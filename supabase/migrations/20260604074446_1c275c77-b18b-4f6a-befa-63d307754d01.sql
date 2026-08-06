
-- 1. Extend parts with compliance fields
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS eccn text,
  ADD COLUMN IF NOT EXISTS country_of_origin text;

-- 2. Extend profiles with billing details (seller-as-vendor on invoice)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text;

-- 3. Extend rfq_status with 'confirmed'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='confirmed' AND enumtypid='public.rfq_status'::regtype) THEN
    ALTER TYPE public.rfq_status ADD VALUE 'confirmed';
  END IF;
END $$;

-- 4. Add deal-confirmation fields to quote_requests
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS final_price numeric,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz;

-- 5. Sequential invoice number
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1001;

-- 6. Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  rfq_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  sell_price numeric NOT NULL,
  currency text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.01,
  commission_amount numeric NOT NULL,
  -- frozen snapshot for compliance & audit
  part_snapshot jsonb NOT NULL,
  seller_snapshot jsonb NOT NULL,
  buyer_snapshot jsonb NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued'
);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_party" ON public.invoices
  FOR SELECT TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- 7. Security-definer function: buyer confirms deal -> invoice created
CREATE OR REPLACE FUNCTION public.confirm_deal(_rfq_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq public.quote_requests%ROWTYPE;
  v_part public.parts%ROWTYPE;
  v_seller public.profiles%ROWTYPE;
  v_buyer_email text;
  v_price numeric;
  v_invoice_id uuid;
  v_invoice_no text;
  v_certs jsonb;
BEGIN
  SELECT * INTO v_rfq FROM public.quote_requests WHERE id = _rfq_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'RFQ not found'; END IF;
  IF v_rfq.buyer_id <> auth.uid() THEN RAISE EXCEPTION 'Only the buyer can confirm this deal'; END IF;
  IF v_rfq.status <> 'responded' THEN RAISE EXCEPTION 'Deal can only be confirmed after a seller quote'; END IF;
  IF v_rfq.quoted_price IS NULL THEN RAISE EXCEPTION 'No quoted price on this RFQ'; END IF;

  v_price := v_rfq.quoted_price;

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
    v_price, v_part.currency, 0.01, round(v_price * 0.01, 2),
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
$$;

REVOKE ALL ON FUNCTION public.confirm_deal(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.confirm_deal(uuid) TO authenticated;
