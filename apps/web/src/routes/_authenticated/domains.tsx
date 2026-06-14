import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ContentWarningModal, type SensitivityTag } from "@/components/content-warning-modal";
import { supabase } from "@/integrations/supabase/client";

const DOMAINS = [
  { slug: "social-skills", name: "Social Skills & Human Dynamics", category: "Foundational", difficulty: "Core", desc: "Reading rooms, holding disagreement, building trust without performance." },
  { slug: "how-society-works", name: "How Society Works", category: "Foundational", difficulty: "Core", desc: "Power, incentives, institutions and why systems behave as they do." },
  { slug: "emotional-intelligence", name: "Emotional Intelligence", category: "Foundational", difficulty: "Core", desc: "Knowing what you feel before it runs you." },
  { slug: "media-epistemology", name: "Media & Epistemology", category: "Foundational", difficulty: "Core", desc: "What is true, what is loud, and how to tell them apart." },
  { slug: "embodiment-wellbeing", name: "Embodiment & Wellbeing", category: "Foundational", difficulty: "Core", desc: "The body keeps the score — and writes most of the test." },
  { slug: "systems-thinking", name: "Systems Thinking", category: "Foundational", difficulty: "Core", desc: "Seeing the loops, not just the moves." },
  { slug: "technology", name: "Technology", category: "Specialisation", difficulty: "Open", desc: "Building, breaking, and questioning the tools of our era." },
  { slug: "science", name: "Science", category: "Specialisation", difficulty: "Open", desc: "The discipline of being wrong on purpose." },
  { slug: "business", name: "Business", category: "Specialisation", difficulty: "Open", desc: "Value, exchange, and the games people play with money." },
  { slug: "creative-arts", name: "Creative Arts", category: "Specialisation", difficulty: "Open", desc: "Making the thing only you could make." },
  { slug: "environment", name: "Environment", category: "Specialisation", difficulty: "Open", desc: "The world that holds us, and what we owe it." },
  { slug: "law-rights", name: "Law & Rights", category: "Specialisation", difficulty: "Open", desc: "The rules — written and unwritten — that shape your life." },
];

export const Route = createFileRoute("/_authenticated/domains")({
  head: () => ({ meta: [{ title: "NEXUS — Explore Domains" }] }),
  component: DomainsPage,
});

function DomainsPage() {
  const [warningOpen, setWarningOpen] = useState(false);
  const [activeDomain, setActiveDomain] = useState<(typeof DOMAINS)[0] | null>(null);
  const [activeTags, setActiveTags] = useState<SensitivityTag[]>([]);
  const [exploring, setExploring] = useState<Set<string>>(new Set());

  const { data: allTags = [] } = useQuery({
    queryKey: ["content-sensitivity-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("content_sensitivity_tags").select("*");
      return (data ?? []) as SensitivityTag[];
    },
  });

  async function startExploring(domain: (typeof DOMAINS)[0]) {
    const tags = allTags.filter((t) => t.content_node_id === domain.slug);
    if (tags.length > 0) {
      setActiveDomain(domain);
      setActiveTags(tags);
      setWarningOpen(true);
      return;
    }
    setExploring((p) => new Set(p).add(domain.slug));
  }

  function onContinue() {
    if (activeDomain) setExploring((p) => new Set(p).add(activeDomain.slug));
    setWarningOpen(false);
  }

  return (
    <AppShell title="Explore Domains">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((d) => {
          const hasWarning = allTags.some((t) => t.content_node_id === d.slug);
          const started = exploring.has(d.slug);
          return (
            <div key={d.slug} className="nexus-card p-5 transition hover:border-primary/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.category} · {d.difficulty}</p>
              <h3 className="mt-2 font-display text-lg font-semibold">{d.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.desc}</p>
              {hasWarning && <p className="mt-2 text-[10px] text-accent-amber">Content advisory available</p>}
              {started ? (
                <p className="mt-4 text-xs text-accent-teal">Exploring — modules coming soon</p>
              ) : (
                <button onClick={() => startExploring(d)} className="mt-4 text-xs font-medium text-primary hover:underline">
                  Start exploring →
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeDomain && (
        <ContentWarningModal
          open={warningOpen}
          domainName={activeDomain.name}
          tags={activeTags}
          onContinue={onContinue}
          onSkip={() => setWarningOpen(false)}
          onDismiss={() => setWarningOpen(false)}
        />
      )}
    </AppShell>
  );
}
