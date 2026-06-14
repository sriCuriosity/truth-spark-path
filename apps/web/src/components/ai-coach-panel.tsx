import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, MessageCircle, Send } from "lucide-react";
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

type Props = {
  voiceId: AIVoiceId;
};

export function AICoachPanel({ voiceId }: Props) {
  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ReturnType<typeof generateQuestionExplanation> | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: context } = useQuery({
    queryKey: ["coach-context"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: profile } = await supabase.from("profiles").select("open_questions, preferred_ai_voice").eq("id", u.user.id).maybeSingle();
      const { data: entries } = await supabase.from("cortex_entries").select("entry_type, domains").eq("user_id", u.user.id);
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

    const q = generateSocraticQuestion({
      openQuestion: context.openQuestion,
      domains: context.domains,
      entryCount: context.entryCount,
      perspectiveShifts: context.perspectiveShifts,
      voice: context.voice,
    });

    const { data: interaction, error } = await supabase
      .from("ai_interactions")
      .insert({
        user_id: context.userId,
        voice: context.voice,
        question_text: q,
        context_summary: `entries:${context.entryCount}`,
      })
      .select()
      .single();

    if (error) {
      toast.error("Couldn't generate question");
      setLoading(false);
      return;
    }

    await supabase.from("ai_audit_log").insert({
      user_id: context.userId,
      function_name: "socratic_question",
      model: "rule-based",
      prompt_hash: "local-v1",
      action_description: `Generated ${context.voice} question`,
    });

    setQuestion(q);
    setQuestionId(interaction.id);
    setLoading(false);
  }

  async function explainQuestion() {
    if (!question || !context || !questionId) return;
    const exp = generateQuestionExplanation(question, {
      openQuestion: context.openQuestion,
      entryCount: context.entryCount,
      perspectiveShifts: context.perspectiveShifts,
      voice: context.voice,
    });

    await supabase.from("ai_question_explanations").insert({
      question_id: questionId,
      user_id: context.userId,
      question_text: question,
      reasoning: exp.reasoning,
      alternative_framings: exp.alternative_framings,
      bias_flags: exp.bias_flags,
      source_frameworks: exp.source_frameworks,
    });

    setExplanation(exp);
    setShowWhy(true);
  }

  async function sendReply() {
    if (!reply.trim() || !context) return;
    const trigger = detectEscalation(reply, context.recentLowEnergy);
    if (trigger) {
      const response = warmHandoffResponse(trigger);
      await supabase.from("ai_escalation_log").insert({
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
            <button
              onClick={explainQuestion}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Why this question?
            </button>
            {showWhy && explanation && (
              <div className="mt-4 rounded-md border border-border bg-elevated p-4 text-sm">
                <p>{explanation.reasoning}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Alternative framings</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {explanation.alternative_framings.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-accent-amber">Bias flag: {explanation.bias_flags.join(" ")}</p>
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
