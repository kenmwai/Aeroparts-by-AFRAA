import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signUrls } from "@/lib/storage";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Catalog — AeroParts by AFRAA" }] }),
  component: CatalogPage,
});

type Part = {
  id: string;
  title: string;
  part_number: string;
  manufacturer: string | null;
  condition: string;
  price: number | null;
  currency: string;
  location: string | null;
  part_images: { storage_path: string }[];
};

const PAGE_SIZE = 24;

function CatalogPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Debounce search input so we don't hit the DB on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("parts")
        .select("id,title,part_number,manufacturer,condition,price,currency,location,part_images(storage_path)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, to);

      // Server-side search: full-text on title/mfr/model + trigram/substring on part number.
      if (debouncedQ) {
        const escaped = debouncedQ.replace(/[%_]/g, (m) => `\\${m}`);
        const tsQuery = debouncedQ
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => t.replace(/[^\w]/g, "") + ":*")
          .join(" & ");
        if (tsQuery) {
          query = query.or(
            `search_tsv.fts.${tsQuery},part_number.ilike.%${escaped}%,title.ilike.%${escaped}%`
          );
        }
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setParts([]);
        setHasMore(false);
      } else {
        const rows = (data ?? []) as Part[];
        setParts(rows);
        setHasMore(rows.length === PAGE_SIZE);
        const paths = rows.map((p) => p.part_images?.[0]?.storage_path).filter(Boolean) as string[];
        const signed = await signUrls("part-images", paths, 3600);
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const p of rows) {
          const path = p.part_images?.[0]?.storage_path;
          if (path && signed[path]) map[p.id] = signed[path];
        }
        setUrls(map);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, page]);

  const filtered = useMemo(() => parts, [parts]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-4xl font-semibold">Parts catalog</h1>
          <p className="mt-2 text-primary-foreground/70">Search by part name, part number, or manufacturer.</p>
          <div className="mt-6 flex max-w-xl items-center gap-2 rounded-md border border-accent/30 bg-secondary/40 px-3">
            <Search className="h-4 w-4 text-accent" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. CFM56, 737-NG, 2255M77P05"
              className="border-0 bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {loading ? (
          <p className="text-muted-foreground">Loading parts…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="font-display text-lg">{debouncedQ ? "No matching parts" : "No parts yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {debouncedQ ? "Try a different part number or manufacturer." : "Once sellers list inventory, it will appear here."}
            </p>
          </div>
        ) : (
          <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/parts/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent hover:shadow-lg"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {urls[p.id] ? (
                    <img src={urls[p.id]} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-display font-semibold">{p.title}</h3>
                    <Badge variant="outline" className="border-accent/40 text-xs">{p.condition}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">P/N {p.part_number}</p>
                  {p.manufacturer && <p className="mt-1 text-xs text-muted-foreground">{p.manufacturer}</p>}
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-display text-lg font-semibold text-primary">
                      {p.price != null ? `${p.currency} ${Number(p.price).toLocaleString()}` : "Request quote"}
                    </span>
                    {p.location && <span className="text-xs text-muted-foreground">{p.location}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}