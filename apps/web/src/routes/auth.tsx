import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "NEXUS — Sign in" }] }),
  beforeLoad: async () => {
    // can't check session server-side cleanly; do it client-side in component
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/onboarding" },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to NEXUS.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // route after auth state change
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", data.session.user.id).maybeSingle();
        navigate({ to: profile?.onboarding_complete ? "/dashboard" : "/onboarding" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error("Couldn't sign in with Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: profile } = await supabase.from("profiles").select("onboarding_complete").eq("id", data.session.user.id).maybeSingle();
      navigate({ to: profile?.onboarding_complete ? "/dashboard" : "/onboarding" });
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/15 blur-[160px]" />
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md nexus-card p-8"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-primary/20 ring-1 ring-primary/40">
            <div className="h-3 w-3 rounded-sm bg-primary" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Begin your Cortex"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Your proof of existence is waiting." : "Your curiosity was never wrong."}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-elevated px-4 py-2.5 text-sm font-medium hover:bg-elevated/70 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1A6.4 6.4 0 1 1 12 5.6a5.8 5.8 0 0 1 4.1 1.6l2.2-2.1A9.4 9.4 0 0 0 12 2.4 9.6 9.6 0 1 0 21.6 12c0-.65-.08-1.15-.25-.9z"/>
          </svg>
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or with email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@somewhere.real"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary hover:underline">
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
