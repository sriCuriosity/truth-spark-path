-- xAPI LRS (Learning Record Store) table and functions

-- Create xapi_statements table if it does not exist
create table if not exists public.xapi_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor jsonb not null,
  verb jsonb not null,
  object jsonb not null,
  result jsonb,
  context jsonb,
  "timestamp" timestamptz not null default now(),
  stored_at timestamptz default now()
);
grant select, insert, update on public.xapi_statements to authenticated;
grant all on public.xapi_statements to service_role;
alter table public.xapi_statements enable row level security;
create policy "xapi_statements read own" on public.xapi_statements for select to authenticated using (auth.uid() = user_id);
create policy "xapi_statements insert own" on public.xapi_statements for insert to authenticated with check (auth.uid() = user_id);

-- Function to ingest xAPI statements
create or replace function public.ingest_xapi_statement(
  p_actor jsonb,
  p_verb jsonb,
  p_object jsonb,
  p_result jsonb default null,
  p_context jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_statement_id uuid;
  v_user_id uuid;
begin
  -- Try to extract user_id from actor if it's a NEXUS user
  if p_actor ? 'account' and p_actor->'account' ? 'homePage' and (p_actor->'account'->>'homePage') like 'nexus%' then
    select id into v_user_id from public.profiles 
    where handle = split_part(p_actor->'account'->>'name', '@', 1)
    limit 1;
  end if;

  insert into public.xapi_statements (user_id, actor, verb, object, result, context)
  values (v_user_id, p_actor, p_verb, p_object, p_result, p_context)
  returning id into v_statement_id;
  
  return v_statement_id;
end;
$$;

grant execute on function public.ingest_xapi_statement to authenticated;
grant execute on function public.ingest_xapi_statement to service_role;

-- Function to query xAPI statements
create or replace function public.query_xapi_statements(
  p_user_id uuid default null,
  p_verb text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  actor jsonb,
  verb jsonb,
  object jsonb,
  result jsonb,
  context jsonb,
  "timestamp" timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    x.id, x.actor, x.verb, x.object, x.result, x.context, x."timestamp"
  from public.xapi_statements x
  where 
    (p_user_id is null or x.user_id = p_user_id)
    and (p_verb is null or x.verb->>'id' = p_verb)
  order by x."timestamp" desc
  limit p_limit;
end;
$$;

grant execute on function public.query_xapi_statements to authenticated;
grant execute on function public.query_xapi_statements to service_role;
