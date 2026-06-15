import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  reportedUserId?: string | null;
}; 

const HARM_TYPES = [
  { id: "harassment", label: "Harassment or targeting" },
  { id: "threat", label: "Threat of violence" },
  { id: "exploitation", label: "Exploitation (especially mentor/mentee)" },
  { id: "self_harm_risk", label: "Self-harm risk (community space)" },
] as const;

export function HarmReportModal({ open, onClose, reportedUserId }: Props) {
  const [harmType, setHarmType] = useState<string>("harassment");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error("Please describe what happened (at least a few words).");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await (supabase as any).from("community_harm_reports").insert({
      reporter_id: u.user.id,
      reported_user_id: reportedUserId ?? null,
      harm_type: harmType,
      description: description.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't submit report. Try again.");
      return;
    }
    toast.success("Report submitted. A facilitator will review with care — this is protection, not punishment.");
    setDescription("");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
          onClick={onClose}
        >
          <motion.form
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            className="nexus-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Report community harm</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              NEXUS addresses genuine harm through restoration, not punishment. Imminent danger? Contact emergency services first.
            </p>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Type of concern</span>
              <select
                value={harmType}
                onChange={(e) => setHarmType(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {HARM_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">What happened?</span>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the harm. Be specific."
                className="mt-1 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving ? "…" : "Submit report"}
              </button>
              <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-elevated">
                Cancel
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
