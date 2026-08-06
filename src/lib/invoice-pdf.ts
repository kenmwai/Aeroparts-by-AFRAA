import { jsPDF } from "jspdf";

// Platform legal entity — appears as the "Bill from" on every invoice.
// TODO: replace with the operator's real registered details before production use.
export const PLATFORM = {
  name: "AeroParts by AFRAA",
  address1: "1 Aviation Way",
  address2: "Suite 100",
  city: "Miami, FL 33126",
  country: "USA",
  taxId: "EIN 00-0000000",
  email: "billing@aeroparts.market",
};

type Cert = { name?: string; type?: string | null; issued_by?: string | null; issued_at?: string | null };

export type InvoiceRow = {
  invoice_number: string;
  issued_at: string;
  sell_price: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  part_snapshot: {
    title?: string; part_number?: string; serial_number?: string | null;
    manufacturer?: string | null; aircraft_model?: string | null;
    ata_chapter?: string | null; condition?: string; quantity?: number;
    eccn?: string | null; country_of_origin?: string | null;
    certificates?: Cert[];
  };
  seller_snapshot: Record<string, string | null | undefined>;
  buyer_snapshot: Record<string, string | null | undefined>;
};

const fmtMoney = (n: number, c: string) =>
  `${c} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function generateInvoicePdf(inv: InvoiceRow) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 48;

  // Header
  doc.setFont("helvetica", "bold").setFontSize(20).text("COMMISSION INVOICE", 48, y);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(120);
  doc.text("Platform brokerage fee – aviation parts marketplace", 48, y + 16);
  doc.setTextColor(0);

  // Invoice meta (right side)
  doc.setFontSize(10);
  const metaX = W - 230;
  doc.setFont("helvetica", "bold").text("Invoice #", metaX, y);
  doc.setFont("helvetica", "normal").text(inv.invoice_number, metaX + 70, y);
  doc.setFont("helvetica", "bold").text("Issued", metaX, y + 14);
  doc.setFont("helvetica", "normal").text(new Date(inv.issued_at).toLocaleDateString(), metaX + 70, y + 14);
  doc.setFont("helvetica", "bold").text("Due", metaX, y + 28);
  doc.setFont("helvetica", "normal").text("On receipt", metaX + 70, y + 28);

  y += 60;
  doc.setDrawColor(220).line(48, y, W - 48, y);
  y += 20;

  // Bill from / Bill to
  const colW = (W - 48 * 2 - 24) / 2;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(120).text("BILL FROM (PLATFORM)", 48, y);
  doc.text("BILL TO (SELLER)", 48 + colW + 24, y);
  doc.setTextColor(0).setFont("helvetica", "normal").setFontSize(10);

  const from = [PLATFORM.name, PLATFORM.address1, PLATFORM.address2, PLATFORM.city, PLATFORM.country, PLATFORM.taxId, PLATFORM.email].filter(Boolean) as string[];
  const s = inv.seller_snapshot;
  const to = [
    s.company_name || s.full_name,
    s.address_line1, s.address_line2,
    [s.city, s.postal_code].filter(Boolean).join(" "),
    s.country,
    s.tax_id ? `Tax ID: ${s.tax_id}` : null,
    s.phone,
  ].filter(Boolean) as string[];

  from.forEach((line, i) => doc.text(line, 48, y + 16 + i * 13));
  to.forEach((line, i) => doc.text(line, 48 + colW + 24, y + 16 + i * 13));
  y += 16 + Math.max(from.length, to.length) * 13 + 16;

  // Part traceability block
  doc.setDrawColor(220).line(48, y, W - 48, y);
  y += 18;
  doc.setFont("helvetica", "bold").setFontSize(11).text("Part traceability (ATA Spec 2000)", 48, y);
  y += 14;
  doc.setFontSize(9).setFont("helvetica", "normal");
  const p = inv.part_snapshot;
  const rows: [string, string][] = [
    ["Description", p.title ?? "—"],
    ["Part number (P/N)", p.part_number ?? "—"],
    ["Serial number (S/N)", p.serial_number ?? "—"],
    ["Condition code", p.condition ?? "—"],
    ["Quantity", String(p.quantity ?? 1)],
    ["Manufacturer", p.manufacturer ?? "—"],
    ["Aircraft model", p.aircraft_model ?? "—"],
    ["ATA chapter", p.ata_chapter ?? "—"],
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

  // Certificates
  const certs = p.certificates ?? [];
  doc.setFont("helvetica", "bold").setFontSize(10).text("Airworthiness certificates", 48, y);
  y += 14;
  doc.setFont("helvetica", "normal").setFontSize(9);
  if (certs.length === 0) {
    doc.setTextColor(120).text("None on file.", 48, y); doc.setTextColor(0); y += 14;
  } else {
    certs.forEach((c) => {
      const line = `• ${c.type ?? "Document"} — ${c.name ?? ""}${c.issued_by ? ` (issued by ${c.issued_by})` : ""}${c.issued_at ? ` on ${c.issued_at}` : ""}`;
      doc.text(line, 48, y); y += 12;
    });
  }
  y += 8;

  // Charges table
  doc.setDrawColor(220).line(48, y, W - 48, y); y += 18;
  doc.setFont("helvetica", "bold").setFontSize(11).text("Charges", 48, y); y += 16;
  doc.setFontSize(10);
  doc.text("Description", 48, y); doc.text("Amount", W - 48, y, { align: "right" });
  y += 6; doc.setDrawColor(180).line(48, y, W - 48, y); y += 14;
  doc.setFont("helvetica", "normal");

  doc.text(`Reported sale value (P/N ${p.part_number ?? ""})`, 48, y);
  doc.text(fmtMoney(inv.sell_price, inv.currency), W - 48, y, { align: "right" });
  y += 16;
  doc.text(`Platform commission @ ${(inv.commission_rate * 100).toFixed(2)}%`, 48, y);
  doc.text(fmtMoney(inv.commission_amount, inv.currency), W - 48, y, { align: "right" });
  y += 14; doc.setDrawColor(180).line(48, y, W - 48, y); y += 18;
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Total due", 48, y);
  doc.text(fmtMoney(Number(inv.sell_price) + Number(inv.commission_amount), inv.currency), W - 48, y, { align: "right" });

  // Compliance footer
  y += 36;
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110);
  const footer = [
    "This invoice covers the platform brokerage commission only; the parts sale itself is a separate transaction between buyer and seller.",
    "Aviation compliance: parts are sold with the airworthiness documentation listed above (e.g. FAA 8130-3, EASA Form 1). Buyer is responsible for verifying airworthiness prior to installation.",
    "Export control: this transaction is subject to U.S. EAR / ITAR and equivalent foreign export-control regulations. Re-export, transfer, or use in violation of these laws is prohibited.",
    "Tax: where applicable, reverse charge / zero-rate may apply per local VAT rules. Consult local tax advisor.",
  ];
  footer.forEach((t) => {
    const wrapped = doc.splitTextToSize(t, W - 96) as string[];
    wrapped.forEach((line) => { doc.text(line, 48, y); y += 10; });
    y += 4;
  });

  doc.save(`${inv.invoice_number}.pdf`);
}