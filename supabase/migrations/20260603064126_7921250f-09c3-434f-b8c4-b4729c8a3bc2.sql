
-- 1. Profiles: tighten select to owner-only, expose safe fields via view
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, company_name, country, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow seller info lookup for any part via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_seller_public(_seller_id uuid)
RETURNS TABLE (id uuid, full_name text, company_name text, country text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, full_name, company_name, country, avatar_url
  FROM public.profiles WHERE id = _seller_id
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_public(uuid) TO anon, authenticated;

-- 2. Quote requests: only sellers can update
DROP POLICY IF EXISTS rfq_update_seller ON public.quote_requests;

CREATE POLICY rfq_update_seller_only ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- 3. Storage: remove public read, restrict to authenticated + active parts
DROP POLICY IF EXISTS public_read_part_images ON storage.objects;
DROP POLICY IF EXISTS public_read_certificates ON storage.objects;

CREATE POLICY auth_read_part_images ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'part-images'
    AND EXISTS (
      SELECT 1 FROM public.parts p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.status = 'active'
    )
  );

CREATE POLICY auth_read_certificates ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM public.parts p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.status = 'active'
    )
  );

-- Sellers always retain read access to their own files regardless of status
CREATE POLICY owner_read_part_images ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'part-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY owner_read_certificates ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
