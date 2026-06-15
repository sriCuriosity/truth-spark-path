import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, MessageCircle, Send, Sparkles, ThumbsUp, AlertTriangle, XCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AI_VOICES,
  generateQuestionExplanation,
  generateSocraticQuestion,
  getVoice,
  type AIVoiceId,
} from "@/lib/ai-voices";
import { detectEscalation, warmHandoffResponse } from "@/lib/ai-boundaries";
import { chatWithMentor } from "@/lib/api/mentor.functions";
import { awardXp } from "@/lib/tiers";

type Props = {
  voiceId: AIVoiceId;
};
 
export function AICoachPanel({ voiceId }: Props) {
  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<any | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [evaluated, setEvaluated] = useState(false);
  const [showRefuteInput, setShowRefuteInput] = useState(false);
  const [refutationText, setRefutationText] = useState("");
  const [submittingRefutation, setSubmittingRefutation] = useState(false);

  const { data: context } = useQuery({
    queryKey: ["coach-context"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: profile } = await supabase.from("profiles").select("open_questions, preferred_ai_voice").eq("id", u.user.id).maybeSingle();
      const { data: entries } = await supabase.from("cortex_entries").select("entry_type, domains");
      const perspectiveShifts = (entries ?? []).filter((e) => e.entry_type === "perspective_shift").length;
      const domains = [...new Set((entries ?? []).flatMap((e) => e.domains ?? []))];
      const { data: checkins } = await supabase
        .from("wellbeing_checkins")
        .select("energy_level")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      const recentLowEnergy = (checkins ?? []).filter((c) => (c.energy_level ?? 10) <= 4).length >= 3;
      return {
        userId: u.user.id,
        openQuestion: profile?.open_questions?.[0] ?? null,
        voice: (profile?.preferred_ai_voice ?? voiceId) as AIVoiceId,
        entryCount: entries?.length ?? 0,
        perspectiveShifts,
        domains,
        recentLowEnergy,
      };
    },
  });

  async function askQuestion() {
    if (!context) return;
    setLoading(true);
    setShowWhy(false);
    setExplanation(null);
    setSources([]);
    setEvaluated(false);
    setShowRefuteInput(false);
    setRefutationText("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active auth token");

      // 1. RAG context retrieval based on the active open question
      const queryText = context.openQuestion || (context.domains.length > 0 ? context.domains.join(" ") : "truth and curiosity");
      const ragRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryText })
      });

      let ragContext = "";
      let retrievedEntries: any[] = [];
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        retrievedEntries = ragData.data?.similar_entries || [];
        ragContext = ragData.data?.context || "";
        setSources(retrievedEntries);
      }

      // 2. Prepare Socratic persona prompt
      const voiceObj = getVoice(context.voice);
      const systemPrompt = `You are the NEXUS AI Socratic Coach, adopting the intellectual persona of '${voiceObj.label}' (Tradition/Style: '${voiceObj.tradition}').
Your primary goal is to guide the user to self-deconstruction and deeper insight. Never prescribe answers, define consensus truths, or act as an authority. Always surface uncertainty.

Here is the user's Cortex context:
- Explored Domains: ${context.domains.join(", ") || "None yet"}
- Active Open Question: ${context.openQuestion || "None set"}
- Total Cortex Entries: ${context.entryCount}
- Perspective Shifts Recorded: ${context.perspectiveShifts}

Retrieved related Cortex memories (RAG Context):
${ragContext || "No past related memories found."}

Generate one highly tailored, single, deep, thought-provoking Socratic question for the user. Do not explain anything or provide introductory text. Return ONLY the question itself. Keep it under 2 sentences.`;

      // 3. Call LLM Proxy
      const llmRes = await chatWithMentor({
        data: {
          accessToken: token,
          systemPrompt,
          messages: [{ role: "user", content: "Ask me a Socratic question based on my cortex and active context." }]
        }
      });

      const q = llmRes.content.trim();

      const { data: interaction, error } = await (supabase as any)
        .from("ai_interactions")
        .insert({
          user_id: context.userId,
          voice: context.voice,
          question_text: q,
          context_summary: retrievedEntries.length > 0 ? `RAG: ${retrievedEntries.map(e => e.title).join(", ")}` : "Rule-based",
        })
        .select()
        .single();


      if (error) throw error;

      setQuestion(q);
      setQuestionId(interaction.id);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate dynamic question. Falling back to offline template.");
      const q = generateSocraticQuestion({
        openQuestion: context.openQuestion,
        domains: context.domains,
        entryCount: context.entryCount,
        perspectiveShifts: context.perspectiveShifts,
        voice: context.voice,
      });
      setQuestion(q);
    } finally {
      setLoading(false);
    }
  }

  async function explainQuestion() {
    if (!question || !context || !questionId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active auth token");

      const voiceObj = getVoice(context.voice);
      const explainPrompt = `You are a meta-cognitive auditor for the NEXUS Socratic platform. The AI Coach just asked the user the following question under the persona '${voiceObj.label}':
"${question}"

Explain the pedagogical rationale behind this question. Be transparent, highlight any potential cognitive biases, and cite the underlying philosophical or systemic frameworks.
You MUST respond with a valid JSON object matching this structure EXACTLY (do not wrap in markdown code blocks or add extra text):
{
  "reasoning": "Pedagogical explanation of why this question helps deconstruct authority or default compliance in relation to the user's focus.",
  "alternative_framings": ["An alternative way to phrase this question that changes the perspective", "Another phrasing"],
  "bias_flags": ["Identify any implicit assumptions or biases in the question, or how the persona itself might skew inquiry"],
  "source_frameworks": ["Philosophical tradition or model, e.g. Stoicism, Dialectical Materialism"]
}`;

      const llmRes = await chatWithMentor({
        data: {
          accessToken: token,
          systemPrompt: explainPrompt,
          messages: [{ role: "user", content: "Provide the pedagogical metadata audit for the active question." }]
        }
      });

      let parsedExp;
      try {
        let cleaned = llmRes.content.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        parsedExp = JSON.parse(cleaned);
      } catch (jsonErr) {
        console.warn("Failed to parse JSON, falling back to rule-based explanation:", jsonErr);
        parsedExp = generateQuestionExplanation(question, {
          openQuestion: context.openQuestion,
          entryCount: context.entryCount,
          perspectiveShifts: context.perspectiveShifts,
          voice: context.voice,
        });
      }

      await (supabase as any).from("ai_question_explanations").insert({
        question_id: questionId,
        user_id: context.userId,
        question_text: question,
        reasoning: parsedExp.reasoning,
        alternative_framings: parsedExp.alternative_framings,
        bias_flags: parsedExp.bias_flags,
        source_frameworks: parsedExp.source_frameworks,
      });


      setExplanation(parsedExp);
      setShowWhy(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate explanation metadata.");
    } finally {
      setLoading(false);
    }
  }

  async function handleChallengeAccept() {
    if (evaluated || !context || !questionId) return;
    try {
      const res = await awardXp(context.userId, "socratic_reflection", questionId);
      toast.success(`Pedagogical reflection logged! (+2 XP)`);
      if (res.tierChanged) {
        toast.message(`You reached ${res.currentTier} tier`, {
          description: "This reflects the real things you've done.",
        });
      }
      setEvaluated(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update XP.");
    }
  }

  async function handleRefutationSubmit() {
    if (!refutationText.trim() || !questionId) return;
    setSubmittingRefutation(true);
    try {
      const { error } = await (supabase as any)
        .from("ai_interactions")
        .update({ user_refutation: refutationText.trim() })
        .eq("id", questionId);
      if (error) throw error;
      toast.success("Refutation logged! Skepticism is the cornerstone of truth.");
      setShowRefuteInput(false);
      setEvaluated(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save refutation");
    } finally {
      setSubmittingRefutation(false);
    }
  }

  async function sendReply() {
    if (!reply.trim() || !context) return;
    const trigger = detectEscalation(reply, context.recentLowEnergy);
    if (trigger) {
      const response = warmHandoffResponse(trigger);
      await (supabase as any).from("ai_escalation_log").insert({
        user_id: context.userId,
        trigger_type: trigger,
        ai_response: response,
        resources_offered: ["crisis_helplines", "chamber", "peer_support"],
        user_response: reply,
        outcome: "pending",
        flagged_for_review: trigger === "self_harm_language",
      });

      toast.message("NEXUS noticed something important", { description: response, duration: 12000 });
      setReply("");
      return;
    }
    toast.success("Reflection received. Ask another question when ready.");
    setReply("");
  }

  const voice = getVoice(context?.voice ?? voiceId);

  return (
    <div className="space-y-6">
      <div className="nexus-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active voice</p>
            <h3 className="font-display text-lg font-semibold">{voice.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{voice.tradition}</p>
          </div>
          <span className="chip text-xs">Advisory only</span>
        </div>
        <details className="mt-4 text-sm text-muted-foreground">
          <summary className="cursor-pointer text-xs uppercase tracking-wider text-primary">Stance document</summary>
          <p className="mt-2"><strong>Notices:</strong> {voice.notices}</p>
          <p className="mt-1"><strong>May miss:</strong> {voice.misses}</p>
          <p className="mt-1"><strong>Known biases:</strong> {voice.biases}</p>
        </details>
      </div>

      <div className="nexus-card p-6">
        {!question ? (
          <div className="text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-primary/60" />
            <p className="mt-3 text-sm text-muted-foreground">The AI asks questions. It never prescribes answers.</p>
            <button
              onClick={askQuestion}
              disabled={loading || !context}
              className="mt-4 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Ask me a question"}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Socratic question</p>
            <p className="mt-2 font-display text-lg font-semibold leading-snug">{question}</p>
            
            {/* RAG Explanation Trail */}
            {sources.length > 0 && (
              <div className="mt-4 border-t border-border/40 pt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                  <Link2 className="h-3 w-3" /> Inspiration Trail (RAG Memories)
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {sources.map(s => (
                    <div key={s.id} className="text-[11px] bg-elevated/60 px-2 py-1 rounded flex items-center gap-1 border border-border/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
                      <span className="text-muted-foreground truncate max-w-[150px]">{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={explainQuestion}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Why this question?
            </button>

            {showWhy && explanation && (
              <div className="mt-4 rounded-md border border-border bg-elevated p-4 text-sm space-y-3">
                <p>{explanation.reasoning}</p>
                {explanation.alternative_framings?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Alternative framings</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground text-xs">
                      {explanation.alternative_framings.map((f: string) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {explanation.bias_flags?.length > 0 && (
                  <div className="text-xs text-accent-amber border-t border-border/40 pt-2 flex items-start gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Bias flag: {explanation.bias_flags.join(" ")}</span>
                  </div>
                )}

                {/* Socratic Refutation & Gating Handlers */}
                <div className="border-t border-border/40 pt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleChallengeAccept}
                    disabled={evaluated}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded border border-primary/30 transition disabled:opacity-50"
                  >
                    <ThumbsUp className="h-3 w-3" /> Challenges me (+2 XP)
                  </button>
                  <button
                    onClick={() => setShowRefuteInput(true)}
                    disabled={evaluated}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-accent-teal/10 hover:bg-accent-teal/20 text-accent-teal rounded border border-accent-teal/30 transition disabled:opacity-50"
                  >
                    <XCircle className="h-3 w-3" /> Refute Persona assumptions
                  </button>
                </div>

                {showRefuteInput && (
                  <div className="mt-3 border border-border bg-surface p-3 rounded space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">Submit refutation directly into model feedback logs:</p>
                    <textarea
                      rows={2}
                      value={refutationText}
                      onChange={(e) => setRefutationText(e.target.value)}
                      placeholder="Explain what the persona assumes about you..."
                      className="w-full text-xs rounded border border-border bg-elevated px-2 py-1.5 outline-none focus:border-accent-teal"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowRefuteInput(false)}
                        className="text-[11px] px-2 py-1 hover:bg-elevated rounded text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRefutationSubmit}
                        disabled={submittingRefutation || !refutationText.trim()}
                        className="text-[11px] px-2 py-1 bg-accent-teal hover:opacity-90 rounded text-black font-semibold disabled:opacity-50"
                      >
                        {submittingRefutation ? "Logging..." : "Submit Refutation"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Your reflection (optional)…"
                className="flex-1 rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
              />
              <button onClick={sendReply} className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <button onClick={askQuestion} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
              Another question →
            </button>
          </div>
        )}
      </div>

      <div className="nexus-card p-4">
        <p className="text-xs text-muted-foreground">
          <strong>AI boundaries:</strong> I can ask questions and suggest human connection. I cannot diagnose, treat, or read your Chamber.
        </p>
      </div>
    </div>
  );
}

export function AIVoicePicker({
  value,
  onChange,
}: {
  value: AIVoiceId;
  onChange: (v: AIVoiceId) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {AI_VOICES.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-lg border p-3 text-left text-sm transition ${value === v.id ? "border-primary bg-primary/10" : "border-border bg-elevated hover:border-primary/40"}`}
        >
          <p className="font-medium">{v.label}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.tradition}</p>
        </button>
      ))}
    </div>
  );
}



