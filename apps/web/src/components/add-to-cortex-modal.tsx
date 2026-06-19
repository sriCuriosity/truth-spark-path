import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Paperclip, Link2, UploadCloud, Trash } from "lucide-react";
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

  const [analyzing, setAnalyzing] = useState(false);
  const [aiRelevance, setAiRelevance] = useState("");

  // Evidence Attachments State
  const [evidenceList, setEvidenceList] = useState<Array<{ title: string; url: string; evidence_type: 'link' | 'file'; file_key?: string }>>([]);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  function reset() {
    setType(null); setTitle(""); setBody(""); setDomains("");
    setPreviousBelief(""); setNewBelief(""); setWhatLearned("");
    setIsPublic(true); setHappenedAt(""); setAiRelevance("");
    setEvidenceList([]); setEvidenceUrl(""); setEvidenceTitle("");
  }

  async function handleAIClassify() {
    if (!title.trim() || !body.trim()) {
      toast.error("Please enter a title and description first.");
      return;
    }
    setAnalyzing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("sdk/classify", {
        body: {
          title,
          content_snippet: body,
          url: "https://nexus.app/local",
          platform: "browser_extension"
        }
      });
      if (error) throw error;
      
      if (res.domains && res.domains.length > 0) {
        setDomains(res.domains.join(", "));
        toast.success("AI domain suggestions populated.");
      }
      if (res.relevance_text) {
        setAiRelevance(res.relevance_text);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("AI classification failed. Please enter domains manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No active session");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${u.user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("cortex-evidence")
        .upload(filePath, file);

      if (error) {
        console.warn("Storage upload failed, simulating fallback:", error);
        const fallbackUrl = URL.createObjectURL(file);
        setEvidenceList(prev => [...prev, {
          title: file.name,
          url: fallbackUrl,
          evidence_type: "file",
        }]);
        toast.info("Mock upload succeeded (using local browser object fallback).");
        return;
      }

      const { data: urlData } = supabase.storage
        .from("cortex-evidence")
        .getPublicUrl(filePath);

      setEvidenceList(prev => [...prev, {
        title: file.name,
        url: urlData.publicUrl,
        evidence_type: "file",
        file_key: data.path,
      }]);
      toast.success("File uploaded and attached.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  function handleAddLink() {
    if (!evidenceUrl.trim()) {
      toast.error("Please enter a valid URL.");
      return;
    }
    const titleToUse = evidenceTitle.trim() || evidenceUrl;
    setEvidenceList(prev => [...prev, {
      title: titleToUse,
      url: evidenceUrl.trim(),
      evidence_type: "link"
    }]);
    setEvidenceUrl("");
    setEvidenceTitle("");
    toast.success("Link evidence attached.");
  }

  function removeEvidence(idx: number) {
    setEvidenceList(prev => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");
      
      // Invoke cortex-entry edge function to save entry and generate embeddings
      const { data: edgeRes, error } = await supabase.functions.invoke("cortex-entry", {
        body: {
          entry_type: type,
          title, 
          body,
          domains: domains.split(",").map(s => s.trim()).filter(Boolean),
          is_public: isPublic,
          happened_at: happenedAt || null,
          previous_belief: type === "perspective_shift" ? previousBelief : null,
          new_belief: type === "perspective_shift" ? newBelief : null,
          what_i_learned: type === "experiment" ? whatLearned : null,
        }
      });
      if (error) throw error;

      const entryData = edgeRes.data || edgeRes;

      // Save evidence rows to cortex_evidence table
      if (evidenceList.length > 0) {
        const evidenceRows = evidenceList.map(ev => ({
          entry_id: entryData.id,
          user_id: u.user.id,
          evidence_type: ev.evidence_type,
          title: ev.title,
          url: ev.url,
          file_key: ev.file_key || null,
        }));
        const { error: evidenceError } = await supabase.from("cortex_evidence").insert(evidenceRows);
        if (evidenceError) console.error("Error saving evidence:", evidenceError);
      }

      trackSessionActivity("cortex_entry");
      const tierResult = await awardXp(u.user.id, "cortex_entry_created", entryData.id);
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
      const awarded = await checkAchievements(u.user.id, entryData.title);
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
                  
                  <button
                    type="button"
                    onClick={handleAIClassify}
                    disabled={analyzing}
                    className="w-full py-2 bg-elevated border border-primary/40 text-primary text-xs font-semibold rounded hover:bg-elevated/70 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {analyzing ? "Analyzing Socratic Context..." : "⚡ Analyze with Socratic AI"}
                  </button>

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
                  
                  {/* Evidence Attachments */}
                  <div className="rounded-lg border border-border bg-background/30 p-4 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
                      <Paperclip className="h-3.5 w-3.5" /> Evidence Attachments
                    </span>

                    {/* Attached list */}
                    {evidenceList.length > 0 && (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {evidenceList.map((ev, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded bg-elevated/55 border border-border/40 px-3 py-1.5 text-xs">
                            <span className="truncate max-w-[280px] font-medium flex items-center gap-1.5">
                              {ev.evidence_type === "file" ? <UploadCloud className="h-3.5 w-3.5 text-accent-teal" /> : <Link2 className="h-3.5 w-3.5 text-primary" />}
                              {ev.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEvidence(idx)}
                              className="text-muted-foreground hover:text-red-400 p-1 cursor-pointer"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adding mechanism */}
                    <div className="grid gap-4 border-t border-border/30 pt-3 md:grid-cols-2">
                      {/* URL input */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-muted-foreground block font-medium">Attach Link</span>
                        <input
                          type="text"
                          placeholder="Evidence title (optional)"
                          value={evidenceTitle}
                          onChange={(e) => setEvidenceTitle(e.target.value)}
                          className="w-full rounded border border-border bg-elevated px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="https://..."
                            value={evidenceUrl}
                            onChange={(e) => setEvidenceUrl(e.target.value)}
                            className="flex-1 rounded border border-border bg-elevated px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={handleAddLink}
                            className="rounded bg-elevated border border-border px-3 py-1.5 text-xs hover:bg-elevated/70 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* File upload */}
                      <div className="space-y-2 flex flex-col justify-between">
                        <span className="text-[10px] text-muted-foreground block font-medium">Upload File</span>
                        <label className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-border/60 bg-elevated/35 hover:bg-elevated/65 hover:border-primary/40 cursor-pointer p-3 transition text-center min-h-[68px]">
                          <UploadCloud className="h-5 w-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                            {uploading ? "Uploading..." : "Choose PDF, image, doc"}
                          </span>
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <input placeholder="Domains (comma separated)" value={domains} onChange={(e) => setDomains(e.target.value)}
                      className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    {aiRelevance && (
                      <div className="text-[11px] p-3 bg-accent-teal/10 border border-accent-teal/30 rounded text-accent-teal mt-1 leading-relaxed">
                        <strong>AI Socratic Evaluation Suggestion:</strong> {aiRelevance}
                      </div>
                    )}
                  </div>
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
