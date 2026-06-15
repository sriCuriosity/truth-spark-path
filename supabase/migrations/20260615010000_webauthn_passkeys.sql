-- WebAuthn / Passkeys storage table
create table if not exists public.webauthn_credentials (
  id text primary key, -- Credential ID from browser
  user_id uuid not null references public.profiles(id) on delete cascade,
  public_key text not null, -- PEM or Hex string of the public key
  counter integer default 0,
  created_at timestamptz default now()
);

grant select, insert on public.webauthn_credentials to authenticated;
grant select, insert on public.webauthn_credentials to anon;
grant all on public.webauthn_credentials to service_role;

alter table public.webauthn_credentials enable row level security;

create policy "credentials read own" on public.webauthn_credentials for select using (
  auth.uid() = user_id
);

create policy "credentials insert own" on public.webauthn_credentials for insert with check (
  auth.uid() = user_id
);

-- Generate challenge RPC
create or replace function public.generate_webauthn_challenge(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_challenge text;
begin
  v_challenge := encode(gen_random_bytes(32), 'hex');
  return jsonb_build_object(
    'challenge', v_challenge,
    'rp', jsonb_build_object('name', 'NEXUS', 'id', 'localhost'),
    'user', jsonb_build_object(
      'id', encode(p_user_id::text::bytea, 'hex'),
      'name', 'seeker@nexus.app',
      'displayName', 'NEXUS Seeker'
    ),
    'pubKeyCredParams', jsonb_build_array(
      jsonb_build_object('type', 'public-key', 'alg', -7) -- ES256
    )
  );
end;
$$;

grant execute on function public.generate_webauthn_challenge to authenticated, anon;
grant execute on function public.generate_webauthn_challenge to service_role;
