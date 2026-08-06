-- 1. Seller billing
CREATE TYPE public.seller_plan AS ENUM ('subscription', 'commission');

CREATE TABLE public.seller_billing (
  seller_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type public.seller_plan NOT NULL DEFAULT 'commission',
  listing_active boolean NOT NULL DEFAULT false,
  valid_until date,
  commission_rate numeric,
  subscription_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seller_billing TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seller_billing TO authenticated;
GRANT ALL ON public.seller_billing TO service_role;

ALTER TABLE public.seller_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_billing_select_own_or_admin ON public.seller_billing
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY seller_billing_admin_write ON public.seller_billing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER seller_billing_touch BEFORE UPDATE ON public.seller_billing
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Listing gate
CREATE OR REPLACE FUNCTION public.seller_listing_active(_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seller_billing b
    WHERE b.seller_id = _seller_id
      AND b.listing_active = true
      AND (b.valid_until IS NULL OR b.valid_until >= current_date)
  )
$$;

REVOKE ALL ON FUNCTION public.seller_listing_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_listing_active(uuid) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS parts_select_all ON public.parts;
CREATE POLICY parts_select_visible ON public.parts
  FOR SELECT TO anon, authenticated
  USING (public.seller_listing_active(seller_id) OR seller_id = auth.uid());

-- 3. Quote snapshots
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS quote_number text,
  ADD COLUMN IF NOT EXISTS quote_snapshot jsonb;

CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq;

CREATE OR REPLACE FUNCTION public.submit_quote(_rfq_id uuid, _price numeric, _message text, _valid_days integer DEFAULT 30)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq public.quote_requests%ROWTYPE;
  v_part public.parts%ROWTYPE;
  v_seller public.profiles%ROWTYPE;
  v_no text;
  v_certs jsonb;
BEGIN
  SELECT * INTO v_rfq FROM public.quote_requests WHERE id = _rfq_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RFQ not found'; END IF;
  IF v_rfq.seller_id <> auth.uid() THEN RAISE EXCEPTION 'Only the seller can quote this request'; END IF;

  SELECT * INTO v_part FROM public.parts WHERE id = v_rfq.part_id;
  SELECT * INTO v_seller FROM public.profiles WHERE id = v_rfq.seller_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', c.name, 'type', c.cert_type, 'issued_by', c.issued_by, 'issued_at', c.issued_at
  )), '[]'::jsonb) INTO v_certs
  FROM public.certificates c WHERE c.part_id = v_part.id;

  v_no := COALESCE(v_rfq.quote_number,
    'QT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quote_number_seq')::text, 6, '0'));

  UPDATE public.quote_requests
  SET status = 'responded',
      seller_response = _message,
      quoted_price = _price,
      responded_at = now(),
      quote_number = v_no,
      quote_snapshot = jsonb_build_object(
        'quote_number', v_no,
        'issued_at', now(),
        'valid_until', (current_date + COALESCE(_valid_days, 30)),
        'unit_price', _price,
        'quantity', v_rfq.quantity,
        'currency', v_part.currency,
        'terms', _message,
        'part', jsonb_build_object(
          'title', v_part.title,
          'part_number', v_part.part_number,
          'serial_number', v_part.serial_number,
          'manufacturer', v_part.manufacturer,
          'aircraft_model', v_part.aircraft_model,
          'ata_chapter', v_part.ata_chapter,
          'condition', v_part.condition,
          'eccn', v_part.eccn,
          'country_of_origin', v_part.country_of_origin,
          'documentation_status', v_part.documentation_status,
          'certificates', v_certs
        ),
        'seller', jsonb_build_object(
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
        'buyer', jsonb_build_object(
          'email', v_rfq.contact_email,
          'phone', v_rfq.contact_phone
        )
      )
  WHERE id = _rfq_id;

  RETURN v_no;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quote(uuid, numeric, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quote(uuid, numeric, text, integer) TO authenticated;

-- 4. Capture signup details into profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE m jsonb;
BEGIN
  m := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  INSERT INTO public.profiles (
    id, full_name, company_name, phone, country,
    tax_id, address_line1, address_line2, city, postal_code
  ) VALUES (
    NEW.id,
    COALESCE(m->>'full_name', m->>'name'),
    m->>'company_name',
    m->>'phone',
    m->>'country',
    m->>'tax_id',
    m->>'address_line1',
    m->>'address_line2',
    m->>'city',
    m->>'postal_code'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
