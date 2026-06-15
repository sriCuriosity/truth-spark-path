-- Add consent columns to profiles
alter table public.profiles
  add column if not exists data_sharing_consented boolean default true,
  add column if not exists ai_training_consented boolean default false,
  add column if not exists public_visibility_consented boolean default false;

-- Trigger to delete/anonymize data immediately on revocation
create or replace function public.handle_consent_revocation()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If data sharing consent is revoked
  if (OLD.data_sharing_consented = true and NEW.data_sharing_consented = false) then
    -- Delete all validation records validator participated in
    delete from public.peer_validations where validator_id = NEW.id;
    delete from public.peer_validations where owner_id = NEW.id;
    
    -- Turn all cortex entries private
    update public.cortex_entries set is_public = false where user_id = NEW.id;
    
    -- Clear achievements / telemetry if shared is disabled
    delete from public.user_achievements where user_id = NEW.id;
  end if;

  -- If public visibility is revoked
  if (OLD.public_visibility_consented = true and NEW.public_visibility_consented = false) then
    update public.cortex_entries set is_public = false where user_id = NEW.id;
  end if;

  return NEW;
end;
$$;

-- Register the trigger
drop trigger if exists on_consent_revocation on public.profiles;
create trigger on_consent_revocation
  before update on public.profiles
  for each row
  execute function public.handle_consent_revocation();

-- Update cortex entries public policy to enforce consent
drop policy if exists "read public entries" on public.cortex_entries;
create policy "read public entries" on public.cortex_entries 
  for select 
  to authenticated 
  using (
    is_public = true 
    and exists (
      select 1 from public.profiles p 
      where p.id = user_id 
      and p.public_visibility_consented = true
      and p.data_sharing_consented = true
    )
  );
