import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Github, Youtube, Linkedin, BookOpen, Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/integrations/suggestions")({
  head: () => ({ meta: [{ title: "NEXUS — Suggestions" }] }),
  component: SuggestionsPage,
});

const PLATFORM_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  github: { label: "GitHub", icon: Github, color: "text-foreground", bg: "bg-zinc-800" },
  youtube: { label: "YouTube", icon: Youtube, color: "text-red-400", bg: "bg-red-950/50" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-400", bg: "bg-blue-950/50" },
  medium: { label: "Medium", icon: BookOpen, color: "text-green-400", bg: "bg-green-950/30" },
  browser: { label: "Browser", icon: Globe, color: "text-accent-teal", bg: "bg-teal-950/30" },
  browser_extension: { label: "Browser", icon: Globe, color: "text-accent-teal", bg: "bg-teal-950/30" },
};

const ENTRY_TYPES = ["action", "experiment", "contribution", "perspective_shift"];

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform] ?? { label: platform, icon: Globe, color: "text-muted-foreground", bg: "bg-muted/20" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function SuggestionCard({ suggestion, onRemove }: { suggestion: any; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    title: suggestion.title ?? "",
    body: suggestion.body ?? "",
    domains: (suggestion.domains ?? []).join(", "),
    entry_type: suggestion.suggestion_type ?? "action",
  });
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  async function accept() {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdk/suggestions/${suggestion.id}/accept`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entry_type: form.entry_type,
          title: form.title,
          body: form.body,
          domains: form.domains.split(",").map((d: string) => d.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Added to your Cortex");
      qc.invalidateQueries({ queryKey: ["pending-suggestions"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestions-count"] });
      onRemove();
    } catch {
      toast.error("Failed to add entry");
    }
    setSubmitting(false);
  }

  async function discard() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdk/suggestions/${suggestion.id}/discard`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      qc.invalidateQueries({ queryKey: ["pending-suggestions"] });
      qc.invalidateQueries({ queryKey: ["pending-suggestions-count"] });
      onRemove();
    } catch {
      toast.error("Failed to discard");
    }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0 }}
      className="nexus-card p-5">
      <div className="flex items-start gap-3 flex-wrap">
        <PlatformBadge platform={suggestion.platform} />
        {suggestion.suggestion_type && (
          <span className="inline-flex items-center rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-medium text-primary">
            {suggestion.suggestion_type.replace("_", " ")}
          </span>
        )}
      </div>
      <h3 className="mt-2 font-semibold text-sm">{suggestion.title}</h3>
      {suggestion.ai_summary && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{suggestion.ai_summary}</p>
      )}
      {suggestion.body && !suggestion.ai_summary && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{suggestion.body}</p>
      )}
      {suggestion.source_url && (
        <a href={suggestion.source_url} target="_blank" rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition truncate max-w-xs">
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{suggestion.source_url}</span>
        </a>
      )}
      {suggestion.domains?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestion.domains.map((d: string) => (
            <span key={d} className="chip text-[10px]">{d}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
          Add to Cortex
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button onClick={discard} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-elevated transition">
          Discard
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 overflow-hidden border-t border-border pt-4">
            <div className="flex flex-wrap gap-1.5">
              {ENTRY_TYPES.map((t) => (
                <button key={t} onClick={() => setForm(f => ({ ...f, entry_type: t }))}
                  className={`rounded-full px-3 py-1 text-[10px] font-medium capitalize transition ${form.entry_type === t ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" />
            <textarea rows={3} value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="What does this mean to you?"
              className="w-full resize-none rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" />
            <input value={form.domains} onChange={(e) => setForm(f => ({ ...f, domains: e.target.value }))}
              placeholder="Domains (comma separated)"
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" />
            <button onClick={accept} disabled={submitting}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? "Adding…" : "Confirm & Add"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SuggestionsPage() {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["pending-suggestions"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("cortex_suggestions").select("*").eq("user_id", u.user.id).eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: integrations = [] } = useQuery({
    queryKey: ["user-integrations"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("user_integrations").select("*").eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  const { data: weekSuggestions = 0 } = useQuery({
    queryKey: ["suggestions-this-week"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return 0;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase.from("cortex_suggestions").select("*", { count: "exact", head: true })
        .eq("user_id", u.user.id).gte("created_at", weekAgo);
      return count ?? 0;
    },
  });

  const connected = (integrations as any[]).filter((i) => i.is_connected);
  const visible = suggestions.filter((s: any) => !dismissed.has(s.id));

  const platformCounts = visible.reduce((acc: Record<string, number>, s: any) => {
    acc[s.platform] = (acc[s.platform] ?? 0) + 1;
    return acc;
  }, {});
  const mostActive = Object.entries(platformCounts).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0];

  return (
    <AppShell title="Suggestions">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* LEFT */}
        <div>
          <div className="mb-4">
            <h2 className="font-display text-xl font-bold">Pending Suggestions</h2>
            <p className="text-xs text-muted-foreground">Review activity from your connected platforms</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="nexus-card h-28 animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="nexus-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No suggestions yet. Connect a platform in Settings or install the browser extension to start capturing your learning everywhere.
              </p>
              <Link to="/settings" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Set up integrations →
              </Link>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {visible.map((s: any) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onRemove={() => setDismissed(prev => new Set([...prev, s.id]))}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <div className="nexus-card p-5">
            <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Summary</h3>
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold font-display">{connected.length}</p>
                <p className="text-xs text-muted-foreground">Connected platforms</p>
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{weekSuggestions}</p>
                <p className="text-xs text-muted-foreground">Suggestions this week</p>
              </div>
              {mostActive && (
                <div>
                  <p className="text-sm font-medium capitalize">{PLATFORM_CONFIG[mostActive]?.label ?? mostActive}</p>
                  <p className="text-xs text-muted-foreground">Most active platform</p>
                </div>
              )}
            </div>
            <Link to="/settings" className="mt-4 block text-xs text-primary hover:underline">Manage integrations →</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
