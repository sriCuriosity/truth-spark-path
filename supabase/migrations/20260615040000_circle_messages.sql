-- Create circle_messages table for E2E encrypted chat

create table if not exists public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  encrypted_content text not null,
  created_at timestamptz default now()
);

-- Grants
grant select, insert on public.circle_messages to authenticated;
grant all on public.circle_messages to service_role;

-- RLS
alter table public.circle_messages enable row level security;

create policy "messages read" on public.circle_messages for select to authenticated using (true);
create policy "messages insert own" on public.circle_messages for insert to authenticated with check (auth.uid() = user_id);

-- Enable Supabase Realtime via DO block for exception handling
do $$
begin
  alter publication supabase_realtime add table public.circle_messages;
  alter publication supabase_realtime add table public.community_questions;
exception when others then
  -- Ignore errors if table is already added or publication doesn't exist
  null;
end;
$$;
