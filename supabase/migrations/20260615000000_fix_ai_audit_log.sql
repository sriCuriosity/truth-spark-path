-- Fix ai_audit_log table schema columns missing
alter table public.ai_audit_log
  add column if not exists risk_score double precision default 0.0,
  add column if not exists flags jsonb default '[]'::jsonb;

-- Add embedding vector(1536) column to cortex_entries table
create extension if not exists vector;
alter table public.cortex_entries
  add column if not exists embedding vector(1536);

-- Index for similarity search directly on cortex_entries
create index if not exists cortex_entries_embedding_idx on public.cortex_entries
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Redefining search_similar_entries to look at cortex_entries table directly
create or replace function public.search_similar_entries(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_limit integer default 5
)
returns table (
  entry_id uuid,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    e.id as entry_id,
    (1 - (e.embedding <=> p_query_embedding))::float as similarity
  from public.cortex_entries e
  where e.user_id = p_user_id and e.embedding is not null
  order by e.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

grant execute on function public.search_similar_entries to authenticated;
grant execute on function public.search_similar_entries to service_role;
