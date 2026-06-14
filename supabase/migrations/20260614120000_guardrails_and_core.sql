-- Failure mode mitigations + core NEXUS tables (instructions.md + copilot spec)

-- Profile guardrail columns
alter table public.profiles
  add column if not exists total_xp integer default 0,
  add column if not exists tier_visibility text default 'full'
    check (tier_visibility in ('full', 'self_only', 'hidden', 'milestones')),
  add column if not exists preferred_ai_voice text default 'socratic',
  add column if not exists ai_voice_history jsonb default '[]'::jsonb,
  add column if not exists safety_preferences jsonb default '{
    "crisis_helpline_visible": true,
    "peer_support_circle_accessible": true,
    "ai_can_suggest_human_connection_when_distressed": true,
    "trusted_contact_notification": false,
    "trusted_contact_email": null
  }'::jsonb,
  add column if not exists content_preferences jsonb default '{
    "show_warnings": true,
    "auto_skip_intense": false,
    "sensitivity_threshold": "moderate",
    "support_resource_visible": true,
    "pause_after_intense_content": true
  }'::jsonb,
  add column if not exists sovereignty_settings jsonb default '{"ai_feedback": true, "public_cortex": false}'::jsonb;

-- XP ledger (append-only)
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  source text not null,
  reference_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
grant select on public.xp_ledger to authenticated;
grant all on public.xp_ledger to service_role;
alter table public.xp_ledger enable row level security;
create policy "xp read own" on public.xp_ledger for select to authenticated using (auth.uid() = user_id);

-- AI audit log (append-only)
create table if not exists public.ai_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  function_name text not null,
  model text not null default 'rule-based',
  prompt_hash text not null default 'local',
  action_description text not null,
  created_at timestamptz default now()
);
grant select, insert on public.ai_audit_log to authenticated;
grant all on public.ai_audit_log to service_role;
alter table public.ai_audit_log enable row level security;
create policy "audit read own" on public.ai_audit_log for select to authenticated using (auth.uid() = user_id);
create policy "audit insert own" on public.ai_audit_log for insert to authenticated with check (auth.uid() = user_id);

-- AI interactions (Socratic questions)
create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  voice text not null default 'socratic',
  question_text text not null,
  context_summary text,
  created_at timestamptz default now()
);
grant select, insert on public.ai_interactions to authenticated;
grant all on public.ai_interactions to service_role;
alter table public.ai_interactions enable row level security;
create policy "ai int own" on public.ai_interactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI question explanations ("Why this question?")
create table if not exists public.ai_question_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.ai_interactions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  question_text text not null,
  reasoning text not null,
  alternative_framings text[] default '{}',
  bias_flags text[] default '{}',
  source_frameworks text[] default '{}',
  generated_at timestamptz default now()
);
grant select, insert on public.ai_question_explanations to authenticated;
grant all on public.ai_question_explanations to service_role;
alter table public.ai_question_explanations enable row level security;
create policy "ai explain own" on public.ai_question_explanations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anti-addiction alerts
create table if not exists public.anti_addiction_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  alert_type text check (alert_type in ('possible_grinding', 'health_concern', 'extrinsic_dependency_forming')),
  detected_pattern jsonb,
  action_taken text,
  resolved boolean default false,
  detected_at timestamptz default now(),
  resolved_at timestamptz
);
grant select, insert, update on public.anti_addiction_alerts to authenticated;
grant all on public.anti_addiction_alerts to service_role;
alter table public.anti_addiction_alerts enable row level security;
create policy "addiction own" on public.anti_addiction_alerts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Restorative justice
create table if not exists public.community_harm_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  harm_type text check (harm_type in ('harassment', 'threat', 'exploitation', 'self_harm_risk')),
  description text not null,
  evidence_links text[] default '{}',
  status text default 'submitted',
  resolution_type text,
  resolution_notes text,
  submitted_at timestamptz default now(),
  resolved_at timestamptz
);
grant select, insert on public.community_harm_reports to authenticated;
grant all on public.community_harm_reports to service_role;
alter table public.community_harm_reports enable row level security;
create policy "harm report insert" on public.community_harm_reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "harm report read own" on public.community_harm_reports for select to authenticated using (auth.uid() = reporter_id);

create table if not exists public.restorative_dialogues (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.community_harm_reports(id) on delete cascade,
  participant_id uuid references public.profiles(id) on delete set null,
  participant_role text,
  dialogue_text text not null,
  outcome_notes text,
  created_at timestamptz default now()
);
grant select on public.restorative_dialogues to authenticated;
grant all on public.restorative_dialogues to service_role;
alter table public.restorative_dialogues enable row level security;
create policy "dialogue read reporter" on public.restorative_dialogues for select to authenticated
  using (exists (select 1 from public.community_harm_reports r where r.id = report_id and r.reporter_id = auth.uid()));

create table if not exists public.interaction_restrictions (
  id uuid primary key default gen_random_uuid(),
  restricted_user_id uuid references public.profiles(id) on delete cascade,
  restriction_type text,
  related_report_id uuid references public.community_harm_reports(id) on delete set null,
  reason text not null,
  duration_hours integer,
  reviewed boolean default false,
  applied_at timestamptz default now(),
  expires_at timestamptz,
  lifted_at timestamptz
);
grant select on public.interaction_restrictions to authenticated;
grant all on public.interaction_restrictions to service_role;
alter table public.interaction_restrictions enable row level security;
create policy "restrictions read own" on public.interaction_restrictions for select to authenticated using (auth.uid() = restricted_user_id);

-- Content sensitivity
create table if not exists public.content_sensitivity_tags (
  id uuid primary key default gen_random_uuid(),
  content_node_id text not null,
  tag_type text not null,
  intensity text default 'moderate' check (intensity in ('mild', 'moderate', 'intense')),
  opt_in_required boolean default false,
  support_resources text[] default '{}',
  advisory_text text not null
);
grant select on public.content_sensitivity_tags to authenticated, anon;
grant all on public.content_sensitivity_tags to service_role;
alter table public.content_sensitivity_tags enable row level security;
create policy "sensitivity public read" on public.content_sensitivity_tags for select using (true);

-- Guardian connections
create table if not exists public.guardian_connections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  guardian_email varchar(255),
  relationship text,
  overview_access boolean default true,
  content_preview boolean default true,
  veto_power boolean default false,
  connected_at timestamptz default now(),
  student_consented boolean default false,
  unique (student_id, guardian_email)
);
grant select, insert, update on public.guardian_connections to authenticated;
grant all on public.guardian_connections to service_role;
alter table public.guardian_connections enable row level security;
create policy "guardian own" on public.guardian_connections for all to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- Mental health resources
create table if not exists public.mental_health_resources (
  id uuid primary key default gen_random_uuid(),
  country_code varchar(2),
  language varchar(10) default 'en',
  resource_type text,
  organisation varchar(255),
  contact_info text not null,
  cost varchar(20) default 'free',
  vetted_by varchar(100),
  last_verified date,
  is_active boolean default true
);
grant select on public.mental_health_resources to authenticated, anon;
grant all on public.mental_health_resources to service_role;
alter table public.mental_health_resources enable row level security;
create policy "mh resources public" on public.mental_health_resources for select using (is_active = true);

-- AI escalation log
create table if not exists public.ai_escalation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  trigger_type text,
  ai_response text not null,
  resources_offered text[] default '{}',
  user_response text,
  outcome text,
  flagged_for_review boolean default false,
  created_at timestamptz default now()
);
grant select, insert on public.ai_escalation_log to authenticated;
grant all on public.ai_escalation_log to service_role;
alter table public.ai_escalation_log enable row level security;
create policy "escalation own" on public.ai_escalation_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mentor quality
create table if not exists public.mentor_development (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid unique references public.profiles(id) on delete cascade,
  development_phase text default 'onboarding',
  co_mentor_partner_id uuid references public.profiles(id) on delete set null,
  completed_modules text[] default '{}',
  mentor_covenant_accepted boolean default false,
  covenant_accepted_at timestamptz,
  solo_eligible boolean default false,
  solo_approved_at timestamptz
);
grant select, insert, update on public.mentor_development to authenticated;
grant all on public.mentor_development to service_role;
alter table public.mentor_development enable row level security;
create policy "mentor dev own" on public.mentor_development for all to authenticated using (auth.uid() = mentor_id) with check (auth.uid() = mentor_id);

create table if not exists public.mentor_feedback (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references public.profiles(id) on delete cascade,
  mentee_id uuid references public.profiles(id) on delete cascade,
  mentorship_id uuid,
  feedback_text text not null,
  what_helped text,
  what_could_improve text,
  would_recommend boolean,
  visible_to text default 'mentor_only',
  created_at timestamptz default now()
);
grant select, insert on public.mentor_feedback to authenticated;
grant all on public.mentor_feedback to service_role;
alter table public.mentor_feedback enable row level security;
create policy "mf insert mentee" on public.mentor_feedback for insert to authenticated with check (auth.uid() = mentee_id);
create policy "mf read mentor" on public.mentor_feedback for select to authenticated using (auth.uid() = mentor_id or auth.uid() = mentee_id);

-- Institutional licenses (funding model)
create table if not exists public.institutional_licenses (
  id uuid primary key default gen_random_uuid(),
  organisation_name varchar(255) not null,
  organisation_type text,
  license_tier text,
  max_learners integer,
  active_learners integer default 0,
  features jsonb default '{}'::jsonb,
  annual_fee_usd integer,
  contract_start date,
  contract_end date,
  auto_renew boolean default true,
  created_at timestamptz default now()
);
grant select on public.institutional_licenses to authenticated;
grant all on public.institutional_licenses to service_role;
alter table public.institutional_licenses enable row level security;
create policy "institutional read" on public.institutional_licenses for select to authenticated using (true);

-- Community question wall
create table if not exists public.community_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_text text not null,
  domain text,
  created_at timestamptz default now()
);
grant select, insert on public.community_questions to authenticated;
grant all on public.community_questions to service_role;
alter table public.community_questions enable row level security;
create policy "questions read" on public.community_questions for select to authenticated using (true);
create policy "questions insert own" on public.community_questions for insert to authenticated with check (auth.uid() = user_id);

-- Seed content sensitivity tags for sensitive domains
insert into public.content_sensitivity_tags (content_node_id, tag_type, intensity, opt_in_required, support_resources, advisory_text)
select * from (values
  ('embodiment-wellbeing', 'sexual_content', 'moderate', false, ARRAY['https://www.who.int/health-topics/sexual-health', 'Chamber for private reflection']::text[], 'This domain includes sexuality and body awareness topics. Content is age-appropriate and consent-focused — included to build literacy, not shock.'),
  ('embodiment-wellbeing', 'existential_distress', 'intense', true, ARRAY['iCall: 9152987821', 'Chamber for private reflection']::text[], 'Some modules discuss death, mortality, and meaning. This can be emotionally difficult. Take your time; you can skip and return later.'),
  ('how-society-works', 'historical_atrocity', 'moderate', false, ARRAY['Chamber for reflection', 'Learning Circle peer support']::text[], 'This domain examines caste, colonialism, and structural violence. Understanding how harm is manufactured is essential to preventing it — not included to shock.')
) as v(content_node_id, tag_type, intensity, opt_in_required, support_resources, advisory_text)
where not exists (select 1 from public.content_sensitivity_tags t where t.content_node_id = v.content_node_id and t.tag_type = v.tag_type);

-- Seed mental health resources (India-focused per SRS data residency)
insert into public.mental_health_resources (country_code, language, resource_type, organisation, contact_info, cost, vetted_by, last_verified)
select * from (values
  ('IN', 'en', 'crisis_helpline', 'iCall (TISS)', '9152987821 — Mon-Sat 8am-10pm', 'free', 'NEXUS advisory', current_date),
  ('IN', 'en', 'crisis_helpline', 'Vandrevala Foundation', '1860-2662-345 or 9999-666-555 — 24/7', 'free', 'NEXUS advisory', current_date),
  ('IN', 'en', 'crisis_helpline', 'Kiran Mental Health', '1800-599-0019 — 24/7', 'free', 'NEXUS advisory', current_date),
  ('IN', 'hi', 'crisis_helpline', 'AASRA', '91-9820466726 — 24/7', 'free', 'NEXUS advisory', current_date)
) as v(country_code, language, resource_type, organisation, contact_info, cost, vetted_by, last_verified)
where not exists (select 1 from public.mental_health_resources m where m.organisation = v.organisation);
