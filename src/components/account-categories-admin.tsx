import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify, type AccountCategory } from "@/lib/account-categories";

export function AccountCategoriesAdmin() {
  const [cats, setCats] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("account_categories" as never)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setCats((data as unknown as AccountCategory[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(id: string, patch: Partial<AccountCategory>) {
    const { error } = await supabase.from("account_categories" as never).update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category updated — pricing page reflects the new rate");
    load();
  }

  async function create() {
    const name = newName.trim();
    if (!name) return toast.error("Enter a category name");
    const { error } = await supabase.from("account_categories" as never).insert({
      name,
      slug: slugify(name),
      plan_type: "commission",
      commission_rate: 0.01,
      sort_order: (cats[cats.length - 1]?.sort_order ?? 0) + 1,
    } as never);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success("Category added");
    load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Accounts in it keep their own rates.`)) return;
    const { error } = await supabase.from("account_categories" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading categories…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Group selling accounts into categories and set the subscription or commission for each. Changes appear
        immediately on the public pricing page and apply to new confirmed deals.
      </p>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="font-display font-semibold">Add a category</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            placeholder="e.g. Government Operators"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={create}>
            <Plus className="mr-1 h-4 w-4" /> Add category
          </Button>
        </div>
      </div>

      {cats.map((c) => (
        <div key={c.id} className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Category name</Label>
              <Input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && save(c.id, { name: e.target.value })} />
            </div>
            <div>
              <Label>Description (shown on pricing page)</Label>
              <Input defaultValue={c.description ?? ""} onBlur={(e) => save(c.id, { description: e.target.value || null })} />
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Billing model</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={c.plan_type}
                onChange={(e) => save(c.id, { plan_type: e.target.value as AccountCategory["plan_type"] })}
              >
                <option value="commission">Commission on sales</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
            <div>
              <Label>Commission %</Label>
              <Input
                type="number" step="0.01" min="0" max="100"
                defaultValue={c.commission_rate != null ? Number(c.commission_rate) * 100 : ""}
                onBlur={(e) => save(c.id, { commission_rate: e.target.value === "" ? null : Number(e.target.value) / 100 })}
              />
            </div>
            <div>
              <Label>Subscription / year</Label>
              <Input
                type="number" step="0.01" min="0"
                defaultValue={c.subscription_amount != null ? Number(c.subscription_amount) : ""}
                onBlur={(e) => save(c.id, { subscription_amount: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input defaultValue={c.currency} onBlur={(e) => save(c.id, { currency: e.target.value.toUpperCase() || "USD" })} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={c.is_public}
                onChange={(e) => save(c.id, { is_public: e.target.checked })}
              />
              Show on pricing page
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Order</Label>
              <Input
                className="w-20" type="number"
                defaultValue={c.sort_order}
                onBlur={(e) => save(c.id, { sort_order: Number(e.target.value) || 0 })}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => remove(c.id, c.name)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
