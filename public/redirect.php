<?php
/**
 * ==============================================================================
 * SPREAD NFC ULTRA-FAST QR REDIRECTION ENGINE (HOSTINGER OPTIMIZED)
 * Sub-25ms Redirect Latency | Multi-Tier Caching | Non-Blocking Analytics
 * ==============================================================================
 */

// Disable error display to prevent headers already sent issues
error_reporting(0);
ini_set('display_errors', '0');

// 1. Sanitize QR Number
$qrRaw = $_GET['qr'] ?? '';
$qrNumber = strtoupper(trim(preg_replace('/[^A-Za-z0-9_-]/', '', $qrRaw)));

if (empty($qrNumber)) {
    header("Location: /", true, 302);
    exit;
}

// 2. Load Environment Configurations (Supabase credentials)
$supabaseUrl = getenv('VITE_SUPABASE_URL') ?: getenv('SUPABASE_URL');
$supabaseKey = getenv('VITE_SUPABASE_ANON_KEY') ?: getenv('SUPABASE_ANON_KEY');

// Attempt loading from .env if running on shared hosting without system env vars
if (empty($supabaseUrl) || empty($supabaseKey)) {
    $envPaths = [
        __DIR__ . '/.env',
        __DIR__ . '/../.env',
        dirname(__DIR__) . '/.env'
    ];
    foreach ($envPaths as $envPath) {
        if (file_exists($envPath) && is_readable($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2) {
                    $key = trim($parts[0]);
                    $val = trim(trim($parts[1]), '"\'');
                    if ($key === 'VITE_SUPABASE_URL' || $key === 'SUPABASE_URL') $supabaseUrl = $val;
                    if ($key === 'VITE_SUPABASE_ANON_KEY' || $key === 'SUPABASE_ANON_KEY') $supabaseKey = $val;
                }
            }
            if ($supabaseUrl && $supabaseKey) break;
        }
    }
}

// Fallback if environment is not set yet
if (empty($supabaseUrl) || empty($supabaseKey)) {
    // Forward to client-side fallback
    header("Location: /update?qr=" . urlencode($qrNumber), true, 302);
    exit;
}

// 3. Multi-Tier Cache Check (APCu RAM Cache or High-Speed File Cache)
$cacheKey = 'sn_qr_' . $qrNumber;
$cacheTtl = 120; // 2 minutes cache (instant responsiveness, minimal DB load)
$cachedData = null;

// Tier 1: APCu Memory Cache (Hostinger Shared / VPS)
if (function_exists('apcu_fetch')) {
    $success = false;
    $apcuData = apcu_fetch($cacheKey, $success);
    if ($success && is_array($apcuData)) {
        $cachedData = $apcuData;
    }
}

// Tier 2: NVMe File-Based Fast Cache
$cacheDir = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/' . md5($cacheKey) . '.json';

if (!$cachedData && file_exists($cacheFile)) {
    $fileTime = filemtime($cacheFile);
    if ((time() - $fileTime) < $cacheTtl) {
        $json = @file_get_contents($cacheFile);
        if ($json) {
            $cachedData = json_decode($json, true);
        }
    }
}

// 4. Cache-Miss: Fast Direct REST Query to Supabase (<50ms)
if (!$cachedData) {
    $apiUrl = rtrim($supabaseUrl, '/') . '/rest/v1/qr_codes?qr_number=eq.' . urlencode($qrNumber) . '&select=status,destination_url';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Accept: application/json'
    ]);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $rows = json_decode($response, true);
        if (!empty($rows) && is_array($rows)) {
            $cachedData = [
                'status' => $rows[0]['status'] ?? 'inactive',
                'destination_url' => $rows[0]['destination_url'] ?? null
            ];

            // Store in APCu
            if (function_exists('apcu_store')) {
                @apcu_store($cacheKey, $cachedData, $cacheTtl);
            }

            // Store in File Cache
            if (!is_dir($cacheDir)) {
                @mkdir($cacheDir, 0755, true);
            }
            @file_put_contents($cacheFile, json_encode($cachedData), LOCK_EX);
        }
    }
}

// 5. Determine Redirect Destination
if (!$cachedData) {
    // Forward to React client router to show user-friendly Not Found screen
    header("Location: /q/" . urlencode($qrNumber), true, 302);
    exit;
}

if ($cachedData['status'] !== 'active') {
    // Inactive Card -> let React client show the Inactive status screen
    header("Location: /q/" . urlencode($qrNumber), true, 302);
    exit;
}

$destUrl = trim($cachedData['destination_url'] ?? '');

// If newly registered card without destination set -> redirect to claim/update flow
if (empty($destUrl)) {
    header("Location: /update?qr=" . urlencode($qrNumber), true, 302);
    exit;
}

// Security: Validate destination URL protocol to prevent open redirect vulnerabilities (e.g. javascript:)
if (!preg_match('/^https?:\/\//i', $destUrl)) {
    $destUrl = 'https://' . ltrim($destUrl, '/');
}

// Sanitize CRLF injection
$destUrl = str_replace(["\r", "\n"], '', $destUrl);

// 6. ⚡ INSTANT HTTP 302 REDIRECT TO CUSTOMER DESTINATION
// Instruct Cloudflare / Browser to cache response at CDN Edge for fast bursts
header("Cache-Control: public, max-age=60, s-maxage=120");
header("Location: " . $destUrl, true, 302);

// 7. Non-Blocking Async Completion (Closes HTTP connection to user immediately!)
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request(); // User is redirected right now!
}

// 8. Background Analytics Log (Zero Latency impact on user)
// Increments scan analytics via Supabase RPC or unbuffered local log
try {
    $rpcUrl = rtrim($supabaseUrl, '/') . '/rest/v1/rpc/get_qr_redirect';
    $postData = json_encode(['p_qr_number' => $qrNumber]);

    $chLog = curl_init();
    curl_setopt($chLog, CURLOPT_URL, $rpcUrl);
    curl_setopt($chLog, CURLOPT_POST, true);
    curl_setopt($chLog, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($chLog, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chLog, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($chLog, CURLOPT_TIMEOUT_MS, 500); // Fast timeout so PHP process frees quickly
    @curl_exec($chLog);
    @curl_close($chLog);
} catch (Exception $e) {
    // Background task fail-safe (silent)
}

exit;
