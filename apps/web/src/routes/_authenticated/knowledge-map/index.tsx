import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Network, Zap, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/knowledge-map/")({
  head: () => ({ meta: [{ title: "NEXUS — Knowledge Map" }] }),
  component: KnowledgeMap,
});

function KnowledgeMap() {
  const graphRef = useRef<any>();

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["cortex-entries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cortex_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

   const { data: linkEntries = [], isLoading: isLinksLoading } = useQuery({
    queryKey: ["all-perspective-links", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("cortex_perspective_links")
        .select("id, source_entry_id, target_entry_id, link_type")
        .eq("user_id", profile?.id);
      return data ?? [];
    },
  });

  const currentTier = profile?.current_tier ?? "seeker";
  const totalXp = profile?.total_xp ?? 0;
  const isLocked = currentTier === "seeker" || currentTier === "explorer";
  const xpNeeded = 2000;
  const progressPercent = Math.min(100, Math.round((totalXp / xpNeeded) * 100));

  // Transform entries into graph data
  const graphData = {
    nodes: entries.map((entry: any) => ({
      id: entry.id,
      label: entry.title,
      type: entry.entry_type,
      domains: entry.domains,
      val: entry.impact_count || 1,
    })),
    links: linkEntries.map((link: any) => ({
      source: link.source_entry_id,
      target: link.target_entry_id,
      label: link.link_type,
      value: 2,
    })),
  };

  return (
    <AppShell title="Knowledge Map">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your Knowledge Graph</h2>
            <p className="text-sm text-muted-foreground">Visualize connections between your learning experiences</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="h-4 w-4" />
            {entries.length} entries
          </div>
        </div>

        {isLocked ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-8 text-center md:p-12">
            <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-96 w-96 rounded-full bg-accent-teal/5 blur-3xl" />
            
            <div className="relative z-10 mx-auto max-w-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">Graph Explorer is Locked</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                To prevent cognitive overload and maintain focus, the dynamic Cortex Knowledge Map is restricted to seekers who have demonstrated substantial craft. You must reach the <span className="font-semibold text-primary capitalize">Builder Tier</span> (2,000 XP) to unlock it.
              </p>

              <div className="mt-8 rounded-lg border border-border bg-elevated/40 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>Current Progress</span>
                  <span className="text-accent-teal font-semibold">{totalXp} / {xpNeeded} XP ({progressPercent}%)</span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-accent-teal" />
                  <span>Your current tier is <strong className="capitalize text-foreground">{currentTier}</strong></span>
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/cortex" className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary">
                  Document in Cortex (+10 XP)
                </Link>
                <Link to="/domains" className="rounded-md border border-border bg-elevated px-4 py-2.5 text-sm font-medium hover:bg-elevated/70">
                  Explore Learning Domains
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="nexus-card p-4" style={{ height: "600px" }}>
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading knowledge map…</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Add Cortex entries to build your knowledge graph</p>
              </div>
            ) : (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="label"
                nodeColor={(node: any) => {
                  const colors: Record<string, string> = {
                    action: "#4F46E5",
                    perspective_shift: "#10B981",
                    experiment: "#F59E0B",
                    contribution: "#EC4899",
                    milestone: "#8B5CF6",
                    mentorship: "#06B6D4",
                    collaboration: "#84CC16",
                  };
                  return colors[node.type] || "#6B7280";
                }}
                nodeVal={(node: any) => node.val * 5 + 5}
                linkColor={() => "#4B5563"}
                linkWidth={(link: any) => link.value}
                width={600}
                height={600}
                enablePanInteraction={true}
                enableZoomInteraction={true}
                onNodeClick={(node: any) => {
                  window.location.href = `/cortex`;
                }}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {entries.slice(0, 4).map((entry: any) => (
            <div key={entry.id} className="nexus-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-accent-teal" />
                <span className="text-xs font-medium capitalize">{entry.entry_type.replace("_", " ")}</span>
              </div>
              <h4 className="text-sm font-medium line-clamp-2">{entry.title}</h4>
              {entry.domains.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {entry.domains.slice(0, 2).map((domain: string) => (
                    <span key={domain} className="text-[10px] bg-elevated px-2 py-0.5 rounded-full text-muted-foreground">
                      {domain}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

