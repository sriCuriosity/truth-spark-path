import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

const MENTOR_COVENANT = `I am here to walk beside, not to lead.
I share my experience, not universal truth.
I am still learning. I will be wrong.
I will not use this relationship for anything except mutual growth.
If I fail in this, I expect the community to hold me accountable.`;

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "NEXUS — Mentor Connect" }] }),
  component: MentorPage,
});

function MentorPage() {
  const [covenantAccepted, setCovenantAccepted] = useState(false);
  const [joining, setJoining] = useState(false);

  async function joinWaitlist() {
    setJoining(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (covenantAccepted) {
      await supabase.from("mentor_development").upsert({
        mentor_id: u.user.id,
        development_phase: "onboarding",
        mentor_covenant_accepted: true,
        covenant_accepted_at: new Date().toISOString(),
      }, { onConflict: "mentor_id" });
    }
    setJoining(false);
    toast.success(covenantAccepted ? "You're on the mentor pathway. We'll notify you when matching opens." : "You're on the waitlist.");
  }

  return (
    <AppShell title="Mentor Connect">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="nexus-card p-10 text-center">
          <h2 className="font-display text-2xl font-bold">Mentors are people who've done things.</h2>
          <p className="mt-3 text-sm text-muted-foreground">Not just studied them. NEXUS opens mentorship carefully — with co-mentoring, community feedback, and a public covenant.</p>
        </div>

        <div className="nexus-card p-6">
          <h3 className="font-display text-lg font-semibold">Mentor Covenant</h3>
          <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-elevated p-4 font-sans text-sm text-muted-foreground">{MENTOR_COVENANT}</pre>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={covenantAccepted} onChange={(e) => setCovenantAccepted(e.target.checked)} className="mt-1 accent-[color:var(--primary)]" />
            I understand this covenant and would accept it if I become a mentor
          </label>
        </div>

        <div className="nexus-card p-6">
          <h3 className="font-display text-lg font-semibold">Eligibility pathway</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Contributor tier or above</li>
            <li>• 3+ documented perspective shifts</li>
            <li>• 5+ community validations received</li>
            <li>• Complete "The Mentor's Path" modules</li>
            <li>• Co-mentor with an experienced mentor before solo matching</li>
          </ul>
          <button
            onClick={joinWaitlist}
            disabled={joining}
            className="mt-6 rounded-md border border-border bg-elevated px-5 py-2.5 text-sm font-medium hover:bg-elevated/70 disabled:opacity-50"
          >
            {joining ? "…" : covenantAccepted ? "Begin mentor pathway" : "Join the waitlist"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
