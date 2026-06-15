import { supabase } from "@/integrations/supabase/client";

export const TIERS = [
  { name: "seeker", label: "Seeker", minXp: 0 },
  { name: "explorer", label: "Explorer", minXp: 500 },
  { name: "builder", label: "Builder", minXp: 2000 },
  { name: "contributor", label: "Contributor", minXp: 5000 },
  { name: "architect", label: "Architect", minXp: 10000 },
] as const;

export type TierName = (typeof TIERS)[number]["name"];

export const XP_SOURCES = {
  cortex_entry_created: 10,
  evidence_attached: 5,
  peer_validation_received: 20,
  peer_validation_given: 15,
  socratic_reflection: 2,
} as const;

export function tierForXp(xp: number): TierName {
  let current: TierName = "seeker";
  for (const t of TIERS) {
    if (xp >= t.minXp) current = t.name;
  }
  return current;
}

export function nextTier(current: TierName): (typeof TIERS)[number] | null {
  const idx = TIERS.findIndex((t) => t.name === current);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function tierProgress(xp: number, current: TierName): number {
  const tier = TIERS.find((t) => t.name === current) ?? TIERS[0];
  const nxt = nextTier(current);
  if (!nxt) return 100;
  const range = nxt.minXp - tier.minXp;
  const progress = xp - tier.minXp;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

export type TierUnlockResult = {
  xpAwarded: number;
  totalXp: number;
  previousTier: TierName;
  currentTier: TierName;
  tierChanged: boolean;
};

export async function awardXp(
  userId: string,
  source: keyof typeof XP_SOURCES,
  referenceId?: string
): Promise<TierUnlockResult> {
  const amount = XP_SOURCES[source];

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, current_tier")
    .eq("id", userId)
    .maybeSingle();

  const previousXp = profile?.total_xp ?? 0;
  const previousTier = (profile?.current_tier ?? "seeker") as TierName;
  const totalXp = previousXp + amount;
  const currentTier = tierForXp(totalXp);
  const tierChanged = currentTier !== previousTier;

  await (supabase as any).from("xp_ledger").insert({
    user_id: userId,
    amount,
    source,
    reference_id: referenceId ?? null,
  });


  await supabase
    .from("profiles")
    .update({ total_xp: totalXp, current_tier: currentTier })
    .eq("id", userId);

  if (tierChanged) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "tier_quiet",
      title: `You've reached ${currentTier} tier`,
      body: "This reflects the real things you've done. The tier is just a mirror. You are what you did.",
      link: "/dashboard",
    });
  }

  return { xpAwarded: amount, totalXp, previousTier, currentTier, tierChanged };
}

export function shouldShowTier(visibility: string | null | undefined): boolean {
  return visibility !== "hidden";
}

export function shouldShowTierToCommunity(visibility: string | null | undefined): boolean {
  return visibility === "full";
}
