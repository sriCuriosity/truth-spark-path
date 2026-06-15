-- Add user_refutation column to ai_interactions to support the Socratic refutation model

alter table public.ai_interactions
  add column if not exists user_refutation text;
