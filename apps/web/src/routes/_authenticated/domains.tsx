import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ContentWarningModal, type SensitivityTag } from "@/components/content-warning-modal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, GraduationCap, Link2, BookOpen, Sparkles, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

// Real Socratic curriculum content

const DOMAIN_CONTENT: Record<string, Array<{
  id: string;
  title: string;
  desc: string;
  socraticQuestion: string;
  resourceTitle: string;
  resourceUrl: string;
}>> = {
  "social-skills": [
    {
      id: "radical-disagreement",
      title: "Radical Disagreement",
      desc: "Reading rooms, holding space for opposing worldviews, and building trust without performative consensus.",
      socraticQuestion: "How do you distinguish between defending your identity vs exploring truth in a heated argument?",
      resourceTitle: "Difficult Conversations by Douglas Stone & Bruce Patton",
      resourceUrl: "https://www.triadconsultinggroup.com/difficult-conversations-book"
    },
    {
      id: "status-games",
      title: "Status Games",
      desc: "Identifying structural interpersonal power hierarchies and social scripting.",
      socraticQuestion: "In your primary relationships, what acts are motivated by establishing hierarchy rather than mutual affection?",
      resourceTitle: "Impro by Keith Johnstone (Chapter on Status)",
      resourceUrl: "https://www.bloomsbury.com/uk/impro-9780413490703/"
    },
    {
      id: "active-witnessing",
      title: "Active Witnessing",
      desc: "Moving beyond passive listening to active systems absorption of speakers.",
      socraticQuestion: "When listening to an opponent, how often do you formulate your rebuttal rather than absorb their framework?",
      resourceTitle: "Nonviolent Communication by Marshall Rosenberg",
      resourceUrl: "https://www.cnvc.org/training/resource/book-nvc"
    }
  ],
  "how-society-works": [
    {
      id: "systemic-incentives",
      title: "Systemic Incentives",
      desc: "Understanding why logical actions of individuals lead to irrational system-level outcomes.",
      socraticQuestion: "Why do good individuals acting in compliance yield bad system outcomes in traditional institutions?",
      resourceTitle: "Thinking in Systems by Donella Meadows",
      resourceUrl: "https://donellameadows.org/systems-thinking-resources/"
    },
    {
      id: "manufactured-consensus",
      title: "Manufactured Consensus",
      desc: "Auditing how external media and filters construct consensus filters.",
      socraticQuestion: "What portion of your moral convictions are chosen vs inherited from cultural and media filters?",
      resourceTitle: "Manufacturing Consent by Noam Chomsky & Edward Herman",
      resourceUrl: "https://www.pantheonbooks.com/"
    },
    {
      id: "caste-and-hierarchy",
      title: "Caste & Hierarchy",
      desc: "Exploring invisible structures governing division of labor and dignity.",
      socraticQuestion: "What social divisions are invisible in your daily interactions, yet govern who cleans up after you?",
      resourceTitle: "Caste: The Origins of Our Discontents by Isabel Wilkerson",
      resourceUrl: "https://www.isabelwilkerson.com/"
    }
  ],
  "emotional-intelligence": [
    {
      id: "somatic-mapping",
      title: "Somatic Mapping",
      desc: "Connecting emotional distress directly to biological patterns before cognitive rationalization.",
      socraticQuestion: "Where does anger live in your body before it manifests in your thoughts?",
      resourceTitle: "The Body Keeps the Score by Bessel van der Kolk",
      resourceUrl: "https://www.besselvanderkolk.com/resources/the-body-keeps-the-score"
    },
    {
      id: "narrative-interception",
      title: "Narrative Interception",
      desc: "Stopping automated self-protection stories.",
      socraticQuestion: "What story do you tell yourself about your failures to protect your self-importance?",
      resourceTitle: "Radical Acceptance by Tara Brach",
      resourceUrl: "https://www.tarabrach.com/books/radical-acceptance/"
    },
    {
      id: "burnout-vectors",
      title: "Burnout Vectors",
      desc: "Differentiating biological rest from systemic exhaustion.",
      socraticQuestion: "What part of your fatigue is physical exhaustion vs exhaustion from performing a compliance role?",
      resourceTitle: "The Burnout Society by Byung-Chul Han",
      resourceUrl: "https://www.sup.org/books/title/?id=25579"
    }
  ],
  "media-epistemology": [
    {
      id: "algorithmic-loops",
      title: "Algorithmic Loops",
      desc: "Mapping feedback systems tracking cognitive loops for monetization.",
      socraticQuestion: "If your attention is the product, what version of you is the algorithm optimizing for?",
      resourceTitle: "The Age of Surveillance Capitalism by Shoshana Zuboff",
      resourceUrl: "https://www.shoshanazuboff.com/"
    },
    {
      id: "information-hygiene",
      title: "Information Hygiene",
      desc: "Building filtering models to intercept media noise.",
      socraticQuestion: "What sources do you trust, and how did they earn that trust? What are their material incentives?",
      resourceTitle: "Amusing Ourselves to Death by Neil Postman",
      resourceUrl: "https://www.penguinrandomhouse.com/books/290333/amusing-ourselves-to-death-by-neil-postman/"
    },
    {
      id: "epistemic-humility",
      title: "Epistemic Humility",
      desc: "Quantifying certainty bounds and identifying systemic blindspots.",
      socraticQuestion: "What is one opinion you hold with absolute certainty? What would it take to prove you wrong?",
      resourceTitle: "The Black Swan by Nassim Nicholas Taleb",
      resourceUrl: "http://www.fooledbyrandomness.com/"
    }
  ],
  "embodiment-wellbeing": [
    {
      id: "circadian-integrity",
      title: "Circadian Integrity",
      desc: "Reviewing biological rhythm alignments for cognitive clarity.",
      socraticQuestion: "How does sleep deprivation alter your capacity to face complex, emotional challenges?",
      resourceTitle: "Why We Sleep by Matthew Walker",
      resourceUrl: "https://www.sleepdiplomat.com/author"
    },
    {
      id: "somatic-pausing",
      title: "Somatic Pausing",
      desc: "Building attention resilience against stimulus feeds.",
      socraticQuestion: "Can you sit in silence for ten minutes without looking for a stimulus? What does the urge to escape tell you?",
      resourceTitle: "Mindfulness in Plain English by Henepola Gunaratana",
      resourceUrl: "https://www.wisdompubs.org/"
    }
  ],
  "systems-thinking": [
    {
      id: "feedback-structures",
      title: "Feedback Structures",
      desc: "Identifying circular relationships and system delays.",
      socraticQuestion: "What recurring problem in your life is actually a self-reinforcing feedback loop?",
      resourceTitle: "Thinking in Systems by Donella Meadows",
      resourceUrl: "https://donellameadows.org/systems-thinking-resources/"
    },
    {
      id: "leverage-intervention",
      title: "Leverage Interventions",
      desc: "Locating highest systemic impact points.",
      socraticQuestion: "If you wanted to change a system you are part of, where is the leverage point with minimum friction?",
      resourceTitle: "Leverage Points: Places to Intervene in a System by Donella Meadows",
      resourceUrl: "https://donellameadows.org/"
    }
  ]
};

const DOMAINS = [
  { slug: "social-skills", name: "Social Skills & Human Dynamics", category: "Foundational", difficulty: "Core", desc: "Reading rooms, holding disagreement, building trust without performance." },
  { slug: "how-society-works", name: "How Society Works", category: "Foundational", difficulty: "Core", desc: "Power, incentives, institutions and why systems behave as they do." },
  { slug: "emotional-intelligence", name: "Emotional Intelligence", category: "Foundational", difficulty: "Core", desc: "Knowing what you feel before it runs you." },
  { slug: "media-epistemology", name: "Media & Epistemology", category: "Foundational", difficulty: "Core", desc: "What is true, what is loud, and how to tell them apart." },
  { slug: "embodiment-wellbeing", name: "Embodiment & Wellbeing", category: "Foundational", difficulty: "Core", desc: "The body keeps the score — and writes most of the test." },
  { slug: "systems-thinking", name: "Systems Thinking", category: "Foundational", difficulty: "Core", desc: "Seeing the loops, not just the moves." },
];

export const Route = createFileRoute("/_authenticated/domains")({
  head: () => ({ meta: [{ title: "NEXUS — Explore Domains" }] }),
  component: DomainsPage,
});

function DomainsPage() {
  const qc = useQueryClient();
  const [activeDomainSlug, setActiveDomainSlug] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Reflection modal variables
  const [reflectionTitle, setReflectionTitle] = useState("");
  const [reflectionBody, setReflectionBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Warning modal variables
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningDomain, setWarningDomain] = useState<(typeof DOMAINS)[0] | null>(null);
  const [activeTags, setActiveTags] = useState<SensitivityTag[]>([]);

  const { data: allTags = [] } = useQuery({
    queryKey: ["content-sensitivity-tags"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("content_sensitivity_tags").select("*");
      return (data ?? []) as unknown as SensitivityTag[];
    },
  });

  const activeDomain = DOMAINS.find((d) => d.slug === activeDomainSlug);
  const activeNodes = activeDomainSlug ? (DOMAIN_CONTENT[activeDomainSlug] || []) : [];
  const selectedNode = activeNodes.find((n) => n.id === selectedNodeId);

  async function handleDomainSelect(domain: (typeof DOMAINS)[0]) {
    const tags = allTags.filter((t) => t.content_node_id === domain.slug);
    if (tags.length > 0 && activeDomainSlug !== domain.slug) {
      setWarningDomain(domain);
      setActiveTags(tags);
      setWarningOpen(true);
      return;
    }
    setActiveDomainSlug(domain.slug);
    setSelectedNodeId(null);
  }

  function onContinueWarning() {
    if (warningDomain) {
      setActiveDomainSlug(warningDomain.slug);
      setSelectedNodeId(null);
    }
    setWarningOpen(false);
  }

  const saveReflectionMutation = useMutation({
    mutationFn: async () => {
      if (!reflectionTitle.trim() || !reflectionBody.trim() || !selectedNode || !activeDomainSlug) {
        throw new Error("Missing required reflection fields");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log into cortex entries
      const { error: cortexError } = await supabase.from("cortex_entries").insert({
        user_id: user.id,
        entry_type: "insight",
        title: `${selectedNode.title}: ${reflectionTitle}`,
        body: reflectionBody,
        domains: [activeDomain?.name || activeDomainSlug],
        is_public: false,
      });

      if (cortexError) throw cortexError;

      // Award XP
      const { error: xpError } = await (supabase as any).from("xp_ledger").insert({
        user_id: user.id,
        amount: 30,
        source: "domain_reflection",
        metadata: { node_id: selectedNode.id }
      });

      if (xpError) throw xpError;
    },
    onSuccess: () => {
      toast.success("Socratic Reflection logged to your Cortex (+30 XP)!");
      setReflectionTitle("");
      setReflectionBody("");
      setSelectedNodeId(null);
      qc.invalidateQueries({ queryKey: ["cortex-entries-recent"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save reflection");
    }
  });

  return (
    <AppShell title="Explore Domains">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        
        {/* Main Content Area */}
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DOMAINS.map((d) => {
              const hasWarning = allTags.some((t) => t.content_node_id === d.slug);
              const isActive = activeDomainSlug === d.slug;
              return (
                <button
                  key={d.slug}
                  onClick={() => handleDomainSelect(d)}
                  className={`nexus-card p-5 text-left transition relative overflow-hidden flex flex-col justify-between ${
                    isActive ? "border-primary/80 bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{d.category}</p>
                      {hasWarning && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" title="Sensitivity tag registered" />
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-md font-bold text-foreground">{d.name}</h3>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">{d.desc}</p>
                  </div>
                  <span className="mt-4 text-[10px] font-semibold text-primary uppercase">
                    {isActive ? "Viewing Nodes" : "Explore →"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Domain Explorer Panel */}
          {activeDomainSlug && activeDomain && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="nexus-card p-6 space-y-4"
            >
              <div className="border-b border-border/40 pb-3">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {activeDomain.name} Curriculum Nodes
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Select a core concept node below to challenge systemic assumptions.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeNodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      setReflectionTitle("");
                      setReflectionBody("");
                    }}
                    className={`p-4 rounded-lg border text-left transition flex flex-col justify-between ${
                      selectedNodeId === n.id ? "bg-elevated border-primary/50" : "bg-surface/50 border-border hover:bg-elevated/40"
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{n.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.desc}</p>
                    </div>
                    <span className="mt-3 text-[10px] font-medium text-accent-teal uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Challenge Node
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Side Detail & Quick Capture Panel */}
        <div className="space-y-4">
          {selectedNode ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="nexus-card p-5 space-y-4 bg-surface/40 backdrop-blur"
            >
              <div>
                <span className="chip bg-primary/10 text-primary text-[9px] uppercase font-bold">Concept Node</span>
                <h3 className="font-display text-lg font-bold mt-2 text-foreground">{selectedNode.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selectedNode.desc}</p>
              </div>

              {/* Socratic Question Card */}
              <div className="p-4 bg-elevated border border-border rounded-lg space-y-2">
                <span className="text-[9px] font-mono uppercase text-accent-teal font-semibold flex items-center gap-1">
                  <Brain className="h-3 w-3" /> Socratic Probe
                </span>
                <p className="text-xs font-medium leading-relaxed text-foreground italic">"{selectedNode.socraticQuestion}"</p>
              </div>

              {/* Resource Link */}
              <div className="p-3 bg-elevated border border-border/40 rounded-lg flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-accent-amber shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase block">Recommended Tool</span>
                  <a
                    href={selectedNode.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 truncate"
                  >
                    {selectedNode.resourceTitle}
                    <Link2 className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Quick Capture Form */}
              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-primary" /> Log Insight to Cortex
                </h4>
                <input
                  type="text"
                  placeholder="Reflection title..."
                  value={reflectionTitle}
                  onChange={(e) => setReflectionTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-elevated px-2.5 py-2 text-xs outline-none focus:border-primary"
                />
                <textarea
                  rows={4}
                  placeholder="Write your deconstruction or evidence of reflection here..."
                  value={reflectionBody}
                  onChange={(e) => setReflectionBody(e.target.value)}
                  className="w-full resize-none rounded-md border border-border bg-elevated px-2.5 py-2 text-xs outline-none focus:border-primary font-sans"
                />
                <button
                  onClick={() => saveReflectionMutation.mutate()}
                  disabled={saveReflectionMutation.isPending}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:opacity-90 transition glow-primary"
                >
                  {saveReflectionMutation.isPending ? "Saving..." : "Commit Insight to Cortex (+30 XP)"}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="nexus-card p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-48 bg-surface/20 border-dashed border-border">
              <GraduationCap className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-xs">Select a curriculum node to review details and document Socratic reflections.</p>
            </div>
          )}
        </div>
      </div>

      {warningDomain && (
        <ContentWarningModal
          open={warningOpen}
          domainName={warningDomain.name}
          tags={activeTags}
          onContinue={onContinueWarning}
          onSkip={() => setWarningOpen(false)}
          onDismiss={() => setWarningOpen(false)}
        />
      )}
    </AppShell>
  );
}
