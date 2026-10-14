-- ==============================================================================
-- SPREAD NFC / TAPFLOW PRODUCTION DATABASE MIGRATION
-- Robust Multi-Scenario QR Lifecycle, Anti-Brute-Force Rate Limiting & Safe Redirects
-- Run this entire script in Supabase Dashboard → SQL Editor → Run
-- ==============================================================================

-- 1. ADD NEW COLUMNS TO qr_codes TABLE (Safe & Idempotent)
ALTER TABLE public.qr_codes
    ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS owner_email TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS requires_setup_code BOOLEAN NOT NULL DEFAULT true;

-- 2. HIGH-THROUGHPUT COVERING INDEXES
-- Index-Only Scan: Fetches status, destination_url & is_claimed directly from index in sub-millisecond
CREATE INDEX IF NOT EXISTS idx_qr_codes_scan_covering
    ON public.qr_codes (qr_number, status)
    INCLUDE (destination_url, password_changed);

CREATE INDEX IF NOT EXISTS idx_qr_codes_claimed_dest
    ON public.qr_codes (password_changed, destination_url);

CREATE INDEX IF NOT EXISTS idx_qr_codes_req_setup
    ON public.qr_codes (requires_setup_code);

-- 3. RATE LIMITING TABLE (Protects against brute-force guessing of setup codes / passwords)
CREATE TABLE IF NOT EXISTS public.qr_rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ DEFAULT NULL
);

-- Cleanly drop old functions to allow updated return types without PostgreSQL 42P13 errors
DROP FUNCTION IF EXISTS public.get_qr_redirect(TEXT);
DROP FUNCTION IF EXISTS public.request_qr_update(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.request_qr_update(TEXT);
DROP FUNCTION IF EXISTS public.verify_setup_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.customer_claim_qr(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_qr_update(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_qr_unclaimed(UUID, TEXT);
DROP FUNCTION IF EXISTS public.check_and_record_rate_limit(TEXT, INT, INT, INT);
DROP FUNCTION IF EXISTS public.record_failed_rate_limit(TEXT, INT, INT, INT);
DROP FUNCTION IF EXISTS public.clear_rate_limit(TEXT);

-- Helper function to check rate limits
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
    p_key TEXT,
    p_max_attempts INT DEFAULT 5,
    p_window_seconds INT DEFAULT 300,
    p_lockout_seconds INT DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT attempts, last_attempt, locked_until
    INTO v_rec
    FROM public.qr_rate_limits
    WHERE key = p_key;

    -- Check if currently locked out
    IF v_rec IS NOT NULL AND v_rec.locked_until IS NOT NULL AND v_rec.locked_until > now() THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_rate_limit(
    p_key TEXT,
    p_max_attempts INT DEFAULT 5,
    p_window_seconds INT DEFAULT 300,
    p_lockout_seconds INT DEFAULT 300
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec RECORD;
BEGIN
    SELECT attempts, last_attempt, locked_until
    INTO v_rec
    FROM public.qr_rate_limits
    WHERE key = p_key;

    IF v_rec IS NULL THEN
        INSERT INTO public.qr_rate_limits (key, attempts, last_attempt)
        VALUES (p_key, 1, now())
        ON CONFLICT (key) DO UPDATE
        SET attempts = 1, last_attempt = now(), locked_until = NULL;
    ELSIF v_rec.last_attempt < now() - (p_window_seconds || ' seconds')::interval THEN
        UPDATE public.qr_rate_limits
        SET attempts = 1, last_attempt = now(), locked_until = NULL
        WHERE key = p_key;
    ELSIF v_rec.attempts + 1 >= p_max_attempts THEN
        UPDATE public.qr_rate_limits
        SET attempts = v_rec.attempts + 1,
            last_attempt = now(),
            locked_until = now() + (p_lockout_seconds || ' seconds')::interval
        WHERE key = p_key;
    ELSE
        UPDATE public.qr_rate_limits
        SET attempts = v_rec.attempts + 1, last_attempt = now()
        WHERE key = p_key;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_rate_limit(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.qr_rate_limits WHERE key = p_key;
END;
$$;

-- 4. RPC: get_qr_redirect (Blazing-Fast Scanner Redirection, High Concurrency)
-- Note: Advisory locks removed to allow thousands of concurrent scans per second without bottlenecks
CREATE OR REPLACE FUNCTION public.get_qr_redirect(
    p_qr_number TEXT
)
RETURNS TABLE (
    status TEXT,
    destination_url TEXT,
    is_claimed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_norm_qr TEXT;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));

    -- Fast atomic scan counter increment
    UPDATE public.qr_codes
    SET scan_count = scan_count + 1
    WHERE qr_number = v_norm_qr;

    RETURN QUERY
    SELECT q.status, q.destination_url, (q.password_changed AND q.destination_url IS NOT NULL AND length(trim(q.destination_url)) > 0) AS is_claimed
    FROM public.qr_codes q
    WHERE q.qr_number = v_norm_qr;
END;
$$;

-- 5. RPC: request_qr_update (Lookup Device Status for Activation or Update)
CREATE OR REPLACE FUNCTION public.request_qr_update(
    p_qr_number TEXT,
    p_new_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_norm_qr TEXT;
    v_status TEXT;
    v_is_claimed BOOLEAN;
    v_dest TEXT;
    v_email TEXT;
    v_req_setup BOOLEAN;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));

    SELECT status, password_changed, destination_url, owner_email, COALESCE(requires_setup_code, true)
    INTO v_status, v_is_claimed, v_dest, v_email, v_req_setup
    FROM public.qr_codes
    WHERE qr_number = v_norm_qr;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    -- A card is considered claimed only if password_changed is true AND a destination URL has been set
    RETURN jsonb_build_object(
        'ok', true,
        'is_claimed', (COALESCE(v_is_claimed, false) AND v_dest IS NOT NULL AND length(trim(v_dest)) > 0),
        'destination_url', v_dest,
        'qr_number', v_norm_qr,
        'owner_email', v_email,
        'requires_setup_code', v_req_setup
    );
END;
$$;

-- 6. RPC: verify_setup_code (Scenario C Step 2: Validate Packaging Code before setting Destination)
CREATE OR REPLACE FUNCTION public.verify_setup_code(
    p_qr_number TEXT,
    p_setup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- Check Rate Limiter (Max 5 attempts per 5 minutes)
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

    -- If this card is in Open Mode (Scenario B), setup code is not required
    IF v_req_setup IS FALSE THEN
        RETURN jsonb_build_object('ok', true, 'requires_setup_code', false);
    END IF;

    -- Verify setup code against current packaging hash
    IF v_hash != crypt(TRIM(p_setup_code), v_hash) AND v_hash != crypt(UPPER(TRIM(p_setup_code)), v_hash) THEN
        PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
        RETURN jsonb_build_object('ok', false, 'error', 'wrong_setup_code');
    END IF;

    -- Success: clear rate limit
    PERFORM public.clear_rate_limit(v_rate_key);
    RETURN jsonb_build_object('ok', true, 'requires_setup_code', true);
END;
$$;

-- 7. RPC: customer_claim_qr (Atomic Claim & Password Creation for Scenario B and C)
CREATE OR REPLACE FUNCTION public.customer_claim_qr(
    p_qr_number TEXT,
    p_setup_code TEXT DEFAULT NULL,
    p_new_password TEXT DEFAULT NULL,
    p_destination_url TEXT DEFAULT NULL,
    p_owner_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_rate_key := 'claim_' || v_norm_qr;

    -- Check Rate Limiter
    v_allowed := public.check_and_record_rate_limit(v_rate_key, 5, 300, 300);
    IF NOT v_allowed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
    END IF;

    -- Row-Level Lock: Prevents simultaneous race conditions (only 1 claim will ever succeed)
    SELECT password_hash, password_changed, status, COALESCE(requires_setup_code, true)
    INTO v_hash, v_is_claimed, v_status, v_req_setup
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

    -- If this card requires a packaging setup code (Scenario C), verify it securely
    IF v_req_setup IS TRUE THEN
        IF p_setup_code IS NULL OR length(trim(p_setup_code)) = 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'missing_setup_code');
        END IF;

        IF v_hash != crypt(TRIM(p_setup_code), v_hash) AND v_hash != crypt(UPPER(TRIM(p_setup_code)), v_hash) THEN
            PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
            RETURN jsonb_build_object('ok', false, 'error', 'wrong_setup_code');
        END IF;
    END IF;

    -- Enforce minimum password length
    IF p_new_password IS NULL OR length(p_new_password) < 4 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
    END IF;

    -- Clear rate limit upon success
    PERFORM public.clear_rate_limit(v_rate_key);

    -- IMPORTANT: qr_number is PERMANENT and NEVER changed. Only destination_url, password_hash, claimed_at updated!
    UPDATE public.qr_codes
    SET password_hash = crypt(p_new_password, gen_salt('bf', 8)),
        password_changed = true,
        claimed_at = now(),
        destination_url = NULLIF(TRIM(p_destination_url), ''),
        owner_email = NULLIF(TRIM(p_owner_email), ''),
        updated_at = now()
    WHERE qr_number = v_norm_qr;

    RETURN jsonb_build_object('ok', true, 'qr_number', v_norm_qr);
END;
$$;

-- 8. RPC: confirm_qr_update (Update Existing Destination with Password Verification)
CREATE OR REPLACE FUNCTION public.confirm_qr_update(
    p_qr_number TEXT,
    p_new_url TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_norm_qr TEXT;
    v_hash TEXT;
    v_rate_key TEXT;
    v_allowed BOOLEAN;
BEGIN
    v_norm_qr := UPPER(TRIM(p_qr_number));
    v_rate_key := 'update_' || v_norm_qr;

    -- Check Rate Limiter
    v_allowed := public.check_and_record_rate_limit(v_rate_key, 5, 300, 300);
    IF NOT v_allowed THEN
        RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
    END IF;

    -- Row-Level Lock
    SELECT password_hash INTO v_hash
    FROM public.qr_codes
    WHERE qr_number = v_norm_qr AND status = 'active'
    FOR UPDATE;

    IF v_hash IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    IF v_hash != crypt(p_password, v_hash) THEN
        PERFORM public.record_failed_rate_limit(v_rate_key, 5, 300, 300);
        RETURN jsonb_build_object('ok', false, 'error', 'wrong_password');
    END IF;

    -- Clear rate limit on success
    PERFORM public.clear_rate_limit(v_rate_key);

    -- CRITICAL: qr_number is NEVER modified! Only destination_url is updated.
    UPDATE public.qr_codes
    SET destination_url = TRIM(p_new_url),
        updated_at = now()
    WHERE qr_number = v_norm_qr;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- 9. RPC: admin_reset_qr_unclaimed (Support Admin Reset to Re-issue Packaging Code)
CREATE OR REPLACE FUNCTION public.admin_reset_qr_unclaimed(
    p_qr_id UUID,
    p_new_setup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- 10. PERMISSIONS & GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
