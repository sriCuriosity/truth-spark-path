-- Core Schema initialization for local developer testing sandbox

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    xp INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'Seeker',
    data_sharing BOOLEAN DEFAULT TRUE,
    ai_training_opt_in BOOLEAN DEFAULT FALSE,
    public_visibility BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cortex_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_type TEXT CHECK (entry_type IN ('action', 'perspective_shift', 'experiment', 'contribution')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    outcome TEXT,
    what_i_learned TEXT,
    previous_belief TEXT,
    new_belief TEXT,
    domains TEXT[] NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    happened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed some test users and entries
INSERT INTO public.profiles (id, username, xp, tier) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'skeptic_one', 120, 'Seeker'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'seeker_two', 2450, 'Builder')
ON CONFLICT DO NOTHING;

INSERT INTO public.cortex_entries (user_id, entry_type, title, body, domains, is_public) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'perspective_shift', 'Deconstructing News Claims', 'I analyzed three mainstream news articles and isolated the loaded language patterns.', ARRAY['Epistemology', 'Media Literacy'], true)
ON CONFLICT DO NOTHING;
