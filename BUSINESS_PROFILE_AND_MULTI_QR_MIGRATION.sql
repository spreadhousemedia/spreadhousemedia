-- ==============================================================================
-- SPREADNFC – BUSINESS PROFILE (B2) & MULTI-QR SECURE WORKSPACE MIGRATION
-- Extends existing Personal Profile + Business Direct Link system with:
--   1. Business Profile mode ('business_profile') with Category, Location,
--      Logo/Avatar, Contact Info, and Reorderable Multi-Link Collection
--      (including Google Reviews & Google Maps).
--   2. Server-verified Multi-QR session summary RPC (zero IDOR; every QR
--      requires an active cryptographic customer session token).
--   3. Strict SQL-level URL, platform allowlist, payload size & SSRF checks.
--
-- Safe & Idempotent: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Extend qr_codes.usage_type CHECK constraint to support 'business_profile'
DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'qr_codes'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%usage_type%'
    LOOP
        EXECUTE format('ALTER TABLE public.qr_codes DROP CONSTRAINT %I', v_conname);
    END LOOP;
END $$;

ALTER TABLE public.qr_codes
    ADD CONSTRAINT qr_codes_usage_type_check
    CHECK (usage_type IN ('personal', 'business', 'business_profile'));

-- 2. Extend qr_profiles with Business Profile metadata (backward compatible)
ALTER TABLE public.qr_profiles
    ADD COLUMN IF NOT EXISTS profile_type TEXT NOT NULL DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS business_category TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS contact_person_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS business_experience TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS full_address TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS working_hours TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS google_maps_url TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS contact_visibility JSONB NOT NULL DEFAULT '{"phone":true,"whatsapp":true,"email":true,"address":true,"maps":true,"hours":true,"contact_person":true}'::jsonb;

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'qr_profiles'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%profile_type%'
    LOOP
        EXECUTE format('ALTER TABLE public.qr_profiles DROP CONSTRAINT %I', v_conname);
    END LOOP;
END $$;

ALTER TABLE public.qr_profiles
    ADD CONSTRAINT qr_profiles_profile_type_check
    CHECK (profile_type IN ('personal', 'business'));

-- 3. Hardened HTTP/HTTPS & Platform Validation Helpers
CREATE OR REPLACE FUNCTION public.is_safe_http_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_host TEXT;
BEGIN
    IF p_url IS NULL THEN
        RETURN false;
    END IF;
    v_clean := trim(p_url);
    IF length(v_clean) < 10 OR length(v_clean) > 2048 THEN
        RETURN false;
    END IF;
    IF v_clean ~* '^\s*(javascript|data|file|vbscript|about|blob|ftp|mailto|tel|sms):' THEN
        RETURN false;
    END IF;
    IF NOT (v_clean ~* '^https?://[^\s/$.?#][^\s]*\.[^\s]+$') THEN
        RETURN false;
    END IF;

    -- Extract lowercase hostname (strip port and userinfo if any)
    v_host := lower(regexp_replace(v_clean, '^https?://([^/@]+@)?([^/:?#]+).*$', '\2'));
    IF v_host IN ('localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]')
       OR v_host ~ '^127\.'
       OR v_host ~ '^10\.'
       OR v_host ~ '^192\.168\.'
       OR v_host ~ '^169\.254\.'
       OR v_host ~ '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
       OR v_host ~ '\.local$'
       OR v_host ~ '\.internal$'
    THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_allowed_platform(p_platform TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN lower(trim(COALESCE(p_platform, ''))) = ANY(ARRAY[
        'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x',
        'whatsapp', 'telegram', 'snapchat', 'pinterest', 'threads',
        'website', 'github', 'discord', 'spotify',
        'google_reviews', 'google_maps', 'custom'
    ]);
END;
$$;

-- 4. Admin Support Mode Switch (supports 'personal', 'business', 'business_profile', or NULL)
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

    IF p_usage_type IS NOT NULL AND p_usage_type NOT IN ('personal', 'business', 'business_profile') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_usage_type');
    END IF;

    SELECT id, qr_number, qr_name, business_name INTO v_qr FROM public.qr_codes WHERE id = p_qr_id;
    IF v_qr IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    UPDATE public.qr_codes
    SET usage_type = p_usage_type,
        updated_at = now()
    WHERE id = p_qr_id;

    IF p_usage_type = 'personal' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_type, profile_name)
        VALUES (p_qr_id, 'personal', COALESCE(NULLIF(v_qr.qr_name, ''), v_qr.qr_number))
        ON CONFLICT (qr_code_id) DO UPDATE SET
            profile_type = 'personal',
            updated_at = now();
    ELSIF p_usage_type = 'business_profile' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_type, profile_name)
        VALUES (p_qr_id, 'business', COALESCE(NULLIF(v_qr.business_name, ''), NULLIF(v_qr.qr_name, ''), v_qr.qr_number))
        ON CONFLICT (qr_code_id) DO UPDATE SET
            profile_type = 'business',
            updated_at = now();
    END IF;

    RETURN jsonb_build_object('ok', true, 'qr_number', v_qr.qr_number, 'usage_type', p_usage_type);
END;
$$;

-- 5. Customer Mode Selection (Locked once chosen; supports personal, business, business_profile)
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

    IF p_usage_type NOT IN ('personal', 'business', 'business_profile') THEN
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
        INSERT INTO public.qr_profiles (qr_code_id, profile_type, profile_name)
        VALUES (v_qr_id, 'personal', '')
        ON CONFLICT (qr_code_id) DO UPDATE SET profile_type = 'personal';
    ELSIF p_usage_type = 'business_profile' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_type, profile_name)
        VALUES (v_qr_id, 'business', '')
        ON CONFLICT (qr_code_id) DO UPDATE SET profile_type = 'business';
    END IF;

    RETURN jsonb_build_object('ok', true, 'usage_type', p_usage_type, 'qr_number', v_qr_number);
END;
$$;

-- 6. Updated customer_get_dashboard (returns profile_type, business_category, location)
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
            'profile_type', COALESCE(v_profile.profile_type, 'personal'),
            'profile_name', v_profile.profile_name,
            'profile_image', v_profile.profile_image,
            'avatar_id', v_profile.avatar_id,
            'business_category', v_profile.business_category,
            'location', v_profile.location,
            'contact_person_name', v_profile.contact_person_name,
            'business_experience', v_profile.business_experience,
            'whatsapp_number', v_profile.whatsapp_number,
            'full_address', v_profile.full_address,
            'working_hours', v_profile.working_hours,
            'google_maps_url', v_profile.google_maps_url,
            'contact_visibility', COALESCE(v_profile.contact_visibility, '{"phone":true,"whatsapp":true,"email":true,"address":true,"maps":true,"hours":true,"contact_person":true}'::jsonb),
            'tagline', v_profile.tagline,
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

-- 7. Atomic Save of Business Profile + Ordered Multi-Link Collection
DROP FUNCTION IF EXISTS public.customer_save_business_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB);
CREATE OR REPLACE FUNCTION public.customer_save_business_profile(
    p_session_token TEXT,
    p_business_name TEXT,
    p_business_category TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_tagline TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_profile_image TEXT DEFAULT NULL,
    p_avatar_id TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL,
    p_public_slug TEXT DEFAULT NULL,
    p_theme TEXT DEFAULT 'light',
    p_is_published BOOLEAN DEFAULT false,
    p_links JSONB DEFAULT '[]'::jsonb,
    p_contact_person_name TEXT DEFAULT NULL,
    p_business_experience TEXT DEFAULT NULL,
    p_whatsapp_number TEXT DEFAULT NULL,
    p_full_address TEXT DEFAULT NULL,
    p_working_hours TEXT DEFAULT NULL,
    p_google_maps_url TEXT DEFAULT NULL,
    p_contact_visibility JSONB DEFAULT NULL
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
    v_clean_name TEXT;
    v_clean_category TEXT;
    v_clean_location TEXT;
    v_clean_tagline TEXT;
    v_clean_avatar_id TEXT;
    v_clean_slug TEXT;
    v_clean_theme TEXT;
    v_clean_email TEXT;
    v_clean_phone TEXT;
    v_clean_person TEXT;
    v_clean_exp TEXT;
    v_clean_whatsapp TEXT;
    v_clean_address TEXT;
    v_clean_hours TEXT;
    v_clean_maps_url TEXT;
    v_clean_visibility JSONB;
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

    IF v_qr.usage_type IS DISTINCT FROM 'business_profile' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'mode_mismatch');
    END IF;

    v_clean_name := TRIM(COALESCE(p_business_name, ''));
    IF length(v_clean_name) = 0 OR length(v_clean_name) > 80 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_profile_name');
    END IF;

    v_clean_category := NULLIF(LEFT(TRIM(COALESCE(p_business_category, '')), 60), '');
    v_clean_location := NULLIF(LEFT(TRIM(COALESCE(p_location, '')), 80), '');
    v_clean_tagline := NULLIF(LEFT(TRIM(COALESCE(p_tagline, '')), 80), '');
    v_clean_person := NULLIF(LEFT(TRIM(COALESCE(p_contact_person_name, '')), 80), '');
    v_clean_exp := NULLIF(LEFT(TRIM(COALESCE(p_business_experience, '')), 60), '');
    v_clean_address := NULLIF(LEFT(TRIM(COALESCE(p_full_address, '')), 240), '');
    v_clean_hours := NULLIF(LEFT(TRIM(COALESCE(p_working_hours, '')), 120), '');

    v_clean_avatar_id := NULLIF(LOWER(TRIM(COALESCE(p_avatar_id, ''))), '');
    IF NOT public.is_valid_avatar_id(v_clean_avatar_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_avatar');
    END IF;

    v_clean_theme := COALESCE(NULLIF(LOWER(TRIM(p_theme)), ''), 'light');
    IF v_clean_theme NOT IN ('light', 'dark') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_theme');
    END IF;

    IF NOT public.is_safe_profile_image(p_profile_image) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_profile_image');
    END IF;

    v_clean_email := NULLIF(LEFT(TRIM(COALESCE(p_contact_email, '')), 120), '');
    IF v_clean_email IS NOT NULL AND NOT (v_clean_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_contact_email');
    END IF;

    v_clean_phone := NULLIF(LEFT(TRIM(COALESCE(p_contact_phone, '')), 30), '');
    IF v_clean_phone IS NOT NULL AND NOT (v_clean_phone ~ '^[+\d\s().-]{6,30}$') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_contact_phone');
    END IF;

    v_clean_whatsapp := NULLIF(LEFT(TRIM(COALESCE(p_whatsapp_number, '')), 30), '');
    IF v_clean_whatsapp IS NOT NULL AND NOT (v_clean_whatsapp ~ '^[+\d\s().-]{6,30}$') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_contact_phone');
    END IF;

    v_clean_maps_url := NULLIF(TRIM(COALESCE(p_google_maps_url, '')), '');
    IF v_clean_maps_url IS NOT NULL AND NOT public.is_safe_http_url(v_clean_maps_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
    END IF;

    v_clean_visibility := jsonb_build_object(
        'phone', COALESCE((p_contact_visibility->>'phone')::BOOLEAN, true),
        'whatsapp', COALESCE((p_contact_visibility->>'whatsapp')::BOOLEAN, true),
        'email', COALESCE((p_contact_visibility->>'email')::BOOLEAN, true),
        'address', COALESCE((p_contact_visibility->>'address')::BOOLEAN, true),
        'maps', COALESCE((p_contact_visibility->>'maps')::BOOLEAN, true),
        'hours', COALESCE((p_contact_visibility->>'hours')::BOOLEAN, true),
        'contact_person', COALESCE((p_contact_visibility->>'contact_person')::BOOLEAN, true)
    );

    v_clean_slug := NULLIF(LOWER(TRIM(COALESCE(p_public_slug, ''))), '');
    IF v_clean_slug IS NOT NULL THEN
        IF NOT public.is_valid_public_slug(v_clean_slug) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_slug');
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.qr_profiles
            WHERE LOWER(public_slug) = v_clean_slug AND qr_code_id <> v_qr_id
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'slug_taken');
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.qr_codes
            WHERE LOWER(qr_number) = v_clean_slug AND id <> v_qr_id
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'slug_taken');
        END IF;
    END IF;

    IF p_links IS NULL OR jsonb_typeof(p_links) <> 'array' OR jsonb_array_length(p_links) > 50 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_links_payload');
    END IF;

    FOR v_link IN SELECT * FROM jsonb_array_elements(p_links)
    LOOP
        v_platform := LOWER(TRIM(COALESCE(v_link->>'platform', 'custom')));
        IF NOT public.is_allowed_platform(v_platform) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_links_payload');
        END IF;

        v_title := TRIM(COALESCE(v_link->>'link_title', ''));
        v_url := TRIM(COALESCE(v_link->>'destination_url', ''));

        IF length(v_title) = 0 OR length(v_title) > 80 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_link_title');
        END IF;

        IF NOT public.is_safe_http_url(v_url) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
        END IF;

        IF (v_platform || '|' || LOWER(v_url)) = ANY(v_seen_pairs) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'duplicate_link');
        END IF;
        v_seen_pairs := array_append(v_seen_pairs, v_platform || '|' || LOWER(v_url));
    END LOOP;

    INSERT INTO public.qr_profiles (
        qr_code_id, profile_type, profile_name, business_category, location,
        profile_image, avatar_id, tagline, bio, contact_email, contact_phone,
        contact_person_name, business_experience, whatsapp_number, full_address,
        working_hours, google_maps_url, contact_visibility,
        public_slug, theme, is_published
    ) VALUES (
        v_qr_id,
        'business',
        v_clean_name,
        v_clean_category,
        v_clean_location,
        NULLIF(TRIM(COALESCE(p_profile_image, '')), ''),
        v_clean_avatar_id,
        v_clean_tagline,
        NULLIF(LEFT(TRIM(COALESCE(p_bio, '')), 280), ''),
        v_clean_email,
        v_clean_phone,
        v_clean_person,
        v_clean_exp,
        v_clean_whatsapp,
        v_clean_address,
        v_clean_hours,
        v_clean_maps_url,
        v_clean_visibility,
        v_clean_slug,
        v_clean_theme,
        COALESCE(p_is_published, false)
    )
    ON CONFLICT (qr_code_id) DO UPDATE SET
        profile_type = 'business',
        profile_name = EXCLUDED.profile_name,
        business_category = EXCLUDED.business_category,
        location = EXCLUDED.location,
        profile_image = EXCLUDED.profile_image,
        avatar_id = EXCLUDED.avatar_id,
        tagline = EXCLUDED.tagline,
        bio = EXCLUDED.bio,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        contact_person_name = EXCLUDED.contact_person_name,
        business_experience = EXCLUDED.business_experience,
        whatsapp_number = EXCLUDED.whatsapp_number,
        full_address = EXCLUDED.full_address,
        working_hours = EXCLUDED.working_hours,
        google_maps_url = EXCLUDED.google_maps_url,
        contact_visibility = EXCLUDED.contact_visibility,
        public_slug = EXCLUDED.public_slug,
        theme = EXCLUDED.theme,
        is_published = EXCLUDED.is_published,
        updated_at = now()
    RETURNING id INTO v_profile_id;

    DELETE FROM public.qr_links WHERE qr_profile_id = v_profile_id;

    FOR v_link IN SELECT * FROM jsonb_array_elements(p_links)
    LOOP
        v_platform := LOWER(TRIM(COALESCE(v_link->>'platform', 'custom')));
        v_title := TRIM(COALESCE(v_link->>'link_title', ''));
        v_url := TRIM(COALESCE(v_link->>'destination_url', ''));
        v_icon := NULLIF(LEFT(TRIM(COALESCE(v_link->>'icon', '')), 40), '');
        v_is_active := COALESCE((v_link->>'is_active')::BOOLEAN, true);

        INSERT INTO public.qr_links (
            qr_profile_id, platform, link_title, destination_url, icon, display_order, is_active
        ) VALUES (
            v_profile_id, v_platform, v_title, v_url, v_icon, v_idx, v_is_active
        );

        v_idx := v_idx + 1;
    END LOOP;

    UPDATE public.qr_codes
    SET business_name = v_clean_name,
        updated_at = now()
    WHERE id = v_qr_id;

    RETURN jsonb_build_object(
        'ok', true,
        'profile_id', v_profile_id,
        'public_slug', v_clean_slug,
        'qr_number', v_qr.qr_number,
        'is_published', COALESCE(p_is_published, false)
    );
END;
$$;

-- 8. Updated get_public_profile: serves both 'personal' AND 'business_profile'
--    Privacy invariant: contact_email / contact_phone are ONLY exposed when
--    usage_type = 'business_profile' (never for personal profiles).
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
    v_profile_payload JSONB;
BEGIN
    v_clean := TRIM(COALESCE(p_identifier, ''));
    IF length(v_clean) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    SELECT p.*, q.qr_number, q.status AS qr_status, q.usage_type
    INTO v_profile
    FROM public.qr_profiles p
    JOIN public.qr_codes q ON q.id = p.qr_code_id
    WHERE LOWER(p.public_slug) = LOWER(v_clean)
    LIMIT 1;

    IF v_profile IS NULL THEN
        SELECT p.*, q.qr_number, q.status AS qr_status, q.usage_type
        INTO v_profile
        FROM public.qr_codes q
        LEFT JOIN public.qr_profiles p ON p.qr_code_id = q.id
        WHERE UPPER(q.qr_number) = UPPER(v_clean)
        LIMIT 1;
    END IF;

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

        IF v_qr.usage_type NOT IN ('personal', 'business_profile') OR v_qr.usage_type IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'error', 'not_personal_profile', 'qr_number', v_qr.qr_number);
        END IF;

        RETURN jsonb_build_object('ok', true, 'is_published', false, 'qr_number', v_qr.qr_number);
    END IF;

    IF v_profile.qr_status != 'active' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'inactive');
    END IF;

    IF v_profile.usage_type NOT IN ('personal', 'business_profile') OR v_profile.usage_type IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_personal_profile', 'qr_number', v_profile.qr_number);
    END IF;

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

    v_profile_payload := jsonb_build_object(
        'profile_type', CASE WHEN v_profile.usage_type = 'business_profile' THEN 'business' ELSE 'personal' END,
        'profile_name', v_profile.profile_name,
        'profile_image', v_profile.profile_image,
        'avatar_id', v_profile.avatar_id,
        'business_category', CASE WHEN v_profile.usage_type = 'business_profile' THEN v_profile.business_category ELSE NULL END,
        'location', CASE WHEN v_profile.usage_type = 'business_profile' THEN v_profile.location ELSE NULL END,
        'tagline', v_profile.tagline,
        'bio', v_profile.bio,
        'public_slug', v_profile.public_slug,
        'theme', v_profile.theme
    );

    IF v_profile.usage_type = 'business_profile' THEN
        v_profile_payload := v_profile_payload || jsonb_build_object(
            'business_experience', v_profile.business_experience,
            'contact_person_name', CASE WHEN COALESCE((v_profile.contact_visibility->>'contact_person')::BOOLEAN, true) THEN v_profile.contact_person_name ELSE NULL END,
            'contact_email', CASE WHEN COALESCE((v_profile.contact_visibility->>'email')::BOOLEAN, true) THEN v_profile.contact_email ELSE NULL END,
            'contact_phone', CASE WHEN COALESCE((v_profile.contact_visibility->>'phone')::BOOLEAN, true) THEN v_profile.contact_phone ELSE NULL END,
            'whatsapp_number', CASE WHEN COALESCE((v_profile.contact_visibility->>'whatsapp')::BOOLEAN, true) THEN v_profile.whatsapp_number ELSE NULL END,
            'full_address', CASE WHEN COALESCE((v_profile.contact_visibility->>'address')::BOOLEAN, true) THEN v_profile.full_address ELSE NULL END,
            'google_maps_url', CASE WHEN COALESCE((v_profile.contact_visibility->>'maps')::BOOLEAN, true) THEN v_profile.google_maps_url ELSE NULL END,
            'working_hours', CASE WHEN COALESCE((v_profile.contact_visibility->>'hours')::BOOLEAN, true) THEN v_profile.working_hours ELSE NULL END
        );
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'is_published', true,
        'qr_number', v_profile.qr_number,
        'usage_type', v_profile.usage_type,
        'profile', v_profile_payload,
        'links', v_links
    );
END;
$$;

-- 9. Secure Multi-QR Session Summary RPC
--    Accepts an array of customer session tokens (max 25).
--    Each token is hashed and verified independently against qr_customer_sessions;
--    invalid, expired, or inactive QR tokens are omitted safely (zero IDOR).
CREATE OR REPLACE FUNCTION public.customer_get_multi_qr_summary(
    p_session_tokens TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_tok TEXT;
    v_qr_id UUID;
    v_item JSONB;
    v_items JSONB := '[]'::jsonb;
    v_seen UUID[] := '{}';
    v_count INT := 0;
BEGIN
    IF p_session_tokens IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'items', '[]'::jsonb);
    END IF;

    FOREACH v_tok IN ARRAY p_session_tokens
    LOOP
        v_count := v_count + 1;
        EXIT WHEN v_count > 25;

        v_qr_id := public.verify_customer_session(v_tok);
        IF v_qr_id IS NULL OR v_qr_id = ANY(v_seen) THEN
            CONTINUE;
        END IF;

        SELECT jsonb_build_object(
            'qr_number', q.qr_number,
            'qr_name', q.qr_name,
            'status', q.status,
            'usage_type', q.usage_type,
            'destination_url', q.destination_url,
            'business_name', q.business_name,
            'business_purpose', q.business_purpose,
            'scan_count', q.scan_count,
            'public_slug', p.public_slug,
            'profile_name', p.profile_name,
            'is_published', COALESCE(p.is_published, false),
            'active_links_count', (
                SELECT COUNT(*)::INT
                FROM public.qr_links l
                WHERE l.qr_profile_id = p.id AND l.is_active = true
            ),
            'updated_at', q.updated_at
        )
        INTO v_item
        FROM public.qr_codes q
        LEFT JOIN public.qr_profiles p ON p.qr_code_id = q.id
        WHERE q.id = v_qr_id
          AND q.status = 'active';

        IF v_item IS NOT NULL THEN
            v_seen := array_append(v_seen, v_qr_id);
            v_items := v_items || jsonb_build_array(
                v_item || jsonb_build_object('session_token', v_tok)
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'items', v_items);
END;
$$;

-- 10. Strict Function Privilege Grants
REVOKE ALL ON FUNCTION public.admin_set_qr_usage_type(UUID, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_qr_usage_type(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.customer_select_usage_mode(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_select_usage_mode(TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.customer_get_dashboard(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_get_dashboard(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.customer_save_business_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_save_business_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_profile(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.customer_get_multi_qr_summary(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_get_multi_qr_summary(TEXT[]) TO anon, authenticated, service_role;

