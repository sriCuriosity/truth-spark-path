import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmotionWheel } from "@/components/emotion-wheel";
import { Sparkles, Brain, Lock, ShieldCheck, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "NEXUS — Begin" }] }),
  component: Onboarding,
});

const VALUES = ["Honesty", "Curiosity", "Craft", "Justice", "Beauty", "Service", "Independence", "Community", "Truth", "Play", "Discipline", "Rebellion", "Care", "Courage", "Wonder", "Repair", "Solitude", "Solidarity", "Patience", "Risk"];

const DEPROGRAM_MODULES = [
  {
    id: 1,
    title: "Module 1: The Authority Bias",
    claim: "Experts are always right, and official institutions cannot be wrong.",
    socraticQuestion: "Think of an official consensus in history that turned out to be completely incorrect. What made intelligent people believe it at the time?",
    domain: "Media & Epistemology",
    placeholder: "E.g., In the early 20th century, lobotomies were awarded a Nobel Prize. The consensus believed it was the pinnacle of psychiatric care. It was proven to be structural violence.",
  },
  {
    id: 2,
    title: "Module 2: The Sunk Cost Fallacy",
    claim: "If you have spent years studying a career path, you must continue, even if you hate it.",
    socraticQuestion: "Is a bad investment of time justified by making it worse? What is the distinction between persistence and compliance?",
    domain: "Systems Thinking",
    placeholder: "E.g., Pivoting from a traditional law degree to builder craft. Pivot details and how persistence in a wrong path is structural self-harm.",
  },
  {
    id: 3,
    title: "Module 3: The Standardized Intelligence Fallacy",
    claim: "Your exam scores represent your baseline potential and intellectual capability.",
    socraticQuestion: "Can a standardized multiple-choice exam measure creativity, courage, or systemic understanding? What did your best scores miss about you?",
    domain: "Emotional Intelligence",
    placeholder: "E.g., Scoring poorly in memory recall tests but building an open-source tool or coordinating community support systems without a script.",
  },
  {
    id: 4,
    title: "Module 4: The Echo Chamber",
    claim: "People who disagree with your worldview are simply uneducated or malicious.",
    socraticQuestion: "Find a perspective you strongly oppose. Can you articulate their strongest argument in a way they would agree with? What does your anger protect?",
    domain: "Social Skills",
    placeholder: "E.g., Articulating the material argument of traditionalists regarding localized farming vs globalized industrial efficiency without caricaturing it.",
  },
  {
    id: 5,
    title: "Module 5: The Sovereign Fallacy",
    claim: "You are fully independent and unaffected by algorithmic structures.",
    socraticQuestion: "Check your feed. How much of what you read did you actively choose, and how much was fed to trigger your attention loop?",
    domain: "How Society Works",
    placeholder: "E.g., Analyzing my feed usage. Documenting the specific trigger words that standard algorithms feed to capture my attention loops.",
  }
];

function Onboarding() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"profile" | "deprogram">("profile");
  
  // Phase 0: Profile Setup States
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

  // Phase 1: Deprogramming Modules States
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [reflectionText, setReflectionText] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("display_name, handle, onboarding_complete").eq("id", data.user.id).maybeSingle();
      if (p?.onboarding_complete) navigate({ to: "/dashboard" });
      if (p?.display_name) setDisplayName(p.display_name);
      if (p?.handle) setHandle(p.handle);
    });
  }, [navigate]);

  // Phase 1 Timer logic
  useEffect(() => {
    if (!timerActive) return;
    if (secondsLeft === 0) {
      setTimerActive(false);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft]);

  async function handleProfileSave() {
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
      }).eq("id", u.user.id);
      
      if (error) throw error;
      
      if (emotion) {
        await supabase.from("wellbeing_checkins").insert({ user_id: u.user.id, emotion, energy_level: energy });
      }

      toast.success("Profile baseline established. Welcome to Phase 1.");
      setPhase("deprogram");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save");
    } finally { setSaving(false); }
  }

  async function handleEvidenceSubmit() {
    if (!evidenceTitle.trim() || !evidenceBody.trim()) {
      toast.error("Please fill in the Socratic deconstruction title and body.");
      return;
    }

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");

      const activeModule = DEPROGRAM_MODULES[activeModuleIdx];

      // Insert into cortex_entries
      const { error } = await supabase.from("cortex_entries").insert({
        user_id: u.user.id,
        entry_type: "perspective_shift",
        title: `${activeModule.title}: ${evidenceTitle}`,
        body: evidenceBody,
        domains: [activeModule.domain],
        is_public: false,
      });

      if (error) throw error;

      // Award XP
      await supabase.from("xp_ledger").insert({
        user_id: u.user.id,
        amount: 50,
        source: "deprogram_module",
        metadata: { module_id: activeModule.id }
      });

      toast.success("Evidence log added. Proceeding to reflection.");
      setEvidenceSubmitted(true);
      setTimerActive(true);
      setSecondsLeft(60);
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit evidence");
    } finally { setSaving(false); }
  }

  async function handleNextModule() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    // Save reflection to chamber (encrypted private space)
    if (reflectionText.trim()) {
      await supabase.from("chamber_entries").insert({
        user_id: u.user.id,
        content: `Reflective Sink (${DEPROGRAM_MODULES[activeModuleIdx].title}): ${reflectionText}`,
      });
    }

    if (activeModuleIdx < DEPROGRAM_MODULES.length - 1) {
      setActiveModuleIdx(activeModuleIdx + 1);
      setEvidenceTitle("");
      setEvidenceBody("");
      setEvidenceSubmitted(false);
      setReflectionText("");
      setSecondsLeft(60);
      setTimerActive(false);
    } else {
      // Deprogramming complete!
      setSaving(true);
      try {
        const { error } = await supabase.from("profiles").update({
          onboarding_complete: true,
        }).eq("id", u.user.id);
        if (error) throw error;

        // seed initial spikes
        await supabase.from("truth_spikes").insert([
          { user_id: u.user.id, title: "Your first learning connected", insight_text: "The Socratic method you practiced is more powerful than curriculum systems.", connection_type: "real_world_event" },
          { user_id: u.user.id, title: "Self-Sovereignty Complete", insight_text: "Cortex initialization complete. You are now a Seeker.", connection_type: "milestone" }
        ]);

        toast.success("Deprogramming Phase 1 Complete! Welcome to NEXUS.");
        navigate({ to: "/dashboard" });
      } catch (err: any) {
        toast.error(err.message ?? "Could not finalize deprogramming");
      } finally { setSaving(false); }
    }
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

  const activeModule = DEPROGRAM_MODULES[activeModuleIdx];
  const canAdvanceProfile =
    step === 0 ? true :
    step === 1 ? openQ.trim().length > 3 :
    step === 2 ? displayName.trim().length > 0 :
    step === 3 ? true :
    step === 4 ? emotion !== null : true;

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-[180px]" />

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        
        {phase === "profile" ? (
          <>
            {/* steps */}
            <div className="mb-8 flex items-center justify-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
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
                    <button disabled={!canAdvanceProfile} onClick={() => setStep(step + 1)} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
                      {step === 0 ? "I'm ready to know more →" : "Continue →"}
                    </button>
                  ) : (
                    <button disabled={!canAdvanceProfile || saving} onClick={handleProfileSave} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 glow-primary">
                      {saving ? "Saving..." : "Enter deprogramming phase →"}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          /* Deprogramming Phase (5 sequential Socratic steps) */
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="font-display text-xl font-bold flex items-center gap-2 text-accent-teal">
                  <Brain className="h-5 w-5" /> Phase 1: Cognitive Deprogramming
                </h1>
                <p className="text-xs text-muted-foreground">Complete the 5 sequential biase audits to unlock your dashboard.</p>
              </div>
              <span className="text-xs font-mono bg-elevated border border-border px-2.5 py-1 rounded">
                Module {activeModuleIdx + 1} / {DEPROGRAM_MODULES.length}
              </span>
            </div>

            <motion.div
              key={activeModuleIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="nexus-card p-6 md:p-8 space-y-6"
            >
              <div>
                <span className="chip bg-accent-amber/20 text-accent-amber text-[10px] uppercase font-semibold">
                  Active Challenge Node: {activeModule.domain}
                </span>
                <h2 className="font-display text-2xl font-bold mt-2 text-foreground">{activeModule.title}</h2>
              </div>

              {/* The Claim Box */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="text-[10px] font-mono uppercase text-red-400 font-bold block mb-1">Traditional System Claim:</span>
                <p className="text-sm italic text-muted-foreground">"{activeModule.claim}"</p>
              </div>

              {/* Socratic Challenge */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-accent-teal">
                  <Sparkles className="h-4 w-4" /> Socratic Inquiry
                </h3>
                <p className="text-sm leading-relaxed text-foreground">{activeModule.socraticQuestion}</p>
              </div>

              {!evidenceSubmitted ? (
                /* STEP 1: Submit Counter-Evidence */
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Requirement: Log counter-evidence to your Cortex
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Deconstruction Title (e.g. Challenging Consensus)"
                      value={evidenceTitle}
                      onChange={(e) => setEvidenceTitle(e.target.value)}
                      className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <textarea
                      rows={4}
                      placeholder={activeModule.placeholder}
                      value={evidenceBody}
                      onChange={(e) => setEvidenceBody(e.target.value)}
                      className="w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary font-sans"
                    />
                  </div>
                  <button
                    onClick={handleEvidenceSubmit}
                    disabled={saving}
                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition glow-primary flex items-center justify-center gap-2"
                  >
                    {saving ? "Logging..." : "Submit Socratic Evidence to Cortex (+50 XP)"}
                  </button>
                </div>
              ) : (
                /* STEP 2: Adrenaline Sink Reflection Timer */
                <div className="space-y-5 pt-4 border-t border-border/40">
                  <h4 className="text-xs uppercase tracking-wider text-accent-teal flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-green-400" /> Evidence Verified and Saved to Cortex!
                  </h4>
                  <div className="p-5 bg-accent-teal/10 border border-accent-teal/20 rounded-lg flex items-center gap-4">
                    <div className="relative h-12 w-12 flex items-center justify-center bg-accent-teal/20 rounded-full">
                      <Timer className="h-6 w-6 text-accent-teal" />
                      {timerActive && (
                        <span className="absolute text-xs font-mono font-bold text-accent-teal">
                          {secondsLeft}s
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold">Adrenaline Sink Contemplation Mode</h5>
                      <p className="text-xs text-muted-foreground">Take 60 seconds to sit with this challenge. Document what you actually felt inside your body when questioning this bias.</p>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="E.g., I felt a slight anxiety in my chest when writing that official consensus can be wrong, because I've been trained to seek validation from authorities my whole life."
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    className="w-full resize-none rounded-md border border-border bg-elevated px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />

                  <button
                    onClick={handleNextModule}
                    disabled={secondsLeft > 0 && timerActive}
                    className="w-full py-3 bg-accent-teal text-black font-semibold rounded-md hover:opacity-90 transition disabled:opacity-40 disabled:hover:opacity-40 glow-teal flex items-center justify-center gap-2"
                  >
                    {secondsLeft > 0 && timerActive ? `Contemplating... (${secondsLeft}s remaining)` : "Save Reflection & Proceed"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
