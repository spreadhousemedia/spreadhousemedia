# 🚀 Spread NFC — Complete Production Deployment Guide
### Domain: `spreadnfc.in` | Stack: Hostinger (hPanel / Apache / PHP) + Supabase (PostgreSQL / RLS / Auth)

---

## 📋 Overview of System Architecture
- **Frontend SPA**: React 18, Vite, Tailwind CSS (Compiled static files in `dist/`).
- **High-Speed Redirection Engine**: `public/redirect.php` (Sub-25ms ultra-low latency redirection via Hostinger APCu / NVMe cache with Supabase REST API fallback).
- **Backend & Database**: Supabase PostgreSQL (Stored procedures, Row-Level Security, GIN Trigram indexes, and Supabase Auth).
- **Security & Rewrite Layer**: Apache `.htaccess` (Enforces HTTPS, HSTS, CSP, clickjacking defense, intercepts `/q/{qrNumber}`, and routes SPA page refreshes to `/index.html`).

---

## 🛠️ Phase 1: Supabase Setup (Database & Authentication)

### Step 1.1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **"New Project"**.
3. Fill in the project details:
   - **Name**: `Spread NFC Production`
   - **Database Password**: Choose a strong password and save it in a secure password manager.
   - **Region**: Choose the closest region to your primary audience (e.g., `South Asia (Mumbai)` for Indian traffic).
   - **Pricing Plan**: Free or Pro.
4. Click **"Create new project"** and wait ~2 minutes for provisioning.

---

### Step 1.2: Run the Complete Database Schema
1. In the Supabase left navigation, click on **SQL Editor**.
2. Click **"New query"**.
3. Open the file [`supabase_schema.sql`](./supabase_schema.sql) from this project.
4. Copy the entire contents of `supabase_schema.sql` and paste it into the Supabase SQL Editor.
5. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Verify that the output shows **"Success. No rows returned"**.
   > This automatically provisions:
   > - Required PostgreSQL extensions (`uuid-ossp`, `pgcrypto`, `pg_trgm`).
   > - Tables (`batches`, `qr_codes`, `products`, `orders`, `order_items`, `support_tickets`, `corporate_inquiries`).
   > - High-performance indexes (B-tree on `qr_number`, `created_at`, and GIN Trigram indexes for substring search).
   > - Stored procedures (`admin_create_single_qr`, `admin_create_batch_qrs`, `verify_qr_password_and_update`, `get_qr_redirect`, `export_full_database_snapshot`, etc.).
   > - Row Level Security (RLS) policies.

---

### Step 1.3: Retrieve Supabase API Credentials
1. In Supabase, go to **Project Settings** (gear icon at the bottom left) ➔ **API**.
2. Locate and copy the following values:
   - **Project URL**: e.g. `https://xyzcompany.supabase.co`
   - **Project API Keys** ➔ **`anon` (public)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - *(Optional for server jobs)* **`service_role` (secret)**: Keep strictly private.

---

### Step 1.4: Create the Admin User in Supabase Auth
1. In Supabase, go to **Authentication** ➔ **Users**.
2. Click **"Add user"** ➔ **"Create user"**.
3. Enter:
   - **Email**: `admin@spreadnfc.in`
   - **Password**: Enter your desired secure admin password (e.g. at least 8 characters with upper, lower, and numbers).
   - **Auto Confirm User**: Toggle **ON** (checked).
4. Click **"Create user"**.

---

### Step 1.5: Configure URL Configuration & Redirects
1. In Supabase, go to **Authentication** ➔ **URL Configuration**.
2. Set **Site URL**: `https://spreadnfc.in`
3. In **Redirect URLs**, add:
   - `https://spreadnfc.in/**`
   - `https://spreadnfc.in/login`
   - `https://spreadnfc.in/admin`
4. Click **"Save"**.

---

## 💻 Phase 2: Local Build & Environment Configuration

### Step 2.1: Update Local `.env`
In the root directory of this project, open [.env](file:///.env) and populate your live Supabase credentials:

```env
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_BASE_URL=https://spreadnfc.in
```

### Step 2.2: Generate the Production Build
Open your terminal in the project directory and run:

```bash
npm run build
```

This compiles your TypeScript and Vite assets into the `dist/` directory.
Verify the output:
```text
✓ 2484 modules transformed.
✓ built in ~10s
dist/index.html
dist/.htaccess
dist/redirect.php
dist/robots.txt
dist/sitemap.xml
dist/assets/...
```

---

## 🌐 Phase 3: Hostinger Deployment (hPanel & File Manager)

### Step 3.1: Log into Hostinger hPanel
1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com).
2. Go to **Websites** ➔ Find your domain `spreadnfc.in` ➔ Click **"Manage"**.

---

### Step 3.2: Verify PHP Configuration
1. In the search bar on hPanel, search for **"PHP Configuration"**.
2. Ensure the following settings:
   - **PHP Version**: `PHP 8.1` or `PHP 8.2` (Recommended).
   - Under **PHP Extensions**, ensure the following are enabled:
     - `curl` (Required for Supabase REST lookups in `redirect.php`)
     - `json` (Enabled by default)
     - `apcu` (Recommended for sub-10ms in-memory redirection caching)
     - `openssl`
3. Click **"Save"**.

---

### Step 3.3: Upload `dist/` Contents to `public_html`
1. In hPanel, go to **Files** ➔ **File Manager** (Access files of `spreadnfc.in`).
2. Navigate into the **`public_html`** folder.
3. If there is a default Hostinger placeholder file (`default.php` or `index.php`), **delete it**.
4. Upload all files and folders located **inside your local `dist/` folder**:
   - `assets/` (folder)
   - `index.html`
   - `redirect.php`
   - `.htaccess`
   - `robots.txt`
   - `sitemap.xml`
   - `logo.png`, `spread-logo.png`, `favicon.png`, `favicon.ico`, `apple-touch-icon.png`, `aditya.jpg`
   - `_headers`

> [!IMPORTANT]
> **Check Hidden Files:**
> Ensure that `.htaccess` is uploaded into `public_html`. If Hostinger hides files starting with a dot, toggle **"Show Hidden Files (dotfiles)"** in the File Manager top bar.

---

### Step 3.4: Configure `.env` on Hostinger for `redirect.php`
In `public_html` in File Manager:
1. Create a new file named `.env`.
2. Insert your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://xyzcompany.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_APP_BASE_URL=https://spreadnfc.in
   ```
3. Save the file.
   > `redirect.php` automatically reads this `.env` file to establish high-speed database queries without requiring command-line server environment variables.

---

## 🔒 Phase 4: Domain & SSL Setup (`spreadnfc.in`)

### Step 4.1: DNS Configuration
If your domain `spreadnfc.in` is registered with Hostinger:
- DNS records are automatically linked to your hosting plan.

If registered with another registrar (GoDaddy, Namecheap, Cloudflare):
- Point your nameservers to Hostinger:
  - `ns1.dns-parking.com`
  - `ns2.dns-parking.com`
- OR add an **A Record** pointing `@` and `www` to your Hostinger server IP address (found on hPanel dashboard).

---

### Step 4.2: Activate Free SSL Certificate
1. In hPanel, search for **"SSL"**.
2. Click **"Install SSL"** for `spreadnfc.in` and `www.spreadnfc.in` (Let's Encrypt Free SSL).
3. Toggle **"Force HTTPS"** to **ON**.
   > The `.htaccess` file also includes `Strict-Transport-Security` (HSTS) with a 1-year preload header.

---

## ✅ Phase 5: Post-Deployment Smoke Test & Verification

Test each of the following endpoints in an Incognito/Private browser window:

| Test Item | URL / Path | Expected Result |
| :--- | :--- | :--- |
| **Landing Page** | `https://spreadnfc.in/` | Clean hero page with "Print Your QR Once. Change Your Link Anytime." |
| **Clean Navigation** | Topbar | Menu displays `Home \| Products \| About \| Support \| Contact` (no redundant buttons). |
| **WhatsApp Floating Widget** | Bottom-right corner | Circular green WhatsApp icon visible. Clicking opens chat with `+91 93510 42276`. |
| **Admin Login** | `https://spreadnfc.in/login` | Renders clean admin login form with no default passwords exposed. |
| **Admin Dashboard** | `https://spreadnfc.in/admin` | Logs in successfully with `admin@spreadnfc.in`. Shows real-time metrics. |
| **Admin Dark Mode** | Top-right header | Clicking the Sun/Moon toggle switches between dark mode (`#09090B`) and light mode. |
| **Admin Dropdown** | Profile icon in header | User menu opens smoothly on `z-50` layer without being hidden or covered by cards. |
| **Change Password** | Dropdown ➔ Change Password | Opens modal with password complexity rules and updates credentials. |
| **SPA Page Refresh** | `https://spreadnfc.in/products` (hit F5) | Refreshes properly without throwing a 404 error (handled by `.htaccess`). |
| **Ultra-Fast QR Redirect** | `https://spreadnfc.in/q/TABLE-01` | Redirects in sub-25ms to configured target URL via `redirect.php`. |
| **First-Scan Claim** | `https://spreadnfc.in/update?qr=TABLE-01` | Prompts user to set initial destination and passcode. |
| **Data Backup & Snapshot** | `https://spreadnfc.in/admin/backup` | Exports instant JSON, CSV, and PDF backups. |

---

## 🛡️ Troubleshooting & Maintenance

### 1. Page Refresh Returns 404 Error
- **Cause**: `.htaccess` is missing from `public_html` or Apache `mod_rewrite` is disabled.
- **Solution**: Confirm that `.htaccess` exists in `public_html` and contains:
  ```apache
  RewriteEngine On
  RewriteBase /
  RewriteRule ^q/([A-Za-z0-9_-]+)/?$ redirect.php?qr=$1 [L,QSA]
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  ```

### 2. QR Redirection is Slow (> 200ms)
- **Solution**: Ensure the `apcu` extension is enabled under **Hostinger hPanel ➔ PHP Configuration ➔ Extensions**. With APCu active, repeat redirects execute in **< 10ms directly from RAM**.

### 3. Updating the Website in the Future
Whenever you make updates to the code:
1. Run `npm run build` locally.
2. In Hostinger File Manager, replace `assets/` and `index.html` inside `public_html`.
3. Your updates will be live instantly.
