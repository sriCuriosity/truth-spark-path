
-- PROFILES (avoid 'users' name to not collide with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text,
  avatar_url text,
  bio text,
  values text[] default '{}',
  open_questions text[] default '{}',
  current_tier text default 'seeker',
  tier_progress jsonb default '{}'::jsonb,
  onboarding_complete boolean default false,
  onboarding_phase text default 'deprogramming',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- CORTEX ENTRIES
create table public.cortex_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('action','perspective_shift','experiment','contribution','milestone','mentorship','collaboration')),
  title text not null,
  body text not null,
  outcome text,
  what_i_learned text,
  previous_belief text,
  new_belief text,
  domains text[] default '{}',
  is_public boolean default true,
  impact_count integer default 0,
  happened_at timestamptz,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.cortex_entries to authenticated;
grant all on public.cortex_entries to service_role;
alter table public.cortex_entries enable row level security;
create policy "owners read own" on public.cortex_entries for select to authenticated using (auth.uid() = user_id or is_public = true);
create policy "owners insert" on public.cortex_entries for insert to authenticated with check (auth.uid() = user_id);
create policy "owners update" on public.cortex_entries for update to authenticated using (auth.uid() = user_id);
create policy "owners delete" on public.cortex_entries for delete to authenticated using (auth.uid() = user_id);

-- EVIDENCE
create table public.cortex_evidence (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.cortex_entries(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  evidence_type text,
  title text,
  url text,
  file_key text,
  mime_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.cortex_evidence to authenticated;
grant all on public.cortex_evidence to service_role;
alter table public.cortex_evidence enable row level security;
create policy "evidence readable when entry readable" on public.cortex_evidence for select to authenticated
  using (exists (select 1 from public.cortex_entries e where e.id = entry_id and (e.user_id = auth.uid() or e.is_public = true)));
create policy "evidence owner write" on public.cortex_evidence for insert to authenticated with check (auth.uid() = user_id);
create policy "evidence owner mod" on public.cortex_evidence for update to authenticated using (auth.uid() = user_id);
create policy "evidence owner del" on public.cortex_evidence for delete to authenticated using (auth.uid() = user_id);

-- PEER VALIDATIONS
create table public.peer_validations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.cortex_entries(id) on delete cascade,
  validator_id uuid references public.profiles(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  validation_text text not null,
  specific_aspect text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.peer_validations to authenticated;
grant all on public.peer_validations to service_role;
alter table public.peer_validations enable row level security;
create policy "peer val read" on public.peer_validations for select to authenticated using (true);
create policy "peer val insert" on public.peer_validations for insert to authenticated with check (auth.uid() = validator_id);

-- WELLBEING
create table public.wellbeing_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  emotion text,
  energy_level smallint check (energy_level between 1 and 10),
  body_note text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.wellbeing_checkins to authenticated;
grant all on public.wellbeing_checkins to service_role;
alter table public.wellbeing_checkins enable row level security;
create policy "own wellbeing" on public.wellbeing_checkins for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ACHIEVEMENTS
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  achievement_type text,
  rarity text,
  particle_colour text
);
grant select on public.achievements to authenticated, anon;
grant all on public.achievements to service_role;
alter table public.achievements enable row level security;
create policy "ach public read" on public.achievements for select using (true);

insert into public.achievements (slug, name, description, achievement_type, rarity, particle_colour) values
('first-mark','First Mark','Your story begins.','cortex','common','#3ECFB2'),
('honest-failure','Honest Failure','The best learners fail openly.','cortex','common','#F5A623'),
('shape-shifter','Shape-Shifter','You changed your mind. That takes courage.','cortex','uncommon','#7C6EF5'),
('deep-diver','Deep Diver','10 entries. Your Cortex is alive.','cortex','uncommon','#3ECFB2'),
('first-ripple','First Ripple','Your work reached someone else.','community','uncommon','#4ADE80'),
('brave-question','Brave Question','You asked what others were afraid to.','epistemic','rare','#F5A623');

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id uuid references public.achievements(id) on delete cascade,
  context_data jsonb,
  earned_at timestamptz default now(),
  unique (user_id, achievement_id)
);
grant select, insert, update, delete on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;
alter table public.user_achievements enable row level security;
create policy "ua read own" on public.user_achievements for select to authenticated using (auth.uid() = user_id);
create policy "ua insert own" on public.user_achievements for insert to authenticated with check (auth.uid() = user_id);

-- TRUTH SPIKES
create table public.truth_spikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  insight_text text,
  connection_type text,
  external_source text,
  delivered_at timestamptz default now(),
  opened_at timestamptz
);
grant select, insert, update, delete on public.truth_spikes to authenticated;
grant all on public.truth_spikes to service_role;
alter table public.truth_spikes enable row level security;
create policy "spikes own" on public.truth_spikes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- LEARNING CIRCLES
create table public.learning_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.learning_circles to authenticated;
grant all on public.learning_circles to service_role;
alter table public.learning_circles enable row level security;
create policy "circles read" on public.learning_circles for select to authenticated using (true);
create policy "circles create" on public.learning_circles for insert to authenticated with check (auth.uid() = created_by);

create table public.circle_members (
  circle_id uuid references public.learning_circles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (circle_id, user_id)
);
grant select, insert, delete on public.circle_members to authenticated;
grant all on public.circle_members to service_role;
alter table public.circle_members enable row level security;
create policy "cm read" on public.circle_members for select to authenticated using (true);
create policy "cm join self" on public.circle_members for insert to authenticated with check (auth.uid() = user_id);
create policy "cm leave self" on public.circle_members for delete to authenticated using (auth.uid() = user_id);

-- CHAMBER (private journal)
create table public.chamber_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  content text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update, delete on public.chamber_entries to authenticated;
grant all on public.chamber_entries to service_role;
alter table public.chamber_entries enable row level security;
create policy "chamber own" on public.chamber_entries for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text,
  title text,
  body text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
