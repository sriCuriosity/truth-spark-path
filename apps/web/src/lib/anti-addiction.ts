import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "nexus_session_start";
const ACTIVITY_KEY = "nexus_session_actions";

export function trackSessionActivity(action: string) {
  if (typeof sessionStorage === "undefined") return;
  if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    sessionStorage.setItem(ACTIVITY_KEY, "0");
  }
  const count = Number(sessionStorage.getItem(ACTIVITY_KEY) ?? 0) + 1;
  sessionStorage.setItem(ACTIVITY_KEY, String(count));
  void action;
}

export type AddictionAlert = {
  type: "possible_grinding" | "health_concern";
  message: string;
};

export async function checkAddictionPatterns(userId: string): Promise<AddictionAlert | null> {
  if (typeof sessionStorage === "undefined") return null;

  const start = Number(sessionStorage.getItem(SESSION_KEY) ?? Date.now());
  const hours = (Date.now() - start) / (1000 * 60 * 60);
  const actions = Number(sessionStorage.getItem(ACTIVITY_KEY) ?? 0);

  if (hours >= 8 && actions > 20) {
    await logAlert(userId, "health_concern", { consecutive_hours: hours, actions });
    return {
      type: "health_concern",
      message: "You've been in NEXUS for a long stretch. Your body matters. Close this and go outside.",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("user_achievements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("earned_at", today.toISOString());

  const { count: entryCount } = await supabase
    .from("cortex_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", today.toISOString());

  if ((count ?? 0) >= 3 && (entryCount ?? 0) >= 8) {
    await logAlert(userId, "possible_grinding", { achievements_today: count, entries_today: entryCount });
    return {
      type: "possible_grinding",
      message: "You've been doing a lot. Are you chasing achievements, or chasing what matters to you?",
    };
  }

  return null;
}

async function logAlert(userId: string, alertType: string, pattern: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from("anti_addiction_alerts")
    .select("id")
    .eq("user_id", userId)
    .eq("alert_type", alertType)
    .eq("resolved", false)
    .gte("detected_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  if (existing) return;

  await supabase.from("anti_addiction_alerts").insert({
    user_id: userId,
    alert_type: alertType,
    detected_pattern: pattern,
    action_taken: "ai_nudge_sent",
  });
}
