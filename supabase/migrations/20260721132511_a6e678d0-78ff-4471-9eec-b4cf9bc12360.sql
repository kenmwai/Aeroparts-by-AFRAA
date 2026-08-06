
-- Certificates: restrict SELECT to part owner (seller) or buyers with an RFQ on the part
DROP POLICY IF EXISTS certificates_select_authenticated ON public.certificates;
CREATE POLICY certificates_select_scoped ON public.certificates
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parts p
    WHERE p.id = certificates.part_id
      AND (
        p.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quote_requests q
          WHERE q.part_id = p.id AND q.buyer_id = auth.uid()
        )
      )
  )
);

-- Part images: restrict SELECT to active parts, or the owner regardless of status
DROP POLICY IF EXISTS part_images_select_authenticated ON public.part_images;
CREATE POLICY part_images_select_scoped ON public.part_images
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parts p
    WHERE p.id = part_images.part_id
      AND (p.status = 'active' OR p.seller_id = auth.uid())
  )
);

-- Platform settings: restrict SELECT to admins only. confirm_deal reads via SECURITY DEFINER so it bypasses RLS.
DROP POLICY IF EXISTS platform_settings_read_auth ON public.platform_settings;
CREATE POLICY platform_settings_read_admin ON public.platform_settings
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
