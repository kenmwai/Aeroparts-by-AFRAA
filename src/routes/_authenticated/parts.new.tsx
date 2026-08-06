import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { PartForm } from "@/components/part-form";

export const Route = createFileRoute("/_authenticated/parts/new")({
  head: () => ({ meta: [{ title: "List a part — AeroParts by AFRAA" }] }),
  component: NewPart,
});

function NewPart() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">List a part</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add details, photos, and airworthiness certificates.</p>
        <div className="mt-8"><PartForm /></div>
      </div>
    </div>
  );
}