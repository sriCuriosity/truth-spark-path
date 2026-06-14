-- USER INTEGRATIONS
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  platform text not null,
  is_connected boolean default false,
  scopes_granted text[] default '{}',
  data_types_consented text[] default '{}',
  auto_suggest boolean default true,
  auto_add boolean default false,
  last_synced timestamptz,
  connected_at timestamptz default now(),
  unique(user_id, platform)
);
grant select, insert, update, delete on public.user_integrations to authenticated;
grant all on public.user_integrations to service_role;
alter table public.user_integrations enable row level security;
create policy "own integrations" on public.user_integrations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CORTEX SUGGESTIONS
create table public.cortex_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  platform text not null,
  suggestion_type text not null,
  title text not null,
  body text,
  domains text[] default '{}',
  evidence_data jsonb default '{}',
  ai_summary text,
  status text default 'pending' check (status in ('pending','accepted','discarded')),
  source_url text,
  created_at timestamptz default now(),
  actioned_at timestamptz
);
grant select, insert, update, delete on public.cortex_suggestions to authenticated;
grant all on public.cortex_suggestions to service_role;
alter table public.cortex_suggestions enable row level security;
create policy "own suggestions" on public.cortex_suggestions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- EXTERNAL ACTIVITY LOG
create table public.external_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  platform text,
  activity_type text,
  raw_metadata jsonb default '{}',
  processed boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.external_activity_log to authenticated;
grant all on public.external_activity_log to service_role;
alter table public.external_activity_log enable row level security;
create policy "own activity log" on public.external_activity_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- API TOKENS
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  token_hash text unique not null,
  label text,
  last_used timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.api_tokens to authenticated;
grant all on public.api_tokens to service_role;
alter table public.api_tokens enable row level security;
create policy "own tokens" on public.api_tokens for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
