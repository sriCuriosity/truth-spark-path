import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Github, Youtube, Linkedin, BookOpen, Globe, Check, X, RefreshCw, Copy, AlertTriangle, Key, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ApiTokenDisplay } from "@/components/api-token-display";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "NEXUS — Settings" }] }),
  component: Settings,
});

type Tab = "profile" | "integrations";

const PLATFORMS = [
  {
    id: "github",
    name: "GitHub",
    description: "Code commits, repos, and pull requests added to your Cortex",
    icon: Github,
    color: "text-foreground",
    dataTypes: ["Code pushes and commits", "Pull request activity", "Issues you create or comment on"],
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Educational videos you watch deeply (>70% watched)",
    icon: Youtube,
    color: "text-red-400",
    dataTypes: ["Videos watched beyond 70%", "Watch history metadata"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Articles and posts you publish",
    icon: Linkedin,
    color: "text-blue-400",
    dataTypes: ["Articles you publish", "Posts and updates"],
  },
  {
    id: "medium",
    name: "Medium",
    description: "Articles you read and write",
    icon: BookOpen,
    color: "text-green-400",
    dataTypes: ["Articles you write", "Reading activity"],
  },
  {
    id: "browser_extension",
    name: "Browser Extension",
    description: "Any page you choose to add from your browser",
    icon: Globe,
    color: "text-accent-teal",
    dataTypes: ["Pages you manually flag", "Classified learning content"],
  },
] as const;

function RelativeTime({ date }: { date: string | null }) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  return <span>{Math.floor(hrs / 24)}d ago</span>;
}

function ConnectGitHubModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const qc = useQueryClient();
  const [consented, setConsented] = useState<Record<string, boolean>>({
    "Code pushes and commits": true,
    "Pull request activity": true,
    "Issues you create or comment on": true,
  });
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    setConnecting(true);
    const granted = Object.entries(consented).filter(([, v]) => v).map(([k]) => k);
    const { error } = await supabase.from("user_integrations").upsert({
      user_id: userId,
      platform: "github",
      is_connected: true,
      scopes_granted: ["repo", "read:user"],
      data_types_consented: granted,
      auto_suggest: true,
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform" });
    setConnecting(false);
    if (error) { toast.error("Failed to connect"); return; }
    toast.success("GitHub connected");
    qc.invalidateQueries({ queryKey: ["user-integrations"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
      <div className="nexus-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Connect GitHub</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Select the data types you'd like to share with NEXUS:</p>
        <div className="space-y-2 mb-4">
          {Object.keys(consented).map((k) => (
            <label key={k} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={consented[k]} onChange={(e) => setConsented(prev => ({ ...prev, [k]: e.target.checked }))}
                className="rounded border-border" />
              <span className="text-sm">{k}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4 rounded-md border border-border bg-elevated p-3">
          NEXUS will suggest Cortex entries from this activity. You review each suggestion before it's added.
        </p>
        <p className="text-xs text-accent-teal mb-4">Full OAuth coming soon — tracking is active via the browser extension.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm hover:bg-elevated">Cancel</button>
          <button onClick={connect} disabled={connecting} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {connecting ? "Connecting…" : "Connect with GitHub"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtensionModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const qc = useQueryClient();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: tokens = [], refetch: refetchTokens } = useQuery({
    queryKey: ["api-tokens"],
    queryFn: async () => {
      const { data } = await supabase.from("api_tokens").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function generateToken() {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdk/token`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: "Browser Extension" }),
      });
      const data = await res.json();
      if (data.token) {
        setNewToken(data.token);
        refetchTokens();
        qc.invalidateQueries({ queryKey: ["api-tokens"] });
      } else {
        toast.error("Failed to generate token");
      }
    } catch {
      toast.error("Failed to generate token");
    }
    setGenerating(false);
  }

  async function revokeToken(id: string) {
    await supabase.from("api_tokens").delete().eq("id", id);
    refetchTokens();
    toast.success("Token revoked");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur p-4">
      <div className="nexus-card w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold">Install the NEXUS Extension</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <ol className="space-y-4 mb-6">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</span>
            <div>
              <p className="text-sm font-medium">Download the extension file</p>
              <button className="mt-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs hover:bg-elevated/70">
                Download nexus-extension.zip
              </button>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">2</span>
            <div>
              <p className="text-sm font-medium">Load in Chrome</p>
              <p className="mt-1 text-xs text-muted-foreground">Open <code className="rounded bg-elevated px-1">chrome://extensions</code>, enable Developer Mode, click Load Unpacked, select the extracted folder</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</span>
            <div>
              <p className="text-sm font-medium">Activate</p>
              <p className="mt-1 text-xs text-muted-foreground">Pin the NEXUS icon to your toolbar and sign in with your account</p>
            </div>
          </li>
        </ol>

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-accent-teal" />
            <h3 className="text-sm font-semibold">API Token</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Your extension needs this token to connect to your account.</p>

          {newToken ? (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Your new token (shown once):</p>
              <ApiTokenDisplay token={newToken} />
            </div>
          ) : (
            <button onClick={generateToken} disabled={generating}
              className="mb-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {generating ? "Generating…" : "Generate Token"}
            </button>
          )}

          {tokens.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Existing tokens</p>
              <div className="space-y-2">
                {tokens.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.label ?? "Token"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Created {new Date(t.created_at).toLocaleDateString()}
                        {t.last_used && <> · Last used <RelativeTime date={t.last_used} /></>}
                      </p>
                    </div>
                    <button onClick={() => revokeToken(t.id)} className="text-muted-foreground hover:text-red-400 transition" title="Revoke">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-md border border-border py-2 text-sm hover:bg-elevated">Close</button>
      </div>
    </div>
  );
}

function IntegrationsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [connectModal, setConnectModal] = useState<string | null>(null);

  const { data: integrations = [] } = useQuery({
    queryKey: ["user-integrations"],
    queryFn: async () => {
      const { data } = await supabase.from("user_integrations").select("*").eq("user_id", userId);
      return data ?? [];
    },
  });

  const integrationMap = Object.fromEntries(integrations.map((i: any) => [i.platform, i]));

  async function toggleAutoSuggest(platform: string, current: boolean) {
    const existing = integrationMap[platform];
    if (!existing) return;
    await supabase.from("user_integrations").update({ auto_suggest: !current }).eq("id", existing.id);
    qc.invalidateQueries({ queryKey: ["user-integrations"] });
  }

  async function disconnect(platform: string) {
    const existing = integrationMap[platform];
    if (!existing) return;
    await supabase.from("user_integrations").update({ is_connected: false }).eq("id", existing.id);
    qc.invalidateQueries({ queryKey: ["user-integrations"] });
    toast.success("Disconnected");
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((p) => {
        const integration = integrationMap[p.id];
        const connected = integration?.is_connected ?? false;

        return (
          <div key={p.id} className="nexus-card p-5">
            <div className="flex items-start gap-4">
              <div className={`mt-0.5 ${p.color}`}>
                <p.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm">{p.name}</h3>
                  {connected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Not connected
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                {connected && integration?.last_synced && (
                  <p className="mt-1 text-[10px] text-muted-foreground">Last synced: <RelativeTime date={integration.last_synced} /></p>
                )}
                {connected && (
                  <label className="mt-3 flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => toggleAutoSuggest(p.id, integration?.auto_suggest ?? true)}
                      className={`relative h-4 w-8 rounded-full transition cursor-pointer ${integration?.auto_suggest ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${integration?.auto_suggest ? "left-4" : "left-0.5"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">Suggest Cortex entries automatically</span>
                  </label>
                )}
              </div>
              <div className="shrink-0">
                {connected ? (
                  <button onClick={() => disconnect(p.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-elevated hover:text-red-400 transition">
                    Disconnect
                  </button>
                ) : (
                  <button onClick={() => setConnectModal(p.id)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {connectModal === "github" && <ConnectGitHubModal userId={userId} onClose={() => setConnectModal(null)} />}
      {connectModal === "browser_extension" && <ExtensionModal userId={userId} onClose={() => setConnectModal(null)} />}
      {connectModal && connectModal !== "github" && connectModal !== "browser_extension" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="nexus-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Connect {PLATFORMS.find(p => p.id === connectModal)?.name}</h2>
              <button onClick={() => setConnectModal(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-accent-teal mb-4">Full OAuth coming soon — tracking is active via the browser extension.</p>
            <button onClick={() => setConnectModal(null)} className="w-full rounded-md border border-border py-2 text-sm hover:bg-elevated">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
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
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {(["profile", "integrations"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <>
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
          </>
        )}

        {tab === "integrations" && userId && <IntegrationsTab userId={userId} />}
      </div>
    </AppShell>
  );
}
