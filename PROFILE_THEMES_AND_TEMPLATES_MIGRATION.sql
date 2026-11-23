-- ==============================================================================
-- SPREADNFC – BUSINESS & PERSONAL THEME TEMPLATES MIGRATION
-- Extends qr_profiles.theme and customer save RPCs to support distinct
-- minimalist color & layout templates separately for Business & Personal QRs.
-- Safe & Idempotent: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Theme Template Validation Helper
CREATE OR REPLACE FUNCTION public.is_valid_profile_theme(p_theme TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    v_clean := lower(trim(COALESCE(p_theme, '')));
    RETURN v_clean = ANY(ARRAY[
        'light', 'dark',
        'biz_ivory', 'biz_obsidian', 'biz_sage', 'biz_slate', 'biz_sand', 'biz_emerald_dark',
        'per_paper', 'per_ink', 'per_terracotta', 'per_ocean', 'per_blush', 'per_moss',
        'per_pop_yellow', 'per_arcade_mint', 'per_sunset_coral', 'per_cobalt_vibe'
    ]);
END;
$$;

-- 2. Update qr_profiles.theme CHECK constraint
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
          AND pg_get_constraintdef(c.oid) ILIKE '%theme%'
    LOOP
        EXECUTE format('ALTER TABLE public.qr_profiles DROP CONSTRAINT %I', v_conname);
    END LOOP;
END $$;

ALTER TABLE public.qr_profiles
    ADD CONSTRAINT qr_profiles_theme_check
    CHECK (public.is_valid_profile_theme(theme));

-- 3. Update Personal Profile Save RPC (12-arg signature)
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
    p_links JSONB DEFAULT '[]'::jsonb,
    p_tagline TEXT DEFAULT NULL,
    p_avatar_id TEXT DEFAULT NULL
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
    v_clean_tagline TEXT;
    v_clean_avatar_id TEXT;
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

    v_clean_tagline := NULLIF(LEFT(TRIM(COALESCE(p_tagline, '')), 80), '');

    v_clean_avatar_id := NULLIF(LOWER(TRIM(COALESCE(p_avatar_id, ''))), '');
    IF NOT public.is_valid_avatar_id(v_clean_avatar_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_avatar');
    END IF;

    v_clean_theme := COALESCE(NULLIF(LOWER(TRIM(p_theme)), ''), 'per_paper');
    IF NOT public.is_valid_profile_theme(v_clean_theme) THEN
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

    IF p_links IS NULL OR jsonb_typeof(p_links) <> 'array' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_links_payload');
    END IF;

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

        IF (v_platform || '|' || LOWER(v_url)) = ANY(v_seen_pairs) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'duplicate_link');
        END IF;
        v_seen_pairs := array_append(v_seen_pairs, v_platform || '|' || LOWER(v_url));
    END LOOP;

    INSERT INTO public.qr_profiles (
        qr_code_id, profile_name, profile_image, avatar_id, tagline, bio, contact_email, contact_phone, public_slug, theme, is_published
    ) VALUES (
        v_qr_id,
        v_clean_name,
        NULLIF(TRIM(COALESCE(p_profile_image, '')), ''),
        v_clean_avatar_id,
        v_clean_tagline,
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
        avatar_id = EXCLUDED.avatar_id,
        tagline = EXCLUDED.tagline,
        bio = EXCLUDED.bio,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
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

-- 4. Update Business Profile Save RPC (21-arg signature)
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

    v_clean_theme := COALESCE(NULLIF(LOWER(TRIM(p_theme)), ''), 'biz_ivory');
    IF NOT public.is_valid_profile_theme(v_clean_theme) THEN
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

GRANT EXECUTE ON FUNCTION public.is_valid_profile_theme(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_save_personal_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_save_business_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- 5. Self-Service Customer Profile Mode Switcher (Preserves existing links, profile & URL data)
CREATE OR REPLACE FUNCTION public.customer_switch_usage_mode(
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
    v_qr RECORD;
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    IF p_usage_type IS NULL OR p_usage_type NOT IN ('personal', 'business', 'business_profile') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_usage_type');
    END IF;

    SELECT id, qr_number, qr_name, business_name
    INTO v_qr
    FROM public.qr_codes
    WHERE id = v_qr_id
    FOR UPDATE;

    IF v_qr IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;

    UPDATE public.qr_codes
    SET usage_type = p_usage_type,
        updated_at = now()
    WHERE id = v_qr_id;

    IF p_usage_type = 'personal' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_type, profile_name, theme)
        VALUES (
            v_qr_id,
            'personal',
            COALESCE(NULLIF(v_qr.qr_name, ''), v_qr.qr_number),
            'per_paper'
        )
        ON CONFLICT (qr_code_id) DO UPDATE SET
            profile_type = 'personal',
            updated_at = now();
    ELSIF p_usage_type = 'business_profile' THEN
        INSERT INTO public.qr_profiles (qr_code_id, profile_type, profile_name, theme)
        VALUES (
            v_qr_id,
            'business',
            COALESCE(NULLIF(v_qr.business_name, ''), NULLIF(v_qr.qr_name, ''), v_qr.qr_number),
            'biz_ivory'
        )
        ON CONFLICT (qr_code_id) DO UPDATE SET
            profile_type = 'business',
            updated_at = now();
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'qr_number', v_qr.qr_number,
        'usage_type', p_usage_type
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_switch_usage_mode(TEXT, TEXT) TO anon, authenticated, service_role;

