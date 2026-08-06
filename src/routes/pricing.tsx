import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtAmount, fmtRate, type AccountCategory } from "@/lib/account-categories";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Seller pricing & membership tiers — AeroParts by AFRAA" },
      { name: "description", content: "Subscription and commission rates for AFRAA members, AFRAA partners, other airlines and independent suppliers listing aircraft parts." },
      { property: "og:title", content: "Seller pricing — AeroParts by AFRAA" },
      { property: "og:description", content: "Membership tiers with subscription or commission-on-sales pricing for aircraft parts sellers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const [cats, setCats] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("account_categories" as never)
      .select("*")
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setCats((data as unknown as AccountCategory[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Seller pricing
          </h1>
          <p className="mt-3 text-muted-foreground">
            Every selling account is grouped into a category. AFRAA members and partners list on a subscription,
            while other airlines and suppliers pay a commission only when a deal is confirmed. Rates below are
            live — they update whenever the platform team adjusts an agreement.
          </p>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading rates…</p>
        ) : cats.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">Pricing tiers will be published shortly.</p>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {cats.map((c) => (
              <div key={c.id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-foreground">{c.name}</h2>
                  <Badge variant="outline" className="border-accent text-accent-foreground/80">
                    {c.plan_type === "subscription" ? "Subscription" : "Commission"}
                  </Badge>
                </div>
                <div className="mt-4">
                  {c.plan_type === "subscription" ? (
                    <p className="font-display text-3xl font-semibold text-foreground">
                      {fmtAmount(c.subscription_amount, c.currency)}
                      {c.subscription_amount != null && Number(c.subscription_amount) > 0 && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">/ year</span>
                      )}
                    </p>
                  ) : (
                    <p className="font-display text-3xl font-semibold text-foreground">
                      {fmtRate(c.commission_rate)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">per confirmed sale</span>
                    </p>
                  )}
                </div>
                {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}
                <ul className="mt-5 space-y-2 text-sm text-foreground">
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" /> Unlimited part listings</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" /> Certificate uploads (8130-3 / EASA Form 1)</li>
                  <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-accent" /> Professional quotations & invoices</li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-accent" />
                    {c.plan_type === "subscription"
                      ? "No commission on confirmed sales"
                      : `${fmtRate(c.commission_rate)} platform fee on confirmed sales`}
                  </li>
                </ul>
                <div className="mt-6">
                  <Button asChild size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link to="/auth">Start selling</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 max-w-3xl text-xs text-muted-foreground">
          Listings become visible in the public catalog once the account's subscription or commission agreement is
          activated. Commission is invoiced to the seller on each confirmed deal and shown on the platform invoice.
        </p>
      </div>
    </div>
  );
}
