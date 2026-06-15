-- Migration to support human co-mentorship platform

CREATE TABLE IF NOT EXISTS public.mentorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'closed')),
    relationship_health_decay NUMERIC(3, 2) DEFAULT 1.00 CHECK (relationship_health_decay >= 0.00 AND relationship_health_decay <= 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closure_reason TEXT,
    closure_notes TEXT,
    CONSTRAINT unique_active_mentorship UNIQUE (mentor_id, mentee_id, status)
);

CREATE TABLE IF NOT EXISTS public.mentorship_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cortex_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cortex_entry_id UUID REFERENCES public.cortex_entries(id) ON DELETE SET NULL,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mentor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL, -- AES encrypted payload
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant privileges
GRANT ALL ON public.mentorships TO authenticated, service_role;
GRANT ALL ON public.mentorship_goals TO authenticated, service_role;
GRANT ALL ON public.cortex_access_logs TO authenticated, service_role;
GRANT ALL ON public.mentor_messages TO authenticated, service_role;

-- Enable RLS
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cortex_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "mentorships_access" ON public.mentorships
    FOR ALL TO authenticated
    USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
    WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "goals_access" ON public.mentorship_goals
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.mentorships m 
        WHERE m.id = mentorship_id AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.mentorships m 
        WHERE m.id = mentorship_id AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    ));

CREATE POLICY "access_logs_access" ON public.cortex_access_logs
    FOR ALL TO authenticated
    USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
    WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "messages_access" ON public.mentor_messages
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.mentorships m 
        WHERE m.id = mentorship_id AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.mentorships m 
        WHERE m.id = mentorship_id AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    ));
