-- ==============================================================================
-- SPREADNFC – STANDALONE ADMIN PANEL RLS & PRIVILEGE LOCKDOWN SCRIPT
-- Fixes the exact issue where a browser console script using the public `anon`
-- key can list all QR codes, read batches, or invoke admin RPCs.
--
-- SAFE TO RUN IMMEDIATELY on your live Supabase project (with or without
-- MULTI_LINK_SYSTEM_MIGRATION.sql applied yet).
-- Run in: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADMIN ALLOWLIST TABLE & CENTRALIZED CHECK
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Bootstrap: Automatically seed existing admin user(s) from auth.users ONLY if
-- admin_users is currently empty (prevents locking out your active admin).
-- Once seeded, any future random Supabase Auth signup will NOT be an admin.
INSERT INTO public.admin_users (user_id, email, role)
SELECT id, COALESCE(email, id::text || '@admin.local'), 'super_admin'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users)
  AND (
      email IN ('admin@spreadnfc.in', 'admin@etromo.in')
      OR (SELECT COUNT(*) FROM auth.users) <= 3
  )
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
    SELECT auth.role() = 'authenticated'
       AND (
           COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'super_admin')
           OR EXISTS (
               SELECT 1
               FROM public.admin_users a
               WHERE a.user_id = auth.uid()
                 AND a.is_active = true
           )
       );
$$;

REVOKE ALL ON public.admin_users FROM anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

DROP POLICY IF EXISTS "Admins Read Own Allowlist" ON public.admin_users;
CREATE POLICY "Admins Read Own Allowlist" ON public.admin_users
    FOR SELECT
    USING (public.is_admin());

-- ==============================================================================
-- 2. LOCK DOWN qr_codes, batches, AND qr_rate_limits (STOPS ANON CONSOLE SCRAPING)
-- ==============================================================================
-- Public QR scans (/q/:qrNumber) and customer updates (/update) go ONLY through
-- SECURITY DEFINER RPCs (get_qr_redirect, request_qr_update, verify_setup_code,
-- customer_claim_qr, confirm_qr_update, etc.) — they never need direct anon table SELECT.

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.qr_codes FROM anon, PUBLIC;
GRANT ALL ON public.qr_codes TO authenticated, service_role;

DROP POLICY IF EXISTS "Public QR Read" ON public.qr_codes;
DROP POLICY IF EXISTS "Public QR Insert/Update/Delete" ON public.qr_codes;
DROP POLICY IF EXISTS "Admin QR All" ON public.qr_codes;
CREATE POLICY "Admin QR All" ON public.qr_codes
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

REVOKE ALL ON public.batches FROM anon, PUBLIC;
GRANT ALL ON public.batches TO authenticated, service_role;

DROP POLICY IF EXISTS "Batches Read" ON public.batches;
DROP POLICY IF EXISTS "Batches All" ON public.batches;
CREATE POLICY "Batches All" ON public.batches
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DO $$
BEGIN
    IF to_regclass('public.qr_rate_limits') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.qr_rate_limits ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.qr_rate_limits FROM anon, authenticated, PUBLIC';
        EXECUTE 'GRANT ALL ON public.qr_rate_limits TO service_role';
    END IF;

    IF to_regclass('public.qr_customer_sessions') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.qr_customer_sessions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.qr_customer_sessions FROM anon, authenticated, PUBLIC';
        EXECUTE 'GRANT ALL ON public.qr_customer_sessions TO service_role';
    END IF;

    IF to_regclass('public.qr_profiles') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.qr_profiles ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.qr_profiles FROM anon, PUBLIC';
        EXECUTE 'GRANT ALL ON public.qr_profiles TO authenticated, service_role';
        EXECUTE 'DROP POLICY IF EXISTS "Public Published Profiles Read" ON public.qr_profiles';
        EXECUTE 'DROP POLICY IF EXISTS "Admin Profiles All" ON public.qr_profiles';
        EXECUTE 'CREATE POLICY "Admin Profiles All" ON public.qr_profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;

    IF to_regclass('public.qr_links') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.qr_links FROM anon, PUBLIC';
        EXECUTE 'GRANT ALL ON public.qr_links TO authenticated, service_role';
        EXECUTE 'DROP POLICY IF EXISTS "Public Active Links Read" ON public.qr_links';
        EXECUTE 'DROP POLICY IF EXISTS "Admin Links All" ON public.qr_links';
        EXECUTE 'CREATE POLICY "Admin Links All" ON public.qr_links FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;
END $$;

-- ==============================================================================
-- 3. LOCK DOWN E-COMMERCE & SUPPORT TABLES (IF PRESENT)
-- ==============================================================================
DO $$
BEGIN
    IF to_regclass('public.products') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.products FROM anon, PUBLIC';
        EXECUTE 'GRANT SELECT ON public.products TO anon';
        EXECUTE 'GRANT ALL ON public.products TO authenticated, service_role';
        EXECUTE 'DROP POLICY IF EXISTS "Public Products Read" ON public.products';
        EXECUTE 'CREATE POLICY "Public Products Read" ON public.products FOR SELECT USING (is_active = true OR public.is_admin())';
        EXECUTE 'DROP POLICY IF EXISTS "Admin Products All" ON public.products';
        EXECUTE 'CREATE POLICY "Admin Products All" ON public.products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;

    IF to_regclass('public.orders') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.orders FROM anon, PUBLIC';
        EXECUTE 'GRANT INSERT ON public.orders TO anon';
        EXECUTE 'GRANT ALL ON public.orders TO authenticated, service_role';
        EXECUTE 'DROP POLICY IF EXISTS "Public Orders Insert" ON public.orders';
        EXECUTE 'CREATE POLICY "Public Orders Insert" ON public.orders FOR INSERT WITH CHECK (payment_status = ''pending'' AND order_status = ''pending_verification'')';
        EXECUTE 'DROP POLICY IF EXISTS "Public Orders Read" ON public.orders';
        EXECUTE 'DROP POLICY IF EXISTS "Admin Orders All" ON public.orders';
        EXECUTE 'CREATE POLICY "Admin Orders All" ON public.orders FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;

    IF to_regclass('public.support_tickets') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.support_tickets FROM anon, PUBLIC';
        EXECUTE 'GRANT INSERT ON public.support_tickets TO anon';
        EXECUTE 'GRANT ALL ON public.support_tickets TO authenticated, service_role';
        EXECUTE 'DROP POLICY IF EXISTS "Public Support Tickets Insert" ON public.support_tickets';
        EXECUTE 'CREATE POLICY "Public Support Tickets Insert" ON public.support_tickets FOR INSERT WITH CHECK (status = ''open'')';
        EXECUTE 'DROP POLICY IF EXISTS "Public Support Tickets Read" ON public.support_tickets';
        EXECUTE 'DROP POLICY IF EXISTS "Admin Support Tickets All" ON public.support_tickets';
        EXECUTE 'CREATE POLICY "Admin Support Tickets All" ON public.support_tickets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;

    IF to_regclass('public.contact_inquiries') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY';
        EXECUTE 'REVOKE ALL ON public.contact_inquiries FROM anon, PUBLIC';
        EXECUTE 'GRANT INSERT ON public.contact_inquiries TO anon';
        EXECUTE 'GRANT ALL ON public.contact_inquiries TO authenticated, service_role';
        EXECUTE 'DROP POLICY IF EXISTS "Public Inquiries Insert" ON public.contact_inquiries';
        EXECUTE 'CREATE POLICY "Public Inquiries Insert" ON public.contact_inquiries FOR INSERT WITH CHECK (status = ''new'')';
        EXECUTE 'DROP POLICY IF EXISTS "Admin Inquiries All" ON public.contact_inquiries';
        EXECUTE 'CREATE POLICY "Admin Inquiries All" ON public.contact_inquiries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.track_support_ticket(
    p_ticket_number TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    IF to_regclass('public.support_tickets') IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF p_ticket_number IS NULL OR p_email IS NULL OR length(trim(p_email)) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_lookup');
    END IF;

    SELECT
        id, ticket_number, customer_name, customer_email, customer_phone,
        category, associated_qr_number, associated_order_number,
        subject, description, status, priority, resolution_notes,
        created_at, updated_at
    INTO v_ticket
    FROM public.support_tickets
    WHERE UPPER(TRIM(ticket_number)) = UPPER(TRIM(p_ticket_number))
      AND LOWER(TRIM(customer_email)) = LOWER(TRIM(p_email))
    LIMIT 1;

    IF v_ticket IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    RETURN jsonb_build_object('ok', true, 'ticket', to_jsonb(v_ticket));
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_support_ticket(TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 4. HARDEN ALL EXISTING ADMIN RPCs (REQUIRE public.is_admin() + REVOKE ANON)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_single_qr(
    p_qr_number TEXT,
    p_qr_name TEXT,
    p_destination_url TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
    v_pass_hash TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    v_norm_qr := UPPER(TRIM(p_qr_number));
    IF v_norm_qr IS NULL OR length(v_norm_qr) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_qr_number');
    END IF;

    IF p_password IS NULL OR length(p_password) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
    END IF;

    IF EXISTS (SELECT 1 FROM public.qr_codes WHERE qr_number = v_norm_qr) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicate_qr_number');
    END IF;

    v_pass_hash := crypt(p_password, gen_salt('bf', 8));

    INSERT INTO public.qr_codes (qr_number, qr_name, destination_url, password_hash, status)
    VALUES (
        v_norm_qr,
        TRIM(p_qr_name),
        NULLIF(TRIM(p_destination_url), ''),
        v_pass_hash,
        COALESCE(p_status, 'active')
    );

    RETURN jsonb_build_object('ok', true, 'qr_number', v_norm_qr);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_batch(
    p_batch_name TEXT,
    p_series_prefix TEXT,
    p_start_number TEXT,
    p_end_number TEXT,
    p_password_mode TEXT DEFAULT 'common',
    p_common_password TEXT DEFAULT NULL,
    p_default_url TEXT DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_start INT;
    v_end INT;
    v_pad_len INT;
    v_total INT;
    v_prefix TEXT;
    v_first TEXT;
    v_last TEXT;
    v_conflicts TEXT[];
    v_batch_id UUID;
    v_common_hash TEXT;
    v_passwords JSONB := '[]'::jsonb;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    v_start := p_start_number::INT;
    v_end := p_end_number::INT;
    v_pad_len := length(p_start_number);
    v_total := (v_end - v_start) + 1;
    v_prefix := UPPER(TRIM(p_series_prefix));

    IF v_total <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'start_after_end');
    END IF;

    IF v_total > 5000 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'range_too_large');
    END IF;

    v_first := v_prefix || lpad(v_start::TEXT, v_pad_len, '0');
    v_last := v_prefix || lpad(v_end::TEXT, v_pad_len, '0');

    SELECT array_agg(q.qr_number)
    INTO v_conflicts
    FROM (
        SELECT v_prefix || lpad(s::TEXT, v_pad_len, '0') AS qr_num
        FROM generate_series(v_start, v_end) s
    ) gen
    JOIN public.qr_codes q ON q.qr_number = gen.qr_num;

    IF v_conflicts IS NOT NULL AND array_length(v_conflicts, 1) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicates', 'conflicts', to_jsonb(v_conflicts));
    END IF;

    IF p_dry_run THEN
        RETURN jsonb_build_object('ok', true, 'total', v_total, 'first', v_first, 'last', v_last);
    END IF;

    INSERT INTO public.batches (batch_name, series_prefix, start_number, end_number, total_qr_codes)
    VALUES (TRIM(p_batch_name), v_prefix, p_start_number, p_end_number, v_total)
    RETURNING id INTO v_batch_id;

    IF p_password_mode = 'common' THEN
        IF p_common_password IS NULL OR length(p_common_password) < 4 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
        END IF;
        v_common_hash := crypt(p_common_password, gen_salt('bf', 8));

        INSERT INTO public.qr_codes (qr_number, qr_name, destination_url, status, batch_id, password_hash)
        SELECT
            v_prefix || lpad(s::TEXT, v_pad_len, '0'),
            TRIM(p_batch_name) || ' #' || s::TEXT,
            NULLIF(TRIM(p_default_url), ''),
            'active',
            v_batch_id,
            v_common_hash
        FROM generate_series(v_start, v_end) s;

        RETURN jsonb_build_object('ok', true, 'batch_id', v_batch_id, 'total', v_total, 'password_mode', 'common');
    ELSE
        WITH generated_rows AS (
            SELECT
                v_prefix || lpad(s::TEXT, v_pad_len, '0') AS num,
                TRIM(p_batch_name) || ' #' || s::TEXT AS name,
                UPPER(substr(md5(random()::text || s::text), 1, 6)) AS plain_pwd
            FROM generate_series(v_start, v_end) s
        ),
        inserted_rows AS (
            INSERT INTO public.qr_codes (qr_number, qr_name, destination_url, status, batch_id, password_hash)
            SELECT num, name, NULLIF(TRIM(p_default_url), ''), 'active', v_batch_id, crypt(plain_pwd, gen_salt('bf', 8))
            FROM generated_rows
            RETURNING qr_number
        )
        SELECT jsonb_agg(jsonb_build_object('qr_number', num, 'password', plain_pwd))
        INTO v_passwords
        FROM generated_rows;

        RETURN jsonb_build_object('ok', true, 'batch_id', v_batch_id, 'total', v_total, 'password_mode', 'unique', 'passwords', v_passwords);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_process_qr_csv(
    p_rows JSONB,
    p_dry_run BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_row JSONB;
    v_qr_num TEXT;
    v_qr_name TEXT;
    v_url TEXT;
    v_pwd TEXT;
    v_errors JSONB := '[]'::jsonb;
    v_valid_count INT := 0;
    v_created_count INT := 0;
    v_idx INT := 0;
    v_seen_in_file TEXT[] := '{}';
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_idx := v_idx + 1;
        v_qr_num := UPPER(TRIM(COALESCE(v_row->>'qr_number', '')));
        v_qr_name := TRIM(COALESCE(v_row->>'qr_name', ''));
        v_url := NULLIF(TRIM(COALESCE(v_row->>'destination_url', '')), '');
        v_pwd := COALESCE(v_row->>'password', '');

        IF v_qr_num = '' THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'error', 'missing_qr_number');
            CONTINUE;
        END IF;

        IF v_qr_num = ANY(v_seen_in_file) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'qr_number', v_qr_num, 'error', 'duplicate_in_file');
            CONTINUE;
        END IF;

        v_seen_in_file := array_append(v_seen_in_file, v_qr_num);

        IF EXISTS (SELECT 1 FROM public.qr_codes WHERE qr_number = v_qr_num) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'qr_number', v_qr_num, 'error', 'already_exists');
            CONTINUE;
        END IF;

        IF length(v_pwd) < 4 THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'qr_number', v_qr_num, 'error', 'invalid_password');
            CONTINUE;
        END IF;

        v_valid_count := v_valid_count + 1;

        IF NOT p_dry_run THEN
            INSERT INTO public.qr_codes (qr_number, qr_name, destination_url, password_hash, status)
            VALUES (
                v_qr_num,
                CASE WHEN v_qr_name = '' THEN v_qr_num ELSE v_qr_name END,
                v_url,
                crypt(v_pwd, gen_salt('bf', 8)),
                'active'
            );
            v_created_count := v_created_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'ok', true,
        'total', v_idx,
        'valid_count', v_valid_count,
        'error_count', jsonb_array_length(v_errors),
        'errors', v_errors,
        'created', v_created_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_qr_password(
    p_qr_id UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
    END IF;

    UPDATE public.qr_codes
    SET password_hash = crypt(p_new_password, gen_salt('bf', 8)),
        updated_at = now()
    WHERE id = p_qr_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_qr_unclaimed(
    p_qr_id UUID,
    p_new_setup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_new_setup_code IS NULL OR length(p_new_setup_code) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
    END IF;

    UPDATE public.qr_codes
    SET password_hash = crypt(TRIM(p_new_setup_code), gen_salt('bf', 8)),
        password_changed = false,
        claimed_at = NULL,
        owner_email = NULL,
        updated_at = now()
    WHERE id = p_qr_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Revoke anon EXECUTE on ALL admin RPCs
REVOKE EXECUTE ON FUNCTION public.admin_create_single_qr(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_single_qr(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_create_batch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_batch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_process_qr_csv(JSONB, BOOLEAN) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_process_qr_csv(JSONB, BOOLEAN) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_reset_qr_password(UUID, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_qr_password(UUID, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_reset_qr_unclaimed(UUID, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_qr_unclaimed(UUID, TEXT) TO authenticated, service_role;

DO $$
BEGIN
    IF to_regprocedure('public.admin_set_qr_usage_type(uuid,text)') IS NOT NULL THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_set_qr_usage_type(UUID, TEXT) FROM anon, PUBLIC';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_set_qr_usage_type(UUID, TEXT) TO authenticated, service_role';
    END IF;
END $$;

-- ==============================================================================
-- 5. HARDEN confirm_qr_update & ADD TAMPER-RESISTANT AUDIT LOGGING
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_safe_http_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    IF p_url IS NULL THEN
        RETURN false;
    END IF;
    v_clean := trim(p_url);
    IF length(v_clean) < 10 OR length(v_clean) > 2048 THEN
        RETURN false;
    END IF;
    IF v_clean ~* '^\s*(javascript|data|file|vbscript|about|blob):' THEN
        RETURN false;
    END IF;
    RETURN v_clean ~* '^https?://[^\s/$.?#][^\s]*\.[^\s]+$';
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_qr_update(
    p_qr_number TEXT,
    p_new_url TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
    v_hash TEXT;
    v_usage TEXT;
    v_rate_key TEXT;
    v_allowed BOOLEAN;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));
    v_rate_key := 'update_' || v_norm_qr;

    v_allowed := public.check_and_record_rate_limit(v_rate_key, 5, 300, 300);
    IF NOT v_allowed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
    END IF;

    IF NOT public.is_safe_http_url(p_new_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
    END IF;

    SELECT password_hash, usage_type INTO v_hash, v_usage
    FROM public.qr_codes
    WHERE qr_number = v_norm_qr AND status = 'active'
    FOR UPDATE;

    IF v_hash IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_usage = 'personal' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'mode_mismatch');
    END IF;

    IF v_hash != crypt(p_password, v_hash) THEN
        PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
        RETURN jsonb_build_object('ok', false, 'error', 'wrong_password');
    END IF;

    PERFORM public.clear_rate_limit(v_rate_key);

    UPDATE public.qr_codes
    SET destination_url = TRIM(p_new_url),
        usage_type = COALESCE(usage_type, 'business'),
        updated_at = now()
    WHERE qr_number = v_norm_qr;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Append-only audit table for sensitive QR & profile mutations
CREATE TABLE IF NOT EXISTS public.qr_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    qr_number TEXT,
    action TEXT NOT NULL,
    actor_role TEXT,
    actor_uid UUID,
    changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_audit_logs_created
    ON public.qr_audit_logs (created_at DESC);

ALTER TABLE public.qr_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qr_audit_logs FROM anon, PUBLIC;
GRANT SELECT ON public.qr_audit_logs TO authenticated;
GRANT ALL ON public.qr_audit_logs TO service_role;

DROP POLICY IF EXISTS "Admin Audit Logs Read" ON public.qr_audit_logs;
CREATE POLICY "Admin Audit Logs Read" ON public.qr_audit_logs
    FOR SELECT
    USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.log_qr_code_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.destination_url IS DISTINCT FROM NEW.destination_url THEN
            v_changes := v_changes || jsonb_build_object('destination_url', jsonb_build_object('old', OLD.destination_url, 'new', NEW.destination_url));
        END IF;
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.usage_type IS DISTINCT FROM NEW.usage_type THEN
            v_changes := v_changes || jsonb_build_object('usage_type', jsonb_build_object('old', OLD.usage_type, 'new', NEW.usage_type));
        END IF;
        IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
            v_changes := v_changes || jsonb_build_object('password_changed', true);
        END IF;
        IF v_changes = '{}'::jsonb THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_changes := jsonb_build_object('deleted_qr_number', OLD.qr_number);
    ELSE
        v_changes := jsonb_build_object('created_qr_number', NEW.qr_number);
    END IF;

    INSERT INTO public.qr_audit_logs (
        table_name, record_id, qr_number, action, actor_role, actor_uid, changed_fields
    ) VALUES (
        'qr_codes',
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.qr_number, OLD.qr_number),
        TG_OP,
        auth.role(),
        auth.uid(),
        v_changes
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_qr_codes ON public.qr_codes;
CREATE TRIGGER trg_audit_qr_codes
    AFTER INSERT OR UPDATE OR DELETE ON public.qr_codes
    FOR EACH ROW EXECUTE FUNCTION public.log_qr_code_changes();
