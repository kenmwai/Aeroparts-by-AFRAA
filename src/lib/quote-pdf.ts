import { jsPDF } from "jspdf";

const BRAND = "AeroParts by AFRAA";

type Cert = { name?: string; type?: string | null; issued_by?: string | null; issued_at?: string | null };
type Party = Record<string, string | null | undefined>;

export type QuoteSnapshot = {
  quote_number: string;
  issued_at: string;
  valid_until?: string | null;
  unit_price: number;
  quantity: number;
  currency: string;
  terms?: string | null;
  part: {
    title?: string; part_number?: string; serial_number?: string | null;
    manufacturer?: string | null; aircraft_model?: string | null;
    ata_chapter?: string | null; condition?: string;
    eccn?: string | null; country_of_origin?: string | null;
    documentation_status?: string | null;
    certificates?: Cert[];
  };
  seller: Party;
  buyer: Party;
};

const fmtMoney = (n: number, c: string) =>
  `${c} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function generateQuotePdf(q: QuoteSnapshot) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFont("helvetica", "bold").setFontSize(20).text("QUOTATION", 48, y);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(120);
  doc.text(`Issued via ${BRAND} — certified aircraft parts marketplace`, 48, y + 16);
  doc.setTextColor(0);

  doc.setFontSize(10);
  const metaX = W - 240;
  const meta: [string, string][] = [
    ["Quote #", q.quote_number],
    ["Issued", new Date(q.issued_at).toLocaleDateString()],
    ["Valid until", q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "30 days"],
  ];
  meta.forEach(([k, v], i) => {
    doc.setFont("helvetica", "bold").text(k, metaX, y + i * 14);
    doc.setFont("helvetica", "normal").text(v, metaX + 80, y + i * 14);
  });

  y += 60;
  doc.setDrawColor(220).line(48, y, W - 48, y);
  y += 20;

  const colW = (W - 48 * 2 - 24) / 2;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(120).text("QUOTE FROM (SELLER)", 48, y);
  doc.text("QUOTE TO (BUYER)", 48 + colW + 24, y);
  doc.setTextColor(0).setFont("helvetica", "normal").setFontSize(10);

  const s = q.seller ?? {};
  const b = q.buyer ?? {};
  const from = [
    s.company_name || s.full_name,
    s.address_line1, s.address_line2,
    [s.city, s.postal_code].filter(Boolean).join(" "),
    s.country,
    s.tax_id ? `Tax ID: ${s.tax_id}` : null,
    s.phone,
  ].filter(Boolean) as string[];
  const to = [b.email, b.phone].filter(Boolean) as string[];

  from.forEach((line, i) => doc.text(line, 48, y + 16 + i * 13));
  to.forEach((line, i) => doc.text(line, 48 + colW + 24, y + 16 + i * 13));
  y += 16 + Math.max(from.length, to.length, 1) * 13 + 16;

  doc.setDrawColor(220).line(48, y, W - 48, y);
  y += 18;
  doc.setFont("helvetica", "bold").setFontSize(11).text("Part traceability (ATA Spec 2000)", 48, y);
  y += 14;
  doc.setFontSize(9).setFont("helvetica", "normal");
  const p = q.part ?? {};
  const rows: [string, string][] = [
    ["Description", p.title ?? "—"],
    ["Part number (P/N)", p.part_number ?? "—"],
    ["Serial number (S/N)", p.serial_number ?? "—"],
    ["Condition code", p.condition ?? "—"],
    ["Manufacturer", p.manufacturer ?? "—"],
    ["Aircraft model", p.aircraft_model ?? "—"],
    ["ATA chapter", p.ata_chapter ?? "—"],
    ["Documentation", p.documentation_status ?? "—"],
    ["Country of origin", p.country_of_origin ?? "—"],
    ["ECCN", p.eccn ?? "—"],
  ];
  rows.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 48 + col * (colW + 24);
    doc.setTextColor(120).text(k, x, y + row * 14);
    doc.setTextColor(0).text(v, x + 110, y + row * 14);
  });
  y += Math.ceil(rows.length / 2) * 14 + 12;

  const certs = p.certificates ?? [];
  doc.setFont("helvetica", "bold").setFontSize(10).text("Airworthiness certificates", 48, y);
  y += 14;
  doc.setFont("helvetica", "normal").setFontSize(9);
  if (certs.length === 0) {
    doc.setTextColor(120).text("None on file — part is quoted as undocumented.", 48, y);
    doc.setTextColor(0);
    y += 14;
  } else {
    certs.forEach((c) => {
      doc.text(
        `• ${c.type ?? "Document"} — ${c.name ?? ""}${c.issued_by ? ` (issued by ${c.issued_by})` : ""}${c.issued_at ? ` on ${c.issued_at}` : ""}`,
        48,
        y,
      );
      y += 12;
    });
  }
  y += 8;

  doc.setDrawColor(220).line(48, y, W - 48, y); y += 18;
  doc.setFont("helvetica", "bold").setFontSize(11).text("Pricing", 48, y); y += 16;
  doc.setFontSize(10);
  doc.text("Description", 48, y);
  doc.text("Qty", W - 220, y, { align: "right" });
  doc.text("Unit price", W - 140, y, { align: "right" });
  doc.text("Amount", W - 48, y, { align: "right" });
  y += 6; doc.setDrawColor(180).line(48, y, W - 48, y); y += 14;
  doc.setFont("helvetica", "normal");

  const qty = Number(q.quantity ?? 1);
  const unit = Number(q.unit_price ?? 0);
  const total = qty * unit;
  doc.text(`${p.title ?? "Part"} (P/N ${p.part_number ?? ""})`, 48, y);
  doc.text(String(qty), W - 220, y, { align: "right" });
  doc.text(fmtMoney(unit, q.currency), W - 140, y, { align: "right" });
  doc.text(fmtMoney(total, q.currency), W - 48, y, { align: "right" });
  y += 14; doc.setDrawColor(180).line(48, y, W - 48, y); y += 18;
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Total quoted", 48, y);
  doc.text(fmtMoney(total, q.currency), W - 48, y, { align: "right" });
  y += 24;

  if (q.terms) {
    doc.setFont("helvetica", "bold").setFontSize(10).text("Seller notes / terms", 48, y); y += 14;
    doc.setFont("helvetica", "normal").setFontSize(9);
    (doc.splitTextToSize(q.terms, W - 96) as string[]).forEach((line) => { doc.text(line, 48, y); y += 11; });
    y += 10;
  }

  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  const footer = [
    `This quotation is issued by the seller through ${BRAND}. Prices exclude freight, insurance, duties and taxes unless stated otherwise.`,
    "Aviation compliance: parts are offered with the airworthiness documentation listed above (e.g. FAA 8130-3, EASA Form 1). The buyer is responsible for verifying airworthiness prior to installation.",
    "Export control: any resulting transaction is subject to U.S. EAR / ITAR and equivalent foreign export-control regulations. Re-export, transfer or use in violation of these laws is prohibited.",
    "Acceptance of this quotation within the validity period creates a binding order; the platform commission is invoiced separately to the seller.",
  ];
  footer.forEach((t) => {
    (doc.splitTextToSize(t, W - 96) as string[]).forEach((line) => { doc.text(line, 48, y); y += 10; });
    y += 4;
  });

  doc.save(`${q.quote_number}.pdf`);
}
