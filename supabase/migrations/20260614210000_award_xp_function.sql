-- XP award function
create or replace function public.award_xp(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_reference_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_xp_id uuid;
begin
  insert into public.xp_ledger (user_id, amount, source, reference_id, metadata)
  values (p_user_id, p_amount, p_source, p_reference_id, p_metadata)
  returning id into v_xp_id;
  
  return v_xp_id;
end;
$$;

grant execute on function public.award_xp to authenticated;
grant execute on function public.award_xp to service_role;
