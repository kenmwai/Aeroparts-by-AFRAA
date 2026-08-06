DROP POLICY IF EXISTS account_categories_public_read ON public.account_categories;

CREATE POLICY account_categories_anon_read
  ON public.account_categories FOR SELECT TO anon
  USING (is_public);

CREATE POLICY account_categories_auth_read
  ON public.account_categories FOR SELECT TO authenticated
  USING (is_public OR public.has_role(auth.uid(), 'admin'));