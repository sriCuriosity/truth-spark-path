import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CortexEntryCard, ENTRY_TYPE_META, type CortexEntry, type EntryType } from "@/components/cortex-entry-card";
import { AddToCortexModal } from "@/components/add-to-cortex-modal";

export const Route = createFileRoute("/_authenticated/cortex")({
  head: () => ({ meta: [{ title: "NEXUS — My Cortex" }] }),
  component: CortexPage,
});

const FILTERS = ["all", "action", "perspective_shift", "experiment", "contribution", "milestone"] as const;
type Filter = (typeof FILTERS)[number];

function CortexPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);

  const { data: entries = [], refetch } = useQuery<CortexEntry[]>({
    queryKey: ["cortex-entries-all"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("cortex_entries").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false });
      return (data ?? []) as CortexEntry[];
    },
  });

  const filtered = filter === "all" ? entries : entries.filter(e => e.entry_type === filter);

  const byType = (Object.keys(ENTRY_TYPE_META) as EntryType[]).map(t => ({
    name: ENTRY_TYPE_META[t].label,
    count: entries.filter(e => e.entry_type === t).length,
    color: ENTRY_TYPE_META[t].color,
  })).filter(d => d.count > 0);

  const allDomains = new Map<string, number>();
  entries.forEach(e => (e.domains ?? []).forEach(d => allDomains.set(d, (allDomains.get(d) ?? 0) + 1)));
  const shiftCount = entries.filter(e => e.entry_type === "perspective_shift").length;

  return (
    <AppShell title="My Cortex">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {/* filters */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
            {FILTERS.map(f => {
              const label = f === "all" ? "All" : ENTRY_TYPE_META[f as EntryType]?.label ?? f;
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`relative px-4 py-2 text-sm transition ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="nexus-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {entries.length === 0 ? "Your Cortex is empty. Add your first entry." : "No entries match this filter yet."}
              </p>
              <button onClick={() => setAddOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary">
                <Plus className="h-4 w-4" /> Add to Cortex
              </button>
            </div>
          ) : (
            <>
              <div>
                {filtered.map((e, i) => <CortexEntryCard key={e.id} entry={e} idx={i} />)}
              </div>
              <button onClick={() => setAddOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary">
                <Plus className="h-4 w-4" /> Add to Cortex
              </button>
            </>
          )}
        </div>

        {/* Analytics */}
        <div className="space-y-4">
          <div className="nexus-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total entries</p>
            <p className="mt-1 font-display text-4xl font-bold">{entries.length}</p>
          </div>
          {byType.length > 0 && (
            <div className="nexus-card p-5">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">By type</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={byType} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--elevated)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {allDomains.size > 0 && (
            <div className="nexus-card p-5">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Domains explored</p>
              <div className="flex flex-wrap gap-1.5">
                {[...allDomains.entries()].map(([d, n]) => <span key={d} className="chip">{d} · {n}</span>)}
              </div>
            </div>
          )}
          <div className="nexus-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perspective shifts</p>
            <p className="mt-1 font-display text-3xl font-bold text-accent-amber">{shiftCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Documented times you changed your mind.</p>
          </div>
        </div>
      </div>

      <AddToCortexModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => refetch()} />
    </AppShell>
  );
}
