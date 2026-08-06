export type AccountCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  plan_type: "subscription" | "commission";
  subscription_amount: number | null;
  commission_rate: number | null;
  currency: string;
  is_public: boolean;
  sort_order: number;
};

export const fmtRate = (r: number | null | undefined) =>
  r == null ? "—" : `${(Number(r) * 100).toFixed(2).replace(/\.00$/, "")}%`;

export const fmtAmount = (a: number | null | undefined, currency = "USD") =>
  a == null ? "—" : Number(a) === 0 ? "Included" : `${currency} ${Number(a).toLocaleString()}`;

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
