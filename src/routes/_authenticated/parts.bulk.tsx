import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Upload as UploadIcon, Download, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/parts/bulk")({
  head: () => ({ meta: [{ title: "Bulk upload parts — AeroParts by AFRAA" }] }),
  component: BulkUploadPage,
});

const CONDITIONS = new Set(["NE", "NS", "SV", "AR", "OH", "RP", "AS-IS"]);
const CURRENCIES = new Set(["USD", "EUR", "GBP"]);

type Row = {
  title: string;
  part_number: string;
  serial_number?: string | null;
  manufacturer?: string | null;
  aircraft_model?: string | null;
  ata_chapter?: string | null;
  condition: string;
  description?: string | null;
  price?: number | null;
  currency: string;
  quantity: number;
  location?: string | null;
  eccn?: string | null;
  country_of_origin?: string | null;
};

type ParsedRow = { row: number; data?: Row; error?: string };

const TEMPLATE_HEADERS = [
  "part_name",
  "part_number",
  "serial_number",
  "manufacturer",
  "aircraft_model",
  "ata_chapter",
  "condition",
  "quantity",
  "price",
  "currency",
  "location",
  "eccn",
  "country_of_origin",
  "description",
];

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

function parseRow(raw: Record<string, unknown>, idx: number): ParsedRow {
  const get = (k: string) => norm(raw[k] ?? raw[k.toUpperCase()] ?? raw[k.replace(/_/g, " ")]);
  const title = get("part_name") || get("name") || get("title");
  const part_number = get("part_number") || get("pn");
  const conditionRaw = (get("condition") || "NE").toUpperCase();
  const currencyRaw = (get("currency") || "USD").toUpperCase();
  const qtyRaw = get("quantity") || "1";
  const priceRaw = get("price");

  if (!title) return { row: idx, error: "Missing part_name" };
  if (!part_number) return { row: idx, error: "Missing part_number" };
  if (!CONDITIONS.has(conditionRaw)) return { row: idx, error: `Invalid condition "${conditionRaw}"` };
  if (!CURRENCIES.has(currencyRaw)) return { row: idx, error: `Invalid currency "${currencyRaw}"` };
  const quantity = Number.parseInt(qtyRaw, 10);
  if (!Number.isFinite(quantity) || quantity < 1) return { row: idx, error: "Invalid quantity" };
  const price = priceRaw ? Number(priceRaw) : null;
  if (priceRaw && (price == null || !Number.isFinite(price) || price < 0)) return { row: idx, error: "Invalid price" };

  return {
    row: idx,
    data: {
      title,
      part_number,
      serial_number: get("serial_number") || null,
      manufacturer: get("manufacturer") || null,
      aircraft_model: get("aircraft_model") || null,
      ata_chapter: get("ata_chapter") || null,
      condition: conditionRaw,
      description: get("description") || null,
      price,
      currency: currencyRaw,
      quantity,
      location: get("location") || null,
      eccn: get("eccn") || null,
      country_of_origin: get("country_of_origin") || null,
    },
  };
}

function downloadTemplate() {
  const sample = [
    {
      part_name: "CFM56-7B Fan Blade",
      part_number: "2255M77P05",
      serial_number: "SN-12345",
      manufacturer: "CFM International",
      aircraft_model: "737-NG",
      ata_chapter: "72-31",
      condition: "SV",
      quantity: 1,
      price: 12500,
      currency: "USD",
      location: "MIA, USA",
      eccn: "9A991",
      country_of_origin: "USA",
      description: "Serviceable, with trace",
    },
  ];
  const csv = [TEMPLATE_HEADERS.join(",")]
    .concat(sample.map((row) => TEMPLATE_HEADERS.map((h) => `"${String((row as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aeroparts-bulk-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function BulkUploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      // Only CSV supported in this simplified flow
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Only CSV uploads are supported. Save your spreadsheet as CSV and try again.");
        setRows([]);
        return;
      }
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, unknown>[];
          const parsed = data.map((r, i) => parseRow(r, i + 2));
          setRows(parsed);
        },
        error: (err) => {
          toast.error("Could not read CSV: " + err.message);
          setRows([]);
        },
      });
    } catch (err) {
      toast.error("Could not read file: " + (err as Error).message);
      setRows([]);
    }
  }

  const valid = rows.filter((r) => r.data);
  const invalid = rows.filter((r) => r.error);

  async function submit() {
    if (!user || valid.length === 0) return;
    setUploading(true);
    // Insert in chunks to avoid oversized payloads
    const CHUNK = 100;
    let inserted = 0;
    try {
      for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK).map((r) => ({ ...(r.data as Row), seller_id: user.id }));
        const { error, count } = await supabase.from("parts").insert(chunk as never, { count: "exact" });
        if (error) throw error;
        inserted += count ?? chunk.length;
      }
      toast.success(`Uploaded ${inserted} parts. All marked "undocumented" — upload certificates to publish as documented.`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Bulk upload parts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a CSV or Excel file to list many parts at once. All uploaded parts start as
              <span className="mx-1 rounded-md border border-amber-500 px-1.5 py-0.5 text-xs font-medium text-amber-700">Undocumented</span>
              and become
              <span className="mx-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-medium text-white">Documented</span>
              automatically once you upload at least one certificate for that part.
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-1 h-4 w-4" /> Download template (.xlsx)
          </Button>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:border-accent hover:text-accent">
            <UploadIcon className="h-6 w-6" />
            <span>{fileName ? `Selected: ${fileName}` : "Choose a .csv, .xlsx, or .xls file"}</span>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
          </label>
          <p className="mt-3 text-xs text-muted-foreground">
            Required columns: <code>part_name</code>, <code>part_number</code>, <code>condition</code> (NE, NS, SV, AR, OH, RP, AS-IS),
            <code> quantity</code>. Optional: <code>serial_number</code>, <code>manufacturer</code>, <code>aircraft_model</code>,
            <code> ata_chapter</code>, <code>price</code>, <code>currency</code>, <code>location</code>, <code>eccn</code>, <code>country_of_origin</code>, <code>description</code>.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-emerald-800">✓ {valid.length} valid</span>
              {invalid.length > 0 && (
                <span className="rounded-md bg-red-50 px-3 py-1 text-red-800">
                  <AlertTriangle className="mr-1 inline h-3 w-3" /> {invalid.length} with errors (will be skipped)
                </span>
              )}
            </div>

            {invalid.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-destructive/30 bg-card">
                <div className="border-b border-destructive/20 bg-destructive/5 p-3 text-xs font-medium uppercase tracking-wide text-destructive">
                  Errors
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {invalid.slice(0, 20).map((r) => (
                      <tr key={r.row} className="border-t border-border">
                        <td className="w-24 p-3 font-mono text-xs text-muted-foreground">Row {r.row}</td>
                        <td className="p-3 text-destructive">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {valid.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3">Part name</th><th className="p-3">P/N</th><th className="p-3">S/N</th>
                      <th className="p-3">Cond</th><th className="p-3">Qty</th><th className="p-3">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valid.slice(0, 20).map((r) => (
                      <tr key={r.row} className="border-t border-border">
                        <td className="p-3 font-medium">{r.data!.title}</td>
                        <td className="p-3 font-mono text-xs">{r.data!.part_number}</td>
                        <td className="p-3 font-mono text-xs">{r.data!.serial_number ?? "—"}</td>
                        <td className="p-3">{r.data!.condition}</td>
                        <td className="p-3">{r.data!.quantity}</td>
                        <td className="p-3">{r.data!.price != null ? `${r.data!.currency} ${r.data!.price.toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {valid.length > 20 && (
                  <div className="border-t border-border p-3 text-xs text-muted-foreground">…and {valid.length - 20} more</div>
                )}
              </div>
            )}

            <Button
              disabled={uploading || valid.length === 0}
              onClick={submit}
              className="bg-primary text-primary-foreground"
            >
              {uploading ? "Uploading…" : `Upload ${valid.length} parts`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}