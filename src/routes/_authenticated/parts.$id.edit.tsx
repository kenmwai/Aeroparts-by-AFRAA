import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { PartForm } from "@/components/part-form";

export const Route = createFileRoute("/_authenticated/parts/$id/edit")({
  head: () => ({ meta: [{ title: "Edit part — AeroParts by AFRAA" }] }),
  component: EditPart,
});

function EditPart() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Edit part</h1>
        <div className="mt-8"><PartForm partId={id} /></div>
      </div>
    </div>
  );
}