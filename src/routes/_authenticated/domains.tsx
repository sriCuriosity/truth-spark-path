import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

const DOMAINS = [
  { name: "Social Skills & Human Dynamics", category: "Foundational", difficulty: "Core", desc: "Reading rooms, holding disagreement, building trust without performance." },
  { name: "How Society Works", category: "Foundational", difficulty: "Core", desc: "Power, incentives, institutions and why systems behave as they do." },
  { name: "Emotional Intelligence", category: "Foundational", difficulty: "Core", desc: "Knowing what you feel before it runs you." },
  { name: "Media & Epistemology", category: "Foundational", difficulty: "Core", desc: "What is true, what is loud, and how to tell them apart." },
  { name: "Embodiment & Wellbeing", category: "Foundational", difficulty: "Core", desc: "The body keeps the score — and writes most of the test." },
  { name: "Systems Thinking", category: "Foundational", difficulty: "Core", desc: "Seeing the loops, not just the moves." },
  { name: "Technology", category: "Specialisation", difficulty: "Open", desc: "Building, breaking, and questioning the tools of our era." },
  { name: "Science", category: "Specialisation", difficulty: "Open", desc: "The discipline of being wrong on purpose." },
  { name: "Business", category: "Specialisation", difficulty: "Open", desc: "Value, exchange, and the games people play with money." },
  { name: "Creative Arts", category: "Specialisation", difficulty: "Open", desc: "Making the thing only you could make." },
  { name: "Environment", category: "Specialisation", difficulty: "Open", desc: "The world that holds us, and what we owe it." },
  { name: "Law & Rights", category: "Specialisation", difficulty: "Open", desc: "The rules — written and unwritten — that shape your life." },
];

export const Route = createFileRoute("/_authenticated/domains")({
  head: () => ({ meta: [{ title: "NEXUS — Explore Domains" }] }),
  component: () => (
    <AppShell title="Explore Domains">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((d) => (
          <div key={d.name} className="nexus-card p-5 transition hover:border-primary/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.category} · {d.difficulty}</p>
            <h3 className="mt-2 font-display text-lg font-semibold">{d.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.desc}</p>
            <button className="mt-4 text-xs font-medium text-primary hover:underline">Start exploring →</button>
          </div>
        ))}
      </div>
    </AppShell>
  ),
});
