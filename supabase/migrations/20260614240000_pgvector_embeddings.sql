-- Enable pgvector extension
create extension if not exists vector;

-- Embeddings table for RAG
create table if not exists public.cortex_embeddings (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.cortex_entries(id) on delete cascade,
  embedding vector(1536),
  content_hash text not null,
  created_at timestamptz default now()
);
grant select, insert on public.cortex_embeddings to authenticated;
grant all on public.cortex_embeddings to service_role;
alter table public.cortex_embeddings enable row level security;
create policy "embeddings read own" on public.cortex_embeddings for select to authenticated using (
  exists (select 1 from public.cortex_entries e where e.id = entry_id and e.user_id = auth.uid())
);
create policy "embeddings insert own" on public.cortex_embeddings for insert to authenticated with check (
  exists (select 1 from public.cortex_entries e where e.id = entry_id and e.user_id = auth.uid())
);

-- Create index for vector similarity search
create index if not exists cortex_embeddings_embedding_idx on public.cortex_embeddings 
using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Function to generate embeddings (placeholder - would call OpenAI API)
create or replace function public.generate_embedding(text_content text)
returns vector(1536)
language plpgsql
security definer
as $$
begin
  -- This is a placeholder - in production, this would call OpenAI API
  -- For now, return a zero vector
  return '[0]'::vector(1536);
end;
$$;

-- Function to search similar entries
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
    ce.entry_id,
    1 - (ce.embedding <=> p_query_embedding) as similarity
  from public.cortex_embeddings ce
  join public.cortex_entries e on e.id = ce.entry_id
  where e.user_id = p_user_id
  order by ce.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;

grant execute on function public.search_similar_entries to authenticated;
grant execute on function public.search_similar_entries to service_role;
