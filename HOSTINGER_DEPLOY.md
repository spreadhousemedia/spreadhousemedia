# SPREAD NFC — HOSTINGER DEPLOYMENT GUIDE
## Complete step-by-step guide to deploy on spreadnfc.in

---

## ⚡ QUICK OVERVIEW

This project has TWO separate credential needs:

| Layer | Used By | When Set |
|-------|---------|----------|
| `public/config.php` | PHP `redirect.php` (QR scans) | On Hostinger server |
| `.env` (local) | React admin panel | Before `npm run build` |

You MUST set both. The PHP handles fast QR redirects; React handles the admin panel.

---

## STEP 1 — Get Your Supabase Credentials

1. Go to **https://app.supabase.com**
2. Open your project → **Settings** → **API**
3. Copy:
   - `Project URL` → looks like `https://abcxyz.supabase.co`
   - `anon public` key → starts with `eyJhbGci...`

---

## STEP 2 — Update config.php on Hostinger (for QR Redirects)

This file controls the **PHP redirect engine** (what happens when someone scans a QR code).
You can update this WITHOUT rebuilding the React app.

1. Open `public/config.php` in your file manager
2. Replace with your real values:

```php
define('SUPABASE_URL',      'https://YOUR_REAL_PROJECT.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_REAL_KEY');
define('SITE_URL',          'https://spreadnfc.in');
define('SITE_NAME',         'Spread NFC');
```

3. Upload `config.php` to `public_html/config.php` on Hostinger

> ✅ This file is protected — browsers cannot access it (blocked by .htaccess)
> ✅ PHP reads it internally for all QR scans

---

## STEP 3 — Update .env (for React Admin Panel)

This file controls what **React bakes into the JS bundle** at build time.

Open the `.env` file in your project root and fill in:

```
VITE_SUPABASE_URL=https://YOUR_REAL_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_REAL_KEY
VITE_APP_BASE_URL=https://spreadnfc.in
```

> ⚠️ Never share or commit your real .env to Git

---

## STEP 4 — Build React App Locally

Run this in your terminal (inside the project folder):

```bash
npm run build
```

This creates the `dist/` folder. Your credentials are now baked into the JS.

---

## STEP 5 — Upload to Hostinger

### Files to upload to `public_html/`:

```
FROM YOUR LOCAL MACHINE          →  TO Hostinger public_html/
─────────────────────────────────────────────────────────────
dist/index.html                  →  public_html/index.html
dist/assets/ (entire folder)     →  public_html/assets/
public/.htaccess                 →  public_html/.htaccess      ← CRITICAL
public/redirect.php              →  public_html/redirect.php   ← CRITICAL
public/config.php (edited)       →  public_html/config.php     ← CRITICAL
public/logo.png                  →  public_html/logo.png
public/favicon.png               →  public_html/favicon.png
public/favicon.ico               →  public_html/favicon.ico
public/robots.txt                →  public_html/robots.txt
public/sitemap.xml               →  public_html/sitemap.xml
public/spread-logo.png           →  public_html/spread-logo.png
```

### Using Hostinger File Manager:
1. **hPanel** → **Files** → **File Manager**
2. Navigate to `public_html/`
3. Delete old files
4. Upload everything from the list above

### Using FTP (FileZilla):
- Host: your FTP hostname from hPanel → FTP Accounts
- Upload local `dist/*` → remote `public_html/`
- Upload `public/.htaccess` → `public_html/.htaccess`
- Upload `public/redirect.php` → `public_html/redirect.php`
- Upload `public/config.php` (with real creds) → `public_html/config.php`

---

## STEP 6 — Verify PHP Settings on Hostinger

In **hPanel → Advanced → PHP Configuration**:
- PHP Version: **8.1** or **8.2** (recommended)
- Extensions enabled: ✅ `curl` ✅ `json` ✅ `mbstring`

---

## STEP 7 — Run Supabase Schema (First Time Only)

1. Go to **Supabase Dashboard** → your project → **SQL Editor**
2. Open `supabase_schema.sql` from this project
3. Paste the entire content and click **Run**
4. This creates all tables, indexes, and stored procedures

---

## ✅ VERIFICATION CHECKLIST

After uploading, verify:

- [ ] `https://spreadnfc.in` → homepage loads ✓
- [ ] `https://spreadnfc.in/admin` → login page loads ✓
- [ ] Scan a QR code → redirects to correct destination ✓
- [ ] Scan an unregistered QR → shows "Device Not Found" page (not a loop!) ✓
- [ ] Enter Instagram URL in update form → accepts it ✓ (no "couldn't open" error)
- [ ] Create a QR from admin → appears in Manage QR ✓
- [ ] Import CSV → QR codes appear in Manage QR with batch filter ✓

---

## 🔥 TROUBLESHOOTING

| Error | Cause | Fix |
|-------|-------|-----|
| `ERR_TOO_MANY_REDIRECTS` | `config.php` has placeholder credentials | Edit `config.php` on Hostinger with real Supabase URL + Key |
| QR scans show "Service Not Configured" | Same as above | Edit `config.php` on Hostinger |
| Admin panel in offline/demo mode | `.env` not updated before build | Update `.env` → `npm run build` → re-upload `dist/` |
| "We couldn't open this link" for Instagram | ✅ Already fixed in this version | — |
| Admin page shows blank on refresh | `.htaccess` missing | Upload `public/.htaccess` to `public_html/.htaccess` |
| 404 on any page refresh | Same: `.htaccess` missing | Upload `.htaccess` |
| PHP errors on QR scan | PHP version too old | hPanel → PHP → set to 8.1+ |
| QR redirect loops | ✅ Fixed in `redirect.php` | — |

---

## 📁 HOW THE SYSTEM WORKS

```
User scans QR code
       ↓
spreadnfc.in/q/GX123
       ↓
.htaccess intercepts → redirect.php?qr=GX123
       ↓
PHP reads config.php → gets Supabase credentials
       ↓
PHP queries Supabase REST API
       ↓
   ┌───────────────────────────────┐
   │ QR found & active & has URL  │ → 302 redirect to customer's link (< 25ms)
   │ QR found & active & no URL   │ → redirect to /update?qr=GX123 (setup flow)
   │ QR not found                 │ → PHP renders "Device Not Found" HTML page
   │ QR inactive                  │ → PHP renders "Card Inactive" HTML page
   │ DB error / no credentials    │ → PHP renders "Service Error" HTML page
   └───────────────────────────────┘
         ↑ NO REDIRECT LOOPS — PHP renders HTML directly for all errors ↑
```

---

## 🔑 SECURITY NOTES

- `config.php` is blocked from HTTP access by `.htaccess` (PHP reads it internally only)
- `.env` is blocked from HTTP access by `.htaccess`
- Your Supabase anon key is safe to use client-side (it's a public key with RLS)
- Never upload `node_modules/`, `src/`, `.git/`, or `package.json` to Hostinger
