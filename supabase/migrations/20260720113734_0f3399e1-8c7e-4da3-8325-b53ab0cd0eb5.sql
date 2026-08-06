
-- 1. Restrict certificates SELECT to authenticated users only
DROP POLICY IF EXISTS certificates_select_all ON public.certificates;
CREATE POLICY certificates_select_authenticated
  ON public.certificates FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.certificates FROM anon;

-- 2. Restrict part_images SELECT to authenticated users only
DROP POLICY IF EXISTS part_images_select_all ON public.part_images;
CREATE POLICY part_images_select_authenticated
  ON public.part_images FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.part_images FROM anon;

-- 3. Lock down SECURITY DEFINER functions
-- Trigger-only functions: no direct EXECUTE needed by any client role
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()   FROM PUBLIC, anon, authenticated;

-- has_role: used by RLS policies; only signed-in users need to call it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- confirm_deal: buyer-initiated; anon must not be able to call it
REVOKE EXECUTE ON FUNCTION public.confirm_deal(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.confirm_deal(uuid) TO authenticated;
