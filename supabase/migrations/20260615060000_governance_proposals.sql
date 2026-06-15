-- Create proposals and quadratic votes tables for community governance

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null default 'policy',
  status text not null default 'active' check (status in ('active', 'passed', 'rejected')),
  yes_votes float default 0.0,
  no_votes float default 0.0,
  created_at timestamptz default now()
);

create table if not exists public.proposal_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  credits_spent integer not null check (credits_spent >= 0),
  vote_type text not null check (vote_type in ('yes', 'no')),
  created_at timestamptz default now(),
  constraint unique_proposal_user_vote unique (proposal_id, user_id)
);

-- Grants
grant select, insert, update on public.proposals to authenticated;
grant all on public.proposals to service_role;

grant select, insert, update on public.proposal_votes to authenticated;
grant all on public.proposal_votes to service_role;

-- RLS
alter table public.proposals enable row level security;
alter table public.proposal_votes enable row level security;

create policy "proposals read" on public.proposals for select to authenticated using (true);
create policy "proposals insert" on public.proposals for insert to authenticated with check (auth.uid() = user_id);

create policy "votes read" on public.proposal_votes for select to authenticated using (true);
create policy "votes write own" on public.proposal_votes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger function to update proposal totals upon casting a vote
create or replace function public.update_proposal_vote_totals()
returns trigger
language plpgsql
security definer
as $$
declare
  v_yes_votes float := 0.0;
  v_no_votes float := 0.0;
  r record;
begin
  -- For every vote on this proposal, calculate the Sqrt(credits_spent) as votes
  for r in 
    select credits_spent, vote_type 
    from public.proposal_votes 
    where proposal_id = coalesce(NEW.proposal_id, OLD.proposal_id)
  loop
    if r.vote_type = 'yes' then
      v_yes_votes := v_yes_votes + sqrt(r.credits_spent);
    elsif r.vote_type = 'no' then
      v_no_votes := v_no_votes + sqrt(r.credits_spent);
    end if;
  end loop;

  update public.proposals
  set yes_votes = v_yes_votes,
      no_votes = v_no_votes
  where id = coalesce(NEW.proposal_id, OLD.proposal_id);

  return NEW;
end;
$$;

create trigger on_proposal_vote_change
  after insert or update or delete on public.proposal_votes
  for each row
  execute function public.update_proposal_vote_totals();
