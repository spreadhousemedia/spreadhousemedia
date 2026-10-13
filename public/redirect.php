<?php
/**
 * ============================================================
 * SPREAD NFC — ULTRA-FAST QR REDIRECT ENGINE (HOSTINGER)
 * ============================================================
 * Architecture:
 *   - SUCCESS  → 302 redirect to customer's destination URL
 *   - ERRORS   → PHP renders a styled HTML page directly
 *                 (NO redirects back to /q/ — eliminates loops!)
 *
 * Upload to: public_html/redirect.php
 * ============================================================
 */

error_reporting(0);
ini_set('display_errors', '0');

// ── 1. LOAD CREDENTIALS ─────────────────────────────────────
// Priority: config.php → .env file → system env vars
$supabaseUrl = '';
$supabaseKey = '';
$siteUrl     = 'https://spreadnfc.in';
$siteName    = 'Spread NFC';

// Try config.php first (recommended for Hostinger)
$configPath = __DIR__ . '/config.php';
if (file_exists($configPath) && is_readable($configPath)) {
    require_once $configPath;
    $supabaseUrl = defined('SUPABASE_URL')      ? SUPABASE_URL      : '';
    $supabaseKey = defined('SUPABASE_ANON_KEY') ? SUPABASE_ANON_KEY : '';
    $siteUrl     = defined('SITE_URL')          ? SITE_URL          : $siteUrl;
    $siteName    = defined('SITE_NAME')         ? SITE_NAME         : $siteName;
}

// Fallback: read from .env file (placed in public_html/)
if (empty($supabaseUrl) || empty($supabaseKey)
    || strpos($supabaseUrl, 'YOUR_PROJECT_ID') !== false) {

    $envPaths = [
        __DIR__ . '/.env',
        dirname(__DIR__) . '/.env',
    ];
    foreach ($envPaths as $envPath) {
        if (!file_exists($envPath) || !is_readable($envPath)) continue;
        foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if (ltrim($line)[0] === '#') continue;
            [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
            $k = trim($k);
            $v = trim(trim($v), '"\'');
            if (in_array($k, ['VITE_SUPABASE_URL', 'SUPABASE_URL']))           $supabaseUrl = $v;
            if (in_array($k, ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'])) $supabaseKey = $v;
        }
        if ($supabaseUrl && $supabaseKey) break;
    }
}

// Fallback: system environment variables
if (empty($supabaseUrl)) $supabaseUrl = getenv('VITE_SUPABASE_URL') ?: getenv('SUPABASE_URL') ?: '';
if (empty($supabaseKey)) $supabaseKey = getenv('VITE_SUPABASE_ANON_KEY') ?: getenv('SUPABASE_ANON_KEY') ?: '';

// ── 2. SANITIZE QR NUMBER ────────────────────────────────────
$qrRaw    = $_GET['qr'] ?? '';
$qrNumber = strtoupper(trim(preg_replace('/[^A-Za-z0-9_-]/', '', $qrRaw)));

if (empty($qrNumber)) {
    header('Location: ' . $siteUrl . '/', true, 302);
    exit;
}

// ── 3. CHECK FOR PLACEHOLDER / UNCONFIGURED CREDENTIALS ──────
$isPlaceholder =
    empty($supabaseUrl) || empty($supabaseKey) ||
    strpos($supabaseUrl, 'YOUR_PROJECT_ID') !== false ||
    strpos($supabaseUrl, 'your-project')    !== false ||
    strpos($supabaseUrl, 'placeholder')     !== false ||
    strpos($supabaseKey, 'YOUR_REAL_ANON')  !== false ||
    strpos($supabaseKey, 'your-anon-key')   !== false ||
    strpos($supabaseKey, 'placeholder')     !== false;

if ($isPlaceholder) {
    // Render a helpful error — do NOT redirect to /q/ (causes infinite loop!)
    renderErrorPage(
        $qrNumber, $siteUrl, $siteName,
        'not_configured',
        '⚙️ Service Not Configured',
        'This QR system is not yet connected to a database. Please contact the administrator.'
    );
    exit;
}

// ── 4. MULTI-TIER CACHE ──────────────────────────────────────
$cacheTtl  = defined('QR_CACHE_TTL') ? QR_CACHE_TTL : 120;
$cacheKey  = 'sn_qr_' . $qrNumber;
$cacheDir  = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/' . md5($cacheKey) . '.json';
$data      = null;

// Tier 1: APCu in-memory cache (fastest — sub-1ms)
if (function_exists('apcu_fetch')) {
    $ok = false;
    $hit = apcu_fetch($cacheKey, $ok);
    if ($ok && is_array($hit)) $data = $hit;
}

// Tier 2: File cache on NVMe SSD
if (!$data && file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    $raw = @file_get_contents($cacheFile);
    if ($raw) $data = json_decode($raw, true);
}

// ── 5. DATABASE LOOKUP (cache miss) ─────────────────────────
if (!$data) {
    $apiUrl = rtrim($supabaseUrl, '/') .
              '/rest/v1/qr_codes?qr_number=eq.' . urlencode($qrNumber) .
              '&select=status,destination_url&limit=1';

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'apikey: '        . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Accept: application/json',
        ],
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr || $httpCode !== 200) {
        // Database unreachable — show error page, NOT a redirect to /q/
        renderErrorPage(
            $qrNumber, $siteUrl, $siteName,
            'db_error',
            '⚡ Service Temporarily Unavailable',
            'Could not connect to the QR database. Please try again in a moment.'
        );
        exit;
    }

    $rows = json_decode($response, true);
    if (!empty($rows) && is_array($rows)) {
        $data = [
            'status'          => $rows[0]['status']          ?? 'inactive',
            'destination_url' => $rows[0]['destination_url'] ?? null,
        ];
        // Only cache if destination_url is set. If empty, user needs to set it up,
        // so we must NOT cache null destination_url (otherwise subsequent scan after setup would be stale).
        if (!empty($data['destination_url']) && $data['status'] === 'active') {
            if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
            @file_put_contents($cacheFile, json_encode($data), LOCK_EX);
            if (function_exists('apcu_store')) @apcu_store($cacheKey, $data, $cacheTtl);
        } else {
            // Ensure no stale cache exists for this QR
            if (file_exists($cacheFile)) @unlink($cacheFile);
            if (function_exists('apcu_delete')) @apcu_delete($cacheKey);
        }
    }
}

// ── 6. HANDLE RESULT ─────────────────────────────────────────
if (!$data) {
    // QR number not found in database
    renderErrorPage(
        $qrNumber, $siteUrl, $siteName,
        'not_found',
        '❌ Device Not Found',
        'QR code <strong>' . htmlspecialchars($qrNumber) . '</strong> is not registered in our system. Please check the serial number printed on your card.'
    );
    exit;
}

if ($data['status'] !== 'active') {
    // QR exists but is deactivated
    renderErrorPage(
        $qrNumber, $siteUrl, $siteName,
        'inactive',
        '🔒 Card Inactive',
        'This NFC card or QR standee has been deactivated. Please contact your administrator or support team.'
    );
    exit;
}

$destUrl = trim($data['destination_url'] ?? '');

if (empty($destUrl)) {
    // QR is active but no destination set — first scan setup flow
    header('Location: ' . $siteUrl . '/update?qr=' . urlencode($qrNumber), true, 302);
    exit;
}

// Validate URL protocol (prevent open redirect to javascript:)
if (!preg_match('/^https?:\/\//i', $destUrl)) {
    $destUrl = 'https://' . ltrim($destUrl, '/');
}
$destUrl = str_replace(["\r", "\n"], '', $destUrl);

// ── 7. ⚡ INSTANT REDIRECT TO DESTINATION ────────────────────
header('Cache-Control: public, max-age=60, s-maxage=120');
header('Location: ' . $destUrl, true, 302);

// Close connection to user immediately — analytics run in background
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();

// ── 8. BACKGROUND: INCREMENT SCAN COUNTER ───────────────────
try {
    $rpcUrl  = rtrim($supabaseUrl, '/') . '/rest/v1/rpc/get_qr_redirect';
    $payload = json_encode(['p_qr_number' => $qrNumber]);
    $chLog   = curl_init($rpcUrl);
    curl_setopt_array($chLog, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'apikey: '               . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT_MS => 800,
    ]);
    @curl_exec($chLog);
    @curl_close($chLog);
} catch (Exception $e) { /* silent */ }

exit;


// ── HELPER: RENDER STYLED ERROR PAGE ────────────────────────
/**
 * Renders a beautiful, branded error page directly from PHP.
 * This avoids ANY redirect — completely eliminates redirect loops.
 *
 * @param string $qrNumber  The scanned QR number
 * @param string $siteUrl   Base site URL
 * @param string $siteName  Brand name
 * @param string $type      Error type slug (for CSS class)
 * @param string $title     Page title
 * @param string $message   Error message (HTML allowed)
 */
function renderErrorPage(string $qrNumber, string $siteUrl, string $siteName, string $type, string $title, string $message): void
{
    $logoUrl     = $siteUrl . '/logo.png';
    $safeQr      = htmlspecialchars($qrNumber);
    $safeTitle   = htmlspecialchars_decode($title);  // allow emoji
    $safeMessage = $message;  // caller already escaped or intentionally uses HTML
    $updateUrl   = $siteUrl . '/update?qr=' . urlencode($qrNumber);
    $whatsapp    = 'https://wa.me/919876543210?text=' . rawurlencode('Hi, I need help with QR code: ' . $qrNumber);

    http_response_code(200);
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$safeTitle} — {$siteName}</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      color: #f1f5f9;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .logo { height: 36px; width: auto; margin-bottom: 32px; }
    .icon {
      width: 72px; height: 72px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px;
    }
    .icon.not_found, .icon.not_configured { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); }
    .icon.inactive    { background: rgba(107,114,128,0.15); border: 1px solid rgba(107,114,128,0.3); }
    .icon.db_error    { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); }
    h1 { font-size: 1.35rem; font-weight: 700; margin-bottom: 12px; color: #f8fafc; }
    p  { font-size: 0.9rem; line-height: 1.6; color: #94a3b8; margin-bottom: 8px; }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 4px 12px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #e2e8f0;
      margin: 12px 0 20px;
    }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .btn {
      display: block; width: 100%;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.2s;
      cursor: pointer;
    }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-ghost {
      background: transparent;
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 20px 0; }
    .footer { font-size: 0.75rem; color: #475569; margin-top: 24px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <img src="{$logoUrl}" alt="{$siteName}" class="logo" onerror="this.style.display='none'">
    <div class="icon {$type}">{$safeTitle[0]}</div>
    <h1>{$safeTitle}</h1>
    <p>{$safeMessage}</p>
    <div class="badge">#{$safeQr}</div>
    <hr class="divider">
    <div class="actions">
HTML;

    if ($type === 'not_found') {
        echo <<<HTML
      <a href="{$updateUrl}" class="btn btn-primary">🔗 Set Up This QR Code</a>
      <a href="{$siteUrl}" class="btn btn-ghost">← Back to Home</a>
HTML;
    } elseif ($type === 'db_error') {
        echo <<<HTML
      <a href="javascript:location.reload()" class="btn btn-primary">↻ Try Again</a>
      <a href="{$siteUrl}" class="btn btn-ghost">← Back to Home</a>
HTML;
    } else {
        echo <<<HTML
      <a href="{$whatsapp}" class="btn btn-primary" target="_blank" rel="noopener">💬 Contact Support via WhatsApp</a>
      <a href="{$siteUrl}" class="btn btn-ghost">← Back to Home</a>
HTML;
    }

    echo <<<HTML
    </div>
  </div>
  <p class="footer">
    Powered by <a href="{$siteUrl}" target="_blank">{$siteName}</a>
  </p>
</body>
</html>
HTML;
}
