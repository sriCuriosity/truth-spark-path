import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AIVoicePicker } from "@/components/ai-coach-panel";
import { supabase } from "@/integrations/supabase/client";
import type { AIVoiceId } from "@/lib/ai-voices";

type ProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  tier_visibility?: string | null;
  preferred_ai_voice?: string | null;
  safety_preferences?: Record<string, unknown> | null;
  content_preferences?: Record<string, unknown> | null;
  sovereignty_settings?: Record<string, unknown> | null;
};

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "NEXUS — Settings" }] }),
  component: Settings,
});

const TIER_VISIBILITY = [
  { id: "full", label: "Full", desc: "Tier visible to you and community" },
  { id: "self_only", label: "Self only", desc: "Tier visible only to you" },
  { id: "hidden", label: "Hidden", desc: "Progression happens silently" },
  { id: "milestones", label: "Milestones", desc: "Only shown when a new tier is reached" },
] as const;

function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      setProfile(data as ProfileRow | null);
    })();
  }, []);

  const { data: auditLog = [] } = useQuery({
    queryKey: ["ai-audit-log"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("ai_audit_log")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: mhResources = [] } = useQuery({
    queryKey: ["mh-resources-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("mental_health_resources").select("*").eq("is_active", true).limit(6);
      return data ?? [];
    },
  });

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name,
      handle: profile.handle,
      bio: profile.bio,
      tier_visibility: profile.tier_visibility,
      preferred_ai_voice: profile.preferred_ai_voice,
      safety_preferences: profile.safety_preferences,
      content_preferences: profile.content_preferences,
      sovereignty_settings: profile.sovereignty_settings,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error("Couldn't save");
    else toast.success("Saved.");
  }

  async function exportData() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [entries, checkins, achievements] = await Promise.all([
      supabase.from("cortex_entries").select("*").eq("user_id", u.user.id),
      supabase.from("wellbeing_checkins").select("*").eq("user_id", u.user.id),
      supabase.from("user_achievements").select("*, achievement:achievements(*)").eq("user_id", u.user.id),
    ]);
    const blob = new Blob(
      [JSON.stringify({ cortex: entries.data, wellbeing: checkins.data, achievements: achievements.data }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function patchSafety(key: string, value: unknown) {
    setProfile((p) => p ? { ...p, safety_preferences: { ...p.safety_preferences, [key]: value } } : p);
  }

  function patchContent(key: string, value: unknown) {
    setProfile((p) => p ? { ...p, content_preferences: { ...p.content_preferences, [key]: value } } : p);
  }

  if (!profile) return <AppShell title="Settings"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  const safety = (profile.safety_preferences ?? {}) as Record<string, boolean>;
  const content = (profile.content_preferences ?? {}) as Record<string, boolean | string>;

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
          </div>
        </section>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">AI Coach voice</h2>
          <p className="mb-4 text-sm text-muted-foreground">Each voice has a documented stance, biases, and blind spots.</p>
          <AIVoicePicker
            value={(profile.preferred_ai_voice ?? "socratic") as AIVoiceId}
            onChange={(v) => setProfile({ ...profile, preferred_ai_voice: v })}
          />
        </section>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Tier visibility</h2>
          <p className="mb-4 text-sm text-muted-foreground">Control how visible your tier is — to yourself and others.</p>
          <div className="space-y-2">
            {TIER_VISIBILITY.map((opt) => (
              <label key={opt.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${profile.tier_visibility === opt.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <input
                  type="radio"
                  name="tier_visibility"
                  checked={(profile.tier_visibility ?? "full") === opt.id}
                  onChange={() => setProfile({ ...profile, tier_visibility: opt.id })}
                  className="mt-1 accent-[color:var(--primary)]"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Safety preferences</h2>
          <div className="space-y-3">
            {[
              ["crisis_helpline_visible", "Show crisis helplines in Chamber footer"],
              ["peer_support_circle_accessible", "Show peer support links"],
              ["ai_can_suggest_human_connection_when_distressed", "AI can suggest human connection when distressed"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={safety[key] !== false} onChange={(e) => patchSafety(key, e.target.checked)} className="accent-[color:var(--primary)]" />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Content preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={content.show_warnings !== false} onChange={(e) => patchContent("show_warnings", e.target.checked)} className="accent-[color:var(--primary)]" />
              Show content warnings before sensitive modules
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!content.auto_skip_intense} onChange={(e) => patchContent("auto_skip_intense", e.target.checked)} className="accent-[color:var(--primary)]" />
              Auto-skip intense content (opt-in required modules)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={content.pause_after_intense_content !== false} onChange={(e) => patchContent("pause_after_intense_content", e.target.checked)} className="accent-[color:var(--primary)]" />
              Suggest pause after intense content
            </label>
          </div>
        </section>

        <section className="nexus-card p-6" id="sovereignty">
          <h2 className="mb-2 font-display text-lg font-semibold">Sovereignty</h2>
          <p className="text-sm text-muted-foreground">Your data. Your audit trail. Your choice.</p>
          <button onClick={exportData} className="mt-3 rounded-md border border-border bg-elevated px-4 py-2 text-sm hover:bg-elevated/70">
            Export all data (JSON)
          </button>
          {auditLog.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-border bg-elevated p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">AI audit log</p>
              {auditLog.map((row: any) => (
                <p key={row.id} className="border-b border-border/40 py-1.5 text-xs text-muted-foreground last:border-0">
                  {new Date(row.created_at).toLocaleString()} — {row.action_description}
                </p>
              ))}
            </div>
          )}
        </section>

        {mhResources.length > 0 && (
          <section className="nexus-card p-6">
            <h2 className="mb-2 font-display text-lg font-semibold">Crisis resources</h2>
            <ul className="space-y-2 text-sm">
              {mhResources.map((r: any) => (
                <li key={r.id}>
                  <span className="font-medium">{r.organisation}</span>
                  <span className="text-muted-foreground"> — {r.contact_info}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "…" : "Save all settings"}
          </button>
        </div>

        <section className="nexus-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Session</h2>
          <button onClick={signOut} className="rounded-md border border-border bg-elevated px-4 py-2 text-sm hover:bg-elevated/70">Sign out</button>
        </section>
      </div>
    </AppShell>
  );
}
