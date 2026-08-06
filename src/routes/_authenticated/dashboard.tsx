import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Inbox, Send, FileText, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateInvoicePdf, type InvoiceRow } from "@/lib/invoice-pdf";
import { generateQuotePdf, type QuoteSnapshot } from "@/lib/quote-pdf";
import { AccountCategoriesAdmin } from "@/components/account-categories-admin";
import type { AccountCategory } from "@/lib/account-categories";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AeroParts by AFRAA" }] }),
  component: Dashboard,
});

type MyPart = { id: string; title: string; part_number: string; serial_number: string | null; condition: string; price: number | null; currency: string; quantity: number; status: string; documentation_status: "documented" | "undocumented" };
type RFQ = {
  id: string;
  quantity: number;
  message: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: string;
  quoted_price: number | null;
  seller_response: string | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  final_price: number | null;
  buyer_confirmed_at: string | null;
  quote_number: string | null;
  quote_snapshot: QuoteSnapshot | null;
  parts: { id: string; title: string; part_number: string; currency: string } | null;
};
type Invoice = InvoiceRow & { id: string };
type SellerBilling = {
  seller_id: string;
  plan_type: "subscription" | "commission";
  listing_active: boolean;
  valid_until: string | null;
  commission_rate: number | null;
  subscription_amount: number | null;
  currency: string;
  notes: string | null;
  category_id: string | null;
};

function Dashboard() {
  const { user } = useAuth();
  const [parts, setParts] = useState<MyPart[]>([]);
  const [received, setReceived] = useState<RFQ[]>([]);
  const [sent, setSent] = useState<RFQ[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number>(0.01);
  const [myBilling, setMyBilling] = useState<SellerBilling | null>(null);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: r }, { data: s }, { data: inv }, { data: settings }, { data: roles }, { data: bill }] = await Promise.all([
      supabase.from("parts").select("id,title,part_number,serial_number,condition,price,currency,quantity,status,documentation_status").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("quote_requests").select("*,parts(id,title,part_number,currency)").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("quote_requests").select("*,parts(id,title,part_number,currency)").eq("buyer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("invoices" as never).select("*").order("issued_at", { ascending: false }),
      supabase.from("platform_settings" as never).select("commission_rate").maybeSingle(),
      supabase.from("user_roles" as never).select("role").eq("user_id", user.id),
      supabase.from("seller_billing" as never).select("*").eq("seller_id", user.id).maybeSingle(),
    ]);
    if (p) setParts(p as MyPart[]);
    if (r) setReceived(r as unknown as RFQ[]);
    if (s) setSent(s as unknown as RFQ[]);
    if (inv) setInvoices(inv as unknown as Invoice[]);
    if (settings) setCommissionRate(Number((settings as { commission_rate: number }).commission_rate ?? 0.01));
    setIsAdmin(Array.isArray(roles) && (roles as Array<{ role: string }>).some((r) => r.role === "admin"));
    setMyBilling((bill as SellerBilling | null) ?? null);
  }

  const listingActive =
    !!myBilling?.listing_active &&
    (!myBilling.valid_until || new Date(myBilling.valid_until) >= new Date(new Date().toDateString()));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function deletePart(id: string) {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("parts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted");
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your inventory and quote requests.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/parts/bulk">Bulk upload</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/parts/new">
                <Plus className="mr-1 h-4 w-4" /> List a part
              </Link>
            </Button>
          </div>
        </div>

        {parts.length > 0 && !listingActive && (
          <div className="mt-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="font-display font-semibold">Your listings are not visible to buyers</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Public catalog visibility requires an active seller agreement — either a partner subscription or a
              commission-on-sales agreement. Your inventory is saved and stays private until AFRAA activates your account.
              Contact the AFRAA marketplace team to activate.
            </p>
          </div>
        )}
        {listingActive && myBilling && (
          <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm">
            <span className="font-medium">Seller plan:</span>{" "}
            {myBilling.plan_type === "subscription"
              ? `Partner subscription${myBilling.subscription_amount ? ` — ${myBilling.currency} ${Number(myBilling.subscription_amount).toLocaleString()}` : ""}`
              : `Commission on sales${myBilling.commission_rate != null ? ` — ${(Number(myBilling.commission_rate) * 100).toFixed(2)}%` : ""}`}
            {myBilling.valid_until && (
              <span className="text-muted-foreground"> · active until {new Date(myBilling.valid_until).toLocaleDateString()}</span>
            )}
          </div>
        )}

        <Tabs defaultValue="inventory" className="mt-8">
          <TabsList>
            <TabsTrigger value="inventory">Inventory ({parts.length})</TabsTrigger>
            <TabsTrigger value="received"><Inbox className="mr-1 h-4 w-4" /> Received RFQs ({received.length})</TabsTrigger>
            <TabsTrigger value="sent"><Send className="mr-1 h-4 w-4" /> My requests ({sent.length})</TabsTrigger>
            <TabsTrigger value="invoices"><FileText className="mr-1 h-4 w-4" /> Invoices ({invoices.length})</TabsTrigger>
            <TabsTrigger value="billing">Billing details</TabsTrigger>
            {isAdmin && <TabsTrigger value="sellers">Sellers</TabsTrigger>}
            {isAdmin && <TabsTrigger value="categories">Categories</TabsTrigger>}
            {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="inventory" className="mt-6">
            {parts.length === 0 ? (
              <Empty title="No inventory yet" body="List your first aircraft part to start receiving quote requests." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3">Part name</th><th className="p-3">P/N</th><th className="p-3">S/N</th><th className="p-3">Condition</th>
                      <th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3">Docs</th><th className="p-3">Status</th><th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-3 font-medium">{p.title}</td>
                        <td className="p-3 font-mono text-xs">{p.part_number}</td>
                        <td className="p-3 font-mono text-xs">{p.serial_number ?? "—"}</td>
                        <td className="p-3"><Badge variant="outline">{p.condition}</Badge></td>
                        <td className="p-3">{p.quantity}</td>
                        <td className="p-3">{p.price != null ? `${p.currency} ${Number(p.price).toLocaleString()}` : "—"}</td>
                        <td className="p-3">
                          {p.documentation_status === "documented" ? (
                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Documented</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">Undocumented</Badge>
                          )}
                        </td>
                        <td className="p-3"><Badge>{p.status}</Badge></td>
                        <td className="p-3 text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/parts/$id/edit" params={{ id: p.id }}><Pencil className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deletePart(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-6">
            {received.length === 0 ? (
              <Empty title="No requests yet" body="Quote requests from buyers will appear here." />
            ) : (
              <div className="space-y-3">
                {received.map((r) => <ReceivedRFQ key={r.id} rfq={r} onUpdate={load} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            {sent.length === 0 ? (
              <Empty title="No requests sent" body="Your quote requests to sellers will appear here." />
            ) : (
              <div className="space-y-3">
                {sent.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        {r.parts ? (
                          <Link to="/parts/$id" params={{ id: r.parts.id }} className="font-display font-semibold hover:text-accent">
                            {r.parts.title}
                          </Link>
                        ) : (
                          <p className="font-display font-semibold">Listing unavailable</p>
                        )}
                        <p className="font-mono text-xs text-muted-foreground">P/N {r.parts?.part_number ?? "—"} · qty {r.quantity}</p>
                      </div>
                      <Badge>{r.status}</Badge>
                    </div>
                    {r.seller_response && (
                      <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Seller response</p>
                        {r.quoted_price && <p className="mt-1 font-display text-lg font-semibold text-primary">{r.parts?.currency ?? ""} {Number(r.quoted_price).toLocaleString()}</p>}
                        <p className="mt-1 whitespace-pre-line">{r.seller_response}</p>
                      </div>
                    )}
                    {r.status === "responded" && r.quoted_price != null && (
                      <div className="mt-3 flex items-center justify-between rounded-md border border-accent/40 bg-accent/5 p-3">
                        <p className="text-sm">
                          Confirming generates a commission invoice ({(commissionRate * 100).toFixed(2)}% of sell price) for the seller.
                        </p>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"
                          onClick={async () => {
                            const { error } = await supabase.rpc("confirm_deal" as never, { _rfq_id: r.id } as never);
                            if (error) return toast.error(error.message);
                            toast.success("Deal confirmed. Invoice generated.");
                            load();
                          }}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm purchase
                        </Button>
                      </div>
                    )}
                    {r.status === "confirmed" && (
                      <div className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
                        ✓ Deal confirmed{r.final_price ? ` at ${r.parts?.currency ?? ""} ${Number(r.final_price).toLocaleString()}` : ""}.
                      </div>
                    )}
                    {r.quote_snapshot && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => generateQuotePdf(r.quote_snapshot as QuoteSnapshot)}>
                          <Download className="mr-1 h-4 w-4" /> Download quotation {r.quote_number}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            {invoices.length === 0 ? (
              <Empty title="No invoices yet" body="Commission invoices are generated automatically when a buyer confirms a deal." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3">Invoice #</th><th className="p-3">Issued</th><th className="p-3">Part</th>
                      <th className="p-3">Sell price</th><th className="p-3">Commission</th><th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-border">
                        <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="p-3">{new Date(inv.issued_at).toLocaleDateString()}</td>
                        <td className="p-3">{inv.part_snapshot?.title} <span className="text-xs text-muted-foreground">({inv.part_snapshot?.part_number})</span></td>
                        <td className="p-3">{inv.currency} {Number(inv.sell_price).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-primary">
                          {inv.currency} {Number(inv.commission_amount).toLocaleString()}
                          <span className="ml-1 text-xs text-muted-foreground">({(Number(inv.commission_rate) * 100).toFixed(2)}%)</span>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => generateInvoicePdf(inv)}>
                            <Download className="mr-1 h-4 w-4" /> PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <BillingForm />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="sellers" className="mt-6">
              <SellerAccessAdmin />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="categories" className="mt-6">
              <AccountCategoriesAdmin />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="settings" className="mt-6">
              <PlatformSettingsForm initialRate={commissionRate} onSaved={(r) => setCommissionRate(r)} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function BillingForm() {
  return <BillingFormInner />;
}

type SellerRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  country: string | null;
  city: string | null;
  is_admin: boolean;
};

function SellerAccessAdmin() {
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [billing, setBilling] = useState<Record<string, SellerBilling>>({});
  const [cats, setCats] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: accounts, error: accErr }, { data: bills }, { data: categories }] = await Promise.all([
      supabase.rpc("admin_list_accounts" as never),
      supabase.from("seller_billing" as never).select("*"),
      supabase.from("account_categories" as never).select("*").order("sort_order", { ascending: true }),
    ]);
    if (accErr) toast.error(accErr.message);
    setSellers((accounts as unknown as SellerRow[] | null) ?? []);
    setCats((categories as unknown as AccountCategory[] | null) ?? []);
    const map: Record<string, SellerBilling> = {};
    ((bills as unknown as SellerBilling[]) ?? []).forEach((b) => { map[b.seller_id] = b; });
    setBilling(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const [promoteEmail, setPromoteEmail] = useState("");

  async function setAdmin(email: string, makeAdmin: boolean) {
    const { error } = await supabase.rpc("admin_set_admin_by_email" as never, {
      _email: email,
      _make_admin: makeAdmin,
    } as never);
    if (error) return toast.error(error.message);
    toast.success(makeAdmin ? `${email} is now an admin` : `Admin removed from ${email}`);
    load();
  }

  async function save(sellerId: string, patch: Partial<SellerBilling>) {
    const current = billing[sellerId];
    const row = {
      seller_id: sellerId,
      plan_type: current?.plan_type ?? "commission",
      listing_active: current?.listing_active ?? false,
      valid_until: current?.valid_until ?? null,
      commission_rate: current?.commission_rate ?? null,
      subscription_amount: current?.subscription_amount ?? null,
      currency: current?.currency ?? "USD",
      notes: current?.notes ?? null,
      category_id: current?.category_id ?? null,
      ...patch,
    };
    const { error } = await supabase.from("seller_billing" as never).upsert(row as never, { onConflict: "seller_id" } as never);
    if (error) return toast.error(error.message);
    toast.success("Seller access updated");
    load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading sellers…</p>;
  if (sellers.length === 0) return <Empty title="No sellers yet" body="Seller accounts appear here once they sign up." />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Only sellers marked active appear in the public catalog. Assign each account a category (AFRAA member, partner,
        other airline, supplier…) to apply that category's rate, or set a per-account override below.
      </p>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="font-display font-semibold">Promote an account to admin</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email of an existing account. Admins can manage seller access, commission settings and other admins.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            type="email"
            placeholder="person@company.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
          />
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              if (!promoteEmail.trim()) return toast.error("Enter an email address");
              setAdmin(promoteEmail.trim(), true).then(() => setPromoteEmail(""));
            }}
          >
            Make admin
          </Button>
        </div>
      </div>
      {sellers.map((s) => {
        const b = billing[s.id];
        return (
          <div key={s.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display font-semibold">{s.company_name || s.full_name || "Unnamed account"}</p>
                <p className="text-xs text-muted-foreground">
                  {[s.email, s.full_name, s.city, s.country].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s.is_admin && <Badge className="bg-primary text-primary-foreground hover:bg-primary">Admin</Badge>}
                {b?.listing_active ? (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Listings live</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">Not paid / inactive</Badge>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div>
                <Label>Category</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={b?.category_id ?? ""}
                  onChange={(e) => save(s.id, { category_id: e.target.value || null })}
                >
                  <option value="">Uncategorised</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Plan</Label>
                <select
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={b?.plan_type ?? "commission"}
                  onChange={(e) => save(s.id, { plan_type: e.target.value as SellerBilling["plan_type"] })}
                >
                  <option value="commission">Commission on sales</option>
                  <option value="subscription">Partner subscription</option>
                </select>
              </div>
              <div>
                <Label>Commission % override</Label>
                <Input
                  type="number" step="0.01" min="0" max="100"
                  defaultValue={b?.commission_rate != null ? Number(b.commission_rate) * 100 : ""}
                  onBlur={(e) => save(s.id, { commission_rate: e.target.value === "" ? null : Number(e.target.value) / 100 })}
                />
              </div>
              <div>
                <Label>Subscription amount</Label>
                <Input
                  type="number" step="0.01" min="0"
                  defaultValue={b?.subscription_amount != null ? Number(b.subscription_amount) : ""}
                  onBlur={(e) => save(s.id, { subscription_amount: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Active until</Label>
                <Input
                  type="date"
                  defaultValue={b?.valid_until ?? ""}
                  onBlur={(e) => save(s.id, { valid_until: e.target.value || null })}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className={b?.listing_active ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}
                variant={b?.listing_active ? "outline" : "default"}
                onClick={() => save(s.id, { listing_active: !b?.listing_active })}
              >
                {b?.listing_active ? "Deactivate listings" : "Activate listings"}
              </Button>
              <Input
                className="max-w-sm"
                placeholder="Agreement notes"
                defaultValue={b?.notes ?? ""}
                onBlur={(e) => save(s.id, { notes: e.target.value || null })}
              />
              {s.email && (
                <Button size="sm" variant="outline" onClick={() => setAdmin(s.email as string, !s.is_admin)}>
                  {s.is_admin ? "Remove admin" : "Make admin"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BillingFormInner() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    company_name: "", full_name: "", tax_id: "",
    address_line1: "", address_line2: "", city: "", postal_code: "", country: "", phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm((f) => ({
        ...f,
        company_name: data.company_name ?? "",
        full_name: data.full_name ?? "",
        tax_id: (data as { tax_id?: string | null }).tax_id ?? "",
        address_line1: (data as { address_line1?: string | null }).address_line1 ?? "",
        address_line2: (data as { address_line2?: string | null }).address_line2 ?? "",
        city: (data as { city?: string | null }).city ?? "",
        postal_code: (data as { postal_code?: string | null }).postal_code ?? "",
        country: data.country ?? "",
        phone: data.phone ?? "",
      }));
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Billing details saved");
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={save} className="max-w-2xl rounded-lg border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Billing & company details</h2>
      <p className="mt-1 text-sm text-muted-foreground">Used as the "Bill to" entity on commission invoices.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><Label>Company name</Label><Input value={form.company_name} onChange={set("company_name")} /></div>
        <div><Label>Contact name</Label><Input value={form.full_name} onChange={set("full_name")} /></div>
        <div className="sm:col-span-2"><Label>Tax / VAT / EIN ID</Label><Input value={form.tax_id} onChange={set("tax_id")} /></div>
        <div className="sm:col-span-2"><Label>Address line 1</Label><Input value={form.address_line1} onChange={set("address_line1")} /></div>
        <div className="sm:col-span-2"><Label>Address line 2</Label><Input value={form.address_line2} onChange={set("address_line2")} /></div>
        <div><Label>City</Label><Input value={form.city} onChange={set("city")} /></div>
        <div><Label>Postal code</Label><Input value={form.postal_code} onChange={set("postal_code")} /></div>
        <div><Label>Country</Label><Input value={form.country} onChange={set("country")} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
      </div>
      <Button type="submit" disabled={saving} className="mt-6 bg-primary text-primary-foreground">{saving ? "Saving…" : "Save details"}</Button>
    </form>
  );
}

function PlatformSettingsForm({ initialRate, onSaved }: { initialRate: number; onSaved: (rate: number) => void }) {
  const { user } = useAuth();
  const [percent, setPercent] = useState<string>((initialRate * 100).toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => { setPercent((initialRate * 100).toString()); }, [initialRate]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error("Enter a value between 0 and 100");
    const rate = pct / 100;
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as never)
      .update({ commission_rate: rate, updated_at: new Date().toISOString(), updated_by: user?.id } as never)
      .eq("id", true);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Commission rate updated");
    onSaved(rate);
  }

  return (
    <form onSubmit={save} className="max-w-xl rounded-lg border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">Platform settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Commission percentage applied to the sell price on every new invoice. Existing invoices keep the rate that was active when they were issued.
      </p>
      <div className="mt-4 max-w-xs">
        <Label>Commission rate (%)</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input type="number" step="0.01" min="0" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <Button type="submit" disabled={saving} className="mt-6 bg-primary text-primary-foreground">{saving ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

function ReceivedRFQ({ rfq, onUpdate }: { rfq: RFQ; onUpdate: () => void }) {
  const [response, setResponse] = useState(rfq.seller_response ?? "");
  const [price, setPrice] = useState<string>(rfq.quoted_price?.toString() ?? "");
  const [validDays, setValidDays] = useState("30");
  const [saving, setSaving] = useState(false);

  async function sendQuote() {
    if (!price || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      return toast.error("Enter a unit price for the quotation");
    }
    setSaving(true);
    const { error } = await supabase.rpc("submit_quote" as never, {
      _rfq_id: rfq.id,
      _price: Number(price),
      _message: response || null,
      _valid_days: Number(validDays) || 30,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Quotation issued — a PDF is now available to you and the buyer");
    onUpdate();
  }

  async function respond(status: "declined" | "closed") {
    setSaving(true);
    const { error } = await supabase
      .from("quote_requests")
      .update({
        status,
        seller_response: response || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", rfq.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Response saved");
    onUpdate();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {rfq.parts ? (
            <Link to="/parts/$id" params={{ id: rfq.parts.id }} className="font-display font-semibold hover:text-accent">
              {rfq.parts.title}
            </Link>
          ) : (
            <p className="font-display font-semibold">Listing unavailable</p>
          )}
          <p className="font-mono text-xs text-muted-foreground">P/N {rfq.parts?.part_number ?? "—"} · qty {rfq.quantity}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            From {rfq.contact_email}{rfq.contact_phone ? ` · ${rfq.contact_phone}` : ""}
          </p>
        </div>
        <Badge variant={rfq.status === "pending" ? "default" : "outline"}>{rfq.status}</Badge>
      </div>
      {rfq.message && <p className="mt-3 whitespace-pre-line rounded-md bg-muted p-3 text-sm">{rfq.message}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-[160px_120px_1fr]">
        <Input placeholder={`Unit price (${rfq.parts?.currency ?? "USD"})`} value={price} onChange={(e) => setPrice(e.target.value)} />
        <Input placeholder="Valid (days)" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
        <Textarea placeholder="Your response (availability, lead time, etc.)" rows={2} value={response} onChange={(e) => setResponse(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={saving} onClick={sendQuote} className="bg-primary text-primary-foreground">Issue quotation</Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={() => respond("declined")}>Decline</Button>
        {rfq.quote_snapshot && (
          <Button size="sm" variant="outline" onClick={() => generateQuotePdf(rfq.quote_snapshot as QuoteSnapshot)}>
            <Download className="mr-1 h-4 w-4" /> Quotation PDF
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Issuing a quotation generates a formal PDF with your company address, part traceability and export-control terms.
      </p>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="font-display text-lg">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}