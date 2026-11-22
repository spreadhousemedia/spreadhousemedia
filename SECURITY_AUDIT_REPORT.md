# SpreadNFC – Application Security & RLS Assessment Report

**Assessment Date:** 2026-11-22  
**Scope:** Static Source-Code, Database Schema, RLS, Authentication & Business-Logic Audit of the SpreadNFC Repository (`spreadhousemedia-main`)  
**Actual Repository Stack Observed:** React 18 + Vite + TypeScript + Tailwind CSS (SPA) + Supabase (PostgreSQL, PostgREST, `pgcrypto`, Supabase Auth)  
*(Note: The request template referenced PHP/MySQL, whereas the repository in this workspace runs React + Supabase PostgreSQL.)*

---

## A. Executive Summary

A source-code and database-schema security review of SpreadNFC identified **critical Row-Level Security (RLS) and privilege weaknesses** in the baseline [supabase_schema.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/supabase_schema.sql) and [SUPABASE_MIGRATION.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/SUPABASE_MIGRATION.sql) definitions:

1. **Unrestricted `anon` RLS (`USING (true)`) on E-Commerce & Support Tables** (`products`, `orders`, `support_tickets`, `contact_inquiries`) allowing anonymous REST reads/writes/deletions of admin-managed data and customer PII.
2. **Permissive `anon` `SELECT` + `GRANT ALL` on `qr_codes`, `batches`, and `qr_rate_limits`** in the baseline schema, exposing `password_hash`, `owner_email`, and rate-limit state to anonymous PostgREST queries.
3. **Unauthenticated / Weakly Authorized `SECURITY DEFINER` Admin RPCs** (`admin_create_single_qr`, `admin_create_batch`, `admin_process_qr_csv`, `admin_reset_qr_password`, `admin_reset_qr_unclaimed`) previously granted to `anon` without internal caller authorization.
4. **Over-broad Admin RLS Predicate (`auth.role() = 'authenticated'`)**: Any authenticated Supabase Auth user (such as a newly registered user if signups are left open) would satisfy `auth.role() = 'authenticated'` and obtain admin permissions unless gated by an explicit admin allowlist (`admin_users` / `public.is_admin()`).

Remediation has been implemented in [ADMIN_RLS_SECURITY_HARDENING.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/ADMIN_RLS_SECURITY_HARDENING.sql), [MULTI_LINK_SYSTEM_MIGRATION.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/MULTI_LINK_SYSTEM_MIGRATION.sql), [supabase_schema.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/supabase_schema.sql), and [ecommerceDb.ts](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/src/lib/ecommerceDb.ts).

---

## B. Target Website Overview

- **Public Website & E-Commerce:** `/`, `/products`, `/support`, `/contact`.
- **QR / NFC Scan & Profile Endpoints:** `/q/:qrNumber` (`QRRedirect.tsx`) and `/p/:identifier` (`PublicProfile.tsx`).
- **Customer Activation & Self-Service Dashboard:** `/update` (`UpdatePage.tsx` + `ModeSelector`, `PersonalDashboard`, `BusinessDashboard`).
- **Admin Panel (`/admin/*`):** Protected by `ProtectedRoute.tsx` + Supabase Auth (`AuthContext.tsx`) for managing QR codes, batches, CSV imports, backups, products, orders, support tickets, and inquiries.

---

## C. Pages and Functionality Inspected (Source Code & SQL)

- Public & Routing: `src/App.tsx`, `src/pages/public/QRRedirect.tsx`, `src/pages/public/PublicProfile.tsx`, `src/pages/public/UpdatePage.tsx`, `src/lib/ecommerceDb.ts`.
- Auth & Guards: `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/Login.tsx`, `src/components/ChangePasswordModal.tsx`.
- Admin Pages & Components: `src/pages/admin/Dashboard.tsx`, `src/pages/admin/ManageQR.tsx`, `src/pages/admin/CreateQR.tsx`, `src/pages/admin/BulkQR.tsx`, `src/pages/admin/UploadCSV.tsx`, `src/pages/admin/Batches.tsx`, `src/pages/admin/DataBackup.tsx`, `src/components/EditQrModal.tsx`, `src/lib/backup.ts`.
- Security & Validation: `src/lib/supabase.ts`, `src/lib/mockDb.ts`, `src/lib/validation.ts`, `public/.htaccess`, `public/_headers`, `vercel.json`, `supabase_schema.sql`, `SUPABASE_MIGRATION.sql`, `MULTI_LINK_SYSTEM_MIGRATION.sql`, `ADMIN_RLS_SECURITY_HARDENING.sql`.

---

## D. Authentication Findings

- **Admin Auth (`AuthContext.tsx`):** Uses Supabase Auth (`signInWithPassword`) in online mode. However, offline demo mode (`localStorage.spreadnfc_offline_mode === 'true'`) uses client-side credential checks with a legacy default (`admin123` / `admin`) before password change—this affects only local browser storage, not the live Supabase backend.
- **Customer Auth (`qr_codes.password_hash` + `qr_customer_sessions`):** Customers authenticate per QR using bcrypt (`pgcrypto` `crypt(..., gen_salt('bf', 8))`). Rate limiting (`qr_rate_limits`) enforces a 5-attempt / 5-minute lockout on `verify_setup_code`, `customer_claim_qr`, `customer_login_qr`, and `confirm_qr_update`. Minimum password length is 4 characters (`isValidPassword`), which is intentionally short for standee PIN convenience; raising it to 6–8+ characters for new setups is recommended.

---

## E. QR Ownership Findings

- **Atomic Claiming (`customer_claim_qr`):** Uses `SELECT ... FOR UPDATE` row locking to prevent concurrent race-condition double claims.
- **Mode Lock (`customer_select_usage_mode`):** Enforced server-side (`IF v_current_usage IS NOT NULL ... RETURN 'mode_locked'`), preventing customers from tampering with frontend requests to bypass mode restrictions.
- **Unauthenticated `request_qr_update` PII Exposure (Fixed in Phase 1):** Baseline `request_qr_update` returned `owner_email` to unauthenticated callers knowing only `qr_number`; updated `request_qr_update` omits `owner_email`.

---

## F. API & RPC Security Findings

- **Missing Caller Authorization on Baseline `admin_*` RPCs (Fixed):** Baseline `supabase_schema.sql` executed `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon` and lacked `is_admin()` checks inside `admin_create_single_qr`, `admin_create_batch`, `admin_process_qr_csv`, `admin_reset_qr_password`, and `admin_reset_qr_unclaimed`.
- **Missing `SET search_path` on Baseline `SECURITY DEFINER` Functions (Fixed):** Baseline RPCs omitted `SET search_path`, creating potential search-path shadowing risk.

---

## G. Database & RLS Security Findings

- **Open E-Commerce / Admin Tables (`USING (true)` + `GRANT ALL TO anon`):** In baseline `supabase_schema.sql` (lines 1059–1086), `products`, `orders`, `support_tickets`, and `contact_inquiries` granted `ALL` to `anon` with `USING (true)` policies.
- **`Public QR Read` & `Batches Read` (`USING (true)`):** Allowed `anon` PostgREST enumeration of `qr_codes` (including `password_hash` and `owner_email`) and `batches`.
- **Admin RLS Too Broad (`auth.role() = 'authenticated'`):** Did not distinguish an authorized admin from any arbitrary signed-up Supabase Auth user.

---

## H. Redirect and URL Security Findings

- **Baseline SQL URL Validation Gap (Fixed):** Baseline `confirm_qr_update`, `admin_create_single_qr`, and `admin_process_qr_csv` relied solely on frontend `isValidDestinationUrl` and lacked server-side URL scheme checks. Added `public.is_safe_http_url` in PostgreSQL to enforce `http://`/`https://` and block `javascript:`, `data:`, `file:`, and `vbscript:`.
- **SSRF:** The backend does not fetch submitted destination URLs (`isUrlReachable` in `src/lib/validation.ts` performs only hostname/syntax checks), so server-side SSRF is not present.

---

## I. Admin Security Findings

- Frontend `ProtectedRoute.tsx` redirects unauthenticated users to `/login`, which is a UI guard only. Actual security relies on PostgreSQL RLS and RPC authorization (`public.is_admin()` + `public.admin_users`), enforced in [ADMIN_RLS_SECURITY_HARDENING.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/ADMIN_RLS_SECURITY_HARDENING.sql).

---

## J. Business Logic Findings

- **Public Order Status Integrity:** Baseline `orders` `INSERT` policy (`WITH CHECK (true)`) allowed an anonymous caller to insert an order with `payment_status = 'paid'`. Fixed with `WITH CHECK (payment_status = 'pending' AND order_status = 'pending_verification')`.
- **Public Support Ticket Enumeration:** Fixed by revoking `anon` `SELECT` on `support_tickets` and routing ticket lookup through `track_support_ticket(p_ticket_number, p_email)` requiring both matching ticket number and email.
- **Unpublished Personal Profile Privacy:** `get_public_profile` and RLS on `qr_profiles`/`qr_links` block all link exposure whenever `is_published = false` or `qr_codes.status = 'inactive'`.

---

## K. Confirmed Findings (Code & Schema Audit)

| ID | Title | Severity | Status in Repo |
| :--- | :--- | :--- | :--- |
| **SNFC-01** | Unrestricted `anon` `ALL` Grants & `USING (true)` RLS on `products`, `orders`, `support_tickets`, `contact_inquiries` | **CRITICAL** | Remediated in `ADMIN_RLS_SECURITY_HARDENING.sql` & `supabase_schema.sql` |
| **SNFC-02** | `admin_*` `SECURITY DEFINER` RPCs Executable by `anon` Without Admin Check | **CRITICAL** | Remediated in `MULTI_LINK_SYSTEM_MIGRATION.sql` & `ADMIN_RLS_SECURITY_HARDENING.sql` |
| **SNFC-03** | `qr_codes` `Public QR Read` + `GRANT ALL TO anon` Exposed `password_hash` & `owner_email` | **CRITICAL** | Remediated (`REVOKE ALL FROM anon` + RLS via `public.is_admin()`) |
| **SNFC-04** | Admin RLS Relied on `auth.role() = 'authenticated'` Without Explicit Admin Allowlist | **HIGH** | Remediated (`public.admin_users` + `public.is_admin()`) |
| **SNFC-05** | Missing Server-Side HTTP/HTTPS URL Validation in Baseline `confirm_qr_update` / `admin_*` RPCs | **HIGH** | Remediated (`public.is_safe_http_url`) |
| **SNFC-06** | Missing `SET search_path` on Baseline `SECURITY DEFINER` Functions | **MEDIUM** | Remediated across new/updated functions |
| **SNFC-07** | `request_qr_update` Returned `owner_email` to Unauthenticated Callers | **MEDIUM** | Remediated (removed from lookup response) |

---

## L. Potential Vulnerabilities / Hardening Notes

- **Live Supabase Database State:** Updating local `.sql` files does not automatically update the remote Supabase database until executed in the Supabase SQL Editor.
- **Supabase Public Signups:** If "Enable sign ups" is enabled in Supabase Auth → Providers → Email, disable public signups in the Supabase Dashboard as defense-in-depth alongside `public.is_admin()`.
- **Hardcoded Fallback Anon Key in `src/lib/supabase.ts`:** Anon keys are public by design in Supabase SPAs (security relies on RLS), but production builds should always inject credentials via `.env` and disable fallback/offline demo defaults (`isOfflineMode`) in production if not required.
- **Minimum Customer Password Length (4 chars):** Short passwords are easier to guess if rate-limit keys are bypassed or across many QRs; consider increasing minimum length to 6–8 characters for new activations.

---

## M. Evidence & Verification Reference

All findings above were verified directly in the repository files prior to remediation:
- `supabase_schema.sql` (original lines 812–842, 940–973)
- `SUPABASE_MIGRATION.sql` (lines 426–429)
- `src/lib/ecommerceDb.ts` (line 603 direct `support_tickets` query)
- `src/lib/supabase.ts` and `src/contexts/AuthContext.tsx`

---

## N. Business Impact

Without applying [ADMIN_RLS_SECURITY_HARDENING.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/ADMIN_RLS_SECURITY_HARDENING.sql), any party with the public Supabase `anon` key could:
- Read customer orders, support tickets, corporate leads, and `qr_codes` records (including `password_hash` and `owner_email`).
- Call `admin_reset_qr_password` or `admin_create_batch` directly via PostgREST RPC endpoints.
- Tamper with `products` catalog entries or mark unpaid `orders` as `paid`.

---

## O. Recommended Fixes & Retest Procedure

1. **Execute [MULTI_LINK_SYSTEM_MIGRATION.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/MULTI_LINK_SYSTEM_MIGRATION.sql) and [ADMIN_RLS_SECURITY_HARDENING.sql](file:///c:/Users/brije/Downloads/spreadhousemedia-main/spreadhousemedia-main/ADMIN_RLS_SECURITY_HARDENING.sql)** in **Supabase Dashboard → SQL Editor**.
2. **Verify `public.admin_users`** contains only authorized administrator `user_id` / `email` rows (`SELECT * FROM public.admin_users;`).
3. **Disable Public User Signups** in **Supabase Dashboard → Authentication → Sign In / Providers → Email** (unless required later).
4. **Retest Safely:**
   - Confirm unauthenticated (`anon`) requests to `/rest/v1/qr_codes`, `/rest/v1/batches`, `/rest/v1/orders`, `/rest/v1/support_tickets`, `/rest/v1/contact_inquiries`, and `/rest/v1/rpc/admin_reset_qr_password` return HTTP `401`/`403` or `{"ok": false, "error": "unauthorized"}`.
   - Confirm authenticated admin login at `/admin` can still list/edit/create QRs, orders, tickets, and products normally.

---

## P. Priority Remediation Roadmap

1. **Immediate (P0):** Run `ADMIN_RLS_SECURITY_HARDENING.sql` in Supabase SQL Editor and verify `public.admin_users` contents.
2. **Immediate (P0):** Disable public Auth signups in Supabase Dashboard.
3. **Short-Term (P1):** Deploy the updated frontend (`ecommerceDb.ts` using `track_support_ticket` + Multi-Link UI).
4. **Medium-Term (P2):** Raise customer QR password minimum length from 4 to 6–8 characters and restrict `VITE_ENABLE_OFFLINE_DEMO` to non-production builds.

---

## Q. Testing Limitations

- **No Active Exploitation Performed:** Per safety and ethical guidelines, no live penetration testing, injection, brute-force, or REST probing was executed against `https://spreadnfc.in/`.
- **No Live Admin/Customer Test Credentials Provided:** Findings are established from static inspection of the repository source code and SQL schema files rather than live HTTP traffic capture against production.

---

## R. Areas Not Tested

- Live production server configuration on `https://spreadnfc.in/` (Apache/Hostinger `.htaccess` enforcement, TLS/HSTS deployment, Supabase project Dashboard Auth settings, and live database state).
- Authenticated runtime browser testing against the production Supabase instance.

