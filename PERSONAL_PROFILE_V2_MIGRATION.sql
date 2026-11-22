-- ==============================================================================
-- SPREADNFC – PERSONAL DIGITAL PROFILE V2 MIGRATION
-- Adds tagline, curated avatar_id support, and secure username availability check.
-- Safe & Idempotent: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

ALTER TABLE public.qr_profiles
    ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS avatar_id TEXT DEFAULT NULL;

-- Curated avatar ID validation (avatar-01 through avatar-18)
CREATE OR REPLACE FUNCTION public.is_valid_avatar_id(p_avatar_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    IF p_avatar_id IS NULL OR length(trim(p_avatar_id)) = 0 THEN
        RETURN true;
    END IF;
    v_clean := lower(trim(p_avatar_id));
    RETURN v_clean ~ '^avatar-(0[1-9]|1[0-8])$';
END;
$$;

-- Extend safe profile image validation to permit curated static /avatars/ paths as well
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
        RETURN false;
    END IF;
    IF v_clean ~ '^/avatars/avatar-(0[1-9]|1[0-8])\.(webp|png|avif|svg)$' THEN
        RETURN true;
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

-- Secure username availability check (only callable with a valid customer session token)
CREATE OR REPLACE FUNCTION public.check_public_slug_available(
    p_session_token TEXT,
    p_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qr_id UUID;
    v_clean TEXT;
BEGIN
    v_qr_id := public.verify_customer_session(p_session_token);
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
    END IF;

    v_clean := lower(trim(COALESCE(p_slug, '')));
    IF length(v_clean) = 0 THEN
        RETURN jsonb_build_object('ok', true, 'available', true);
    END IF;

    IF NOT public.is_valid_public_slug(v_clean) THEN
        RETURN jsonb_build_object('ok', true, 'available', false, 'reason', 'invalid_slug');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.qr_profiles
        WHERE LOWER(public_slug) = v_clean AND qr_code_id <> v_qr_id
    ) THEN
        RETURN jsonb_build_object('ok', true, 'available', false, 'reason', 'slug_taken');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.qr_codes
        WHERE LOWER(qr_number) = v_clean AND id <> v_qr_id
    ) THEN
        RETURN jsonb_build_object('ok', true, 'available', false, 'reason', 'slug_taken');
    END IF;

    RETURN jsonb_build_object('ok', true, 'available', true);
END;
$$;

-- Updated customer_get_dashboard: includes tagline & avatar_id
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
            'avatar_id', v_profile.avatar_id,
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

-- Updated customer_save_personal_profile: supports p_tagline and p_avatar_id
DROP FUNCTION IF EXISTS public.customer_save_personal_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB);
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

-- Updated get_public_profile: includes tagline & avatar_id (never exposes private fields)
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
            'avatar_id', v_profile.avatar_id,
            'tagline', v_profile.tagline,
            'bio', v_profile.bio,
            'public_slug', v_profile.public_slug,
            'theme', v_profile.theme
        ),
        'links', v_links
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_public_slug_available(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_save_personal_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_get_dashboard(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- SECURITY HARDENING: LOCK DOWN DIRECT ANON READS ON qr_profiles & qr_links
-- Public profile rendering uses get_public_profile() SECURITY DEFINER RPC only.
-- ==============================================================================
REVOKE ALL ON public.qr_profiles FROM anon, PUBLIC;
GRANT ALL ON public.qr_profiles TO authenticated, service_role;
DROP POLICY IF EXISTS "Public Published Profiles Read" ON public.qr_profiles;

REVOKE ALL ON public.qr_links FROM anon, PUBLIC;
GRANT ALL ON public.qr_links TO authenticated, service_role;
DROP POLICY IF EXISTS "Public Active Links Read" ON public.qr_links;

-- ==============================================================================
-- AUDIT LOGGING FOR QR CODES (Append-Only, Admin Read-Only)
-- ==============================================================================
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

