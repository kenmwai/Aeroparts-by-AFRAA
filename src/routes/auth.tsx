import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — AeroParts by AFRAA" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"tabs" | "forgot">("tabs");
  const [fpEmail, setFpEmail] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  // sign-in
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");
  // sign-up
  const [suName, setSuName] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suTaxId, setSuTaxId] = useState("");
  const [suAddr1, setSuAddr1] = useState("");
  const [suAddr2, setSuAddr2] = useState("");
  const [suCity, setSuCity] = useState("");
  const [suPostal, setSuPostal] = useState("");
  const [suCountry, setSuCountry] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: suName,
          company_name: suCompany,
          phone: suPhone,
          tax_id: suTaxId,
          address_line1: suAddr1,
          address_line2: suAddr2,
          city: suCity,
          postal_code: suPostal,
          country: suCountry,
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account");
  }

  async function handleGoogle() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(fpEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent — check your email");
    setMode("tabs");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Plane className="h-5 w-5 text-accent" /> AeroParts <span className="text-accent">by AFRAA</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl leading-tight">
            One marketplace.<br />
            <span className="text-accent">Every certified</span> part.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            List inventory with full documentation. Buyers see images and certificates upfront.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/40">© {new Date().getFullYear()} AeroParts by AFRAA</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create an account to list parts or request quotes.</p>

          {mode === "forgot" ? (
            <form onSubmit={handleForgot} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" type="email" required value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                Send reset link
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode("tabs")}>
                Back to sign in
              </button>
            </form>
          ) : (
          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="si-pwd">Password</Label>
                  <Input id="si-pwd" type="password" required value={siPwd} onChange={(e) => setSiPwd(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                  Sign in
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot your password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" required value={suName} onChange={(e) => setSuName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="su-co">Company</Label>
                    <Input id="su-co" value={suCompany} onChange={(e) => setSuCompany(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-pwd">Password</Label>
                  <Input id="su-pwd" type="password" minLength={6} required value={suPwd} onChange={(e) => setSuPwd(e.target.value)} />
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">Company address</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Used as your registered address on quotations and invoices. You can update it later in your dashboard.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="su-a1">Address line 1</Label>
                      <Input id="su-a1" value={suAddr1} onChange={(e) => setSuAddr1(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="su-a2">Address line 2</Label>
                      <Input id="su-a2" value={suAddr2} onChange={(e) => setSuAddr2(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="su-city">City</Label>
                      <Input id="su-city" value={suCity} onChange={(e) => setSuCity(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="su-zip">Postal code</Label>
                      <Input id="su-zip" value={suPostal} onChange={(e) => setSuPostal(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="su-country">Country</Label>
                      <Input id="su-country" value={suCountry} onChange={(e) => setSuCountry(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="su-phone">Phone</Label>
                      <Input id="su-phone" value={suPhone} onChange={(e) => setSuPhone(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="su-tax">Tax / VAT / EIN ID</Label>
                      <Input id="su-tax" value={suTaxId} onChange={(e) => setSuTaxId(e.target.value)} />
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          )}

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={handleGoogle}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.4-4.3 2.2-6.9 2.2-5.3 0-9.7-3.1-11.3-7.4l-6.5 5C9.7 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6 5c-.4.4 6.4-4.7 6.4-14.5 0-1.2-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}