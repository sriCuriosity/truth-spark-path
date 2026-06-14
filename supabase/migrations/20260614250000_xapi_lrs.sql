-- xAPI LRS (Learning Record Store) - additional functions
-- Note: xapi_statements table already exists in the initial schema

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
  if p_actor ? 'account' ? 'homePage' like 'nexus%' then
    select id into v_user_id from public.profiles 
    where handle = split_part(p_actor->'account'->'name', '@', 1)
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
  timestamp timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    id, actor, verb, object, result, context, timestamp
  from public.xapi_statements
  where 
    (p_user_id is null or user_id = p_user_id)
    and (p_verb is null or verb->>'id' = p_verb)
  order by timestamp desc
  limit p_limit;
end;
$$;

grant execute on function public.query_xapi_statements to authenticated;
grant execute on function public.query_xapi_statements to service_role;
