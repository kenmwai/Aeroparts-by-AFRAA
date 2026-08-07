import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Plane, ShieldCheck, FileBadge, Search, Upload, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { PricingTiers } from "@/components/pricing-tiers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AeroParts by AFRAA — Aircraft parts marketplace" },
      { name: "description", content: "B2B marketplace for aircraft parts. Verified certificates, traceable inventory, instant quote requests." },
      { property: "og:title", content: "AeroParts by AFRAA" },
      { property: "og:description", content: "B2B marketplace for aircraft parts with verified certificates and instant RFQs." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs uppercase tracking-wider text-accent">
            <Plane className="h-3 w-3" /> Aviation supply chain
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-6xl font-semibold leading-[1.05] sm:text-7xl">
            The marketplace for <span className="text-accent">certified</span> aircraft parts.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/75">
            List inventory with full traceability. Browse parts with images and 8130-3 / EASA Form 1 certificates. Request quotes in seconds.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/catalog">Browse parts</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-accent/40 bg-transparent text-primary-foreground hover:bg-accent/10 hover:text-primary-foreground">
              <Link to="/auth">List your inventory</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold text-foreground">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Upload, title: "Sellers list inventory", body: "Upload parts with photos, part numbers, condition codes and airworthiness certificates." },
            { icon: Search, title: "Buyers discover parts", body: "Search by P/N, manufacturer, ATA chapter. Review images and certificates before reaching out." },
            { icon: MessageSquare, title: "Request a quote", body: "Send a structured RFQ. Sellers respond in-app and by email — no broker games." },
          ].map((s) => (
            <div key={s.title} className="rounded-lg border border-border bg-card p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-accent">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold text-foreground">Documentation that matches the part.</h2>
              <p className="mt-4 text-muted-foreground">
                Every listing supports multiple images and as many certificates as needed — 8130-3, EASA Form 1, JAA, CAAC, trace docs and shop reports. Buyers see them before they ask.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {["8130-3", "EASA Form 1", "Trace to birth", "Shop reports"].map((t) => (
                  <div key={t} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <FileBadge className="h-4 w-4 text-accent" /> {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-primary p-8 text-primary-foreground">
              <ShieldCheck className="h-8 w-8 text-accent" />
              <p className="mt-4 font-display text-2xl leading-snug">
                "Cuts our parts sourcing cycle from days to hours. Certs are right there."
              </p>
              <p className="mt-4 text-sm text-primary-foreground/70">— DOM, regional MRO</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-foreground">Seller pricing</h2>
            <p className="mt-3 text-muted-foreground">
              AFRAA members and partners list on a subscription; other airlines and suppliers pay a commission only
              when a deal is confirmed. Rates are live.
            </p>
          </div>
          <div className="mt-10">
            <PricingTiers compact />
          </div>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link to="/pricing">See full pricing details</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-primary py-8 text-center text-sm text-primary-foreground/60">
        © {new Date().getFullYear()} AeroParts by AFRAA
      </footer>
    </div>
  );
}
