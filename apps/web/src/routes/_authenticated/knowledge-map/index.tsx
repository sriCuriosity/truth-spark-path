import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Network, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

export const Route = createFileRoute("/_authenticated/knowledge-map/")({
  head: () => ({ meta: [{ title: "NEXUS — Knowledge Map" }] }),
  component: KnowledgeMap,
});

function KnowledgeMap() {
  const graphRef = useRef<any>();

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

  // Transform entries into graph data
  const graphData = {
    nodes: entries.map((entry: any) => ({
      id: entry.id,
      label: entry.title,
      type: entry.entry_type,
      domains: entry.domains,
      val: entry.impact_count || 1,
    })),
    links: [] as any[],
  };

  // Add some example connections based on shared domains
  entries.forEach((entry: any, i: number) => {
    if (i > 0 && entry.domains && entries[i - 1].domains) {
      const sharedDomains = entry.domains.filter((d: string) => 
        entries[i - 1].domains.includes(d)
      );
      if (sharedDomains.length > 0) {
        graphData.links.push({
          source: entries[i - 1].id,
          target: entry.id,
          value: sharedDomains.length,
        });
      }
    }
  });

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
