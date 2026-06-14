import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "NEXUS — Settings" }] }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      setProfile(data);
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      handle: profile.handle,
      bio: profile.bio,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error("Couldn't save"); else toast.success("Saved.");
  }

  async function exportData() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("cortex_entries").select("*").eq("user_id", u.user.id);
    const blob = new Blob([JSON.stringify(data ?? [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nexus-cortex.json"; a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!profile) return <AppShell title="Settings"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="nexus-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Profile</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Display name</span>
              <input value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Handle</span>
              <input value={profile.handle ?? ""} onChange={(e) => setProfile({ ...profile, handle: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Bio</span>
              <textarea rows={3} value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="mt-1 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </label>
            <button onClick={save} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? "…" : "Save profile"}
            </button>
          </div>
        </section>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Privacy</h2>
          <p className="text-sm text-muted-foreground">Your Cortex is yours. Export anytime.</p>
          <button onClick={exportData} className="mt-3 rounded-md border border-border bg-elevated px-4 py-2 text-sm hover:bg-elevated/70">
            Download Cortex (JSON)
          </button>
        </section>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Session</h2>
          <button onClick={signOut} className="rounded-md border border-border bg-elevated px-4 py-2 text-sm hover:bg-elevated/70">Sign out</button>
        </section>
      </div>
    </AppShell>
  );
}
