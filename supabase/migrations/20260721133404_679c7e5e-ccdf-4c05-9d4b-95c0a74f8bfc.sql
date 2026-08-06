
DO $$ BEGIN
  CREATE TYPE public.part_doc_status AS ENUM ('undocumented','documented');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS documentation_status public.part_doc_status NOT NULL DEFAULT 'undocumented';

-- Backfill: any part that already has at least one certificate is documented
UPDATE public.parts p
SET documentation_status = 'documented'
WHERE EXISTS (SELECT 1 FROM public.certificates c WHERE c.part_id = p.id);

CREATE INDEX IF NOT EXISTS parts_doc_status_idx ON public.parts (documentation_status);

-- Trigger: keep doc status in sync with presence of certificates
CREATE OR REPLACE FUNCTION public.sync_part_doc_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  v_part_id uuid;
  v_count int;
BEGIN
  v_part_id := COALESCE(NEW.part_id, OLD.part_id);
  SELECT count(*) INTO v_count FROM public.certificates WHERE part_id = v_part_id;
  UPDATE public.parts
    SET documentation_status = CASE WHEN v_count > 0 THEN 'documented'::public.part_doc_status
                                    ELSE 'undocumented'::public.part_doc_status END
    WHERE id = v_part_id;
  RETURN NULL;
END; $fn$;

REVOKE EXECUTE ON FUNCTION public.sync_part_doc_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS certificates_sync_doc_status_ins ON public.certificates;
DROP TRIGGER IF EXISTS certificates_sync_doc_status_del ON public.certificates;

CREATE TRIGGER certificates_sync_doc_status_ins
AFTER INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.sync_part_doc_status();

CREATE TRIGGER certificates_sync_doc_status_del
AFTER DELETE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.sync_part_doc_status();
