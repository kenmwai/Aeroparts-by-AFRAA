-- Seed admin role for the platform owner
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'kkionero@afraa.org'
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin-only account listing (includes email from auth.users)
CREATE OR REPLACE FUNCTION public.admin_list_accounts()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  company_name text,
  city text,
  country text,
  is_admin boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  RETURN QUERY
  SELECT u.id,
         u.email::text,
         p.full_name,
         p.company_name,
         p.city,
         p.country,
         EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts() TO authenticated;

-- Admin-only role assignment by email
CREATE OR REPLACE FUNCTION public.admin_set_admin_by_email(_email text, _make_admin boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No account found for %', _email;
  END IF;

  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF v_id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot remove your own admin role';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = v_id AND role = 'admin';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_admin_by_email(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin_by_email(text, boolean) TO authenticated;