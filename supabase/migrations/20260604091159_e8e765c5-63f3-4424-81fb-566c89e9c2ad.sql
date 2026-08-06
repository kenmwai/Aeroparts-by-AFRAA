-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY user_roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platform settings (single row, id = TRUE)
CREATE TABLE public.platform_settings (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
  commission_rate numeric NOT NULL DEFAULT 0.01 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_read_auth ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY platform_settings_admin_write ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (id, commission_rate) VALUES (TRUE, 0.01)
  ON CONFLICT (id) DO NOTHING;

-- Update confirm_deal to use the configured rate
CREATE OR REPLACE FUNCTION public.confirm_deal(_rfq_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_rfq public.quote_requests%ROWTYPE;
  v_part public.parts%ROWTYPE;
  v_seller public.profiles%ROWTYPE;
  v_buyer_email text;
  v_price numeric;
  v_invoice_id uuid;
  v_invoice_no text;
  v_certs jsonb;
  v_rate numeric;
BEGIN
  SELECT * INTO v_rfq FROM public.quote_requests WHERE id = _rfq_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RFQ not found'; END IF;
  IF v_rfq.buyer_id <> auth.uid() THEN RAISE EXCEPTION 'Only the buyer can confirm this deal'; END IF;
  IF v_rfq.status <> 'responded' THEN RAISE EXCEPTION 'Deal can only be confirmed after a seller quote'; END IF;
  IF v_rfq.quoted_price IS NULL THEN RAISE EXCEPTION 'No quoted price on this RFQ'; END IF;

  v_price := v_rfq.quoted_price;

  SELECT commission_rate INTO v_rate FROM public.platform_settings WHERE id = TRUE;
  v_rate := COALESCE(v_rate, 0.01);

  SELECT * INTO v_part FROM public.parts WHERE id = v_rfq.part_id;
  SELECT * INTO v_seller FROM public.profiles WHERE id = v_rfq.seller_id;
  SELECT email INTO v_buyer_email FROM auth.users WHERE id = v_rfq.buyer_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', c.name, 'type', c.cert_type, 'issued_by', c.issued_by, 'issued_at', c.issued_at
  )), '[]'::jsonb) INTO v_certs
  FROM public.certificates c WHERE c.part_id = v_part.id;

  v_invoice_no := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');

  UPDATE public.quote_requests
  SET status = 'confirmed', buyer_confirmed_at = now(), final_price = v_price
  WHERE id = _rfq_id;

  INSERT INTO public.invoices (
    invoice_number, rfq_id, seller_id, buyer_id,
    sell_price, currency, commission_rate, commission_amount,
    part_snapshot, seller_snapshot, buyer_snapshot
  ) VALUES (
    v_invoice_no, _rfq_id, v_rfq.seller_id, v_rfq.buyer_id,
    v_price, v_part.currency, v_rate, round(v_price * v_rate, 2),
    jsonb_build_object(
      'title', v_part.title,
      'part_number', v_part.part_number,
      'serial_number', v_part.serial_number,
      'manufacturer', v_part.manufacturer,
      'aircraft_model', v_part.aircraft_model,
      'ata_chapter', v_part.ata_chapter,
      'condition', v_part.condition,
      'quantity', v_rfq.quantity,
      'eccn', v_part.eccn,
      'country_of_origin', v_part.country_of_origin,
      'certificates', v_certs
    ),
    jsonb_build_object(
      'full_name', v_seller.full_name,
      'company_name', v_seller.company_name,
      'tax_id', v_seller.tax_id,
      'address_line1', v_seller.address_line1,
      'address_line2', v_seller.address_line2,
      'city', v_seller.city,
      'postal_code', v_seller.postal_code,
      'country', v_seller.country,
      'phone', v_seller.phone
    ),
    jsonb_build_object(
      'email', COALESCE(v_rfq.contact_email, v_buyer_email),
      'phone', v_rfq.contact_phone
    )
  ) RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$function$;