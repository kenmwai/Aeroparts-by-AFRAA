import { Link, useNavigate } from "@tanstack/react-router";
import { Plane, LogOut, LayoutDashboard, ShoppingBag, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Plane className="h-5 w-5 text-accent" strokeWidth={2.2} />
          <span>AeroParts <span className="text-accent">by AFRAA</span></span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-secondary hover:text-primary-foreground">
            <Link to="/catalog">
              <ShoppingBag className="mr-1 h-4 w-4" /> Catalog
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-secondary hover:text-primary-foreground">
            <Link to="/pricing">
              <Tag className="mr-1 h-4 w-4" /> Pricing
            </Link>
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-secondary hover:text-primary-foreground">
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary-foreground hover:bg-secondary hover:text-primary-foreground"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}