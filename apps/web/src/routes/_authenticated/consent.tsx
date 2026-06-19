import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Eye, Brain, Wifi, Smartphone, Lock, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/consent")({
  head: () => ({ meta: [{ title: "NEXUS — Sovereignty & Consent" }] }),
  component: ConsentDashboard,
});

interface SovereigntySettings {
  ai_feedback: boolean;
  public_cortex: boolean;
  extension_tracking: boolean;
  mobile_sync: boolean;
  peer_visibility: boolean;
  ai_question_logging: boolean;
  wellbeing_data_share: boolean;
  knowledge_graph_public: boolean;
}

const DEFAULT_SETTINGS: SovereigntySettings = {
  ai_feedback: true,
  public_cortex: false,
  extension_tracking: true,
  mobile_sync: true,
  peer_visibility: true,
  ai_question_logging: true,
  wellbeing_data_share: false,
  knowledge_graph_public: false,
};

const CONSENT_CATEGORIES = [
  {
    key: "ai_feedback" as keyof SovereigntySettings,
    icon: Brain,
    title: "AI Socratic Feedback",
    description: "Allow the AI Mentor to analyse your Cortex entries and generate personalised Socratic questions.",
    warning: "Disabling this prevents the AI Coach from accessing your learning data. You can still chat, but responses will be generic.",
    color: "#8B5CF6",
  },
  {
    key: "ai_question_logging" as keyof SovereigntySettings,
    icon: Info,
    title: "AI Question Audit Logging",
    description: "Store anonymised reasoning context for every AI question you receive (enables \"Why did you ask me that?\").",
    warning: "Disabling this removes your ability to interrogate AI reasoning. Only prompt hashes will be stored.",
    color: "#06B6D4",
  },
  {
    key: "public_cortex" as keyof SovereigntySettings,
    icon: Eye,
    title: "Public Cortex Entries",
    description: "Allow entries you mark as 'public' to appear in community feeds and peer validation flows.",
    warning: "Disabling this makes all your entries private-only, even if individually marked public.",
    color: "#10B981",
  },
  {
    key: "peer_visibility" as keyof SovereigntySettings,
    icon: Shield,
    title: "Peer Visibility",
    description: "Allow Learning Circle members and co-mentors to see your public entries and contribution score.",
    warning: "Disabling this hides your profile from circles and mentor matching. Existing relationships persist but new discovery stops.",
    color: "#F59E0B",
  },
  {
    key: "extension_tracking" as keyof SovereigntySettings,
    icon: Wifi,
    title: "Browser Extension Sync",
    description: "Allow the NEXUS browser extension to push captured web activity into your Cortex.",
    warning: "Disabling this prevents the extension from sending any data. Local extension storage continues independently.",
    color: "#EC4899",
  },
  {
    key: "mobile_sync" as keyof SovereigntySettings,
    icon: Smartphone,
    title: "Mobile App Sync",
    description: "Allow the NEXUS mobile app to synchronise offline entries, health data, and location context.",
    warning: "Disabling this puts the mobile app in offline-only mode. Entries created on mobile will not sync to your Cortex.",
    color: "#F43F5E",
  },
  {
    key: "wellbeing_data_share" as keyof SovereigntySettings,
    icon: Lock,
    title: "Wellbeing Data in AI Context",
    description: "Allow your wellbeing check-in history (emotions, energy) to be included in AI Mentor context windows.",
    warning: "Disabling this excludes all wellbeing data from AI processing. The AI Mentor will not reference your emotional state.",
    color: "#14B8A6",
  },
  {
    key: "knowledge_graph_public" as keyof SovereigntySettings,
    icon: Eye,
    title: "Knowledge Graph Public Nodes",
    description: "Allow your Cortex nodes to appear in the community knowledge graph explorer.",
    warning: "Disabling this makes your nodes invisible in the shared graph. Your private graph is unaffected.",
    color: "#A855F7",
  },
];

function ConsentDashboard() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SovereigntySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SovereigntySettings>(DEFAULT_SETTINGS);

  // Fetch current sovereignty settings
  const { data: profile } = useQuery({
    queryKey: ["consent-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, sovereignty_settings")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  // Initialise settings from profile
  useEffect(() => {
    if (profile?.sovereignty_settings) {
      const merged = { ...DEFAULT_SETTINGS, ...(profile.sovereignty_settings as Partial<SovereigntySettings>) };
      setSettings(merged);
      setOriginalSettings(merged);
      setHasChanges(false);
    }
  }, [profile]);

  function toggleSetting(key: keyof SovereigntySettings) {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalSettings));
      return updated;
    });
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");

      const { error } = await supabase
        .from("profiles")
        .update({ sovereignty_settings: settings as any })
        .eq("id", u.user.id);

      if (error) throw error;

      setOriginalSettings(settings);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["consent-profile"] });
      toast.success("Sovereignty settings saved. Your data boundaries are enforced immediately.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = Object.values(settings).filter(Boolean).length;
  const totalCount = Object.keys(settings).length;

  return (
    <AppShell title="Sovereignty & Consent">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Sovereignty meter */}
        <div className="nexus-card p-6 bg-surface/40 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 border border-primary/25">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Data Sovereignty Controls</h2>
                <p className="text-xs text-muted-foreground">Every toggle is enforced server-side via RLS. No silent access.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-primary">{enabledCount}</span>
              <span className="text-sm text-muted-foreground">/{totalCount}</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Consents</p>
            </div>
          </div>

          {/* Visual consent bar */}
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-border/30">
            {CONSENT_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                className="flex-1 rounded-full transition-all duration-500"
                style={{
                  background: settings[cat.key] ? cat.color : "transparent",
                  opacity: settings[cat.key] ? 1 : 0.15,
                }}
              />
            ))}
          </div>
        </div>

        {/* Individual consent toggles */}
        <div className="space-y-3">
          {CONSENT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isEnabled = settings[cat.key];

            return (
              <div
                key={cat.key}
                className={`nexus-card p-5 transition-all duration-300 ${
                  isEnabled ? "border-l-2" : "border-l-2 border-l-border/30 opacity-70"
                }`}
                style={isEnabled ? { borderLeftColor: cat.color } : undefined}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-all"
                    style={{
                      background: isEnabled ? `${cat.color}15` : "transparent",
                      borderColor: isEnabled ? `${cat.color}40` : "var(--border)",
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: isEnabled ? cat.color : "var(--muted-foreground)" }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold">{cat.title}</h3>

                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleSetting(cat.key)}
                        className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-300 ${
                          isEnabled ? "border-transparent" : "border-border bg-surface"
                        }`}
                        style={isEnabled ? { background: cat.color } : undefined}
                        role="switch"
                        aria-checked={isEnabled}
                        id={`consent-toggle-${cat.key}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{cat.description}</p>

                    {!isEnabled && (
                      <p className="mt-2 text-[10px] text-accent-amber/80 flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">⚠</span>
                        {cat.warning}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save bar */}
        {hasChanges && (
          <div className="sticky bottom-6 flex items-center justify-between rounded-xl border border-primary/40 bg-surface/90 backdrop-blur-md px-6 py-4 shadow-lg glow-primary">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Unsaved sovereignty changes</span>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? "Enforcing..." : "Save & Enforce"}
            </button>
          </div>
        )}

        {/* Footer notice */}
        <div className="rounded-lg border border-border/40 bg-elevated/20 p-4 text-center">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            NEXUS Sovereignty Promise: Every toggle above maps to a database-level Row-Level Security policy.
            When you disable a consent, the server physically cannot access that data class — even if the frontend code tried.
            This is not a preference. It is an architecture.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
