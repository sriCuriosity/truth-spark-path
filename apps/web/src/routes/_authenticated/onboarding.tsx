import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmotionWheel } from "@/components/emotion-wheel";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "NEXUS — Begin" }] }),
  component: Onboarding,
});

const VALUES = ["Honesty", "Curiosity", "Craft", "Justice", "Beauty", "Service", "Independence", "Community", "Truth", "Play", "Discipline", "Rebellion", "Care", "Courage", "Wonder", "Repair", "Solitude", "Solidarity", "Patience", "Risk"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [openQ, setOpenQ] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [energy, setEnergy] = useState(6);
  const [tierVisibility, setTierVisibility] = useState("full");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("display_name, handle, onboarding_complete").eq("id", data.user.id).maybeSingle();
      if (p?.onboarding_complete) navigate({ to: "/dashboard" });
      if (p?.display_name) setDisplayName(p.display_name);
      if (p?.handle) setHandle(p.handle);
    });
  }, [navigate]);

  async function finish() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");
      const { error } = await supabase.from("profiles").update({
        display_name: displayName || "Anonymous",
        handle: handle || null,
        bio,
        values,
        open_questions: openQ ? [openQ] : [],
        tier_visibility: tierVisibility,
        onboarding_complete: true,
      }).eq("id", u.user.id);
      if (error) throw error;
      if (emotion) {
        await supabase.from("wellbeing_checkins").insert({ user_id: u.user.id, emotion, energy_level: energy });
      }
      // seed 3 truth spikes
      await supabase.from("truth_spikes").insert([
        { user_id: u.user.id, title: "Your first learning connected", insight_text: "The topic you explore here is more relevant to the world right now than most people realise.", connection_type: "real_world_event" },
        { user_id: u.user.id, title: "Someone thinks like you", insight_text: "A student in a different city is exploring the same question you posted. NEXUS will connect you soon.", connection_type: "peer_connection" },
        { user_id: u.user.id, title: "Two things you know are secretly the same", insight_text: "The first two domains you explore will share a deep structural pattern.", connection_type: "cross_domain" },
      ]);
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save");
    } finally { setSaving(false); }
  }

  function toggleValue(v: string) {
    setValues((p) => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  }
  function addCustom() {
    if (customValue.trim() && !values.includes(customValue.trim())) {
      setValues([...values, customValue.trim()]);
      setCustomValue("");
    }
  }

  const canAdvance =
    step === 0 ? true :
    step === 1 ? openQ.trim().length > 3 :
    step === 2 ? displayName.trim().length > 0 :
    step === 3 ? true :
    step === 4 ? emotion !== null : true;

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[180px]" />

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        {/* steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0,1,2,3,4].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-6 bg-primary/50" : "w-6 bg-border"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="nexus-card p-8 md:p-10"
          >
            {step === 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-accent-amber">Step 1 — The system you were born into</p>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">Before we begin, there's something you were never told.</h2>
                <div className="mt-6 space-y-4 text-muted-foreground">
                  <p>The examination system you grew up inside was not designed to teach you. It was designed to rank you, to sort the obedient from the inconvenient, and to reward people who could repeat without thinking.</p>
                  <p>Your boredom was not failure. Your off-topic questions were not failure. The subjects you fell in love with that "weren't on the test" were never failure.</p>
                  <p>You were measured against a yardstick built for a different century. NEXUS is not that yardstick.</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-accent-amber">Step 2 — Your curiosity was never wrong</p>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">Everything you were told was a failure — wasn't.</h2>
                <p className="mt-4 text-muted-foreground">Years of being told "stay on task" teaches a thing called learned helplessness — the quiet belief that your own questions don't matter. NEXUS is built to undo that.</p>
                <label className="mt-8 block">
                  <span className="text-sm font-medium">What question have you always wanted to explore but felt was too off-topic?</span>
                  <textarea
                    rows={3} value={openQ} onChange={(e) => setOpenQ(e.target.value)}
                    placeholder="The one your teachers waved away."
                    className="mt-2 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-accent-amber">Step 3 — Who are you, actually?</p>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">No CV language. Just you.</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Display name</span>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Handle</span>
                    <div className="mt-1 flex items-center rounded-md border border-border bg-elevated">
                      <span className="pl-3 text-muted-foreground">@</span>
                      <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))} className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" />
                    </div>
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Describe yourself in your own words</span>
                  <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Not what you do. Who you are." />
                </label>
                <div className="mt-6">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Your values</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {VALUES.map((v) => {
                      const active = values.includes(v);
                      return (
                        <button key={v} onClick={() => toggleValue(v)} className={`chip transition ${active ? "!bg-primary/30 !border-primary !text-foreground" : ""}`}>
                          {v}
                        </button>
                      );
                    })}
                    {values.filter(v => !VALUES.includes(v)).map(v => (
                      <button key={v} onClick={() => toggleValue(v)} className="chip !bg-primary/30 !border-primary">{v}</button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input value={customValue} onChange={(e) => setCustomValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} placeholder="Add your own" className="flex-1 rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" />
                    <button onClick={addCustom} className="rounded-md border border-border bg-elevated px-3 py-2 text-sm hover:bg-elevated/70">Add</button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-accent-amber">Step 4 — How NEXUS works</p>
                <h2 className="mt-4 font-display text-3xl font-bold">Three things, then you're in.</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { title: "The Cortex", body: "Your proof of existence. Every action, experiment, change of mind — recorded as evidence.", color: "var(--accent-teal)" },
                    { title: "Tiers", body: "Unlocked by what you actually do, not by how long you've been here.", color: "var(--primary)" },
                    { title: "Truth Spikes", body: "When your learning resonates with the real world, NEXUS notices and tells you.", color: "var(--accent-amber)" },
                  ].map(c => (
                    <div key={c.title} className="rounded-lg border border-border bg-elevated p-5">
                      <div className="mb-3 h-1 w-10 rounded-full" style={{ background: c.color }} />
                      <h3 className="font-display text-lg font-bold">{c.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-border bg-elevated p-4">
                  <p className="text-sm font-medium">You are not your grade</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tiers reflect real actions — but you can hide them if ladders trigger old habits.</p>
                  <select
                    value={tierVisibility}
                    onChange={(e) => setTierVisibility(e.target.value)}
                    className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="full">Show my tier (default)</option>
                    <option value="self_only">Only show tier to me</option>
                    <option value="hidden">Hide tiers entirely</option>
                    <option value="milestones">Only on new tier reached</option>
                  </select>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-accent-amber">Step 5 — Wellbeing baseline</p>
                <h2 className="mt-4 font-display text-3xl font-bold">NEXUS learns your rhythms.</h2>
                <p className="mt-2 text-sm text-muted-foreground">This is your starting point. Tap an emotion. Set your energy.</p>
                <div className="mt-6 grid items-center gap-8 md:grid-cols-2">
                  <EmotionWheel selected={emotion} onSelect={setEmotion} />
                  <div>
                    <label className="block">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Energy</span>
                        <span className="font-mono text-foreground">{energy}/10</span>
                      </div>
                      <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-2 w-full accent-[color:var(--primary)]" />
                    </label>
                    {emotion && <p className="mt-4 text-sm">You feel <span className="text-primary">{emotion}</span> at energy {energy}.</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex items-center justify-between">
              {step > 0 ? (
                <button onClick={() => setStep(step - 1)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
              ) : <span />}
              {step < 4 ? (
                <button disabled={!canAdvance} onClick={() => setStep(step + 1)} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
                  {step === 0 ? "I'm ready to know more →" : "Continue →"}
                </button>
              ) : (
                <button disabled={!canAdvance || saving} onClick={finish} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 glow-primary">
                  {saving ? "Entering…" : "Enter NEXUS →"}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
