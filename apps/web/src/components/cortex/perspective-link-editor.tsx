import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, ArrowRight, X, Plus, GitBranch, RefreshCw, Lightbulb, Rocket, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LINK_TYPES = [
  { value: "builds_on", label: "Builds On", icon: ArrowRight, color: "#10B981", description: "This entry extends or deepens the linked entry." },
  { value: "contradicts", label: "Contradicts", icon: RefreshCw, color: "#F43F5E", description: "This entry challenges or conflicts with the linked entry." },
  { value: "synthesizes", label: "Synthesizes", icon: GitBranch, color: "#8B5CF6", description: "This entry combines ideas from the linked entry with others." },
  { value: "applies", label: "Applies", icon: Rocket, color: "#06B6D4", description: "This entry puts the linked entry into practice." },
  { value: "inspired_by", label: "Inspired By", icon: Lightbulb, color: "#F59E0B", description: "This entry was sparked by the linked entry." },
] as const;

type LinkType = (typeof LINK_TYPES)[number]["value"];

interface PerspectiveLinkEditorProps {
  entryId: string;
  userId: string;
}

export function PerspectiveLinkEditor({ entryId, userId }: PerspectiveLinkEditorProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<LinkType>("builds_on");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Fetch existing links for this entry
  const { data: links = [] } = useQuery({
    queryKey: ["perspective-links", entryId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cortex_perspective_links")
        .select("id, link_type, target_entry_id, target:cortex_entries!target_entry_id(id, title, entry_type, domains)")
        .eq("source_entry_id", entryId);

      // Also get reverse links (where this entry is the target)
      const { data: reverseData } = await (supabase as any)
        .from("cortex_perspective_links")
        .select("id, link_type, source_entry_id, source:cortex_entries!source_entry_id(id, title, entry_type, domains)")
        .eq("target_entry_id", entryId);

      return {
        outgoing: data ?? [],
        incoming: reverseData ?? [],
      };
    },
  });

  // Fetch user's other entries to link to
  const { data: otherEntries = [] } = useQuery({
    queryKey: ["linkable-entries", userId, entryId],
    enabled: isAdding,
    queryFn: async () => {
      const { data } = await supabase
        .from("cortex_entries")
        .select("id, title, entry_type, domains, created_at")
        .eq("user_id", userId)
        .neq("id", entryId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTargetId) throw new Error("Select an entry to link");

      const { error } = await (supabase as any)
        .from("cortex_perspective_links")
        .insert({
          source_entry_id: entryId,
          target_entry_id: selectedTargetId,
          link_type: selectedType,
          user_id: userId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perspective-links", entryId] });
      setIsAdding(false);
      setSelectedTargetId(null);
      toast.success("Perspective link created.");
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Failed to create link");
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await (supabase as any)
        .from("cortex_perspective_links")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perspective-links", entryId] });
      toast.success("Link removed.");
    },
  });

  const outgoing = (links as any)?.outgoing ?? [];
  const incoming = (links as any)?.incoming ?? [];
  const hasLinks = outgoing.length > 0 || incoming.length > 0;

  function getLinkMeta(type: string) {
    return LINK_TYPES.find((lt) => lt.value === type) ?? LINK_TYPES[0];
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Link2 className="h-3.5 w-3.5 text-primary" /> Perspective Links
        </h4>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded-md border border-border bg-elevated px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary transition"
          >
            <Plus className="h-3 w-3" /> Link Entry
          </button>
        )}
      </div>

      {/* Existing Links */}
      {hasLinks ? (
        <div className="space-y-1.5">
          {outgoing.map((link: any) => {
            const meta = getLinkMeta(link.link_type);
            const Icon = meta.icon;
            return (
              <div key={link.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-elevated/30 px-3 py-2 group">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="text-xs truncate flex-1">{link.target?.title ?? "Unknown"}</span>
                <button
                  onClick={() => deleteLinkMutation.mutate(link.id)}
                  className="h-5 w-5 grid place-items-center rounded text-muted-foreground/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {incoming.map((link: any) => {
            const meta = getLinkMeta(link.link_type);
            const Icon = meta.icon;
            return (
              <div key={link.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-elevated/30 px-3 py-2 opacity-60">
                <span className="text-xs truncate flex-1">{link.source?.title ?? "Unknown"}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : !isAdding ? (
        <p className="text-[11px] text-muted-foreground/60 italic">No perspective links yet. Connect this entry to others to build your knowledge graph.</p>
      ) : null}

      {/* Add Link Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-primary/30 bg-elevated/50 p-4 space-y-4">
              {/* Link type selector */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Relationship Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {LINK_TYPES.map((lt) => {
                    const Icon = lt.icon;
                    const active = selectedType === lt.value;
                    return (
                      <button
                        key={lt.value}
                        onClick={() => setSelectedType(lt.value)}
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
                          active
                            ? "border-transparent text-black"
                            : "border-border bg-surface text-muted-foreground hover:border-border/80"
                        }`}
                        style={active ? { background: lt.color } : undefined}
                      >
                        <Icon className="h-3 w-3" />
                        {lt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {LINK_TYPES.find((lt) => lt.value === selectedType)?.description}
                </p>
              </div>

              {/* Target entry selector */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Link To Entry</label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-surface space-y-0.5 p-1">
                  {otherEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">No other entries to link to yet.</p>
                  ) : (
                    otherEntries.map((entry: any) => (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedTargetId(entry.id)}
                        className={`w-full text-left rounded px-3 py-2 text-xs transition ${
                          selectedTargetId === entry.id
                            ? "bg-primary/15 border border-primary/40"
                            : "hover:bg-elevated border border-transparent"
                        }`}
                      >
                        <span className="font-medium truncate block">{entry.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {entry.entry_type} · {entry.domains?.slice(0, 2).join(", ")}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setSelectedTargetId(null);
                  }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createLinkMutation.mutate()}
                  disabled={!selectedTargetId || createLinkMutation.isPending}
                  className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
                >
                  {createLinkMutation.isPending ? "Creating..." : "Create Link"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
