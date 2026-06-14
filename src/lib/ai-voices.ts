export type AIVoiceId =
  | "socratic"
  | "provocateur"
  | "gentle_nurturer"
  | "synthesiser"
  | "historical_materialist"
  | "indigenous_knowledge"
  | "stoic";

export type AIVoice = {
  id: AIVoiceId;
  label: string;
  tradition: string;
  biases: string;
  notices: string;
  misses: string;
};

export const AI_VOICES: AIVoice[] = [
  {
    id: "socratic",
    label: "Socratic",
    tradition: "Classical Greek inquiry — questions first, answers never.",
    biases: "May over-emphasise logical consistency over embodied knowing.",
    notices: "Contradictions, unstated assumptions, gaps in reasoning.",
    misses: "Emotional nuance when not explicitly named.",
  },
  {
    id: "provocateur",
    label: "Provocateur",
    tradition: "Dialectical challenge — surfaces what you avoid.",
    biases: "Can feel confrontational; may privilege disruption over care.",
    notices: "Comfort zones, inherited beliefs, performative agreement.",
    misses: "When gentleness is what's needed.",
  },
  {
    id: "gentle_nurturer",
    label: "Gentle Nurturer",
    tradition: "Person-centred facilitation — pace follows the learner.",
    biases: "May under-challenge assumptions to preserve safety.",
    notices: "Emotional state, energy levels, need for rest.",
    misses: "Structural analysis when feelings dominate.",
  },
  {
    id: "synthesiser",
    label: "Synthesiser",
    tradition: "Systems integrator — connects disparate domains.",
    biases: "May impose patterns where coincidence exists.",
    notices: "Cross-domain parallels, recurring themes in Cortex.",
    misses: "Fine-grained local context.",
  },
  {
    id: "historical_materialist",
    label: "Historical Materialist",
    tradition: "Power, labour, and material conditions as primary lenses.",
    biases: "Training data overrepresents Western systemic analysis frameworks.",
    notices: "Who benefits, who bears costs, structural incentives.",
    misses: "Spiritual, mystical, or non-material ways of knowing.",
  },
  {
    id: "indigenous_knowledge",
    label: "Indigenous Knowledge",
    tradition: "Reciprocity, relationship to land, ancestral wisdom.",
    biases: "Cannot fully represent any single indigenous tradition.",
    notices: "Relational obligations, land connection, community reciprocity.",
    misses: "Urban, digital-native contexts without adaptation.",
  },
  {
    id: "stoic",
    label: "Stoic",
    tradition: "Agency, virtue, and what is within one's control.",
    biases: "May minimise systemic constraints on individual agency.",
    notices: "What you can influence vs. what you cannot.",
    misses: "When systemic change, not personal virtue, is the answer.",
  },
];

export function getVoice(id: string): AIVoice {
  return AI_VOICES.find((v) => v.id === id) ?? AI_VOICES[0];
}

type QuestionContext = {
  openQuestion?: string | null;
  domains?: string[];
  entryCount?: number;
  perspectiveShifts?: number;
  voice: AIVoiceId;
};

export function generateSocraticQuestion(ctx: QuestionContext): string {
  const templates: Record<AIVoiceId, string[]> = {
    socratic: [
      "What do you think the answer might be — and why do you think that?",
      "What evidence would change your mind about this?",
      "What assumption are you making that you haven't examined yet?",
    ],
    provocateur: [
      "What if the comfortable answer you've been holding is wrong?",
      "Who told you this was true — and what did they gain from you believing it?",
      "What would you have to give up if you admitted uncertainty here?",
    ],
    gentle_nurturer: [
      "What feels most alive in this question for you right now?",
      "When you sit with this, what does your body tell you?",
      "What would feel like enough progress today, not perfection?",
    ],
    synthesiser: [
      "How does this connect to something else you've been exploring?",
      "What pattern keeps showing up across your different domains?",
      "If you zoom out ten years, what thread ties your learning together?",
    ],
    historical_materialist: [
      "What systems made this outcome possible, and who benefited from those systems?",
      "Whose labour or sacrifice is invisible in the story you're telling?",
      "What material conditions had to exist for this to happen?",
    ],
    indigenous_knowledge: [
      "What relationship — to land, community, or ancestors — does this question touch?",
      "What do you owe, and what is owed to you, in this situation?",
      "How might seven generations from now view what you're learning now?",
    ],
    stoic: [
      "What is within your control here, and what isn't?",
      "What would acting with integrity look like, regardless of outcome?",
      "If this went badly, what virtue could you still practice?",
    ],
  };

  const pool = templates[ctx.voice] ?? templates.socratic;
  let q = pool[Math.floor(Math.random() * pool.length)];

  if (ctx.openQuestion && ctx.voice === "socratic") {
    q = `You asked: "${ctx.openQuestion.slice(0, 80)}${ctx.openQuestion.length > 80 ? "…" : ""}" — what's one true thing you've been avoiding about it?`;
  }
  if (ctx.perspectiveShifts && ctx.perspectiveShifts >= 3 && ctx.voice === "synthesiser") {
    q = "You've changed your mind several times already. What connects those shifts — is there a deeper question underneath?";
  }
  if (ctx.domains?.includes("How Society Works") && ctx.voice === "historical_materialist") {
    q = "Your work touches society and systems. What power dynamics are you not yet naming?";
  }

  return q;
}

export function generateQuestionExplanation(
  question: string,
  ctx: QuestionContext
): {
  reasoning: string;
  alternative_framings: string[];
  bias_flags: string[];
  source_frameworks: string[];
} {
  const voice = getVoice(ctx.voice);
  const reasoning = [
    `I asked this because your Cortex has ${ctx.entryCount ?? 0} entries`,
    ctx.perspectiveShifts ? `including ${ctx.perspectiveShifts} perspective shifts` : "",
    ctx.openQuestion ? `and your open question ("${ctx.openQuestion.slice(0, 60)}…") suggests unresolved curiosity` : "",
    `. The ${voice.label} voice is optimised to notice: ${voice.notices}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    reasoning,
    alternative_framings: [
      "What personal choices led to this outcome?",
      "What would someone who disagrees with you ask?",
      "What would you tell a friend in the same situation?",
    ],
    bias_flags: [voice.biases],
    source_frameworks: [voice.tradition],
  };
}
