import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Scale, Plus, Info, Lock, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/governance")({
  head: () => ({ meta: [{ title: "NEXUS — Governance" }] }),
  component: Governance,
});

function Governance() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("policy");
  const [submitting, setSubmitting] = useState(false);

  // Voting states
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [voteType, setVoteType] = useState<"yes" | "no">("yes");
  const [targetVotes, setTargetVotes] = useState(1); // 1 vote default
  const [votingInProgress, setVotingInProgress] = useState(false);

  // Fetch active user profile for tier gating & XP
  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  // Fetch proposals
  const { data: proposals = [], refetch: refetchProposals } = useQuery({
    queryKey: ["governance-proposals"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("proposals")
        .select("*, profiles:user_id(display_name, handle)")
        .order("created_at", { ascending: false });
      
      // Seed default proposals if table is empty
      if (!data || data.length === 0) {
        return [
          {
            id: "default-1",
            title: "Allocate 20% of network treasury to localized offline server nodes",
            description: "To prevent centralization and protect the learning data registry from institutional takedowns, we should fund localized physical nodes in South Asia and Latin America.",
            category: "treasury",
            status: "active",
            yes_votes: 12.5,
            no_votes: 4.0,
            created_at: new Date(Date.now() - 86400000 * 3).toISOString()
          },
          {
            id: "default-2",
            title: "Deprecate traditional grade translations in the Institutional Console",
            description: "Our current bridge exporter allows institutional administrators to map cortex entries back to A/B/C/D letter grades. This compromises our restorative, non-punitive principles.",
            category: "philosophy",
            status: "active",
            yes_votes: 8.0,
            no_votes: 9.0,
            created_at: new Date(Date.now() - 86400000 * 5).toISOString()
          }
        ];
      }
      return data;
    },
  });

  // Fetch current user's cast votes to calculate remaining budget (Max 99 credits total)
  const { data: userVotes = [], refetch: refetchUserVotes } = useQuery({
    queryKey: ["user-proposal-votes"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await (supabase as any)
        .from("proposal_votes")
        .select("*")
        .eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  // Calculate spent credits & remaining budget
  const maxCredits = 99;
  const creditsSpent = userVotes.reduce((sum, v) => sum + v.credits_spent, 0);
  const remainingCredits = Math.max(0, maxCredits - creditsSpent);

  const currentTier = profile?.current_tier ?? "seeker";
  const canCreateProposals = currentTier === "contributor" || currentTier === "architect";

  // Submit new proposal
  async function handleCreateProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("proposals")
        .insert({
          user_id: u.user.id,
          title: newTitle.trim(),
          description: newDesc.trim(),
          category: newCategory,
          status: "active",
          yes_votes: 0.0,
          no_votes: 0.0
        });

      if (error) throw error;
      toast.success("Governance proposal created successfully!");
      setNewTitle("");
      setNewDesc("");
      setCreateOpen(false);
      refetchProposals();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create proposal");
    } finally {
      setSubmitting(false);
    }
  }

  // Cast a quadratic vote
  const creditCost = targetVotes * targetVotes;

  async function handleCastVote() {
    if (!selectedProposal) return;
    if (creditCost > remainingCredits) {
      toast.error("Insufficient quadratic voting credits.");
      return;
    }
    setVotingInProgress(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");

      // Insert or update proposal_votes
      const existingVote = userVotes.find(v => v.proposal_id === selectedProposal.id);

      if (existingVote) {
        // Update vote
        const { error } = await (supabase as any)
          .from("proposal_votes")
          .update({
            credits_spent: creditCost,
            vote_type: voteType
          })
          .eq("id", existingVote.id);
        if (error) throw error;
      } else {
        // Insert new vote
        const { error } = await (supabase as any)
          .from("proposal_votes")
          .insert({
            proposal_id: selectedProposal.id,
            user_id: u.user.id,
            credits_spent: creditCost,
            vote_type: voteType
          });
        if (error) throw error;
      }

      toast.success(`Quadratic vote cast: ${targetVotes} vote(s) (${creditCost} credits spent).`);
      setSelectedProposal(null);
      refetchProposals();
      refetchUserVotes();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to register vote. Check if this is a default mock proposal.");
    } finally {
      setVotingInProgress(false);
    }
  }

  return (
    <AppShell title="Community Governance">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Side: Proposal List & Restorative justice document */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" /> Quadratic Governance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Traditional voting lets majorities completely override intense, focused minorities. NEXUS uses **quadratic voting**, where your cost to cast multiple votes on a single issue escalates quadratically: `Cost = (Votes)²`. This ensures that minority groups with deep conviction can hold their ground against passive consensus.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 bg-elevated px-3 py-1.5 rounded border border-border/40">
                <span className="text-muted-foreground">Your Vote Budget:</span>
                <span className="text-accent-teal font-semibold">{maxCredits} Credits Total</span>
              </div>
              <div className="flex items-center gap-1.5 bg-elevated px-3 py-1.5 rounded border border-border/40">
                <span className="text-muted-foreground">Credits Spent:</span>
                <span className="text-accent-amber font-semibold">{creditsSpent} Credits</span>
              </div>
              <div className="flex items-center gap-1.5 bg-elevated px-3 py-1.5 rounded border border-border/40">
                <span className="text-muted-foreground">Available Budget:</span>
                <span className="text-accent-teal font-semibold">{remainingCredits} Credits</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold">Active Proposals</h3>
              <button
                onClick={() => {
                  if (!canCreateProposals) {
                    toast.error(`Requires Contributor tier. Your current tier is ${currentTier}.`);
                    return;
                  }
                  setCreateOpen(true);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition ${
                  canCreateProposals
                    ? "bg-primary text-primary-foreground hover:opacity-90 glow-primary"
                    : "bg-elevated text-muted-foreground cursor-not-allowed border border-border"
                }`}
              >
                {!canCreateProposals && <Lock className="h-3.5 w-3.5" />}
                <Plus className="h-3.5 w-3.5" /> Submit Proposal
              </button>
            </div>

            <div className="space-y-4">
              {proposals.map((p) => {
                const total = p.yes_votes + p.no_votes;
                const yesPercent = total > 0 ? Math.round((p.yes_votes / total) * 100) : 50;
                const hasVoted = userVotes.find(v => v.proposal_id === p.id);

                return (
                  <div key={p.id} className="nexus-card p-5 space-y-4 relative overflow-hidden">
                    {hasVoted && (
                      <div className="absolute right-4 top-4 flex items-center gap-1 text-[11px] font-semibold text-accent-teal bg-accent-teal/10 px-2 py-0.5 rounded border border-accent-teal/30">
                        <CheckCircle2 className="h-3 w-3" /> Voted ({Math.sqrt(hasVoted.credits_spent)} votes)
                      </div>
                    )}
                    <div>
                      <span className="chip text-[10px] uppercase tracking-wider bg-elevated font-mono">{p.category}</span>
                      <h4 className="mt-2.5 font-display text-base font-bold leading-snug">{p.title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-accent-teal font-semibold">Yes: {p.yes_votes.toFixed(1)} votes</span>
                        <span className="text-accent-amber font-semibold">No: {p.no_votes.toFixed(1)} votes</span>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden flex">
                        <div className="h-full bg-accent-teal" style={{ width: `${yesPercent}%` }} />
                        <div className="h-full bg-accent-amber" style={{ width: `${100 - yesPercent}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground">
                        Proposed by {p.profiles?.display_name ?? "Anonymous Seeker"}
                      </span>
                      <button
                        onClick={() => setSelectedProposal(p)}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                      >
                        Cast Quadratic Vote <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Governance guidelines & Restorative justice stance */}
        <div className="space-y-4">
          <div className="nexus-card p-5 border-accent-teal/20">
            <h4 className="font-display font-semibold text-sm flex items-center gap-1.5 text-accent-teal">
              <ShieldAlert className="h-4 w-4" /> Moderation Principles
            </h4>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-accent-teal font-bold font-mono">01.</span>
                <span>**Sovereign Expression**: No content is modified or deleted by a central authority unless flagged with high risk score.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-teal font-bold font-mono">02.</span>
                <span>**Restorative Dialogues**: Harmful claims or abuse are resolved through collaborative mediation rather than permanent banishing.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent-teal font-bold font-mono">03.</span>
                <span>**Self-audited Data**: Your flags, votes, and reports are fully reviewable inside settings and immediately deleted upon opt-out.</span>
              </li>
            </ul>
          </div>

          <div className="nexus-card p-5">
            <h4 className="font-display font-semibold text-sm flex items-center gap-1 text-primary">
              <Info className="h-4 w-4" /> How to vote?
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Your available credits represent your leverage. To cast **N** votes, you must spend **N²** credits.
            </p>
            <table className="mt-3 w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground"><th className="pb-1">Votes</th><th className="pb-1">Credit Cost</th></tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/20"><td className="py-1">1 Vote</td><td className="py-1">1 Credit</td></tr>
                <tr className="border-b border-border/20"><td className="py-1">2 Votes</td><td className="py-1">4 Credits</td></tr>
                <tr className="border-b border-border/20"><td className="py-1">3 Votes</td><td className="py-1">9 Credits</td></tr>
                <tr className="border-b border-border/20"><td className="py-1">4 Votes</td><td className="py-1">16 Credits</td></tr>
                <tr><td className="py-1">5 Votes</td><td className="py-1">25 Credits</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for casting quadratic votes */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="nexus-card max-w-md w-full p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-base">Cast Quadratic Vote</h3>
            <p className="text-xs text-muted-foreground font-mono leading-snug">{selectedProposal.title}</p>
            
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">Vote Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVoteType("yes")}
                  className={`py-2 rounded text-xs font-semibold border transition ${
                    voteType === "yes" ? "bg-accent-teal/20 border-accent-teal text-accent-teal" : "bg-elevated border-border text-muted-foreground hover:bg-elevated/70"
                  }`}
                >
                  YES (Support)
                </button>
                <button
                  onClick={() => setVoteType("no")}
                  className={`py-2 rounded text-xs font-semibold border transition ${
                    voteType === "no" ? "bg-accent-amber/20 border-accent-amber text-accent-amber" : "bg-elevated border-border text-muted-foreground hover:bg-elevated/70"
                  }`}
                >
                  NO (Oppose)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Votes to Cast</span>
                <span>{targetVotes} Votes</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <input
                  type="range"
                  min={1}
                  max={9}
                  value={targetVotes}
                  onChange={(e) => setTargetVotes(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="font-mono text-sm bg-elevated border border-border px-2 py-1 rounded shrink-0">{creditCost} credits</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Cost calculated as `(Votes)² = (${targetVotes})² = ${creditCost} Credits` from your available {remainingCredits} credits budget.</p>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                onClick={() => setSelectedProposal(null)}
                className="px-3.5 py-2 rounded text-xs font-semibold hover:bg-elevated text-muted-foreground transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCastVote}
                disabled={votingInProgress || creditCost > remainingCredits}
                className="bg-primary text-primary-foreground font-semibold rounded px-4 py-2 hover:opacity-90 disabled:opacity-50 text-xs transition"
              >
                {votingInProgress ? "Casting..." : "Cast Quadratic Vote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for creating a proposal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateProposal} className="nexus-card max-w-lg w-full p-6 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg">Submit Governance Proposal</h3>
            <p className="text-xs text-muted-foreground">Draft a core policy or structural action. Keep description clear.</p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">Title</label>
              <input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="E.g., Establish decentralized IPFS backup..."
                className="w-full text-sm rounded border border-border bg-elevated px-3 py-2 outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">Description</label>
              <textarea
                required
                rows={4}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detail your rationale, scope, and implementation details..."
                className="w-full text-sm rounded border border-border bg-elevated px-3 py-2 outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full text-sm rounded border border-border bg-elevated px-3 py-2 outline-none focus:border-primary"
              >
                <option value="policy">Policy / Guideline</option>
                <option value="treasury">Treasury / Fund Allocation</option>
                <option value="curriculum">Learning Curriculum</option>
                <option value="philosophy">Philosophy Stance</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-3.5 py-2 rounded text-xs font-semibold hover:bg-elevated text-muted-foreground transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground font-semibold rounded px-4 py-2 hover:opacity-90 disabled:opacity-50 text-xs transition"
              >
                {submitting ? "Submitting..." : "Submit Proposal"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
