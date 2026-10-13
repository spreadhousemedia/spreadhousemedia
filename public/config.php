<?php
/**
 * ============================================================
 * SPREAD NFC — HOSTINGER SERVER CONFIGURATION
 * ============================================================
 * Edit this file on your Hostinger server with REAL credentials.
 * Upload to: public_html/config.php
 *
 * This file is protected by .htaccess — it CANNOT be accessed
 * via browser (HTTP requests are blocked). PHP reads it internally.
 *
 * HOW TO FIND YOUR CREDENTIALS:
 *   1. Go to https://app.supabase.com
 *   2. Open your project
 *   3. Click Settings → API
 *   4. Copy "Project URL" and "anon public" key
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────
// YOUR SUPABASE CREDENTIALS — Replace with your real values
// ─────────────────────────────────────────────────────────────
define('SUPABASE_URL',      'https://dvuuturphjumffqyigtz.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXV0dXJwaGp1bWZmcXlpZ3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4Nzk2NTMsImV4cCI6MjEwNzQ1NTY1M30.9oiTvJCDnX9j8EQylGoHlgctew0LBoPdVahnPMOO5Q8');

// ─────────────────────────────────────────────────────────────
// YOUR SITE URL — Used in HTML error pages
// ─────────────────────────────────────────────────────────────
define('SITE_URL', 'https://spreadnfc.in');
define('SITE_NAME', 'Spread NFC');

// ─────────────────────────────────────────────────────────────
// CACHE SETTINGS
// ─────────────────────────────────────────────────────────────
define('QR_CACHE_TTL', 120);  // seconds — how long to cache QR lookups
