import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CortexEntryCard, type CortexEntry } from "@/components/cortex-entry-card";
import { AddToCortexModal } from "@/components/add-to-cortex-modal";
import { checkAddictionPatterns } from "@/lib/anti-addiction";
import { nextTier, shouldShowTier, tierProgress, type TierName } from "@/lib/tiers";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "NEXUS — Dashboard" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [addOpen, setAddOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profile?.id) return;
    checkAddictionPatterns(profile.id).then((alert) => {
      if (alert) toast.message(alert.type === "health_concern" ? "Take a break" : "Pause and reflect", { description: alert.message, duration: 10000 });
    });
  }, [profile?.id]);

  const { data: entries = [], refetch: refetchEntries } = useQuery<CortexEntry[]>({
    queryKey: ["cortex-entries-recent"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("cortex_entries").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(5);
      return (data ?? []) as CortexEntry[];
    },
  });

  const { data: spike } = useQuery({
    queryKey: ["latest-spike"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("truth_spikes").select("*").eq("user_id", u.user.id).is("opened_at", null).order("delivered_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: lastCheck } = useQuery({
    queryKey: ["last-checkin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("wellbeing_checkins").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const currentTier = (profile?.current_tier ?? "seeker") as TierName;
  const totalXp = (profile as { total_xp?: number })?.total_xp ?? 0;
  const nxt = nextTier(currentTier);
  const progress = tierProgress(totalXp, currentTier);
  const showTier = shouldShowTier((profile as { tier_visibility?: string })?.tier_visibility);

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr_280px]">
        <div className="space-y-4">
          <div className="nexus-card p-5">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="h-12 w-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-elevated text-lg font-semibold">{(profile?.display_name ?? "?").slice(0,1).toUpperCase()}</div>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold">{profile?.display_name ?? "You"}</h2>
                {profile?.handle && <p className="text-xs text-muted-foreground">@{profile.handle}</p>}
              </div>
            </div>
            {profile?.bio && <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p>}
            {profile?.open_questions && profile.open_questions.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Open question</p>
                <p className="mt-1 text-sm italic">"{profile.open_questions[0]}"</p>
              </div>
            )}
          </div>

          {profile?.values && profile.values.length > 0 && (
            <div className="nexus-card p-5">
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Values</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.values.map((v: string) => <span key={v} className="chip">{v}</span>)}
              </div>
            </div>
          )}

          {showTier && (
            <div className="nexus-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Current tier</p>
                {nxt && <span className="font-mono text-[11px] text-muted-foreground">→ {nxt.label}</span>}
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative grid h-16 w-16 place-items-center">
                  <svg viewBox="0 0 36 36" className="absolute inset-0">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--primary)" strokeWidth="2.5"
                      strokeDasharray={`${(progress / 100) * 94.25} 94.25`}
                      transform="rotate(-90 18 18)" strokeLinecap="round" />
                  </svg>
                  <Sparkle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold capitalize">{currentTier}</h3>
                  <p className="text-xs text-muted-foreground">{totalXp} XP · {entries.length} entries</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <li>• Document 3 perspective shifts</li>
                <li>• Run 1 experiment with honest results</li>
                <li>• Validate someone else's work</li>
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">My Cortex — Proof of Existence</h2>
              <p className="text-xs text-muted-foreground">What you actually did, learned, changed your mind about.</p>
            </div>
            <Link to="/cortex" className="text-xs text-primary hover:underline">View all →</Link>
          </div>

          {entries.length === 0 ? (
            <EmptyCortex onAdd={() => setAddOpen(true)} />
          ) : (
            <>
              <div>
                {entries.map((e, i) => <CortexEntryCard key={e.id} entry={e} idx={i} />)}
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary"
              >
                <Plus className="h-4 w-4" /> Add to Cortex
              </button>
            </>
          )}
        </div>

        <div className="space-y-4">
          {spike ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="nexus-card glow-amber border-accent-amber/40 p-5"
            >
              <p className="text-[10px] uppercase tracking-wider text-accent-amber">NEXUS noticed something</p>
              <h3 className="mt-2 font-display text-base font-semibold">{spike.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{spike.insight_text}</p>
              <button className="mt-3 text-xs font-medium text-accent-amber hover:underline">Explore →</button>
            </motion.div>
          ) : (
            <div className="nexus-card p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Truth spikes</p>
              <p className="mt-2 text-sm text-muted-foreground">Truth spikes appear when your learning connects to the real world.</p>
            </div>
          )}

          <div className="nexus-card p-5">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Learning circle</p>
            <p className="text-sm text-muted-foreground">Your circle is quiet. Post a question or share something you learned.</p>
            <Link to="/community" className="mt-3 inline-block text-xs text-primary hover:underline">Open community →</Link>
          </div>

          <Link to="/wellbeing" className="block nexus-card p-5 transition hover:border-accent-teal/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wellbeing pulse</p>
            {lastCheck ? (
              <>
                <p className="mt-2 text-sm">Feeling <span className="text-accent-teal">{lastCheck.emotion}</span> · energy {lastCheck.energy_level}/10</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Last check-in {new Date(lastCheck.created_at ?? Date.now()).toLocaleString()}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No recent check-in. How are you, actually?</p>
            )}
          </Link>

          <Link to="/coach" className="block nexus-card p-5 transition hover:border-primary/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI Coach</p>
            <p className="mt-2 text-sm text-muted-foreground">Socratic questions with full transparency — ask "Why this question?" anytime.</p>
          </Link>
        </div>
      </div>

      <AddToCortexModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => refetchEntries()} />
    </AppShell>
  );
}

function EmptyCortex({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="nexus-card p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15">
        <Sparkle className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Your proof of existence starts with one action.<br />What did you do or think today that mattered?
      </p>
      <button onClick={onAdd} className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 glow-primary">
        <Plus className="h-4 w-4" /> Add first entry
      </button>
    </div>
  );
}
