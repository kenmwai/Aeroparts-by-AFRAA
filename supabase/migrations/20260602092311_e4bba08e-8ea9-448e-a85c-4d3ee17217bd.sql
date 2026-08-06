
-- Fix function search_path warning
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Lock down SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- STORAGE POLICIES
-- Anyone (including anon) can read these buckets so signed URLs work for the public catalog
CREATE POLICY "public_read_part_images" ON storage.objects FOR SELECT
  USING (bucket_id = 'part-images');
CREATE POLICY "public_read_certificates" ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

-- Owners (path layout: {user_id}/{part_id}/filename) can upload / modify / delete their own files
CREATE POLICY "owner_insert_part_images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'part-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner_update_part_images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'part-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner_delete_part_images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'part-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "owner_insert_certificates" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner_update_certificates" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner_delete_certificates" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
