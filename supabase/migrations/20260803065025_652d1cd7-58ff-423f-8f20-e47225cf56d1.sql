DROP POLICY IF EXISTS auth_read_certificates ON storage.objects;

CREATE POLICY "cert_read_scoped" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.parts p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quote_requests q
          WHERE q.part_id = p.id AND q.buyer_id = auth.uid()
        )
      )
  )
);