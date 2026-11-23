-- ==============================================================================
-- SPREADNFC – SERVER-SIDE E-COMMERCE, SUPPORT & SECURITY HARDENING MIGRATION
-- Moves order pricing, bulk discount calculation, inquiry quote estimation,
-- and ticket/order ID generation strictly to PostgreSQL SECURITY DEFINER RPCs
-- so client-side code cannot manipulate prices, discounts, or payment status.
--
-- Safe & Idempotent: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Public Read-Only Product Catalog RPC
CREATE OR REPLACE FUNCTION public.get_public_products(
    p_category TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_items JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'slug', p.slug,
            'short_description', p.short_description,
            'full_description', p.full_description,
            'category', p.category,
            'material', p.material,
            'chip_type', p.chip_type,
            'base_price', p.base_price,
            'sale_price', COALESCE(p.sale_price, p.base_price),
            'images', p.images,
            'features', p.features,
            'colors', p.colors,
            'preview_gradient', p.preview_gradient,
            'is_active', p.is_active,
            'is_featured', p.is_featured,
            'stock_status', p.stock_status,
            'created_at', p.created_at,
            'updated_at', p.updated_at
        ) ORDER BY p.created_at DESC
    ), '[]'::jsonb)
    INTO v_items
    FROM public.products p
    WHERE p.is_active = true
      AND (p_category IS NULL OR p_category = 'all' OR p.category = p_category);

    RETURN jsonb_build_object('ok', true, 'products', v_items);
END;
$$;

-- 2. Server-Side Order Creation (Computes Unit Price, Discount, Total & Forces Pending Status)
CREATE OR REPLACE FUNCTION public.create_public_order(
    p_product_id TEXT,
    p_quantity INTEGER,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_cardholder_name TEXT DEFAULT NULL,
    p_company_name TEXT DEFAULT NULL,
    p_destination_url TEXT DEFAULT NULL,
    p_custom_finish TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_qty INTEGER;
    v_unit_price NUMERIC(10, 2);
    v_product_title TEXT;
    v_discount_pct NUMERIC(5, 2) := 0;
    v_raw_total NUMERIC(10, 2);
    v_discount_amount NUMERIC(10, 2);
    v_final_total NUMERIC(10, 2);
    v_order_num TEXT;
    v_dest_url TEXT;
    v_prod RECORD;
BEGIN
    v_qty := COALESCE(p_quantity, 1);
    IF v_qty < 1 OR v_qty > 10000 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity');
    END IF;

    IF length(trim(COALESCE(p_customer_name, ''))) = 0
       OR length(trim(COALESCE(p_customer_email, ''))) = 0
       OR length(trim(COALESCE(p_customer_phone, ''))) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'missing_customer_details');
    END IF;

    IF NOT (trim(p_customer_email) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_contact_email');
    END IF;

    v_dest_url := NULLIF(trim(COALESCE(p_destination_url, '')), '');
    IF v_dest_url IS NOT NULL AND NOT public.is_safe_http_url(v_dest_url) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_url');
    END IF;

    -- Authoritative price lookup from public.products
    SELECT id, title, COALESCE(sale_price, base_price) AS effective_price
    INTO v_prod
    FROM public.products
    WHERE is_active = true
      AND (id::text = p_product_id OR slug = p_product_id)
    LIMIT 1;

    IF v_prod IS NOT NULL THEN
        v_product_title := v_prod.title;
        v_unit_price := v_prod.effective_price;
    ELSE
        -- Safe fallback if default catalog slugs are used before seeding DB
        CASE p_product_id
            WHEN 'p-matte-pvc', 'matte-pvc-card' THEN
                v_product_title := 'Spread NFC Matte PVC Smart Card';
                v_unit_price := 499.00;
            WHEN 'p-luxury-metal', 'luxury-metal-card' THEN
                v_product_title := 'Spread NFC Luxury Stainless Steel Card';
                v_unit_price := 1299.00;
            WHEN 'p-eco-bamboo', 'eco-bamboo-card' THEN
                v_product_title := 'Spread NFC Natural Eco Bamboo Card';
                v_unit_price := 799.00;
            WHEN 'p-acrylic-standee', 'acrylic-standee' THEN
                v_product_title := 'Spread NFC Contactless Tabletop Standee';
                v_unit_price := 899.00;
            WHEN 'p-epoxy-tag', 'epoxy-phone-tag' THEN
                v_product_title := 'Spread NFC Epoxy Mini Smart Tag';
                v_unit_price := 349.00;
            ELSE
                RETURN jsonb_build_object('ok', false, 'error', 'product_not_found');
        END CASE;
    END IF;

    -- Server-side bulk tier discount
    IF v_qty >= 50 THEN
        v_discount_pct := 35;
    ELSIF v_qty >= 20 THEN
        v_discount_pct := 25;
    ELSIF v_qty >= 5 THEN
        v_discount_pct := 15;
    END IF;

    v_raw_total := v_unit_price * v_qty;
    v_discount_amount := round((v_raw_total * v_discount_pct) / 100.0, 2);
    v_final_total := v_raw_total - v_discount_amount;
    v_order_num := 'ORD-' || to_char(now(), 'YYYY') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

    INSERT INTO public.orders (
        order_number, customer_name, customer_email, customer_phone,
        product_id, product_title, quantity, unit_price, discount_amount, total_amount,
        cardholder_name, company_name, destination_url, custom_finish,
        payment_status, order_status
    ) VALUES (
        v_order_num,
        left(trim(p_customer_name), 120),
        left(lower(trim(p_customer_email)), 120),
        left(trim(p_customer_phone), 40),
        left(COALESCE(p_product_id, ''), 80),
        v_product_title,
        v_qty,
        v_unit_price,
        v_discount_amount,
        v_final_total,
        NULLIF(left(trim(COALESCE(p_cardholder_name, '')), 120), ''),
        NULLIF(left(trim(COALESCE(p_company_name, '')), 120), ''),
        v_dest_url,
        NULLIF(left(trim(COALESCE(p_custom_finish, '')), 80), ''),
        'pending',
        'pending_verification'
    );

    RETURN jsonb_build_object(
        'ok', true,
        'order_number', v_order_num,
        'product_title', v_product_title,
        'quantity', v_qty,
        'unit_price', v_unit_price,
        'discount_amount', v_discount_amount,
        'total_amount', v_final_total,
        'payment_status', 'pending',
        'order_status', 'pending_verification'
    );
END;
$$;

-- 3. Server-Side Support Ticket Creation
CREATE OR REPLACE FUNCTION public.create_public_support_ticket(
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_category TEXT DEFAULT 'general',
    p_associated_qr_number TEXT DEFAULT NULL,
    p_associated_order_number TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT '',
    p_description TEXT DEFAULT '',
    p_priority TEXT DEFAULT 'normal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_ticket_num TEXT;
    v_cat TEXT;
    v_prio TEXT;
BEGIN
    IF length(trim(COALESCE(p_customer_name, ''))) = 0
       OR length(trim(COALESCE(p_customer_email, ''))) = 0
       OR length(trim(COALESCE(p_subject, ''))) = 0
       OR length(trim(COALESCE(p_description, ''))) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'missing_fields');
    END IF;

    IF NOT (trim(p_customer_email) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_contact_email');
    END IF;

    v_cat := lower(trim(COALESCE(p_category, 'general')));
    IF v_cat NOT IN ('nfc_hardware', 'qr_redirect', 'order_status', 'print_defect', 'password_reset', 'bulk_inquiry', 'general') THEN
        v_cat := 'general';
    END IF;

    v_prio := lower(trim(COALESCE(p_priority, 'normal')));
    IF v_prio NOT IN ('low', 'normal', 'medium', 'high', 'urgent') THEN
        v_prio := 'normal';
    END IF;

    v_ticket_num := 'TKT-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

    INSERT INTO public.support_tickets (
        ticket_number, customer_name, customer_email, customer_phone,
        category, associated_qr_number, associated_order_number,
        subject, description, status, priority, resolution_notes
    ) VALUES (
        v_ticket_num,
        left(trim(p_customer_name), 120),
        left(lower(trim(p_customer_email)), 120),
        NULLIF(left(trim(COALESCE(p_customer_phone, '')), 40), ''),
        v_cat,
        NULLIF(upper(left(trim(COALESCE(p_associated_qr_number, '')), 64)), ''),
        NULLIF(left(trim(COALESCE(p_associated_order_number, '')), 64), ''),
        left(trim(p_subject), 200),
        left(trim(p_description), 2000),
        'open',
        v_prio,
        'Assigned to Spread NFC Hardware & Redirection Support Desk.'
    );

    RETURN jsonb_build_object(
        'ok', true,
        'ticket_number', v_ticket_num,
        'status', 'open',
        'priority', v_prio
    );
END;
$$;

-- 4. Server-Side Contact Inquiry Creation (Computes Estimated Quote Server-Side)
CREATE OR REPLACE FUNCTION public.create_public_inquiry(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_company TEXT DEFAULT NULL,
    p_team_size TEXT DEFAULT NULL,
    p_inquiry_type TEXT DEFAULT 'corporate_cards',
    p_card_volume INTEGER DEFAULT 25,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_vol INTEGER;
    v_unit_rate NUMERIC(10, 2);
    v_quote NUMERIC(10, 2);
BEGIN
    IF length(trim(COALESCE(p_name, ''))) = 0
       OR length(trim(COALESCE(p_email, ''))) = 0
       OR length(trim(COALESCE(p_phone, ''))) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'missing_fields');
    END IF;

    IF NOT (trim(p_email) ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_contact_email');
    END IF;

    v_vol := GREATEST(1, LEAST(COALESCE(p_card_volume, 25), 50000));
    IF v_vol >= 100 THEN
        v_unit_rate := 299;
    ELSIF v_vol >= 50 THEN
        v_unit_rate := 324;
    ELSIF v_vol >= 20 THEN
        v_unit_rate := 374;
    ELSIF v_vol >= 5 THEN
        v_unit_rate := 424;
    ELSE
        v_unit_rate := 499;
    END IF;
    v_quote := v_vol * v_unit_rate;

    INSERT INTO public.contact_inquiries (
        name, email, phone, company, team_size, inquiry_type,
        card_volume, estimated_quote, message, status
    ) VALUES (
        left(trim(p_name), 120),
        left(lower(trim(p_email)), 120),
        left(trim(p_phone), 40),
        NULLIF(left(trim(COALESCE(p_company, '')), 120), ''),
        NULLIF(left(trim(COALESCE(p_team_size, '')), 40), ''),
        NULLIF(left(trim(COALESCE(p_inquiry_type, '')), 60), ''),
        v_vol,
        v_quote,
        NULLIF(left(trim(COALESCE(p_message, '')), 2000), ''),
        'new'
    );

    RETURN jsonb_build_object('ok', true, 'estimated_quote', v_quote);
END;
$$;

-- 5. Privileges
REVOKE ALL ON FUNCTION public.get_public_products(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_products(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_public_order(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_public_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_support_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_public_inquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_inquiry(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO anon, authenticated, service_role;

