import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, ArrowUp } from "lucide-react";
import type { TierName } from "@/lib/tiers";

const TIER_META: Record<TierName, { label: string; color: string; gradient: string }> = {
  seeker: { label: "Seeker", color: "#06B6D4", gradient: "from-cyan-500 to-blue-600" },
  explorer: { label: "Explorer", color: "#8B5CF6", gradient: "from-violet-500 to-purple-600" },
  builder: { label: "Builder", color: "#10B981", gradient: "from-emerald-500 to-teal-600" },
  contributor: { label: "Contributor", color: "#F59E0B", gradient: "from-amber-500 to-orange-600" },
  architect: { label: "Architect", color: "#F43F5E", gradient: "from-rose-500 to-red-600" },
};

interface TierUpgradeCelebrationProps {
  previousTier: TierName;
  newTier: TierName;
  onDismiss: () => void;
}

export function TierUpgradeCelebration({ previousTier, newTier, onDismiss }: TierUpgradeCelebrationProps) {
  const [visible, setVisible] = useState(true);
  const meta = TIER_META[newTier];

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  function handleDismiss() {
    setVisible(false);
    setTimeout(onDismiss, 500);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
          onClick={handleDismiss}
        >
          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{ background: meta.color, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -100 - Math.random() * 200],
                  x: [0, (Math.random() - 0.5) * 200],
                }}
                transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 1.5, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* Central content */}
          <motion.div
            initial={{ scale: 0.5, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 -m-8 rounded-full blur-3xl opacity-30"
              style={{ background: meta.color }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Trophy icon */}
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full border-2"
              style={{ borderColor: meta.color, background: `${meta.color}15` }}
            >
              <Trophy className="h-12 w-12" style={{ color: meta.color }} />
            </motion.div>

            {/* Tier transition text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-3 flex items-center justify-center gap-3 text-sm text-muted-foreground"
            >
              <span className="capitalize">{TIER_META[previousTier].label}</span>
              <ArrowUp className="h-4 w-4" style={{ color: meta.color }} />
              <span className="font-semibold capitalize" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="font-display text-4xl font-bold md:text-5xl"
            >
              <span className={`bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent`}>
                Tier Unlocked
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-4 max-w-sm text-sm text-muted-foreground"
            >
              This reflects the real things you've done. The tier is just a mirror.
              You are what you did.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
            >
              <Sparkles className="h-3 w-3" style={{ color: meta.color }} />
              <span>Click anywhere to continue</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
