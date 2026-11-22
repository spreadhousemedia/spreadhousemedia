# SpreadNFC – Multi-Link QR & Digital Profile System
## Phase 0: Complete Codebase & Security Audit

**Audit Date:** 2026-11-22  
**Target Repository:** `spreadhousemedia-main`  
**Status:** Phase 0 Complete — Ready for Phase 1 Implementation Review

---

## 1. Executive Summary

SpreadNFC is currently a single-destination dynamic QR and NFC management platform built with **React 18 + Vite + TypeScript + Tailwind CSS** on the frontend and **Supabase (PostgreSQL, PostgREST RPCs, pgcrypto, Supabase Auth)** on the backend, with an in-memory/`localStorage` offline demo mode (`src/lib/mockDb.ts` + `src/lib/supabase.ts`).

Upgrading to a **Dual-Mode (Personal Multi-Link Profile + Business Direct Redirection)** platform is architecturally compatible with the existing QR infrastructure. All physical cards and standees permanently encode `/q/:qrNumber`, which can continue serving as the single immutable entry point while branching dynamically at resolution time based on `usage_type` (`personal` vs. `business`).

However, the audit uncovered **critical existing security & compatibility constraints** in the current SQL schema and frontend logic—most notably overly permissive `anon` grants/policies on `qr_codes` and `qr_rate_limits`, missing authorization checks inside `admin_*` `SECURITY DEFINER` RPCs, and `is_claimed` detection that currently depends on `destination_url IS NOT NULL`. These must be addressed cleanly during Phase 1 without breaking existing active QR codes.

---

## 2. Existing Architecture Overview

### 2.1 Frontend Stack & Routing (`src/App.tsx`, `package.json`, `vite.config.ts`)
- **Framework:** React `^18.3.1`, `react-router-dom` `^6.26.2`, `lucide-react`, `qrcode`, `jspdf`, `jszip`, `papaparse`, `@supabase/supabase-js` `^2.45.4`.
- **Public Routes:**
  - `/` (`LandingPage`), `/products` (`ProductsPage`), `/support` (`SupportPage`), `/contact` (`ContactPage`)
  - `/login` (`Login` — Admin login)
  - `/update` (`UpdatePage` — Customer self-service QR activation & destination update)
  - `/q/:qrNumber` (`QRRedirect` — Public scan/NFC tap redirect resolver)
- **Protected Admin Routes (`/admin/*` wrapped in `ProtectedRoute` + `AdminLayout`):**
  - `/admin` (`Dashboard`), `/admin/create` (`CreateQR`), `/admin/bulk` (`BulkQR`), `/admin/upload` (`UploadCSV`), `/admin/manage` (`ManageQR`), `/admin/batches` (`Batches`), `/admin/backup` (`DataBackup`), plus e-commerce routes (`products`, `orders`, `support`, `inquiries`).
- **Observed Minor Defect in `src/App.tsx`:** Line 66 contains a stray literal `` `n `` between the `backup` and `batches` `<Route>` elements; should be cleaned up during implementation.

### 2.2 Deployment & Caching Layer
- **Vercel (`vercel.json`):** Rewrites all paths to `/index.html` and sets `Cache-Control: no-store, no-cache, must-revalidate` + `X-Robots-Tag: noindex` on `/q/(.*)`.
- **Apache/Hostinger (`public/.htaccess`):** SPA fallback to `/index.html`, strict security headers (`X-Frame-Options: DENY`, CSP allowing `https://*.supabase.co`, `img-src 'self' data: blob: https:`), and blocks direct HTTP access to dotfiles and `supabase_schema.sql`.
- **Cloudflare/Netlify (`public/_headers`):** Security headers + `img-src 'self' data: https:` (note: does not include `blob:` unlike `.htaccess`; should be aligned if blob previews are used for profile photo uploads).
- **Note on Deployment Docs:** `DEPLOYMENT_GUIDE.md` and `HOSTINGER_DEPLOY.md` reference `public/redirect.php` and `public/config.php`, but neither PHP file exists in `public/`. Current production QR resolution runs completely through the SPA route `/q/:qrNumber` (`QRRedirect.tsx`).
- **Client-Side Cache (`src/lib/cache.ts`):** In-memory `Map` with TTL (`redirect_<QR>` cached for 30s on scan; `qr_*` and `batches_*` cached for admin SWR).

### 2.3 Offline / Demo Layer (`src/lib/supabase.ts`, `src/lib/mockDb.ts`)
- Activated only when `localStorage.getItem('spreadnfc_offline_mode') === 'true'`.
- `src/lib/supabase.ts` wraps `realClient` and routes `.from(table)` through `MockQueryBuilder` and `.rpc(name, params)` through `mockDb.*`.
- Note: `src/lib/supabase.ts` and `scripts/test_qr_flows.js` contain hardcoded fallback Supabase URL and anon key constants when env vars are unset or placeholders.

---

## 3. Existing Database Relationships & RPCs (`supabase_schema.sql`, `SUPABASE_MIGRATION.sql`)

### 3.1 Core QR Tables
1. **`public.batches`**
   - `id` (UUID PK), `batch_name`, `series_prefix`, `start_number`, `end_number`, `total_qr_codes`, `created_at`, `updated_at`.
2. **`public.qr_codes`**
   - `id` (UUID PK), `qr_number` (TEXT UNIQUE, normalized uppercase), `qr_name`, `destination_url` (TEXT NULL), `status` (`'active' | 'inactive'`), `batch_id` (UUID FK → `batches.id` ON DELETE SET NULL), `password_hash` (TEXT NOT NULL, `crypt(..., gen_salt('bf', 8))`), `password_changed` (BOOLEAN DEFAULT `false`), `claimed_at` (TIMESTAMPTZ), `owner_email` (TEXT), `requires_setup_code` (BOOLEAN DEFAULT `true`), `scan_count` (INTEGER DEFAULT `0`), `created_at`, `updated_at`.
   - **Indexes:** B-tree on `qr_number`, `created_at DESC`, `batch_id`, `status`, partial on `destination_url`, covering index `idx_qr_codes_scan_covering (qr_number, status) INCLUDE (destination_url, password_changed)`, and GIN trigram index `idx_qr_codes_trgm` on `(qr_number, qr_name)`.
3. **`public.qr_rate_limits`**
   - `key` (TEXT PK), `attempts` (INT), `last_attempt` (TIMESTAMPTZ), `locked_until` (TIMESTAMPTZ).
4. **E-commerce / Support Tables:** `products`, `orders`, `support_tickets`, `contact_inquiries` (independent of `qr_codes` except loose text references `associated_qr_number`).

### 3.2 Existing RPC Functions
| RPC Name | Caller | Purpose |
| :--- | :--- | :--- |
| `admin_create_single_qr` | Admin (`CreateQR.tsx`) | Creates 1 QR with bcrypt-hashed setup code (`min 4 chars`). |
| `admin_create_batch` | Admin (`BulkQR.tsx`) | Dry-run conflict check or bulk `generate_series` insert (max 5000) in `common` or `unique` random 6-char password mode. |
| `admin_process_qr_csv` | Admin (`UploadCSV.tsx`) | Dry-run validation or bulk insert from JSON array of CSV rows. |
| `admin_reset_qr_password` | Admin (`EditQrModal.tsx`) | Direct override of `password_hash` on `qr_codes`. |
| `admin_reset_qr_unclaimed` | Admin (`EditQrModal.tsx`) | Resets `password_hash` to new setup code, sets `password_changed = false`, `claimed_at = NULL`, `owner_email = NULL`. |
| `request_qr_update` | Public (`UpdatePage.tsx`) | Checks QR existence, `status = 'active'`, returns `is_claimed`, `destination_url`, `owner_email`, `requires_setup_code`. |
| `verify_setup_code` | Public (`UpdatePage.tsx`) | Rate-limited (`5 / 5min`, key `setup_verify_<QR>`) verification of packaging setup code against `password_hash` before activation. |
| `customer_claim_qr` | Public (`UpdatePage.tsx`) | Row-locked (`FOR UPDATE`) atomic claim: verifies setup code (if `requires_setup_code`), hashes new password, sets `password_changed = true`, `claimed_at = now()`, `destination_url`, `owner_email`. |
| `confirm_qr_update` | Public (`UpdatePage.tsx`) | Rate-limited (`5 / 5min`, key `update_<QR>`) password check and `destination_url` update. |
| `get_qr_redirect` | Public (`QRRedirect.tsx`) | Atomically increments `scan_count` and returns `(status, destination_url, is_claimed)`. |
| `check_and_record_rate_limit`, `record_failed_rate_limit`, `clear_rate_limit` | Internal RPC helpers | Manage `qr_rate_limits` rows. |

---

## 4. Existing Authentication Workflow

SpreadNFC has **two strictly separate authentication planes**:

1. **Admin Authentication (`src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`, `src/components/ProtectedRoute.tsx`):**
   - Uses **Supabase Auth** (`supabase.auth.signInWithPassword`, `getSession`, `onAuthStateChange`).
   - Any authenticated Supabase Auth user (`auth.role() = 'authenticated'`) has full RLS access to `qr_codes` and `batches`.
   - Offline mode falls back to `localStorage` (`spreadnfc_offline_session` / `spreadnfc_admin_auth`).

2. **Customer Authentication (`src/pages/public/UpdatePage.tsx` + `qr_codes.password_hash`):**
   - Customers do **not** have Supabase Auth accounts or a `users` table.
   - Each physical QR/NFC device is its own credential principal identified by `qr_number` + bcrypt `password_hash` (min 4 characters in `src/lib/validation.ts` and DB RPCs).
   - **Lifecycle Scenarios:**
     - **Scenario C (Packaging Setup Code — default `requires_setup_code = true`):** `verify_setup_code` validates temporary packaging code → `customer_claim_qr` replaces `password_hash` with customer's personal password, sets `password_changed = true`, `claimed_at = now()`, and saves `destination_url`.
     - **Scenario B (Open Direct Claim — `requires_setup_code = false`):** Skips `verify_setup_code` and directly runs `customer_claim_qr`.
     - **Scenario A (Already Claimed):** `UpdatePage` enters `update` mode and verifies personal password via `confirm_qr_update` on each save.

---

## 5. Existing QR Generation & Redirect Workflow

1. **QR Generation (`src/lib/qr.ts`, `src/lib/config.ts`):**
   - `qrPublicUrl(qrNumber)` always produces `${APP_BASE_URL}/q/${encodeURIComponent(qrNumber.trim())}`.
   - PNG/SVG/PDF exports embed this `/q/:qrNumber` URL with the serial label underneath.
   - NFC manufacturing CSV (`src/lib/csv.ts`) also encodes `/q/:qrNumber`.
2. **Public Scan Resolution (`src/pages/public/QRRedirect.tsx`):**
   - Normalizes `qrNumber` (`UPPER(TRIM)`).
   - Checks in-memory 30s cache `redirect_<QR>`. If hit → `window.location.replace(cachedUrl)`.
   - Calls `supabase.rpc('get_qr_redirect', { p_qr_number })`.
   - If not found → renders "Device Not Found".
   - If `status !== 'active'` → renders "Card / Standee Inactive".
   - If `destination_url` is null/empty → navigates to `/update?qr=<QR>` (first-time activation).
   - Otherwise caches `destination_url` for 30s and executes `window.location.replace(row.destination_url)`.
3. **Important Existing Bug / Nuance in `is_claimed`:**
   - Both `request_qr_update` and `get_qr_redirect` compute `is_claimed` as:  
     `password_changed AND destination_url IS NOT NULL AND length(trim(destination_url)) > 0`.
   - In `mockDb.ts`, `is_claimed` only checks `!!target.password_changed`, and `verify_setup_code` / `requires_setup_code` are not modeled in `mockDb.ts`.

---

## 6. Backward-Compatibility Risks

1. **`is_claimed` Coupled to `destination_url`:**
   - Personal mode profiles do **not** require an external `destination_url` on `qr_codes` (their destination is the internal digital profile `/p/:identifier`).
   - If `get_qr_redirect` and `request_qr_update` keep requiring `destination_url IS NOT NULL` to treat a QR as claimed, Personal QRs would endlessly loop back to `/update?qr=...` on scan!
   - **Mitigation:** Update `is_claimed` logic so a QR is claimed when `password_changed = true` AND either:
     - `usage_type = 'business'` with a configured `destination_url`, OR
     - `usage_type = 'personal'` (with a `qr_profiles` record), OR
     - legacy pre-migration records that already have `destination_url` (backfilled to `usage_type = 'business'`).
2. **Existing Claimed QRs Must Never Break:**
   - Production `qr_codes` rows that already have `password_changed = true` and a non-empty `destination_url` must be safely backfilled to `usage_type = 'business'`.
   - Legacy unclaimed QRs that were pre-populated with a `destination_url` (`password_changed = false`, `destination_url IS NOT NULL` — e.g., batch default URL or CSV import) must **still redirect directly** on scan (current `QRRedirect.tsx` checks `!row.destination_url`, not `!row.is_claimed`) while defaulting `usage_type` to `'business'` or allowing setup on `/update` without breaking pre-configured links.
3. **30-Second Client Redirect Cache (`src/lib/cache.ts`):**
   - Currently caches only a raw `string` URL under `redirect_<QR>`. If a card's mode or profile slug changes (e.g., via Admin mode switch or Business URL update), the cached payload must store structured resolution metadata (`{ usage_type, destination_url, public_slug }`) and be invalidated on updates.
4. **`get_qr_redirect` Return Shape:**
   - Existing `scripts/test_qr_flows.js` and `QRRedirect.tsx` expect `get_qr_redirect` to return a `TABLE` with `status`, `destination_url`, `is_claimed`. Adding columns (`usage_type`, `public_slug`) is safe for JSON consumers if existing column names/types remain intact, and requires `DROP FUNCTION` before `CREATE OR REPLACE` due to PostgreSQL `42P13` return-type rules.
5. **Backup & Restore (`src/lib/backup.ts`, `src/pages/admin/DataBackup.tsx`):**
   - JSON/CSV exports currently snapshot only `batches` and `qr_codes`. Extending `qr_codes` with `usage_type`, `business_name`, `business_purpose` and optionally exporting `qr_profiles` / `qr_links` in JSON v2 backups prevents data loss during backup/restore.
6. **Offline Mode (`src/lib/mockDb.ts`, `src/lib/supabase.ts`):**
   - `MockQueryBuilder` only handles `batches` and `qr_codes`. Any new tables/RPCs used by `UpdatePage`, `PublicProfile`, `ManageQR`, or `EditQrModal` must also be supported in `mockDb.ts` / `MockQueryBuilder` so offline mode does not silently break.

---

## 7. Security Audit & Concerns

| Severity | Finding in Current Codebase | Required Mitigation |
| :--- | :--- | :--- |
| **CRITICAL** | `supabase_schema.sql` lines 813 & 826 grant `ALL` on all tables to `anon` and set `CREATE POLICY "Public QR Read" ON public.qr_codes FOR SELECT USING (true);`. Any `anon` client can `SELECT password_hash, owner_email` from `qr_codes` and read/truncate `qr_rate_limits` via PostgREST! | Remove/restrict broad `anon` `SELECT` on `qr_codes` (use dedicated `SECURITY DEFINER` RPCs or a safe public view without `password_hash`/`owner_email`), enable RLS on `qr_rate_limits` with zero `anon` policies, and revoke `ALL` table privileges from `anon`. |
| **CRITICAL** | `admin_*` RPCs (`admin_create_single_qr`, `admin_create_batch`, `admin_process_qr_csv`, `admin_reset_qr_password`, `admin_reset_qr_unclaimed`) are `SECURITY DEFINER` with `GRANT EXECUTE ... TO anon` and **no internal auth check**. Anyone with the public anon key can reset any QR password! | Add `IF auth.role() <> 'authenticated' THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthorized'); END IF;` inside every `admin_*` RPC and `REVOKE EXECUTE ... FROM anon` on admin RPCs. |
| **CRITICAL** | `Admin QR All` RLS uses `auth.role() = 'authenticated'`. If customers were ever added to `auth.users`, every customer would gain full admin access to all QR codes! | Keep customer authentication **strictly** inside QR-scoped `SECURITY DEFINER` RPCs (verifying `qr_number` + `password_hash` or a scoped QR session token), never creating customer `auth.users` rows without explicit `admin` role claims. |
| **HIGH** | `SECURITY DEFINER` functions lack `SET search_path = public, extensions, pg_temp`. | Set explicit `SET search_path = public, pg_temp` (or include `extensions` if `pgcrypto` lives there—verify schema of `crypt`/`gen_salt`) on all new and updated `SECURITY DEFINER` functions. |
| **HIGH** | `confirm_qr_update` & `admin_process_qr_csv` do not validate URL schemes (`http://`/`https://`) inside PostgreSQL—currently only frontend (`isValidDestinationUrl`) validates URLs. A direct RPC call could store `javascript:` or `data:` XSS payloads! | Add a PostgreSQL helper `is_safe_http_url(TEXT)` enforcing `^https?://[^\s/$.?#].[^\s]*$` (rejecting `javascript:`, `data:`, `file:`, `vbscript:`) in every RPC that writes `destination_url` or `qr_links.destination_url`. |
| **HIGH** | **Stateless Customer Dashboard Risk:** Multi-link CRUD (adding/editing/reordering/deleting links, uploading avatar, toggling publish) requires authenticated customer API calls without re-prompting for password on every click and without trusting a raw `qr_code_id` from the client. | Introduce a short-lived **Customer QR Session Token** mechanism: after `customer_claim_qr` or `customer_login_qr` verifies `qr_number` + password (rate-limited), the DB generates a cryptographically random token (`encode(gen_random_bytes(32), 'hex')`), stores its SHA-256 hash + expiry (e.g., 4 hours) in a `qr_customer_sessions` table (no `anon` RLS access), and returns the raw token to the client (`sessionStorage`). All customer dashboard RPCs verify `digest(p_session_token, 'sha256')` against `qr_customer_sessions` and scope all mutations strictly to that `qr_code_id`. |
| **MEDIUM** | **Mode Lock Enforcement:** Customers must not be able to switch `usage_type` after initial selection via modified frontend requests. | Enforce `usage_type IS NULL` check inside `customer_select_usage_mode` RPC using `FOR UPDATE`; once set, only an authenticated Admin (`admin_set_qr_usage_type`) can change `usage_type`. |
| **MEDIUM** | **Public Slug Collisions & Route Hijacking:** Custom `public_slug` values (e.g., `admin`, `login`, `update`, `api`, `q`, `p`, `TF-1001`) could collide with routes or another user's QR number. | Enforce lowercase slug regex `^[a-z0-9][a-z0-9_-]{2,39}$`, maintain a reserved-word blocklist, and ensure `public_slug` uniqueness + non-collision with existing `qr_number` values (except the owner's own QR). |
| **MEDIUM** | **Image Upload Security (`profile_image` / custom icon):** Accepting arbitrary URLs or unvalidated uploads risks broken/malicious assets. | Use a dedicated Supabase Storage bucket (`profile-avatars`) with MIME whitelist (`image/png`, `image/jpeg`, `image/webp`) and size limit (e.g., 2 MB), or restrict `profile_image` to HTTPS URLs / bucket paths; sanitize/escape all rendered profile text in React (no `dangerouslySetInnerHTML`). |
| **LOW** | **`request_qr_update` leaks `owner_email` to unauthenticated callers** who know only `qr_number`. | Avoid returning `owner_email` publicly before authentication, or mask it (`b***@domain.com`) in unauthenticated lookup responses. |

---

## 8. Recommended Database Changes (Phase 1 Blueprint)

Create **`MULTI_LINK_SYSTEM_MIGRATION.sql`** (idempotent, backward-compatible) and synchronize **`supabase_schema.sql`**:

1. **Extend `public.qr_codes` (no dropped columns):**
   - `usage_type TEXT CHECK (usage_type IN ('personal', 'business')) DEFAULT NULL`
   - `business_name TEXT DEFAULT NULL`
   - `business_purpose TEXT DEFAULT NULL` (e.g., `'google_reviews' | 'website' | 'payment' | 'feedback' | 'product' | 'custom'`)
   - **Safe Backfill:**
     ```sql
     UPDATE public.qr_codes
     SET usage_type = 'business'
     WHERE usage_type IS NULL
       AND destination_url IS NOT NULL
       AND length(trim(destination_url)) > 0;
     ```
     *(Existing claimed or pre-linked QRs become `'business'` automatically; unclaimed blank QRs keep `usage_type = NULL` until customer setup.)*
2. **Create `public.qr_profiles`:**
   - `id` (UUID PK), `qr_code_id` (UUID UNIQUE NOT NULL FK → `qr_codes.id` ON DELETE CASCADE), `profile_name` (TEXT NOT NULL DEFAULT ''), `profile_image` (TEXT), `bio` (TEXT), `contact_email` (TEXT), `contact_phone` (TEXT), `public_slug` (TEXT UNIQUE), `theme` (TEXT NOT NULL DEFAULT `'light'` CHECK IN `('light', 'dark')`), `is_published` (BOOLEAN NOT NULL DEFAULT `false`), `created_at`, `updated_at`.
   - Indexes: unique index on `LOWER(public_slug)` where not null, index on `qr_code_id`.
3. **Create `public.qr_links`:**
   - `id` (UUID PK), `qr_profile_id` (UUID NOT NULL FK → `qr_profiles.id` ON DELETE CASCADE), `platform` (TEXT NOT NULL — e.g. `instagram`, `facebook`, `tiktok`, `youtube`, `linkedin`, `x`, `whatsapp`, `telegram`, `snapchat`, `pinterest`, `threads`, `website`, `github`, `discord`, `spotify`, `custom`), `link_title` (TEXT NOT NULL), `destination_url` (TEXT NOT NULL), `icon` (TEXT), `display_order` (INTEGER NOT NULL DEFAULT `0`), `is_active` (BOOLEAN NOT NULL DEFAULT `true`), `created_at`, `updated_at`.
   - Indexes: `(qr_profile_id, display_order)`, partial index on `(qr_profile_id, is_active)`.
4. **Create `public.qr_customer_sessions`:**
   - `id` (UUID PK), `qr_code_id` (UUID NOT NULL FK → `qr_codes.id` ON DELETE CASCADE), `token_hash` (TEXT UNIQUE NOT NULL), `expires_at` (TIMESTAMPTZ NOT NULL), `created_at` (TIMESTAMPTZ DEFAULT now()).
   - RLS enabled with zero `anon` policies (accessed solely inside `SECURITY DEFINER` RPCs).
5. **URL Validation Helper & New / Updated RPCs:**
   - `is_safe_http_url(p_url TEXT)`
   - `request_qr_update(p_qr_number TEXT)` — returns `usage_type`, `is_claimed`, `requires_setup_code`, `business_name`, `business_purpose`, `destination_url`, `public_slug` (masking or omitting `owner_email`).
   - `customer_claim_qr(...)` — claims QR, optionally accepts `p_usage_type` or leaves `usage_type` for Step 2 selection, and returns a short-lived `session_token`.
   - `customer_login_qr(p_qr_number, p_password)` — rate-limited login for already-claimed QRs returning a `session_token` + mode/profile/business state.
   - `customer_select_usage_mode(p_session_token, p_usage_type)` — sets `usage_type` **only if currently NULL** (server-enforced mode lock).
   - `customer_save_business_settings(p_session_token, p_business_name, p_business_purpose, p_destination_url)` — validates HTTP/HTTPS URL, updates `qr_codes`.
   - `customer_save_personal_profile(p_session_token, p_profile_name, p_profile_image, p_bio, p_contact_email, p_contact_phone, p_public_slug, p_theme, p_is_published, p_links JSONB)` — atomic transaction validating slug uniqueness, validating every link's HTTP/HTTPS URL, upserting `qr_profiles`, and replacing/syncing `qr_links` with `display_order`.
   - `customer_get_dashboard(p_session_token)` — loads full profile + links or business config for authenticated customer.
   - `get_public_profile(p_identifier TEXT)` — resolves either `public_slug` (case-insensitive) or `qr_number` (uppercase fallback), checks `qr_codes.status = 'active'` and `usage_type = 'personal'` and `is_published = true`, increments `scan_count` if accessed directly, and returns ONLY public fields + active ordered links (never `password_hash`, `owner_email`, or internal IDs if unnecessary).
   - `get_qr_redirect(p_qr_number TEXT)` — returns `status`, `destination_url`, `is_claimed`, `usage_type`, `public_slug`, `is_published` (preserving backward-compatible columns).
   - `admin_set_qr_usage_type(p_qr_id UUID, p_usage_type TEXT)` & `admin_get_qr_details(p_qr_id UUID)` — authenticated admin only (`auth.role() = 'authenticated'`), preserves existing profile/business data when switching modes.

---

## 9. Files Requiring Modification / Creation

### Database & Documentation
- `MULTI_LINK_SYSTEM_MIGRATION.sql` *(New)* — Idempotent production migration.
- `supabase_schema.sql` *(Update)* — Canonical schema + tightened RLS & RPCs.

### Shared Types, Config, Validation & Offline Mock
- `src/types/index.ts` — Add `UsageType`, `BusinessPurpose`, `ProfileTheme`, `QrProfile`, `QrLink`, `CustomerDashboardState`, `PublicProfileData`, new `RPC_ERROR_MESSAGES`.
- `src/lib/validation.ts` — Add `isValidSlug`, `normalizeSlug`, `PLATFORM_DEFINITIONS` (15 predefined platforms + `custom`), platform URL normalization/validation helpers, profile field length checks.
- `src/lib/config.ts` — Add `profilePublicUrl(identifier)` (`/p/...`) alongside `qrPublicUrl(qrNumber)` (`/q/...`).
- `src/lib/cache.ts` — Store structured redirect payload `{ usage_type, destination_url, public_slug, is_claimed }` and add profile cache invalidation.
- `src/lib/mockDb.ts` & `src/lib/supabase.ts` — Mirror `usage_type`, `qr_profiles`, `qr_links`, `qr_customer_sessions`, and all new RPCs for offline mode parity.
- `src/lib/backup.ts` & `src/pages/admin/DataBackup.tsx` — Include `usage_type`, `business_name`, `business_purpose`, `qr_profiles`, and `qr_links` in JSON/CSV exports and restores.

### Public & Customer Experience
- `src/App.tsx` — Add `/p/:identifier` route (`PublicProfile`), fix stray `` `n `` on line 66.
- `src/pages/public/QRRedirect.tsx` — Branch on `usage_type`:
  - `business` → direct `window.location.replace(destination_url)` (no intermediate profile page).
  - `personal` → navigate to `/p/${public_slug || normQr}` (or render profile).
  - Unclaimed / mode unselected → navigate to `/update?qr=${normQr}`.
- `src/pages/public/PublicProfile.tsx` *(New)* — Mobile-first, fast, accessible light/dark digital profile page with official platform SVG/Lucide icons, avatar, bio, optional contact actions, active links, draft/empty states, and "Powered by SpreadNFC" footer.
- `src/components/profile/PlatformIcons.tsx` & `src/components/profile/ProfilePreview.tsx` *(New)* — Reusable official brand SVG icons for all 15 platforms + custom icon picker, and shared live-preview component matching `PublicProfile` pixel-for-pixel.
- `src/pages/public/UpdatePage.tsx` (plus modular dashboard components under `src/components/customer/`) — Preserve existing lookup, `verify_setup`, `activate` (claim + password), and post-claim **Select Your QR Experience** (Personal vs. Business), then load the **Customer Dashboard**:
  - **Personal Dashboard:** Profile editor (name, avatar upload/URL, bio, contact email/phone, custom slug, Light/Dark theme, Publish/Draft toggle), Multi-Link Manager (15 platforms + unlimited custom links, edit, toggle active, delete, drag-and-drop + accessible Up/Down reorder), **Live Profile Preview**, shareable `/p/...` URL + QR view/download, and Account/Password settings.
  - **Business Dashboard:** Business Name, Purpose selector (Google Reviews, Business Website, Payment Link, Feedback Form, Product Page, Custom URL), single Destination URL with validation + "Test / Open Link" button, save/activate, shareable `/q/...` URL + QR view/download, and Account/Password settings.

### Admin Panel & Tests
- `src/pages/admin/ManageQR.tsx` & `src/pages/admin/Dashboard.tsx` — Show `Personal` vs `Business` mode badges, link count (Personal) or destination URL (Business), and clearer lifecycle status badges (`Unclaimed` / `Awaiting Mode` / `Active` / `Draft` / `Disabled`).
- `src/components/EditQrModal.tsx` — Allow Admin to view Personal/Business summary, change `usage_type` with explicit confirmation dialog (preserving underlying data), edit Business fields, or reset to unclaimed.
- `vercel.json` & `public/_headers` — Ensure `/p/(.*)` has `no-store` headers on dynamic data/HTML if needed and align CSP (`blob:` in `_headers`).
- `scripts/test_qr_flows.js` — Extend automated regression & load test suite to cover Personal, Business, legacy/existing Business migration, and security boundary checks.

---

## 10. Recommended Implementation Sequence

1. **Phase 1 — Database Schema, Security Hardening & Migration (`MULTI_LINK_SYSTEM_MIGRATION.sql` + `supabase_schema.sql`):**  
   Extend `qr_codes`, backfill existing claimed/linked QRs to `'business'`, create `qr_profiles`, `qr_links`, `qr_customer_sessions`, implement `is_safe_http_url`, tighten RLS/grants, and create/update all RPCs with explicit `search_path`.
2. **Phase 2 — Shared Types, Validation, Offline Mock & Mode Selection (`UpdatePage.tsx`):**  
   Implement `types/index.ts`, `validation.ts`, `mockDb.ts`, `customer_login_qr`, `customer_select_usage_mode`, and the mobile-first **Select Your QR Experience** screen (locked after selection).
3. **Phase 3 & 4 — Personal Multi-Link Management, Live Preview & Public Profile (`/p/:identifier`):**  
   Build `PlatformIcons.tsx`, `ProfilePreview.tsx`, `PersonalDashboard`, avatar upload, drag/reorder + accessible Up/Down link controls, draft/published state, and `PublicProfile.tsx`.
4. **Phase 5 — Business Direct Redirection Dashboard:**  
   Build `BusinessDashboard` with purpose selector, Google Reviews test/open link workflow, and single-URL updates.
5. **Phase 6 — Permanent `/q/:qrNumber` Redirect Resolver (`QRRedirect.tsx` & `cache.ts`):**  
   Update `QRRedirect` + structured cache so Business redirects instantly, Personal routes to `/p/...`, and Unclaimed/Unconfigured routes to `/update?qr=...`.
6. **Phase 7 — Admin Panel Upgrades (`ManageQR.tsx`, `Dashboard.tsx`, `EditQrModal.tsx`, `DataBackup.tsx`):**  
   Add mode visibility, link counts, lifecycle statuses, confirmed admin mode switching, and backup/restore updates.
7. **Phase 8 — QA, Security & Regression Verification:**  
   Run `npm run lint`, `npm run build`, update/run `scripts/test_qr_flows.js`, and verify legacy Business QRs, new Personal QRs, new Business QRs, mobile responsiveness, and security controls.

