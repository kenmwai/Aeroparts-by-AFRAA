import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { X, Upload as UploadIcon, FileBadge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadFile, signUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const CONDITIONS = ["NE", "NS", "SV", "AR", "OH", "RP", "AS-IS"] as const;
const CURRENCIES = ["USD", "EUR", "GBP"] as const;

type ExistingImage = { id: string; storage_path: string; url?: string };
type ExistingCert = { id: string; name: string; cert_type: string | null; storage_path: string; url?: string };

export function PartForm({ partId }: { partId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [aircraftModel, setAircraftModel] = useState("");
  const [ata, setAta] = useState("");
  const [condition, setCondition] = useState<string>("NE");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [eccn, setEccn] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newCerts, setNewCerts] = useState<{ file: File; name: string; type: string }[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [existingCerts, setExistingCerts] = useState<ExistingCert[]>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!partId) return;
    (async () => {
      const { data } = await supabase
        .from("parts")
        .select("*,part_images(id,storage_path),certificates(id,name,cert_type,storage_path)")
        .eq("id", partId)
        .maybeSingle();
      if (!data) return;
      setTitle(data.title);
      setPartNumber(data.part_number);
      setManufacturer(data.manufacturer ?? "");
      setAircraftModel(data.aircraft_model ?? "");
      setAta(data.ata_chapter ?? "");
      setCondition(data.condition);
      setDescription(data.description ?? "");
      setPrice(data.price?.toString() ?? "");
      setCurrency(data.currency);
      setQuantity(data.quantity);
      setLocation(data.location ?? "");
      setSerialNumber((data as { serial_number?: string | null }).serial_number ?? "");
      setEccn((data as { eccn?: string | null }).eccn ?? "");
      setCountryOfOrigin((data as { country_of_origin?: string | null }).country_of_origin ?? "");
      const imgs = await Promise.all(
        (data.part_images as ExistingImage[]).map(async (i) => ({ ...i, url: (await signUrl("part-images", i.storage_path, 3600)) ?? undefined }))
      );
      setExistingImages(imgs);
      const certs = await Promise.all(
        (data.certificates as ExistingCert[]).map(async (c) => ({ ...c, url: (await signUrl("certificates", c.storage_path, 3600)) ?? undefined }))
      );
      setExistingCerts(certs);
    })();
  }, [partId]);

  async function removeExistingImage(img: ExistingImage) {
    await supabase.storage.from("part-images").remove([img.storage_path]);
    await supabase.from("part_images").delete().eq("id", img.id);
    setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
  }
  async function removeExistingCert(c: ExistingCert) {
    await supabase.storage.from("certificates").remove([c.storage_path]);
    await supabase.from("certificates").delete().eq("id", c.id);
    setExistingCerts((prev) => prev.filter((x) => x.id !== c.id));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const payload = {
        seller_id: user.id,
        title,
        part_number: partNumber,
        manufacturer: manufacturer || null,
        aircraft_model: aircraftModel || null,
        ata_chapter: ata || null,
        condition: condition as never,
        description: description || null,
        price: price ? Number(price) : null,
        currency,
        quantity,
        location: location || null,
        serial_number: serialNumber || null,
        eccn: eccn || null,
        country_of_origin: countryOfOrigin || null,
      };

      let id = partId;
      if (id) {
        const { error } = await supabase.from("parts").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("parts").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // upload new images
      for (const f of newImages) {
        const path = `${user.id}/${id}/${Date.now()}-${f.name}`;
        await uploadFile("part-images", path, f);
        await supabase.from("part_images").insert({
          part_id: id!,
          storage_path: path,
          public_url: path,
        });
      }
      // upload new certs
      for (const c of newCerts) {
        const path = `${user.id}/${id}/${Date.now()}-${c.file.name}`;
        await uploadFile("certificates", path, c.file);
        await supabase.from("certificates").insert({
          part_id: id!,
          name: c.name || c.file.name,
          cert_type: c.type || null,
          storage_path: path,
          public_url: path,
        });
      }

      toast.success(partId ? "Part updated" : "Part listed");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Part details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Part name *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Part number *</Label><Input required value={partNumber} onChange={(e) => setPartNumber(e.target.value)} /></div>
          <div><Label>Serial number</Label><Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} /></div>
          <div><Label>Manufacturer</Label><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></div>
          <div><Label>Aircraft model</Label><Input value={aircraftModel} onChange={(e) => setAircraftModel(e.target.value)} placeholder="e.g. A320, 737-NG" /></div>
          <div><Label>ATA chapter</Label><Input value={ata} onChange={(e) => setAta(e.target.value)} placeholder="e.g. 32-41" /></div>
          <div>
            <Label>Condition *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || "1"))} /></div>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Price (optional)</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. MIA, USA" /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Traceability & export compliance</h2>
        <p className="text-xs text-muted-foreground">Used on invoices and required for cross-border aviation parts trade.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><Label>ECCN</Label><Input value={eccn} onChange={(e) => setEccn(e.target.value)} placeholder="e.g. 9A991" /></div>
          <div><Label>Country of origin</Label><Input value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} placeholder="e.g. USA" /></div>
          <div />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <p className="text-xs text-muted-foreground">Upload clear images of the part.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded border border-border">
              {img.url && <img src={img.url} alt="" className="h-full w-full object-cover" />}
              <button type="button" onClick={() => removeExistingImage(img)} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {newImages.map((f, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded border border-accent">
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setNewImages((prev) => prev.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border text-xs text-muted-foreground hover:border-accent hover:text-accent">
            <UploadIcon className="h-5 w-5" /> Add photo
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && setNewImages((prev) => [...prev, ...Array.from(e.target.files!)])} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Certificates & documentation</h2>
        <p className="text-xs text-muted-foreground">Upload 8130-3, EASA Form 1, trace docs, shop reports, etc.</p>
        <div className="mt-4 space-y-2">
          {existingCerts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded border border-border p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileBadge className="h-4 w-4 text-accent" />
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.cert_type ?? "Document"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:text-accent">View</a>}
                <Button type="button" size="sm" variant="ghost" onClick={() => removeExistingCert(c)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {newCerts.map((c, i) => (
            <div key={i} className="grid items-end gap-2 rounded border border-accent p-3 sm:grid-cols-[1fr_1fr_auto]">
              <div><Label className="text-xs">Name</Label><Input value={c.name} onChange={(e) => setNewCerts((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></div>
              <div><Label className="text-xs">Type</Label><Input placeholder="8130-3, EASA Form 1..." value={c.type} onChange={(e) => setNewCerts((prev) => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} /></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewCerts((prev) => prev.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed border-border p-4 text-sm text-muted-foreground hover:border-accent hover:text-accent">
            <UploadIcon className="h-4 w-4" /> Upload certificate (PDF, image)
            <input type="file" accept=".pdf,image/*" multiple className="hidden" onChange={(e) => {
              if (!e.target.files) return;
              const added = Array.from(e.target.files).map((f) => ({ file: f, name: f.name.replace(/\.[^.]+$/, ""), type: "" }));
              setNewCerts((prev) => [...prev, ...added]);
            }} />
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? "Saving…" : partId ? "Save changes" : "List part"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
      </div>
    </form>
  );
}