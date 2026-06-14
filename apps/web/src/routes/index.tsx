import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS — Your proof of existence" },
      { name: "description", content: "A learning cortex for people building real things. NEXUS rewards action, not compliance." },
      { property: "og:title", content: "NEXUS" },
      { property: "og:description", content: "Your curiosity was never wrong." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[180px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-accent-teal/15 blur-[160px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 ring-1 ring-primary/40">
            <div className="h-3 w-3 rounded-sm bg-primary" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">NEXUS</span>
        </div>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-xs uppercase tracking-[0.3em] text-accent-teal"
        >
          A counter-education platform
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Your curiosity<br />was <span className="text-primary">never wrong</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground"
        >
          NEXUS is where you document what you actually did, learned, failed at, and changed your mind about — and where the world starts to notice.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Link
            to="/auth"
            search={{ mode: "signup" } as any}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 glow-primary"
          >Begin →</Link>
          <Link to="/auth" className="rounded-lg border border-border bg-surface px-6 py-3 font-medium text-foreground hover:bg-elevated">
            I already have an account
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
