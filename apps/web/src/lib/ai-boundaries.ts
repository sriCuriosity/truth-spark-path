import { supabase } from "@/integrations/supabase/client";

export const AI_CAN_DO = [
  "Ask Socratic questions that promote reflection",
  "Detect when a student seems disengaged and gently inquire",
  "Suggest human connection when distress is detected",
  "Surface patterns in the student's own documented learning journey",
  "Encourage use of The Chamber for private reflection",
  "Provide information about mental health resources when asked",
] as const;

export const AI_MUST_NEVER_DO = [
  "Diagnose any mental health condition",
  "Provide therapeutic treatment or claim to be therapeutic",
  "Attempt to replace human connection with AI interaction",
  "Frame emotional states as problems to be solved",
  "Use clinical language without the student using it first",
  "Continue a clearly therapeutic conversation without offering human connection referral",
  "Store or analyse Chamber content",
] as const;

export type EscalationTrigger = "self_harm_language" | "harm_to_others_language" | "sustained_distress" | "explicit_request_for_therapist";

const SELF_HARM_PATTERNS = [
  /\b(kill myself|suicide|end my life|want to die|self[- ]?harm|hurt myself)\b/i,
  /\b(no reason to (live|go on)|better off dead)\b/i,
];

const HARM_OTHERS_PATTERNS = [
  /\b(hurt (them|him|her)|kill (them|him|her)|attack (them|him|her))\b/i,
];

const THERAPIST_REQUEST = /\b(therapist|counsell?or|psychiatrist|need (help|someone to talk))\b/i;

export function detectEscalation(message: string, recentLowEnergy?: boolean): EscalationTrigger | null {
  if (SELF_HARM_PATTERNS.some((p) => p.test(message))) return "self_harm_language";
  if (HARM_OTHERS_PATTERNS.some((p) => p.test(message))) return "harm_to_others_language";
  if (THERAPIST_REQUEST.test(message)) return "explicit_request_for_therapist";
  if (recentLowEnergy && /\b(heavy|hopeless|empty|can't cope|overwhelmed)\b/i.test(message)) {
    return "sustained_distress";
  }
  return null;
}

export function warmHandoffResponse(trigger: EscalationTrigger, name?: string): string {
  const greeting = name ? `${name}, ` : "";
  switch (trigger) {
    case "self_harm_language":
      return `${greeting}You matter. What you're feeling is real. You are not alone. I'm an AI — I can ask questions, but I can't be the person who sits with you through hard things. Would you like crisis helpline numbers for your region, or to keep doing what we're doing? The Chamber is always there. A human friend is better than me.`;
    case "harm_to_others_language":
      return `${greeting}I'm hearing something that concerns me. If you're in immediate danger or thinking of harming someone, please contact local emergency services. NEXUS can connect you with a human facilitator if you'd like to talk through what's happening.`;
    case "explicit_request_for_therapist":
      return `${greeting}I'm glad you're reaching out. I'm not a therapist — but I can show you vetted crisis lines and peer support resources. Would you like me to list what's available in your region?`;
    case "sustained_distress":
      return `${greeting}I've noticed your recent entries have been heavier than usual. I'm an AI — I can ask questions, but I can't sit with you through hard things. Would you like to: (A) see crisis helplines, (B) connect with a peer, (C) keep going as we are, or (D) I'll back off. You don't have to choose. The Chamber is always there.`;
  }
}

// Wire safety checks to call the NVIDIA reasoning model via the server-side proxy
export async function checkSafetyHarm(message: string): Promise<{ isHarmful: boolean; category?: string; reasoning?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("llm-proxy", {
      body: {
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        messages: [
          {
            role: "system",
            content: "You are a safety classification filter. Analyze the user's message. Output JSON only. Format: {\"isHarmful\": boolean, \"category\": \"self_harm\" | \"harm_to_others\" | \"harassment\" | \"hate_speech\" | \"none\", \"reasoning\": string}."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.1
      }
    });

    if (error) throw error;
    
    const choice = data?.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(choice.replace(/```json/g, "").replace(/```/g, "").trim());
      return {
        isHarmful: !!parsed.isHarmful,
        category: parsed.category,
        reasoning: parsed.reasoning
      };
    } catch {
      // Regex parsing fallback
      const isHarmful = /"isHarmful":\s*true/i.test(choice) || /self_harm|harm_to_others/i.test(choice);
      return { isHarmful };
    }
  } catch (e) {
    console.error("Safety check invocation error:", e);
    return { isHarmful: false };
  }
}
