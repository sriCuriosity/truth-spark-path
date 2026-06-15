-- Credentials table
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('mastery_badge','ima_certificate','milestone')),
  title text not null,
  description text,
  competency_tags text[] default '{}',
  issuer_did text not null,
  credential_json jsonb not null,
  storage_path text,
  is_revoked boolean default false,
  issued_at timestamptz default now()
);
grant select, insert on public.credentials to authenticated;
grant all on public.credentials to service_role;
alter table public.credentials enable row level security;
create policy "credentials read own" on public.credentials for select to authenticated using (auth.uid() = user_id);
create policy "credentials create own" on public.credentials for insert to authenticated with check (auth.uid() = user_id);

-- AI Assessments table
create table if not exists public.ai_assessments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.quest_submissions(id) on delete set null,
  entry_id uuid references public.cortex_entries(id) on delete set null,
  model_version text not null,
  prompt_hash text not null,        -- SHA-256 of the prompt sent
  dimension_scores jsonb not null,  -- { depth, creativity, emotional_intelligence, real_world_application, self_authorship }
  narrative_feedback text not null,
  evidence_gaps text[],
  confidence float not null check (confidence between 0 and 1),
  contested boolean default false,
  contested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
grant select, insert, update on public.ai_assessments to authenticated;
grant all on public.ai_assessments to service_role;
alter table public.ai_assessments enable row level security;
create policy "ai_assessments read own" on public.ai_assessments for select to authenticated using (true);

-- IMA (Integral Mastery Assessment) system
create table if not exists public.ima_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cortex_entry_ids uuid[] default '{}',
  self_reflection text,
  assessor_id uuid references public.profiles(id) on delete set null,
  ai_assessment_id uuid references public.ai_assessments(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','passed','restorative')),
  final_score jsonb,
  credential_id uuid references public.credentials(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update on public.ima_assessments to authenticated;
grant all on public.ima_assessments to service_role;
alter table public.ima_assessments enable row level security;
create policy "ima read own" on public.ima_assessments for select to authenticated using (auth.uid() = user_id);
create policy "ima create own" on public.ima_assessments for insert to authenticated with check (auth.uid() = user_id);
create policy "ima update own" on public.ima_assessments for update to authenticated using (auth.uid() = user_id);
