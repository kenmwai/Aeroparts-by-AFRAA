CREATE TABLE public.account_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  plan_type public.seller_plan NOT NULL DEFAULT 'commission',
  subscription_amount numeric CHECK (subscription_amount IS NULL OR subscription_amount >= 0),
  commission_rate numeric CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 1)),
  currency text NOT NULL DEFAULT 'USD',
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_categories TO authenticated;
GRANT ALL ON public.account_categories TO service_role;

ALTER TABLE public.account_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_categories_public_read ON public.account_categories
  FOR SELECT TO anon, authenticated USING (is_public OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY account_categories_admin_write ON public.account_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER account_categories_touch BEFORE UPDATE ON public.account_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.account_categories (slug, name, description, plan_type, subscription_amount, commission_rate, sort_order) VALUES
  ('afraa-members', 'AFRAA Members', 'AFRAA member airlines listing surplus and rotable inventory.', 'subscription', 0, 0, 1),
  ('afraa-partners', 'AFRAA Partners', 'Strategic partner suppliers and MROs on an annual subscription.', 'subscription', 2400, 0, 2),
  ('other-airlines', 'Other Airlines', 'Non-member airlines selling parts on a per-sale commission.', 'commission', NULL, 0.02, 3),
  ('other-suppliers', 'Other Suppliers', 'Independent distributors, brokers and MROs on commission.', 'commission', NULL, 0.03, 4);

ALTER TABLE public.seller_billing
  ADD COLUMN category_id uuid REFERENCES public.account_categories(id) ON DELETE SET NULL;

CREATE INDEX seller_billing_category_idx ON public.seller_billing (category_id);

CREATE OR REPLACE FUNCTION public.effective_commission_rate(_seller_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT b.commission_rate FROM public.seller_billing b WHERE b.seller_id = _seller_id),
    (SELECT c.commission_rate FROM public.seller_billing b
       JOIN public.account_categories c ON c.id = b.category_id
      WHERE b.seller_id = _seller_id),
    (SELECT s.commission_rate FROM public.platform_settings s WHERE s.id = TRUE),
    0.01
  )
$$;

REVOKE EXECUTE ON FUNCTION public.effective_commission_rate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_commission_rate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_deal(_rfq_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_rate := public.effective_commission_rate(v_rfq.seller_id);

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

REVOKE EXECUTE ON FUNCTION public.confirm_deal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_deal(uuid) TO authenticated;