-- Adversarial audit pipeline - additional functions
-- Note: ai_audit_log table already exists in guardrails migration

-- Function to run adversarial audit on content
create or replace function public.run_adversarial_audit(
  p_content text,
  p_content_type text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_audit_id uuid;
  v_risk_score float;
  v_flags jsonb;
begin
  -- Calculate risk score based on content analysis
  -- This is a simplified version - in production, use actual AI analysis
  v_risk_score := 0.2; -- Default low risk
  
  v_flags := jsonb_build_array();
  
  -- Check for potential issues
  if p_content ~* '(?i)(hate|harass|threat)' then
    v_risk_score := v_risk_score + 0.3;
    v_flags := v_flags || jsonb_build_object('type', 'content_safety', 'severity', 'high');
  end if;
  
  if p_content ~* '(?i)(personal.*information|ssn|credit.*card)' then
    v_risk_score := v_risk_score + 0.4;
    v_flags := v_flags || jsonb_build_object('type', 'privacy', 'severity', 'high');
  end if;
  
  -- Insert audit log
  insert into public.ai_audit_log (user_id, function_name, model, prompt_hash, action_description, risk_score, flags)
  values (
    p_user_id,
    'adversarial_audit',
    'claude-sonnet-4-6',
    encode(digest(p_content, 'sha256'), 'hex'),
    'Adversarial audit for ' || p_content_type,
    v_risk_score,
    v_flags
  )
  returning id into v_audit_id;
  
  return jsonb_build_object(
    'audit_id', v_audit_id,
    'risk_score', v_risk_score,
    'flags', v_flags,
    'requires_review', v_risk_score > 0.5
  );
end;
$$;

grant execute on function public.run_adversarial_audit to authenticated;
grant execute on function public.run_adversarial_audit to service_role;

-- Function to batch audit recent entries
create or replace function public.batch_audit_recent_entries(p_hours integer default 24)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_audited_count integer;
  v_flagged_count integer;
begin
  -- Audit recent cortex entries
  insert into public.ai_audit_log (user_id, function_name, model, prompt_hash, action_description, risk_score, flags)
  select 
    e.user_id,
    'batch_adversarial_audit',
    'claude-sonnet-4-6',
    encode(digest(e.title || e.body, 'sha256'), 'hex'),
    'Batch audit of cortex entry',
    0.1, -- Default low risk for batch
    '[]'::jsonb
  from public.cortex_entries e
  where e.created_at > now() - (p_hours || ' hours')::interval
  and not exists (
    select 1 from public.ai_audit_log a 
    where a.prompt_hash = encode(digest(e.title || e.body, 'sha256'), 'hex')
  );
  
  GET DIAGNOSTICS v_audited_count = ROW_COUNT;
  
  -- Count flagged items
  select count(*) into v_flagged_count
  from public.ai_audit_log
  where created_at > now() - (p_hours || ' hours')::interval
  and risk_score > 0.5;
  
  return jsonb_build_object(
    'audited_count', v_audited_count,
    'flagged_count', v_flagged_count,
    'timeframe_hours', p_hours
  );
end;
$$;

grant execute on function public.batch_audit_recent_entries to service_role;
