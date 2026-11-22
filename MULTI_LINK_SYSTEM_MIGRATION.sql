-- ==============================================================================
-- SPREADNFC – MULTI-LINK QR & DIGITAL PROFILE SYSTEM
-- Phase 1: Backward-Compatible Database Migration
-- Safe & Idempotent: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- 1. EXTEND qr_codes TABLE (Backward-Compatible, No Columns Dropped)
-- ==============================================================================
ALTER TABLE public.qr_codes
    ADD COLUMN IF NOT EXISTS usage_type TEXT CHECK (usage_type IN ('personal', 'business')) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS business_purpose TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_usage_type
    ON public.qr_codes (usage_type);

-- Safe Backfill: Classify all existing QR records that already have a destination_url
-- as 'business' so existing physical QR codes keep redirecting seamlessly without re-setup.
UPDATE public.qr_codes
SET usage_type = 'business'
WHERE usage_type IS NULL
  AND destination_url IS NOT NULL
  AND length(trim(destination_url)) > 0;

-- Refresh covering index to include usage_type for ultra-fast scan resolution
DROP INDEX IF EXISTS idx_qr_codes_scan_covering;
CREATE INDEX IF NOT EXISTS idx_qr_codes_scan_covering
    ON public.qr_codes (qr_number, status)
    INCLUDE (destination_url, password_changed, usage_type);

-- ==============================================================================
-- 2. CREATE qr_profiles TABLE (1-to-1 with Personal/Dual-Mode QR)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.qr_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL UNIQUE REFERENCES public.qr_codes(id) ON DELETE CASCADE,
    profile_name TEXT NOT NULL DEFAULT '',
    profile_image TEXT DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    contact_email TEXT DEFAULT NULL,
    contact_phone TEXT DEFAULT NULL,
    public_slug TEXT DEFAULT NULL,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_profiles_qr_code_id
    ON public.qr_profiles (qr_code_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_profiles_public_slug_lower
    ON public.qr_profiles (LOWER(public_slug))
    WHERE public_slug IS NOT NULL AND length(trim(public_slug)) > 0;

-- ==============================================================================
-- 3. CREATE qr_links TABLE (Unlimited Social & Custom Links per Profile)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.qr_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_profile_id UUID NOT NULL REFERENCES public.qr_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    link_title TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    icon TEXT DEFAULT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_links_profile_order
    ON public.qr_links (qr_profile_id, display_order, created_at);

CREATE INDEX IF NOT EXISTS idx_qr_links_profile_active
    ON public.qr_links (qr_profile_id, is_active)
    WHERE is_active = true;

-- ==============================================================================
-- 4. CREATE qr_customer_sessions TABLE (Scoped Short-Lived Customer Auth Tokens)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.qr_customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_customer_sessions_qr_id
    ON public.qr_customer_sessions (qr_code_id);

CREATE INDEX IF NOT EXISTS idx_qr_customer_sessions_expires
    ON public.qr_customer_sessions (expires_at);

-- ==============================================================================
-- 4A. ADMIN ALLOWLIST & HELPER (Prevents non-admin authenticated signups)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

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
               SELECT 1 FROM public.admin_users a
               WHERE a.user_id = auth.uid() AND a.is_active = true
           )
       );
$$;

-- ==============================================================================
-- 5. VALIDATION & SESSION HELPERS
-- ==============================================================================

-- Server-side HTTP/HTTPS URL validation (blocks javascript:, data:, file:, vbscript:, etc.)
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

-- Server-side custom username/slug validation
CREATE OR REPLACE FUNCTION public.is_valid_public_slug(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_reserved TEXT[] := ARRAY[
        'admin', 'login', 'logout', 'update', 'products', 'support', 'contact',
        'q', 'p', 'api', 'auth', 'assets', 'static', 'public', 'spreadnfc',
        'tapflow', 'help', 'privacy', 'terms', 'dashboard', 'settings', 'profile'
    ];
BEGIN
    IF p_slug IS NULL THEN
        RETURN true; -- Optional slug
    END IF;
    v_clean := lower(trim(p_slug));
    IF length(v_clean) = 0 THEN
        RETURN true;
    END IF;
    IF v_clean = ANY(v_reserved) THEN
        RETURN false;
    END IF;
    RETURN v_clean ~ '^[a-z0-9][a-z0-9_-]{2,39}$';
END;
$$;

-- Server-side profile image validation (HTTPS URL or safe compressed raster data URL)
CREATE OR REPLACE FUNCTION public.is_safe_profile_image(p_image TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    IF p_image IS NULL OR length(trim(p_image)) = 0 THEN
        RETURN true;
    END IF;
    v_clean := trim(p_image);
    IF length(v_clean) > 350000 THEN
        RETURN false; -- Cap inline image payload size
    END IF;
    IF v_clean ~* '^https://[^\s]+$' THEN
        RETURN true;
    END IF;
    IF v_clean ~* '^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$' THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

-- Issue a 4-hour scoped customer session token for a verified QR code
CREATE OR REPLACE FUNCTION public.issue_customer_session(p_qr_code_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_raw_token TEXT;
    v_hash TEXT;
BEGIN
    -- Prune expired sessions opportunistically
    DELETE FROM public.qr_customer_sessions
    WHERE expires_at < now()
       OR (qr_code_id = p_qr_code_id AND created_at < now() - interval '12 hours');

    v_raw_token := encode(gen_random_bytes(32), 'hex');
    v_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

    INSERT INTO public.qr_customer_sessions (qr_code_id, token_hash, expires_at)
    VALUES (p_qr_code_id, v_hash, now() + interval '4 hours');

    RETURN v_raw_token;
END;
$$;

-- Validate customer session token -> returns qr_code_id or NULL
CREATE OR REPLACE FUNCTION public.verify_customer_session(p_session_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_hash TEXT;
    v_qr_id UUID;
BEGIN
    IF p_session_token IS NULL OR length(trim(p_session_token)) < 32 THEN
        RETURN NULL;
    END IF;

    v_hash := encode(digest(trim(p_session_token), 'sha256'), 'hex');

    SELECT s.qr_code_id
    INTO v_qr_id
    FROM public.qr_customer_sessions s
    JOIN public.qr_codes q ON q.id = s.qr_code_id
    WHERE s.token_hash = v_hash
      AND s.expires_at > now()
      AND q.status = 'active';

    RETURN v_qr_id;
END;
$$;

-- ==============================================================================
-- 6. HARDENED ADMIN RPCs (Require auth.role() = 'authenticated' + safe search_path)
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
    v_clean_url TEXT;
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

    v_clean_url := NULLIF(TRIM(p_destination_url), '');
    IF v_clean_url IS NOT NULL AND NOT public.is_safe_http_url(v_clean_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
    END IF;

    IF EXISTS (SELECT 1 FROM public.qr_codes WHERE qr_number = v_norm_qr) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicate_qr_number');
    END IF;

    v_pass_hash := crypt(p_password, gen_salt('bf', 8));

    INSERT INTO public.qr_codes (
        qr_number,
        qr_name,
        destination_url,
        usage_type,
        password_hash,
        status
    ) VALUES (
        v_norm_qr,
        TRIM(p_qr_name),
        v_clean_url,
        CASE WHEN v_clean_url IS NOT NULL THEN 'business' ELSE NULL END,
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
    v_clean_url TEXT;
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
    v_clean_url := NULLIF(TRIM(p_default_url), '');

    IF v_clean_url IS NOT NULL AND NOT public.is_safe_http_url(v_clean_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_default_url');
    END IF;

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

    INSERT INTO public.batches (
        batch_name, series_prefix, start_number, end_number, total_qr_codes
    ) VALUES (
        TRIM(p_batch_name), v_prefix, p_start_number, p_end_number, v_total
    ) RETURNING id INTO v_batch_id;

    IF p_password_mode = 'common' THEN
        IF p_common_password IS NULL OR length(p_common_password) < 4 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
        END IF;
        v_common_hash := crypt(p_common_password, gen_salt('bf', 8));

        INSERT INTO public.qr_codes (
            qr_number, qr_name, destination_url, usage_type, status, batch_id, password_hash
        )
        SELECT
            v_prefix || lpad(s::TEXT, v_pad_len, '0'),
            TRIM(p_batch_name) || ' #' || s::TEXT,
            v_clean_url,
            CASE WHEN v_clean_url IS NOT NULL THEN 'business' ELSE NULL END,
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
            INSERT INTO public.qr_codes (
                qr_number, qr_name, destination_url, usage_type, status, batch_id, password_hash
            )
            SELECT
                num, name, v_clean_url,
                CASE WHEN v_clean_url IS NOT NULL THEN 'business' ELSE NULL END,
                'active', v_batch_id, crypt(plain_pwd, gen_salt('bf', 8))
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

        IF v_url IS NOT NULL AND NOT public.is_safe_http_url(v_url) THEN
            v_errors := v_errors || jsonb_build_object('row', v_idx, 'qr_number', v_qr_num, 'error', 'invalid_url');
            CONTINUE;
        END IF;

        v_valid_count := v_valid_count + 1;

        IF NOT p_dry_run THEN
            INSERT INTO public.qr_codes (
                qr_number, qr_name, destination_url, usage_type, password_hash, status
            ) VALUES (
                v_qr_num,
                CASE WHEN v_qr_name = '' THEN v_qr_num ELSE v_qr_name END,
                v_url,
                CASE WHEN v_url IS NOT NULL THEN 'business' ELSE NULL END,
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

    DELETE FROM public.qr_customer_sessions WHERE qr_code_id = p_qr_id;

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

    DELETE FROM public.qr_customer_sessions WHERE qr_code_id = p_qr_id;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Admin: Change or reset QR usage mode (preserves profile & business data)
CREATE OR REPLACE FUNCTION public.admin_set_qr_usage_type(
    p_qr_id UUID,
    p_usage_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_qr RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_usage_type IS NOT NULL AND p_usage_type NOT IN ('personal', 'business') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_usage_type');
    END IF;

    SELECT id, qr_number, qr_name INTO v_qr FROM public.qr_codes WHERE id = p_qr_id;
    IF v_qr IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    UPDATE public.qr_codes
    SET usage_type = p_usage_type,
        updated_at = now()
    WHERE id = p_qr_id;

    -- Ensure a profile skeleton exists if switched to personal
    IF p_usage_type = 'personal' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_name)
        VALUES (p_qr_id, COALESCE(NULLIF(v_qr.qr_name, ''), v_qr.qr_number))
        ON CONFLICT (qr_code_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('ok', true, 'qr_number', v_qr.qr_number, 'usage_type', p_usage_type);
END;
$$;

-- ==============================================================================
-- 7. PUBLIC SCAN & CUSTOMER LIFECYCLE RPCs
-- ==============================================================================

-- Updated get_qr_redirect: backward-compatible + mode-aware
DROP FUNCTION IF EXISTS public.get_qr_redirect(TEXT);
CREATE OR REPLACE FUNCTION public.get_qr_redirect(
    p_qr_number TEXT
)
RETURNS TABLE (
    status TEXT,
    destination_url TEXT,
    is_claimed BOOLEAN,
    usage_type TEXT,
    public_slug TEXT,
    is_published BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));

    UPDATE public.qr_codes
    SET scan_count = scan_count + 1
    WHERE qr_number = v_norm_qr;

    RETURN QUERY
    SELECT
        q.status,
        q.destination_url,
        (
            q.password_changed
            OR (q.destination_url IS NOT NULL AND length(trim(q.destination_url)) > 0)
            OR q.usage_type IS NOT NULL
        ) AS is_claimed,
        q.usage_type,
        p.public_slug,
        COALESCE(p.is_published, false) AS is_published
    FROM public.qr_codes q
    LEFT JOIN public.qr_profiles p ON p.qr_code_id = q.id
    WHERE q.qr_number = v_norm_qr;
END;
$$;

-- Updated request_qr_update: preserves existing response shape + adds mode/profile metadata
DROP FUNCTION IF EXISTS public.request_qr_update(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.request_qr_update(TEXT);
CREATE OR REPLACE FUNCTION public.request_qr_update(
    p_qr_number TEXT,
    p_new_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
    v_rec RECORD;
    v_slug TEXT;
    v_is_claimed BOOLEAN;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));

    SELECT
        q.id, q.status, q.password_changed, q.destination_url,
        COALESCE(q.requires_setup_code, true) AS requires_setup_code,
        q.usage_type, q.business_name, q.business_purpose
    INTO v_rec
    FROM public.qr_codes q
    WHERE q.qr_number = v_norm_qr;

    IF v_rec IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_rec.status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    SELECT public_slug INTO v_slug
    FROM public.qr_profiles
    WHERE qr_code_id = v_rec.id;

    -- Claimed if customer set their personal password OR legacy card already has destination URL + password_changed
    v_is_claimed := COALESCE(v_rec.password_changed, false);

    RETURN jsonb_build_object(
        'ok', true,
        'is_claimed', v_is_claimed,
        'destination_url', v_rec.destination_url,
        'qr_number', v_norm_qr,
        'requires_setup_code', v_rec.requires_setup_code,
        'usage_type', v_rec.usage_type,
        'business_name', v_rec.business_name,
        'business_purpose', v_rec.business_purpose,
        'public_slug', v_slug
    );
END;
$$;

-- Verify packaging setup code (Scenario C Step 1)
CREATE OR REPLACE FUNCTION public.verify_setup_code(
    p_qr_number TEXT,
    p_setup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
    v_hash TEXT;
    v_is_claimed BOOLEAN;
    v_status TEXT;
    v_req_setup BOOLEAN;
    v_rate_key TEXT;
    v_allowed BOOLEAN;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));
    v_rate_key := 'setup_verify_' || v_norm_qr;

    v_allowed := public.check_and_record_rate_limit(v_rate_key, 5, 300, 300);
    IF NOT v_allowed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
    END IF;

    SELECT password_hash, password_changed, status, COALESCE(requires_setup_code, true)
    INTO v_hash, v_is_claimed, v_status, v_req_setup
    FROM public.qr_codes
    WHERE qr_number = v_norm_qr;

    IF v_hash IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    IF v_is_claimed IS TRUE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
    END IF;

    IF v_req_setup IS FALSE THEN
        RETURN jsonb_build_object('ok', true, 'requires_setup_code', false);
    END IF;

    IF v_hash != crypt(TRIM(p_setup_code), v_hash) AND v_hash != crypt(UPPER(TRIM(p_setup_code)), v_hash) THEN
        PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
        RETURN jsonb_build_object('ok', false, 'error', 'wrong_setup_code');
    END IF;

    PERFORM public.clear_rate_limit(v_rate_key);
    RETURN jsonb_build_object('ok', true, 'requires_setup_code', true);
END;
$$;

-- Atomic Claim & Password Creation -> issues customer session_token
DROP FUNCTION IF EXISTS public.customer_claim_qr(TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.customer_claim_qr(
    p_qr_number TEXT,
    p_setup_code TEXT DEFAULT NULL,
    p_new_password TEXT DEFAULT NULL,
    p_destination_url TEXT DEFAULT NULL,
    p_owner_email TEXT DEFAULT NULL,
    p_usage_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
    v_qr_id UUID;
    v_hash TEXT;
    v_is_claimed BOOLEAN;
    v_status TEXT;
    v_req_setup BOOLEAN;
    v_existing_usage TEXT;
    v_existing_dest TEXT;
    v_clean_url TEXT;
    v_final_usage TEXT;
    v_rate_key TEXT;
    v_allowed BOOLEAN;
    v_session_token TEXT;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));
    v_rate_key := 'claim_' || v_norm_qr;

    v_allowed := public.check_and_record_rate_limit(v_rate_key, 5, 300, 300);
    IF NOT v_allowed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
    END IF;

    SELECT id, password_hash, password_changed, status, COALESCE(requires_setup_code, true), usage_type, destination_url
    INTO v_qr_id, v_hash, v_is_claimed, v_status, v_req_setup, v_existing_usage, v_existing_dest
    FROM public.qr_codes
    WHERE qr_number = v_norm_qr
    FOR UPDATE;

    IF v_hash IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    IF v_is_claimed IS TRUE THEN
        RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
    END IF;

    IF v_req_setup IS TRUE THEN
        IF p_setup_code IS NULL OR length(trim(p_setup_code)) = 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'missing_setup_code');
        END IF;

        IF v_hash != crypt(TRIM(p_setup_code), v_hash) AND v_hash != crypt(UPPER(TRIM(p_setup_code)), v_hash) THEN
            PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
            RETURN jsonb_build_object('ok', false, 'error', 'wrong_setup_code');
        END IF;
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
    END IF;

    v_clean_url := NULLIF(TRIM(p_destination_url), '');
    IF v_clean_url IS NOT NULL AND NOT public.is_safe_http_url(v_clean_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
    END IF;

    IF p_usage_type IS NOT NULL AND p_usage_type NOT IN ('personal', 'business') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_usage_type');
    END IF;

    v_final_usage := COALESCE(p_usage_type, v_existing_usage);
    IF v_final_usage IS NULL AND v_clean_url IS NOT NULL THEN
        v_final_usage := 'business';
    END IF;

    PERFORM public.clear_rate_limit(v_rate_key);

    UPDATE public.qr_codes
    SET password_hash = crypt(p_new_password, gen_salt('bf', 8)),
        password_changed = true,
        claimed_at = now(),
        destination_url = COALESCE(v_clean_url, destination_url),
        usage_type = v_final_usage,
        owner_email = NULLIF(TRIM(p_owner_email), ''),
        updated_at = now()
    WHERE id = v_qr_id;

    IF v_final_usage = 'personal' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_name)
        VALUES (v_qr_id, '')
        ON CONFLICT (qr_code_id) DO NOTHING;
    END IF;

    v_session_token := public.issue_customer_session(v_qr_id);

    RETURN jsonb_build_object(
        'ok', true,
        'qr_number', v_norm_qr,
        'usage_type', v_final_usage,
        'session_token', v_session_token
    );
END;
$$;

-- Customer Login for Already-Claimed QR (issues session_token & returns dashboard state)
CREATE OR REPLACE FUNCTION public.customer_login_qr(
    p_qr_number TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_norm_qr TEXT;
    v_rec RECORD;
    v_rate_key TEXT;
    v_allowed BOOLEAN;
    v_session_token TEXT;
    v_effective_usage TEXT;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));
    v_rate_key := 'login_' || v_norm_qr;

    v_allowed := public.check_and_record_rate_limit(v_rate_key, 5, 300, 300);
    IF NOT v_allowed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
    END IF;

    SELECT id, qr_number, qr_name, status, password_hash, password_changed, usage_type, destination_url, business_name, business_purpose
    INTO v_rec
    FROM public.qr_codes
    WHERE qr_number = v_norm_qr;

    IF v_rec IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_rec.status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    IF v_rec.password_hash != crypt(p_password, v_rec.password_hash) THEN
        PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
        RETURN jsonb_build_object('ok', false, 'error', 'wrong_password');
    END IF;

    PERFORM public.clear_rate_limit(v_rate_key);

    -- Preserve legacy business behavior if usage_type was null on a pre-existing linked QR
    v_effective_usage := v_rec.usage_type;
    IF v_effective_usage IS NULL AND v_rec.destination_url IS NOT NULL AND length(trim(v_rec.destination_url)) > 0 THEN
        v_effective_usage := 'business';
        UPDATE public.qr_codes SET usage_type = 'business', updated_at = now() WHERE id = v_rec.id;
    END IF;

    v_session_token := public.issue_customer_session(v_rec.id);

    RETURN jsonb_build_object(
        'ok', true,
        'session_token', v_session_token,
        'qr_number', v_rec.qr_number,
        'usage_type', v_effective_usage
    );
END;
$$;

-- Fetch full authenticated customer dashboard state
CREATE OR REPLACE FUNCTION public.customer_get_dashboard(
    p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qr_id UUID;
    v_qr RECORD;
    v_profile RECORD;
    v_links JSONB;
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT id, qr_number, qr_name, status, usage_type, destination_url, business_name, business_purpose, scan_count, updated_at
    INTO v_qr
    FROM public.qr_codes
    WHERE id = v_qr_id;

    IF v_qr IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    SELECT * INTO v_profile FROM public.qr_profiles WHERE qr_code_id = v_qr_id;

    IF v_profile IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', l.id,
                'qr_profile_id', l.qr_profile_id,
                'platform', l.platform,
                'link_title', l.link_title,
                'destination_url', l.destination_url,
                'icon', l.icon,
                'display_order', l.display_order,
                'is_active', l.is_active,
                'created_at', l.created_at,
                'updated_at', l.updated_at
            ) ORDER BY l.display_order ASC, l.created_at ASC
        ), '[]'::jsonb)
        INTO v_links
        FROM public.qr_links l
        WHERE l.qr_profile_id = v_profile.id;
    ELSE
        v_links := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'qr', jsonb_build_object(
            'qr_number', v_qr.qr_number,
            'qr_name', v_qr.qr_name,
            'status', v_qr.status,
            'usage_type', v_qr.usage_type,
            'destination_url', v_qr.destination_url,
            'business_name', v_qr.business_name,
            'business_purpose', v_qr.business_purpose,
            'scan_count', v_qr.scan_count,
            'updated_at', v_qr.updated_at
        ),
        'profile', CASE WHEN v_profile IS NOT NULL THEN jsonb_build_object(
            'id', v_profile.id,
            'qr_code_id', v_profile.qr_code_id,
            'profile_name', v_profile.profile_name,
            'profile_image', v_profile.profile_image,
            'bio', v_profile.bio,
            'contact_email', v_profile.contact_email,
            'contact_phone', v_profile.contact_phone,
            'public_slug', v_profile.public_slug,
            'theme', v_profile.theme,
            'is_published', v_profile.is_published,
            'created_at', v_profile.created_at,
            'updated_at', v_profile.updated_at
        ) ELSE NULL END,
        'links', v_links
    );
END;
$$;

-- Phase 2: Customer selects usage mode (LOCKED once chosen; only Admin can change afterwards)
CREATE OR REPLACE FUNCTION public.customer_select_usage_mode(
    p_session_token TEXT,
    p_usage_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qr_id UUID;
    v_current_usage TEXT;
    v_qr_number TEXT;
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_usage_type NOT IN ('personal', 'business') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_usage_type');
    END IF;

    SELECT usage_type, qr_number INTO v_current_usage, v_qr_number
    FROM public.qr_codes
    WHERE id = v_qr_id
    FOR UPDATE;

    -- Mode Lock Enforcement: Customer cannot switch once selected
    IF v_current_usage IS NOT NULL THEN
        IF v_current_usage = p_usage_type THEN
            RETURN jsonb_build_object('ok', true, 'usage_type', v_current_usage, 'qr_number', v_qr_number);
        END IF;
        RETURN jsonb_build_object('ok', false, 'error', 'mode_locked');
    END IF;

    UPDATE public.qr_codes
    SET usage_type = p_usage_type,
        updated_at = now()
    WHERE id = v_qr_id;

    IF p_usage_type = 'personal' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_name)
        VALUES (v_qr_id, '')
        ON CONFLICT (qr_code_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('ok', true, 'usage_type', p_usage_type, 'qr_number', v_qr_number);
END;
$$;

-- Phase 3 & 4: Atomic save of Personal Profile + Ordered Multi-Link Collection
CREATE OR REPLACE FUNCTION public.customer_save_personal_profile(
    p_session_token TEXT,
    p_profile_name TEXT,
    p_profile_image TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL,
    p_public_slug TEXT DEFAULT NULL,
    p_theme TEXT DEFAULT 'light',
    p_is_published BOOLEAN DEFAULT false,
    p_links JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qr_id UUID;
    v_qr RECORD;
    v_profile_id UUID;
    v_clean_slug TEXT;
    v_clean_name TEXT;
    v_clean_theme TEXT;
    v_link JSONB;
    v_idx INT := 0;
    v_platform TEXT;
    v_title TEXT;
    v_url TEXT;
    v_icon TEXT;
    v_is_active BOOLEAN;
    v_seen_pairs TEXT[] := '{}';
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT id, qr_number, usage_type INTO v_qr
    FROM public.qr_codes
    WHERE id = v_qr_id
    FOR UPDATE;

    IF v_qr.usage_type IS DISTINCT FROM 'personal' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'mode_mismatch');
    END IF;

    v_clean_name := TRIM(COALESCE(p_profile_name, ''));
    IF length(v_clean_name) = 0 OR length(v_clean_name) > 80 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_profile_name');
    END IF;

    v_clean_theme := COALESCE(NULLIF(LOWER(TRIM(p_theme)), ''), 'light');
    IF v_clean_theme NOT IN ('light', 'dark') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_theme');
    END IF;

    IF NOT public.is_safe_profile_image(p_profile_image) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_profile_image');
    END IF;

    v_clean_slug := NULLIF(LOWER(TRIM(COALESCE(p_public_slug, ''))), '');
    IF v_clean_slug IS NOT NULL THEN
        IF NOT public.is_valid_public_slug(v_clean_slug) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug');
        END IF;
        -- Check uniqueness across other profiles
        IF EXISTS (
            SELECT 1 FROM public.qr_profiles
            WHERE LOWER(public_slug) = v_clean_slug AND qr_code_id <> v_qr_id
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'slug_taken');
        END IF;
        -- Prevent hijacking another card's QR number as a slug
        IF EXISTS (
            SELECT 1 FROM public.qr_codes
            WHERE LOWER(qr_number) = v_clean_slug AND id <> v_qr_id
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'slug_taken');
        END IF;
    END IF;

    IF p_links IS NULL OR jsonb_typeof(p_links) <> 'array' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_links_payload');
    END IF;

    -- Validate all links BEFORE modifying anything (atomic transaction)
    FOR v_link IN SELECT * FROM jsonb_array_elements(p_links)
    LOOP
        v_platform := LOWER(TRIM(COALESCE(v_link->>'platform', 'custom')));
        v_title := TRIM(COALESCE(v_link->>'link_title', ''));
        v_url := TRIM(COALESCE(v_link->>'destination_url', ''));

        IF length(v_title) = 0 OR length(v_title) > 80 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_link_title');
        END IF;

        IF NOT public.is_safe_http_url(v_url) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
        END IF;

        -- Prevent exact duplicate platform + URL entries in the same save
        IF (v_platform || '|' || LOWER(v_url)) = ANY(v_seen_pairs) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'duplicate_link');
        END IF;
        v_seen_pairs := array_append(v_seen_pairs, v_platform || '|' || LOWER(v_url));
    END LOOP;

    -- Upsert qr_profiles
    INSERT INTO public.qr_profiles (
        qr_code_id, profile_name, profile_image, bio, contact_email, contact_phone, public_slug, theme, is_published
    ) VALUES (
        v_qr_id,
        v_clean_name,
        NULLIF(TRIM(COALESCE(p_profile_image, '')), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_bio, '')), 280), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_contact_email, '')), 120), ''),
        NULLIF(LEFT(TRIM(COALESCE(p_contact_phone, '')), 40), ''),
        v_clean_slug,
        v_clean_theme,
        COALESCE(p_is_published, false)
    )
    ON CONFLICT (qr_code_id) DO UPDATE SET
        profile_name = EXCLUDED.profile_name,
        profile_image = EXCLUDED.profile_image,
        bio = EXCLUDED.bio,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        public_slug = EXCLUDED.public_slug,
        theme = EXCLUDED.theme,
        is_published = EXCLUDED.is_published,
        updated_at = now()
    RETURNING id INTO v_profile_id;

    -- Replace links atomically in exact display_order
    DELETE FROM public.qr_links WHERE qr_profile_id = v_profile_id;

    FOR v_link IN SELECT * FROM jsonb_array_elements(p_links)
    LOOP
        v_platform := LOWER(TRIM(COALESCE(v_link->>'platform', 'custom')));
        v_title := TRIM(COALESCE(v_link->>'link_title', ''));
        v_url := TRIM(COALESCE(v_link->>'destination_url', ''));
        v_icon := NULLIF(TRIM(COALESCE(v_link->>'icon', '')), '');
        v_is_active := COALESCE((v_link->>'is_active')::BOOLEAN, true);

        INSERT INTO public.qr_links (
            qr_profile_id, platform, link_title, destination_url, icon, display_order, is_active
        ) VALUES (
            v_profile_id, v_platform, v_title, v_url, v_icon, v_idx, v_is_active
        );

        v_idx := v_idx + 1;
    END LOOP;

    UPDATE public.qr_codes SET updated_at = now() WHERE id = v_qr_id;

    RETURN jsonb_build_object(
        'ok', true,
        'profile_id', v_profile_id,
        'public_slug', v_clean_slug,
        'qr_number', v_qr.qr_number,
        'is_published', COALESCE(p_is_published, false)
    );
END;
$$;

-- Phase 5: Save Business Direct Redirection settings
CREATE OR REPLACE FUNCTION public.customer_save_business_settings(
    p_session_token TEXT,
    p_business_name TEXT DEFAULT NULL,
    p_business_purpose TEXT DEFAULT 'custom',
    p_destination_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qr_id UUID;
    v_qr RECORD;
    v_clean_url TEXT;
    v_clean_purpose TEXT;
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    SELECT id, qr_number, usage_type INTO v_qr
    FROM public.qr_codes
    WHERE id = v_qr_id
    FOR UPDATE;

    IF v_qr.usage_type IS DISTINCT FROM 'business' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'mode_mismatch');
    END IF;

    v_clean_url := TRIM(COALESCE(p_destination_url, ''));
    IF NOT public.is_safe_http_url(v_clean_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
    END IF;

    v_clean_purpose := LOWER(TRIM(COALESCE(p_business_purpose, 'custom')));
    IF v_clean_purpose NOT IN ('google_reviews', 'website', 'payment', 'feedback', 'product', 'custom') THEN
        v_clean_purpose := 'custom';
    END IF;

    UPDATE public.qr_codes
    SET business_name = NULLIF(LEFT(TRIM(COALESCE(p_business_name, '')), 120), ''),
        business_purpose = v_clean_purpose,
        destination_url = v_clean_url,
        updated_at = now()
    WHERE id = v_qr_id;

    RETURN jsonb_build_object(
        'ok', true,
        'qr_number', v_qr.qr_number,
        'destination_url', v_clean_url,
        'business_purpose', v_clean_purpose
    );
END;
$$;

-- Customer password change from inside dashboard
CREATE OR REPLACE FUNCTION public.customer_change_password(
    p_session_token TEXT,
    p_current_password TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qr_id UUID;
    v_hash TEXT;
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
    END IF;

    SELECT password_hash INTO v_hash FROM public.qr_codes WHERE id = v_qr_id FOR UPDATE;
    IF v_hash IS NULL OR v_hash != crypt(p_current_password, v_hash) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wrong_password');
    END IF;

    UPDATE public.qr_codes
    SET password_hash = crypt(p_new_password, gen_salt('bf', 8)),
        updated_at = now()
    WHERE id = v_qr_id;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Legacy single-URL update RPC (hardened with HTTP/HTTPS check & business mode guard)
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

-- Phase 4: Public Profile Resolver (/p/:identifier -> matches public_slug OR qr_number)
CREATE OR REPLACE FUNCTION public.get_public_profile(
    p_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_qr RECORD;
    v_profile RECORD;
    v_links JSONB;
BEGIN
    v_clean := TRIM(COALESCE(p_identifier, ''));
    IF length(v_clean) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    -- 1. Try matching custom public_slug first (case-insensitive)
    SELECT p.*, q.qr_number, q.status AS qr_status, q.usage_type
    INTO v_profile
    FROM public.qr_profiles p
    JOIN public.qr_codes q ON q.id = p.qr_code_id
    WHERE LOWER(p.public_slug) = LOWER(v_clean)
    LIMIT 1;

    -- 2. Fallback to permanent qr_number (case-insensitive)
    IF v_profile IS NULL THEN
        SELECT p.*, q.qr_number, q.status AS qr_status, q.usage_type
        INTO v_profile
        FROM public.qr_codes q
        LEFT JOIN public.qr_profiles p ON p.qr_code_id = q.id
        WHERE UPPER(q.qr_number) = UPPER(v_clean)
        LIMIT 1;
    END IF;

    -- Check if QR exists at all when profile row wasn't created yet
    IF v_profile IS NULL OR v_profile.qr_number IS NULL THEN
        SELECT id, qr_number, status AS qr_status, usage_type
        INTO v_qr
        FROM public.qr_codes
        WHERE UPPER(qr_number) = UPPER(v_clean)
        LIMIT 1;

        IF v_qr IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'error', 'not_found');
        END IF;

        IF v_qr.qr_status != 'active' THEN
            RETURN jsonb_build_object('ok', false, 'error', 'inactive');
        END IF;

        IF v_qr.usage_type IS DISTINCT FROM 'personal' THEN
            RETURN jsonb_build_object('ok', false, 'error', 'not_personal_profile', 'qr_number', v_qr.qr_number);
        END IF;

        RETURN jsonb_build_object('ok', true, 'is_published', false, 'qr_number', v_qr.qr_number);
    END IF;

    IF v_profile.qr_status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    IF v_profile.usage_type IS DISTINCT FROM 'personal' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_personal_profile', 'qr_number', v_profile.qr_number);
    END IF;

    -- Unpublished profiles MUST NOT expose links or private data publicly
    IF COALESCE(v_profile.is_published, false) IS FALSE THEN
        RETURN jsonb_build_object(
            'ok', true,
            'is_published', false,
            'qr_number', v_profile.qr_number
        );
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', l.id,
            'platform', l.platform,
            'link_title', l.link_title,
            'destination_url', l.destination_url,
            'icon', l.icon,
            'display_order', l.display_order
        ) ORDER BY l.display_order ASC, l.created_at ASC
    ), '[]'::jsonb)
    INTO v_links
    FROM public.qr_links l
    WHERE l.qr_profile_id = v_profile.id
      AND l.is_active = true;

    RETURN jsonb_build_object(
        'ok', true,
        'is_published', true,
        'qr_number', v_profile.qr_number,
        'profile', jsonb_build_object(
            'profile_name', v_profile.profile_name,
            'profile_image', v_profile.profile_image,
            'bio', v_profile.bio,
            'contact_email', v_profile.contact_email,
            'contact_phone', v_profile.contact_phone,
            'public_slug', v_profile.public_slug,
            'theme', v_profile.theme
        ),
        'links', v_links
    );
END;
$$;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY & PRIVILEGE HARDENING
-- ==============================================================================

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_customer_sessions ENABLE ROW LEVEL SECURITY;

-- qr_codes & batches: strictly Admin only (no anon direct reads; public scans use SECURITY DEFINER RPCs)
REVOKE ALL ON public.qr_codes FROM anon;
GRANT ALL ON public.qr_codes TO authenticated, service_role;

REVOKE ALL ON public.batches FROM anon;
GRANT ALL ON public.batches TO authenticated, service_role;

DROP POLICY IF EXISTS "Public QR Read" ON public.qr_codes;
DROP POLICY IF EXISTS "Public QR Insert/Update/Delete" ON public.qr_codes;
DROP POLICY IF EXISTS "Admin QR All" ON public.qr_codes;
CREATE POLICY "Admin QR All" ON public.qr_codes
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Batches Read" ON public.batches;
DROP POLICY IF EXISTS "Batches All" ON public.batches;
CREATE POLICY "Batches All" ON public.batches
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Lock down internal auth/rate-limit tables completely
REVOKE ALL ON public.qr_rate_limits FROM anon, authenticated;
GRANT ALL ON public.qr_rate_limits TO service_role;

REVOKE ALL ON public.qr_customer_sessions FROM anon, authenticated;
GRANT ALL ON public.qr_customer_sessions TO service_role;

REVOKE ALL ON public.admin_users FROM anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

DROP POLICY IF EXISTS "Admins Read Own Allowlist" ON public.admin_users;
CREATE POLICY "Admins Read Own Allowlist" ON public.admin_users
    FOR SELECT
    USING (public.is_admin());

-- qr_profiles RLS: Public can only read published profiles on active Personal QRs; Admins full access
DROP POLICY IF EXISTS "Public Published Profiles Read" ON public.qr_profiles;
CREATE POLICY "Public Published Profiles Read" ON public.qr_profiles
    FOR SELECT
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1 FROM public.qr_codes q
            WHERE q.id = qr_profiles.qr_code_id
              AND q.status = 'active'
              AND q.usage_type = 'personal'
        )
    );

DROP POLICY IF EXISTS "Admin Profiles All" ON public.qr_profiles;
CREATE POLICY "Admin Profiles All" ON public.qr_profiles
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

GRANT SELECT ON public.qr_profiles TO anon;
GRANT ALL ON public.qr_profiles TO authenticated, service_role;

-- qr_links RLS: Public can only read active links belonging to published active Personal profiles
DROP POLICY IF EXISTS "Public Active Links Read" ON public.qr_links;
CREATE POLICY "Public Active Links Read" ON public.qr_links
    FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.qr_profiles p
            JOIN public.qr_codes q ON q.id = p.qr_code_id
            WHERE p.id = qr_links.qr_profile_id
              AND p.is_published = true
              AND q.status = 'active'
              AND q.usage_type = 'personal'
        )
    );

DROP POLICY IF EXISTS "Admin Links All" ON public.qr_links;
CREATE POLICY "Admin Links All" ON public.qr_links
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

GRANT SELECT ON public.qr_links TO anon;
GRANT ALL ON public.qr_links TO authenticated, service_role;

-- Restrict Admin RPC execution exclusively to authenticated Admins & service_role
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

REVOKE EXECUTE ON FUNCTION public.admin_set_qr_usage_type(UUID, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_qr_usage_type(UUID, TEXT) TO authenticated, service_role;

-- Public & Customer RPC execution grants
GRANT EXECUTE ON FUNCTION public.get_qr_redirect(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_qr_update(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_setup_code(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_claim_qr(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_login_qr(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_get_dashboard(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_select_usage_mode(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_save_personal_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_save_business_settings(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_change_password(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_qr_update(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated, service_role;

