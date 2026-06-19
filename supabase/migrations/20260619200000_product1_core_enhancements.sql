-- Product 1: NEXUS Core (PWA) — Schema enhancements
-- Tables: deprogramming_progress, domains, learning_circles, learning_circle_members, question_responses
-- Views: contribution_score
-- Verification: wellbeing_checkins

-- =============================================================================
-- 1. DEPROGRAMMING PROGRESS TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.deprogramming_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL CHECK (module_id BETWEEN 1 AND 5),
  cortex_entry_id UUID REFERENCES public.cortex_entries(id) ON DELETE SET NULL,
  reflection_text TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.deprogramming_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deprogram_own_read" ON public.deprogramming_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deprogram_own_insert" ON public.deprogramming_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deprogram_own_update" ON public.deprogramming_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.deprogramming_progress TO authenticated;
GRANT ALL ON public.deprogramming_progress TO service_role;

-- =============================================================================
-- 2. FOUNDATION DOMAINS LOOKUP TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,        -- lucide icon name
  color TEXT,       -- hex color for UI
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Everyone can read active domains
CREATE POLICY "domains_read_all" ON public.domains
  FOR SELECT USING (is_active = true);

-- Only service_role can modify (Content Studio manages these in future)
GRANT SELECT ON public.domains TO authenticated, anon;
GRANT ALL ON public.domains TO service_role;

-- Seed the 6 Foundation Domains
INSERT INTO public.domains (slug, name, description, icon, color, sort_order) VALUES
  ('media-epistemology', 'Media & Epistemology', 'How do we know what we know? Truth, evidence, and information integrity in the digital age.', 'Search', '#8B5CF6', 1),
  ('systems-thinking', 'Systems Thinking', 'Seeing the whole. Feedback loops, emergence, unintended consequences, and interconnected causality.', 'Network', '#06B6D4', 2),
  ('emotional-intelligence', 'Emotional Intelligence', 'Self-awareness, empathy, regulation — the infrastructure of integrity and honest relationships.', 'Heart', '#F43F5E', 3),
  ('social-skills', 'Social Skills', 'Communication, conflict resolution, collaboration — human interface protocols for real-world effectiveness.', 'Users', '#10B981', 4),
  ('how-society-works', 'How Society Works', 'Power structures, institutions, governance, and the architecture of collective decision-making.', 'Building', '#F59E0B', 5),
  ('embodiment-wellbeing', 'Embodiment & Wellbeing', 'Body-mind integration, somatic intelligence, health sovereignty, and the physics of being alive.', 'Activity', '#EC4899', 6)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 3. LEARNING CIRCLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.learning_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 8 CHECK (max_members BETWEEN 2 AND 20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

ALTER TABLE public.learning_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_circle_members ENABLE ROW LEVEL SECURITY;

-- Circles: members can read, creators can manage
CREATE POLICY "circles_read_member" ON public.learning_circles
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m
      WHERE m.circle_id = id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "circles_insert_own" ON public.learning_circles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "circles_update_creator" ON public.learning_circles
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Circle members: co-members can see each other
CREATE POLICY "circle_members_read" ON public.learning_circle_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m2
      WHERE m2.circle_id = circle_id AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY "circle_members_join" ON public.learning_circle_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "circle_members_leave" ON public.learning_circle_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.learning_circles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.learning_circle_members TO authenticated;
GRANT ALL ON public.learning_circles TO service_role;
GRANT ALL ON public.learning_circle_members TO service_role;

-- =============================================================================
-- 4. QUESTION RESPONSES (extends existing community_questions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_validation_opportunity BOOLEAN DEFAULT FALSE,
  peer_validation_id UUID REFERENCES public.peer_validations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read responses
CREATE POLICY "responses_read_all" ON public.question_responses
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own responses
CREATE POLICY "responses_insert_own" ON public.question_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.question_responses TO authenticated;
GRANT ALL ON public.question_responses TO service_role;

-- =============================================================================
-- 5. CONTRIBUTION SCORE (computed view over xp_ledger)
-- =============================================================================
CREATE OR REPLACE VIEW public.contribution_score AS
SELECT
  user_id,
  COALESCE(SUM(amount) FILTER (WHERE source IN (
    'peer_validation_given',
    'peer_validation_received',
    'community_kb_edit',
    'community_answer',
    'question_response'
  )), 0) AS contribution_xp,
  COUNT(*) FILTER (WHERE source = 'peer_validation_given') AS validations_given,
  COUNT(*) FILTER (WHERE source = 'peer_validation_received') AS validations_received,
  COUNT(*) FILTER (WHERE source IN ('community_kb_edit', 'community_answer', 'question_response')) AS community_contributions
FROM public.xp_ledger
GROUP BY user_id;

-- Grant read access (RLS inherited from xp_ledger underlying table)
GRANT SELECT ON public.contribution_score TO authenticated;
GRANT SELECT ON public.contribution_score TO service_role;

-- =============================================================================
-- 6. WELLBEING CHECKINS (verify/create if not already present)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.wellbeing_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  body_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (idempotent — won't fail if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wellbeing_checkins' AND policyname = 'wellbeing_own'
  ) THEN
    ALTER TABLE public.wellbeing_checkins ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "wellbeing_own" ON public.wellbeing_checkins
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT ON public.wellbeing_checkins TO authenticated;
GRANT ALL ON public.wellbeing_checkins TO service_role;

-- =============================================================================
-- 7. ADD domain_id FK TO cortex_entries (optional tag against domains table)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cortex_entries' AND column_name = 'domain_id'
  ) THEN
    ALTER TABLE public.cortex_entries ADD COLUMN domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL;
  END IF;
END $$;
