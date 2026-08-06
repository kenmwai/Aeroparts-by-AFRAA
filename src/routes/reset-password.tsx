import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — AeroParts by AFRAA" },
      { name: "description", content: "Choose a new password for your AeroParts by AFRAA account." },
      { property: "og:title", content: "Set a new password — AeroParts by AFRAA" },
      { property: "og:description", content: "Choose a new password for your AeroParts by AFRAA account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Plane className="h-5 w-5 text-accent" /> AeroParts <span className="text-accent">by AFRAA</span>
        </div>
        <h1 className="mt-8 font-display text-3xl font-semibold">Set a new password</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Open this page from the password reset link in your email to continue.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="rp-pwd">New password</Label>
              <Input id="rp-pwd" type="password" minLength={6} required value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rp-confirm">Confirm password</Label>
              <Input id="rp-confirm" type="password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-secondary">
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}