import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Link2, FileText, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PerspectiveLinkEditor } from "./cortex/perspective-link-editor";

export type EntryType = "action" | "perspective_shift" | "experiment" | "contribution" | "milestone" | "mentorship" | "collaboration";

export const ENTRY_TYPE_META: Record<EntryType, { label: string; color: string; bg: string }> = {
  action:            { label: "Action",            color: "var(--accent-teal)",   bg: "color-mix(in oklab, var(--accent-teal) 18%, transparent)" },
  perspective_shift: { label: "Perspective Shift", color: "var(--accent-amber)",  bg: "color-mix(in oklab, var(--accent-amber) 18%, transparent)" },
  experiment:        { label: "Experiment",        color: "var(--accent-orange)", bg: "color-mix(in oklab, var(--accent-orange) 18%, transparent)" },
  contribution:      { label: "Contribution",      color: "var(--accent-green)",  bg: "color-mix(in oklab, var(--accent-green) 18%, transparent)" },
  milestone:         { label: "Milestone",         color: "var(--primary)",       bg: "color-mix(in oklab, var(--primary) 18%, transparent)" },
  mentorship:        { label: "Mentorship",        color: "var(--accent-teal)",   bg: "color-mix(in oklab, var(--accent-teal) 18%, transparent)" },
  collaboration:     { label: "Collaboration",     color: "var(--accent-green)",  bg: "color-mix(in oklab, var(--accent-green) 18%, transparent)" },
};

export interface CortexEntry {
  id: string;
  user_id: string;
  entry_type: EntryType;
  title: string;
  body: string;
  domains: string[] | null;
  previous_belief?: string | null;
  new_belief?: string | null;
  what_i_learned?: string | null;
  happened_at?: string | null;
  created_at: string;
  is_public?: boolean | null;
}

export function CortexEntryCard({ entry, idx = 0 }: { entry: CortexEntry; idx?: number }) {
  const meta = ENTRY_TYPE_META[entry.entry_type] ?? ENTRY_TYPE_META.action;
  const [expanded, setExpanded] = useState(false);

  const { data: evidence = [] } = useQuery({
    queryKey: ["cortex-evidence", entry.id],
    enabled: expanded,
    queryFn: async () => {
      const { data } = await supabase
        .from("cortex_evidence")
        .select("*")
        .eq("entry_id", entry.id);
      return data ?? [];
    },
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: idx * 0.04 }}
      className="group relative flex gap-4"
    >
      {/* timeline dot */}
      <div className="relative flex w-4 shrink-0 flex-col items-center">
        <span
          className="mt-2 h-3 w-3 rounded-full ring-4"
          style={{ backgroundColor: meta.color, boxShadow: `0 0 14px ${meta.color}`, ['--tw-ring-color' as any]: "var(--background)" }}
        />
        <span className="mt-1 w-px flex-1 bg-border" />
      </div>

      <div 
        className={`nexus-card mb-6 flex-1 p-5 transition cursor-pointer hover:border-primary/45 ${expanded ? "border-primary/30 bg-elevated/20" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="chip" style={{ background: meta.bg, borderColor: `${meta.color}55`, color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(entry.happened_at ?? entry.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="ml-auto text-muted-foreground/60 hover:text-foreground transition p-1 rounded hover:bg-elevated/40"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug">{entry.title}</h3>
        <p className={`mt-1.5 text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {entry.body}
        </p>

        {entry.entry_type === "perspective_shift" && entry.previous_belief && entry.new_belief && (
          <div className="mt-3 grid gap-2 rounded-md border border-border bg-background/50 p-3 text-sm sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
            <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Used to think</span><p className="mt-1">{entry.previous_belief}</p></div>
            <div><span className="text-[10px] uppercase tracking-wider text-accent-amber">Now think</span><p className="mt-1">{entry.new_belief}</p></div>
          </div>
        )}
        {entry.entry_type === "experiment" && entry.what_i_learned && (
          <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] uppercase tracking-wider text-accent-orange">What it taught me</span>
            <p className="mt-1">{entry.what_i_learned}</p>
          </div>
        )}

        {entry.domains && entry.domains.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {entry.domains.map((d) => (
              <span key={d} className="chip">{d}</span>
            ))}
          </div>
        )}

        {/* Expanded detail panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-border/40 space-y-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Evidence attachments */}
              {evidence.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">Evidence Attachments</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {evidence.map((ev: any) => (
                      <a
                        key={ev.id}
                        href={ev.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded border border-border bg-elevated/45 p-2 text-xs hover:border-primary/40 hover:bg-elevated/85 transition"
                      >
                        {ev.evidence_type === "file" ? <FileText className="h-4 w-4 text-accent-teal shrink-0" /> : <Link2 className="h-4 w-4 text-primary shrink-0" />}
                        <span className="truncate font-medium flex-1">{ev.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Perspective Link Editor */}
              <div className="rounded-lg border border-border/50 bg-elevated/10 p-3">
                <PerspectiveLinkEditor entryId={entry.id} userId={entry.user_id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
