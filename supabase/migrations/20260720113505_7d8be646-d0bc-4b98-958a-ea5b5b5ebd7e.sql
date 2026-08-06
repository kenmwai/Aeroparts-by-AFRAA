
-- Parts: hot query paths
CREATE INDEX IF NOT EXISTS parts_status_created_idx ON public.parts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_seller_created_idx ON public.parts (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS parts_part_number_idx    ON public.parts (part_number);
CREATE INDEX IF NOT EXISTS parts_manufacturer_idx   ON public.parts (manufacturer);
CREATE INDEX IF NOT EXISTS parts_ata_chapter_idx    ON public.parts (ata_chapter);
CREATE INDEX IF NOT EXISTS parts_condition_idx      ON public.parts (condition);

-- Full-text search on parts (generated tsvector + GIN)
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(part_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(manufacturer, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(aircraft_model, '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS parts_search_tsv_idx ON public.parts USING GIN (search_tsv);

-- Trigram index for prefix/substring matches on part numbers
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS parts_part_number_trgm_idx ON public.parts USING GIN (part_number gin_trgm_ops);

-- Quote requests
CREATE INDEX IF NOT EXISTS qr_buyer_created_idx  ON public.quote_requests (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qr_seller_created_idx ON public.quote_requests (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qr_part_idx           ON public.quote_requests (part_id);
CREATE INDEX IF NOT EXISTS qr_status_idx         ON public.quote_requests (status);

-- Invoices
CREATE INDEX IF NOT EXISTS invoices_seller_issued_idx ON public.invoices (seller_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS invoices_buyer_issued_idx  ON public.invoices (buyer_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS invoices_rfq_idx           ON public.invoices (rfq_id);

-- Related tables
CREATE INDEX IF NOT EXISTS part_images_part_idx  ON public.part_images (part_id);
CREATE INDEX IF NOT EXISTS certificates_part_idx ON public.certificates (part_id);
CREATE INDEX IF NOT EXISTS user_roles_user_idx   ON public.user_roles (user_id);
