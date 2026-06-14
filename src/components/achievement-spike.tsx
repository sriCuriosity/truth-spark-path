import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export interface AchievementSpikeData {
  name: string;
  description?: string;
  particle_colour?: string | null;
  subtitle?: string;
}

export function AchievementSpike({ achievement, onClose, onShare }: { achievement: AchievementSpikeData | null; onClose: () => void; onShare?: () => void }) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/90 backdrop-blur"
        >
          <div className="relative grid place-items-center">
            {/* particles */}
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * Math.PI * 2;
              const tx = `${Math.cos(angle) * 200}px`;
              const ty = `${Math.sin(angle) * 200}px`;
              return (
                <span
                  key={i}
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: achievement.particle_colour ?? "var(--primary)",
                    boxShadow: `0 0 14px ${achievement.particle_colour ?? "var(--primary)"}`,
                    animation: "nexus-particle 1.4s ease-out forwards",
                    ['--tx' as any]: tx, ['--ty' as any]: ty,
                  }}
                />
              );
            })}

            <motion.div
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="grid h-32 w-32 place-items-center rounded-full"
              style={{ background: `radial-gradient(circle, ${achievement.particle_colour ?? "var(--primary)"}40 0%, transparent 70%)` }}
            >
              <div
                className="grid h-20 w-20 place-items-center rounded-full text-3xl font-bold ring-2"
                style={{ background: achievement.particle_colour ?? "var(--primary)", color: "#0D0F14", ['--tw-ring-color' as any]: `${achievement.particle_colour ?? "var(--primary)"}88` }}
              >
                ★
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
            className="mt-10 text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Achievement unlocked</p>
            <h2 className="mt-3 font-display text-5xl font-bold tracking-tight md:text-6xl">{achievement.name}</h2>
            {achievement.subtitle && <p className="mt-3 max-w-md text-sm text-muted-foreground">{achievement.subtitle}</p>}
          </motion.div>

          <motion.div
            initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
            className="mt-8 flex gap-3"
          >
            {onShare && (
              <button onClick={onShare} className="rounded-md border border-border bg-surface px-5 py-2 text-sm font-medium hover:bg-elevated">
                Share to Community
              </button>
            )}
            <button onClick={onClose} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
