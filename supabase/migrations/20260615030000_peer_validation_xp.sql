-- Functions and triggers for peer validation weighted XP and profile sync

-- 1. Helper function to process weighted XP on peer validation
create or replace function public.process_peer_validation_xp(p_validation_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_validator_id uuid;
  v_owner_id uuid;
  v_entry_id uuid;
  v_validator_tier text;
  v_validator_tier_level integer;
  v_entry_embedding vector;
  v_validator_embedding vector;
  v_cosine_similarity float;
  v_weight float;
  v_base_xp integer := 20; -- peer_validation_received base XP
  v_weighted_xp integer;
begin
  -- Get validation and entry details
  select pv.validator_id, pv.owner_id, pv.entry_id, e.embedding
  into v_validator_id, v_owner_id, v_entry_id, v_entry_embedding
  from public.peer_validations pv
  join public.cortex_entries e on e.id = pv.entry_id
  where pv.id = p_validation_id;

  if v_validator_id is null or v_owner_id is null then
    return jsonb_build_object('success', false, 'error', 'Validation or Owner not found');
  end if;

  -- Get validator current tier
  select coalesce(current_tier, 'seeker') into v_validator_tier
  from public.profiles
  where id = v_validator_id;

  -- Map tier to level: seeker=0, explorer=1, builder=2, contributor=3, architect=4
  v_validator_tier_level := case v_validator_tier
    when 'seeker' then 0
    when 'explorer' then 1
    when 'builder' then 2
    when 'contributor' then 3
    when 'architect' then 4
    else 0
  end;

  -- Get validator's latest entry embedding (active perspective)
  select embedding into v_validator_embedding
  from public.cortex_entries
  where user_id = v_validator_id and embedding is not null
  order by created_at desc
  limit 1;

  -- Calculate cosine similarity (1 - cosine distance)
  if v_entry_embedding is not null and v_validator_embedding is not null then
    v_cosine_similarity := 1.0 - (v_entry_embedding <=> v_validator_embedding);
    -- Clamp cosine similarity between -1.0 and 1.0
    if v_cosine_similarity < -1.0 then v_cosine_similarity := -1.0; end if;
    if v_cosine_similarity > 1.0 then v_cosine_similarity := 1.0; end if;
  else
    -- Default to 0 similarity if either is null (e.g. validator has no entries or embedding generation pending)
    v_cosine_similarity := 0.0;
  end if;

  -- Weight formula: 1 + (verifier_tier_level * 0.2) * (1 - cosine_similarity_of_perspectives)
  v_weight := 1.0 + (v_validator_tier_level * 0.2) * (1.0 - v_cosine_similarity);
  
  -- Calculate final XP (round to nearest integer)
  v_weighted_xp := round(v_base_xp * v_weight)::integer;

  -- Award XP to the owner of the entry (peer_validation_received)
  perform public.award_xp(
    v_owner_id,
    v_weighted_xp,
    'peer_validation_received',
    p_validation_id,
    jsonb_build_object(
      'weight', v_weight,
      'validator_tier', v_validator_tier,
      'validator_tier_level', v_validator_tier_level,
      'cosine_similarity', v_cosine_similarity
    )
  );

  return jsonb_build_object(
    'success', true,
    'owner_id', v_owner_id,
    'validator_id', v_validator_id,
    'base_xp', v_base_xp,
    'weighted_xp', v_weighted_xp,
    'weight', v_weight,
    'cosine_similarity', v_cosine_similarity
  );
end;
$$;

-- 2. Trigger function to process peer validation XP after validation insertion
create or replace function public.after_peer_validation_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.process_peer_validation_xp(NEW.id);
  return NEW;
end;
$$;

drop trigger if exists on_peer_validation_insert on public.peer_validations;
create trigger on_peer_validation_insert
  after insert on public.peer_validations
  for each row
  execute function public.after_peer_validation_insert();

-- 3. Trigger function to automatically keep profile total_xp and current_tier in sync with xp_ledger
create or replace function public.sync_profile_xp()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_xp integer;
  v_tier text;
begin
  -- Calculate total XP
  select coalesce(sum(amount), 0) into v_total_xp
  from public.xp_ledger
  where user_id = NEW.user_id;

  -- Determine tier based on total XP
  v_tier := case
    when v_total_xp >= 10000 then 'architect'
    when v_total_xp >= 5000 then 'contributor'
    when v_total_xp >= 2000 then 'builder'
    when v_total_xp >= 500 then 'explorer'
    else 'seeker'
  end;

  -- Update profile
  update public.profiles
  set total_xp = v_total_xp,
      current_tier = v_tier
  where id = NEW.user_id;

  return NEW;
end;
$$;

drop trigger if exists on_xp_ledger_insert on public.xp_ledger;
create trigger on_xp_ledger_insert
  after insert on public.xp_ledger
  for each row
  execute function public.sync_profile_xp();
