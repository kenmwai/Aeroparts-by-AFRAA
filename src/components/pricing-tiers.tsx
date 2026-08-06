import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtAmount, fmtRate, type AccountCategory } from "@/lib/account-categories";

export function PricingTiers({ compact = false }: { compact?: boolean }) {
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

  if (loading) return <p className="text-sm text-muted-foreground">Loading rates…</p>;
  if (cats.length === 0)
    return <p className="text-sm text-muted-foreground">Pricing tiers will be published shortly.</p>;

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cats.map((c) => (
        <div key={c.id} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">{c.name}</h3>
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
          {!compact && (
            <ul className="mt-5 space-y-2 text-sm text-foreground">
              <li>Unlimited part listings</li>
              <li>Certificate uploads (8130-3 / EASA Form 1)</li>
              <li>Professional quotations &amp; invoices</li>
              <li>
                {c.plan_type === "subscription"
                  ? "No commission on confirmed sales"
                  : `${fmtRate(c.commission_rate)} platform fee on confirmed sales`}
              </li>
            </ul>
          )}
          <div className="mt-auto pt-6">
            <Button asChild size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">Start selling</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}