import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileBadge, MapPin, Package, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { signUrl } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parts/$id")({
  head: () => ({ meta: [{ title: "Part — AeroParts by AFRAA" }] }),
  component: PartPage,
});

type Part = {
  id: string;
  seller_id: string;
  title: string;
  part_number: string;
  serial_number: string | null;
  manufacturer: string | null;
  aircraft_model: string | null;
  ata_chapter: string | null;
  condition: string;
  description: string | null;
  price: number | null;
  currency: string;
  quantity: number;
  location: string | null;
  part_images: { id: string; storage_path: string }[];
  certificates: { id: string; name: string; cert_type: string | null; storage_path: string; issued_by: string | null }[];
  documentation_status?: "documented" | "undocumented";
};
type Seller = { company_name: string | null; full_name: string | null };

function PartPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [part, setPart] = useState<Part | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [certUrls, setCertUrls] = useState<Record<string, string>>({});

  // RFQ state
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("parts")
        .select(
          "id,seller_id,title,part_number,serial_number,manufacturer,aircraft_model,ata_chapter,condition,description,price,currency,quantity,location,documentation_status,part_images(id,storage_path),certificates(id,name,cert_type,storage_path,issued_by)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return;
      setPart(data as unknown as Part);
      const { data: prof } = await supabase
        .from("public_profiles" as never)
        .select("company_name,full_name")
        .eq("id", data.seller_id)
        .maybeSingle();
      if (prof) setSeller(prof as Seller);
      const imgs = await Promise.all(
        (data.part_images ?? []).map((i: { storage_path: string }) => signUrl("part-images", i.storage_path, 3600))
      );
      setImgUrls(imgs.filter(Boolean) as string[]);
      const cmap: Record<string, string> = {};
      await Promise.all(
        (data.certificates ?? []).map(async (c: { id: string; storage_path: string }) => {
          const u = await signUrl("certificates", c.storage_path, 3600);
          if (u) cmap[c.id] = u;
        })
      );
      setCertUrls(cmap);
    })();
  }, [id]);

  async function submitRFQ(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to request a quote");
      navigate({ to: "/auth" });
      return;
    }
    if (!part) return;
    setSubmitting(true);
    const { error } = await supabase.from("quote_requests").insert({
      part_id: part.id,
      buyer_id: user.id,
      seller_id: part.seller_id,
      quantity: qty,
      message,
      contact_email: email,
      contact_phone: phone || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Quote request sent. The seller will respond shortly.");
    setOpen(false);
    setMessage("");
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-12">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link to="/catalog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {imgUrls[activeImg] ? (
                <img src={imgUrls[activeImg]} alt={part.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No image available</div>
              )}
            </div>
            {imgUrls.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {imgUrls.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square overflow-hidden rounded border-2 ${i === activeImg ? "border-accent" : "border-border"}`}
                  >
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-accent/40">{part.condition}</Badge>
              {part.documentation_status === "documented" ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Documented</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-700">Undocumented</Badge>
              )}
              {seller?.company_name && (
                <span className="text-xs text-muted-foreground">by {seller.company_name}</span>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">{part.title}</h1>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              P/N {part.part_number}{part.serial_number ? ` · S/N ${part.serial_number}` : ""}
            </p>

            <div className="mt-6 rounded-lg border border-border bg-card p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Listed price</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-primary">
                    {part.price != null ? `${part.currency} ${Number(part.price).toLocaleString()}` : "On request"}
                  </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">Request quote</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request a quote</DialogTitle></DialogHeader>
                    <form onSubmit={submitRFQ} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="qty">Quantity</Label>
                          <Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || "1"))} />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone (optional)</Label>
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="rfq-email">Contact email</Label>
                        <Input id="rfq-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="msg">Message</Label>
                        <Textarea id="msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Needed by, certifications required, AOG?" />
                      </div>
                      <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground">
                        Send request
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Manufacturer" value={part.manufacturer} />
              <Detail label="Aircraft model" value={part.aircraft_model} />
              <Detail label="ATA chapter" value={part.ata_chapter} />
              <Detail label="Quantity available" value={String(part.quantity)} icon={<Package className="h-4 w-4" />} />
              <Detail label="Location" value={part.location} icon={<MapPin className="h-4 w-4" />} />
            </dl>

            {part.description && (
              <div className="mt-6">
                <h3 className="font-display font-semibold">Description</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{part.description}</p>
              </div>
            )}

            {/* Certificates */}
            <div className="mt-8">
              <h3 className="font-display text-lg font-semibold">Certificates & documentation</h3>
              {part.certificates.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No certificates uploaded.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {part.certificates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <FileBadge className="h-4 w-4 text-accent" />
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.cert_type ?? "Document"}{c.issued_by ? ` · ${c.issued_by}` : ""}
                          </p>
                        </div>
                      </div>
                      {certUrls[c.id] && (
                        <a href={certUrls[c.id]} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:text-accent">
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 font-medium">{icon}{value}</dd>
    </div>
  );
}