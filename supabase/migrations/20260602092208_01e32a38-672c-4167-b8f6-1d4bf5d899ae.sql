
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARTS
CREATE TYPE public.part_condition AS ENUM ('NE','NS','SV','AR','OH','RP','AS-IS');
CREATE TYPE public.part_status AS ENUM ('active','sold','draft','archived');

CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  part_number TEXT NOT NULL,
  manufacturer TEXT,
  aircraft_model TEXT,
  ata_chapter TEXT,
  condition public.part_condition NOT NULL DEFAULT 'NE',
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  status public.part_status NOT NULL DEFAULT 'active',
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parts_seller_idx ON public.parts(seller_id);
CREATE INDEX parts_part_number_idx ON public.parts(part_number);
CREATE INDEX parts_status_idx ON public.parts(status);
GRANT SELECT ON public.parts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parts_select_all" ON public.parts FOR SELECT USING (true);
CREATE POLICY "parts_insert_own" ON public.parts FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "parts_update_own" ON public.parts FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "parts_delete_own" ON public.parts FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- PART IMAGES
CREATE TABLE public.part_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX part_images_part_idx ON public.part_images(part_id);
GRANT SELECT ON public.part_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_images TO authenticated;
GRANT ALL ON public.part_images TO service_role;
ALTER TABLE public.part_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "part_images_select_all" ON public.part_images FOR SELECT USING (true);
CREATE POLICY "part_images_owner_write" ON public.part_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parts p WHERE p.id = part_id AND p.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parts p WHERE p.id = part_id AND p.seller_id = auth.uid()));

-- CERTIFICATES
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cert_type TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  issued_by TEXT,
  issued_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX certificates_part_idx ON public.certificates(part_id);
GRANT SELECT ON public.certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_select_all" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "certificates_owner_write" ON public.certificates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parts p WHERE p.id = part_id AND p.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parts p WHERE p.id = part_id AND p.seller_id = auth.uid()));

-- QUOTE REQUESTS
CREATE TYPE public.rfq_status AS ENUM ('pending','responded','closed','declined');
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status public.rfq_status NOT NULL DEFAULT 'pending',
  seller_response TEXT,
  quoted_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
CREATE INDEX rfq_buyer_idx ON public.quote_requests(buyer_id);
CREATE INDEX rfq_seller_idx ON public.quote_requests(seller_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfq_select_party" ON public.quote_requests FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "rfq_insert_buyer" ON public.quote_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "rfq_update_seller" ON public.quote_requests FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER parts_touch BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
