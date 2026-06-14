import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "NEXUS — Mentor Connect" }] }),
  component: () => (
    <AppShell title="Mentor Connect">
      <div className="nexus-card mx-auto max-w-2xl p-10 text-center">
        <h2 className="font-display text-2xl font-bold">Mentors are people who've done things.</h2>
        <p className="mt-3 text-sm text-muted-foreground">Not just studied them. NEXUS is opening this carefully. We'll notify you when mentors in your domains are available.</p>
        <button className="mt-6 rounded-md border border-border bg-elevated px-5 py-2.5 text-sm font-medium hover:bg-elevated/70">
          Join the waitlist
        </button>
      </div>
    </AppShell>
  ),
});
