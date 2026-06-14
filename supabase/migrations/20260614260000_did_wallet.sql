-- SSI/DID Wallet for self-sovereign identity
create table if not exists public.did_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  did text not null unique,
  did_method text not null,
  public_key text not null,
  private_key_encrypted text not null,
  verification_methods jsonb default '[]'::jsonb,
  services jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update on public.did_documents to authenticated;
grant all on public.did_documents to service_role;
alter table public.did_documents enable row level security;
create policy "did read own" on public.did_documents for select to authenticated using (auth.uid() = user_id);
create policy "did create own" on public.did_documents for insert to authenticated with check (auth.uid() = user_id);
create policy "did update own" on public.did_documents for update to authenticated using (auth.uid() = user_id);

-- Verifiable credentials storage
create table if not exists public.verifiable_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credential_json jsonb not null,
  credential_hash text not null unique,
  issuer_did text not null,
  status text not null default 'active' check (status in ('active','revoked','suspended')),
  revoked_at timestamptz,
  created_at timestamptz default now()
);
grant select, insert, update on public.verifiable_credentials to authenticated;
grant all on public.verifiable_credentials to service_role;
alter table public.verifiable_credentials enable row level security;
create policy "vc read own" on public.verifiable_credentials for select to authenticated using (auth.uid() = user_id);
create policy "vc create own" on public.verifiable_credentials for insert to authenticated with check (auth.uid() = user_id);
create policy "vc update own" on public.verifiable_credentials for update to authenticated using (auth.uid() = user_id);

-- Function to generate DID (simplified - in production use proper DID method)
create or replace function public.generate_did(p_user_id uuid, p_did_method text default 'web')
returns jsonb
language plpgsql
security definer
as $$
declare
  v_did text;
  v_key_pair jsonb;
begin
  -- Generate a simple DID (in production, use proper cryptographic key generation)
  v_did := 'did:' || p_did_method || ':nexus.app:' || p_user_id::text;
  
  -- Placeholder for key pair generation
  v_key_pair := jsonb_build_object(
    'public_key', encode(gen_random_bytes(32), 'hex'),
    'private_key', encode(gen_random_bytes(32), 'hex')
  );
  
  return jsonb_build_object(
    'did', v_did,
    'key_pair', v_key_pair
  );
end;
$$;

grant execute on function public.generate_did to authenticated;
grant execute on function public.generate_did to service_role;
