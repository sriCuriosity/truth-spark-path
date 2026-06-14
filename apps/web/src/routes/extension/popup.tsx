// This component is also used as the browser extension popup. Build output goes to /extension-build
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Github, Youtube, Linkedin, BookOpen, Globe, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/extension/popup")({
  head: () => ({ meta: [{ title: "NEXUS — Extension" }] }),
  component: ExtensionPopup,
});

const ENTRY_TYPES = [
  { id: "action", label: "Action" },
  { id: "experiment", label: "Experiment" },
  { id: "contribution", label: "Contribution" },
  { id: "perspective_shift", label: "Shift" },
];

const PLATFORM_ICONS: Record<string, any> = {
  github: Github,
  youtube: Youtube,
  linkedin: Linkedin,
  medium: BookOpen,
  browser: Globe,
};

function RelativeTime({ date }: { date: string }) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  return <span>{Math.floor(hrs / 24)}d ago</span>;
}

const TYPE_DOTS: Record<string, string> = {
  action: "bg-accent-teal",
  experiment: "bg-accent-amber",
  contribution: "bg-primary",
  perspective_shift: "bg-purple-400",
  milestone: "bg-green-400",
  mentorship: "bg-blue-400",
  collaboration: "bg-pink-400",
};

function ExtensionPopup() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pageTitle = params.get("title") ?? "Current page";
  const pageUrl = params.get("url") ?? "";
  const platform = params.get("platform") ?? "browser";

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [entryType, setEntryType] = useState("action");
  const [title, setTitle] = useState(pageTitle);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [classification, setClassification] = useState<any>(null);

  const { data: user } = useQuery({
    queryKey: ["ext-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["ext-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: recentEntries = [] } = useQuery({
    queryKey: ["ext-recent-entries", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("cortex_entries").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!pageUrl || !user) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdk/classify`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: pageUrl, title: pageTitle, content_snippet: "", platform }),
        });
        if (res.ok) setClassification(await res.json());
      } catch {}
    })();
  }, [pageUrl, user]);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdk/activity`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: [{
            platform,
            activity_type: entryType,
            metadata: { title, description: body, auto_add: true },
            source_url: pageUrl,
            occurred_at: new Date().toISOString(),
          }],
        }),
      });
      setSubmitted(true);
    } catch {}
    setSubmitting(false);
  }

  const PlatformIcon = PLATFORM_ICONS[platform] ?? Globe;

  return (
    <div style={{ width: 320, minHeight: 480 }} className="bg-background text-foreground overflow-x-hidden flex flex-col">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="grid h-5 w-5 place-items-center rounded bg-primary/20 ring-1 ring-primary/40">
            <div className="h-2 w-2 rounded-sm bg-primary" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight">NEXUS</span>
        </div>
        <div className="flex items-center gap-2">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" />
          ) : (
            <div className="grid h-6 w-6 place-items-center rounded-full bg-elevated text-[10px] font-semibold">
              {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <button className="text-muted-foreground hover:text-foreground">
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Page detection */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PlatformIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs font-medium truncate">{pageTitle}</p>
        </div>
        {classification ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {classification.domains?.map((d: string) => (
              <span key={d} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{d}</span>
            ))}
            <span className={`text-[10px] ${classification.is_educational ? "text-accent-teal" : "text-muted-foreground"}`}>
              {classification.is_educational ? "Educational content detected" : "Not flagged as learning content"}
            </span>
          </div>
        ) : pageUrl ? (
          <p className="mt-1 text-[10px] text-muted-foreground">Classifying…</p>
        ) : null}
      </div>

      {/* Main action */}
      <div className="flex-1 px-4 py-4">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-teal/20">
              <Check className="h-6 w-6 text-accent-teal" />
            </div>
            <p className="text-sm font-medium">Added to your Cortex</p>
          </div>
        ) : !showForm ? (
          <button onClick={() => setShowForm(true)}
            className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary">
            Add to Cortex
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {ENTRY_TYPES.map((t) => (
                <button key={t.id} onClick={() => setEntryType(t.id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${entryType === t.id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-xs outline-none focus:border-primary" />
            <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="What does this mean to you?"
              className="w-full resize-none rounded-md border border-border bg-elevated px-3 py-2 text-xs outline-none focus:border-primary" />
            <button onClick={submit} disabled={submitting}
              className="w-full rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        )}

        {/* Recent activity */}
        {recentEntries.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Recent Cortex Activity</p>
            <div className="space-y-2">
              {recentEntries.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOTS[e.entry_type] ?? "bg-muted"}`} />
                  <p className="flex-1 truncate text-[11px]">{e.title}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0"><RelativeTime date={e.created_at} /></span>
                </div>
              ))}
            </div>
            <a href={`${window.location.origin}/cortex`} target="_blank" rel="noopener noreferrer"
              className="mt-2 block text-[10px] text-primary hover:underline">View all →</a>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-2.5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${user ? "bg-accent-teal" : "bg-accent-amber"}`} />
        {user ? (
          <span className="text-[10px] text-muted-foreground">Connected as @{profile?.handle ?? user.email}</span>
        ) : (
          <a href={`${window.location.origin}/auth`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline">Sign in →</a>
        )}
      </footer>
    </div>
  );
}
