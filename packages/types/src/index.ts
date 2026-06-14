// Shared TypeScript types for NEXUS

export type AIVoiceId = 'socratic' | 'provocateur' | 'gentle_nurturer' | 'synthesiser' | 'historical_materialist' | 'indigenous_knowledge' | 'stoic';

export interface Profile {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  values: string[];
  open_questions: string[];
  current_tier: string;
  tier_progress: Record<string, unknown>;
  onboarding_complete: boolean;
  onboarding_phase: string;
  created_at: string;
  updated_at: string;
}

export interface CortexEntry {
  id: string;
  user_id: string;
  entry_type: 'action' | 'perspective_shift' | 'experiment' | 'contribution' | 'milestone' | 'mentorship' | 'collaboration';
  title: string;
  body: string;
  outcome: string | null;
  what_i_learned: string | null;
  previous_belief: string | null;
  new_belief: string | null;
  domains: string[];
  is_public: boolean;
  impact_count: number;
  happened_at: string | null;
  created_at: string;
}

export interface CortexEvidence {
  id: string;
  entry_id: string;
  user_id: string;
  evidence_type: string;
  title: string | null;
  url: string | null;
  file_key: string | null;
  mime_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PeerValidation {
  id: string;
  entry_id: string;
  validator_id: string;
  owner_id: string;
  validation_text: string;
  specific_aspect: string | null;
  created_at: string;
}

export interface WellbeingCheckin {
  id: string;
  user_id: string;
  emotion: string | null;
  energy_level: number | null;
  body_note: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  achievement_type: string | null;
  rarity: string | null;
  particle_colour: string | null;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  context_data: Record<string, unknown> | null;
  earned_at: string;
}

export interface TruthSpike {
  id: string;
  user_id: string;
  title: string | null;
  insight_text: string | null;
  connection_type: string | null;
  external_source: string | null;
  delivered_at: string;
  opened_at: string | null;
}

export interface LearningCircle {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CircleMember {
  circle_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChamberEntry {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}
