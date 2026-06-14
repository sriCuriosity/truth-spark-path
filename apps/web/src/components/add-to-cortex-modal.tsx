import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ENTRY_TYPE_META, type EntryType } from "./cortex-entry-card";
import { checkAchievements } from "@/lib/achievements";
import { awardXp } from "@/lib/tiers";
import { trackSessionActivity } from "@/lib/anti-addiction";
import { AchievementSpike, type AchievementSpikeData } from "./achievement-spike";

const TYPES: EntryType[] = ["action", "perspective_shift", "experiment", "contribution"];

export function AddToCortexModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [type, setType] = useState<EntryType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [domains, setDomains] = useState("");
  const [previousBelief, setPreviousBelief] = useState("");
  const [newBelief, setNewBelief] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [happenedAt, setHappenedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [spike, setSpike] = useState<AchievementSpikeData | null>(null);

  function reset() {
    setType(null); setTitle(""); setBody(""); setDomains("");
    setPreviousBelief(""); setNewBelief(""); setWhatLearned("");
    setIsPublic(true); setHappenedAt("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");
      const { data, error } = await supabase.from("cortex_entries").insert({
        user_id: u.user.id,
        entry_type: type,
        title, body,
        domains: domains.split(",").map(s => s.trim()).filter(Boolean),
        is_public: isPublic,
        happened_at: happenedAt || null,
        previous_belief: type === "perspective_shift" ? previousBelief : null,
        new_belief: type === "perspective_shift" ? newBelief : null,
        what_i_learned: type === "experiment" ? whatLearned : null,
      }).select().single();
      if (error) throw error;
      trackSessionActivity("cortex_entry");
      const tierResult = await awardXp(u.user.id, "cortex_entry_created", data.id);
      toast.success("Added to your Cortex.");
      if (tierResult.tierChanged) {
        toast.message(`You've reached ${tierResult.currentTier} tier`, {
          description: "This reflects the real things you've done. The tier is just a mirror. You are what you did.",
          duration: 8000,
        });
      }
      reset();
      onCreated?.();
      onClose();
      const awarded = await checkAchievements(u.user.id, data.title);
      if (awarded.length > 0) {
        const first = awarded[0];
        setSpike({
          name: first.name,
          subtitle: first.description ?? undefined,
          particle_colour: first.particle_colour,
        });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't save");
    } finally { setSaving(false); }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="nexus-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-md hover:bg-elevated">
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-display text-xl font-bold">Add to Cortex</h2>
              <p className="mt-1 text-sm text-muted-foreground">What kind of evidence is this?</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {TYPES.map(t => {
                  const m = ENTRY_TYPE_META[t];
                  const active = type === t;
                  return (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`rounded-lg border p-4 text-left transition ${active ? "border-primary" : "border-border bg-elevated hover:border-primary/40"}`}
                      style={active ? { boxShadow: `0 0 30px ${m.color}33` } : {}}
                    >
                      <span className="block h-1.5 w-8 rounded-full" style={{ background: m.color }} />
                      <p className="mt-2 font-display text-base font-semibold">{m.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t === "action" && "Something you actually did."}
                        {t === "perspective_shift" && "You changed your mind."}
                        {t === "experiment" && "You tried it. Honest results."}
                        {t === "contribution" && "You gave something to others."}
                      </p>
                    </button>
                  );
                })}
              </div>

              {type && (
                <form onSubmit={submit} className="mt-6 space-y-3">
                  <input required placeholder="Title — short and specific" value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  <textarea required rows={3} placeholder="Describe what happened, in your own words." value={body} onChange={(e) => setBody(e.target.value)}
                    className="w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  {type === "perspective_shift" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input placeholder="I used to think…" value={previousBelief} onChange={(e) => setPreviousBelief(e.target.value)}
                        className="rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                      <input placeholder="Now I think…" value={newBelief} onChange={(e) => setNewBelief(e.target.value)}
                        className="rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                  )}
                  {type === "experiment" && (
                    <textarea rows={2} placeholder="What did this teach you, even if it failed?" value={whatLearned} onChange={(e) => setWhatLearned(e.target.value)}
                      className="w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  )}
                  <input placeholder="Domains (comma separated)" value={domains} onChange={(e) => setDomains(e.target.value)}
                    className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2.5 text-sm">
                      <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-[color:var(--primary)]" />
                      Public in community
                    </label>
                    <input type="date" value={happenedAt} onChange={(e) => setHappenedAt(e.target.value)}
                      className="rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  </div>

                  <button type="submit" disabled={saving}
                    className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 glow-primary">
                    {saving ? "Saving…" : "Mark this in your Cortex"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AchievementSpike achievement={spike} onClose={() => setSpike(null)} />
    </>
  );
}
