-- Quests system
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  competency_tags text[] default '{}',
  difficulty integer not null check (difficulty between 1 and 5),
  xp_reward integer not null,
  time_limit_days integer,
  submission_type text not null check (submission_type in ('text','project_url','file','video_url','cortex_entry_id')),
  is_learner_defined boolean default false,
  is_published boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update on public.quests to authenticated;
grant all on public.quests to service_role;
alter table public.quests enable row level security;
create policy "quests read published" on public.quests for select to authenticated using (is_published = true or created_by = auth.uid());
create policy "quests create" on public.quests for insert to authenticated with check (auth.uid() = created_by);
create policy "quests update own" on public.quests for update to authenticated using (auth.uid() = created_by);

create table if not exists public.quest_submissions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_content text,
  submission_url text,
  storage_path text,
  cortex_entry_id uuid references public.cortex_entries(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted','under_review','passed','restorative')),
  ai_assessment_id uuid,
  mentor_feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update on public.quest_submissions to authenticated;
grant all on public.quest_submissions to service_role;
alter table public.quest_submissions enable row level security;
create policy "submissions read own" on public.quest_submissions for select to authenticated using (auth.uid() = user_id);
create policy "submissions create own" on public.quest_submissions for insert to authenticated with check (auth.uid() = user_id);
create policy "submissions update own" on public.quest_submissions for update to authenticated using (auth.uid() = user_id);

-- Seed some initial quests
insert into public.quests (title, description, competency_tags, difficulty, xp_reward, submission_type, is_published, created_by)
select * from (values
  ('First Perspective Shift', 'Document a time when your perspective changed fundamentally. What did you believe before? What do you believe now? What caused the shift?', ARRAY['epistemic_humility','critical_thinking'], 2, 50, 'text', true, null::uuid),
  ('Real-World Application', 'Take something you learned and apply it to solve a real problem. Document the problem, your approach, and the outcome.', ARRAY['application','problem_solving'], 3, 100, 'project_url', true, null::uuid),
  ('Teach Someone', 'Teach a concept you understand to someone else. Document how you explained it and what questions they asked.', ARRAY['communication','mastery'], 2, 75, 'text', true, null::uuid),
  ('Deep Dive Research', 'Choose a topic and research it deeply from multiple perspectives. Create a synthesis that shows understanding of different viewpoints.', ARRAY['research','synthesis'], 4, 150, 'cortex_entry_id', true, null::uuid),
  ('Build Something', 'Create something tangible - code, art, writing, a physical object. Document your process and what you learned.', ARRAY['creation','craft'], 3, 100, 'project_url', true, null::uuid)
) as v(title, description, competency_tags, difficulty, xp_reward, submission_type, is_published, created_by)
where not exists (select 1 from public.quests q where q.title = v.title);
