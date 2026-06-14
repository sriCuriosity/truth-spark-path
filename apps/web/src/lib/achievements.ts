import { supabase } from "@/integrations/supabase/client";

export type AchievementResult = { slug: string; name: string; description: string | null; particle_colour: string | null };

export async function checkAchievements(userId: string, newEntryTitle: string): Promise<AchievementResult[]> {
  const { data: entries } = await supabase.from("cortex_entries").select("entry_type").eq("user_id", userId);
  if (!entries) return [];

  const { data: existing } = await supabase
    .from("user_achievements")
    .select("achievement:achievements(slug)")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r: any) => r.achievement?.slug).filter(Boolean));

  const toAward: string[] = [];
  if (entries.length >= 1 && !have.has("first-mark")) toAward.push("first-mark");
  if (entries.some((e) => e.entry_type === "experiment") && !have.has("honest-failure")) toAward.push("honest-failure");
  if (entries.filter((e) => e.entry_type === "perspective_shift").length >= 3 && !have.has("shape-shifter")) toAward.push("shape-shifter");
  if (entries.length >= 10 && !have.has("deep-diver")) toAward.push("deep-diver");

  if (toAward.length === 0) return [];

  const { data: ach } = await supabase.from("achievements").select("id, slug, name, description, particle_colour").in("slug", toAward);
  if (!ach) return [];

  await supabase.from("user_achievements").insert(
    ach.map((a) => ({ user_id: userId, achievement_id: a.id, context_data: { entry_title: newEntryTitle } }))
  );

  // emit notifications
  await supabase.from("notifications").insert(
    ach.map((a) => ({ user_id: userId, type: "achievement", title: `Achievement: ${a.name}`, body: a.description, link: "/cortex" }))
  );

  return ach.map((a) => ({ slug: a.slug, name: a.name, description: a.description, particle_colour: a.particle_colour }));
}
