-- Narrow, column-scoped public read of listing activation status only
GRANT SELECT (seller_id, listing_active, valid_until) ON public.seller_billing TO anon;

CREATE POLICY seller_billing_public_active_flag
  ON public.seller_billing FOR SELECT TO anon
  USING (listing_active = true AND (valid_until IS NULL OR valid_until >= current_date));

DROP POLICY IF EXISTS parts_select_visible ON public.parts;
CREATE POLICY parts_select_visible
  ON public.parts FOR SELECT TO anon, authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.seller_billing b
      WHERE b.seller_id = parts.seller_id
        AND b.listing_active = true
        AND (b.valid_until IS NULL OR b.valid_until >= current_date)
    )
  );