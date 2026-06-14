import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export type SensitivityTag = {
  id: string;
  content_node_id?: string;
  tag_type: string;
  intensity: string;
  opt_in_required: boolean;
  support_resources: string[] | null;
  advisory_text: string;
};

type Props = {
  open: boolean;
  domainName: string;
  tags: SensitivityTag[];
  onContinue: () => void;
  onSkip: () => void;
  onDismiss: () => void;
};

const TAG_LABELS: Record<string, string> = {
  sexual_content: "Sexuality & body awareness",
  existential_distress: "Death & meaning",
  historical_atrocity: "Historical violence & power",
  graphic_violence: "Graphic violence",
  self_harm_discussion: "Self-harm discussion",
};

export function ContentWarningModal({ open, domainName, tags, onContinue, onSkip, onDismiss }: Props) {
  const hasIntense = tags.some((t) => t.intensity === "intense");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            className="nexus-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-accent-amber">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-xs uppercase tracking-[0.2em]">Before you continue</p>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold">{domainName}</h2>
            <p className="mt-2 text-sm text-muted-foreground">This module discusses:</p>
            <ul className="mt-2 space-y-1 text-sm">
              {tags.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
                  {TAG_LABELS[t.tag_type] ?? t.tag_type}
                  <span className="text-xs text-muted-foreground">({t.intensity})</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-3 rounded-md border border-border bg-elevated p-4 text-sm text-muted-foreground">
              {tags.map((t) => (
                <p key={t.id}>{t.advisory_text}</p>
              ))}
            </div>
            {hasIntense && (
              <p className="mt-3 text-xs text-muted-foreground">
                This may be emotionally difficult. Have someone you can talk to afterward, access to your Chamber, and time — don't rush.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={onContinue} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                I'm ready to engage
              </button>
              <button onClick={onSkip} className="rounded-md border border-border bg-elevated px-4 py-2 text-sm hover:bg-elevated/70">
                Not right now
              </button>
              <button onClick={onDismiss} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Skip this module entirely
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
