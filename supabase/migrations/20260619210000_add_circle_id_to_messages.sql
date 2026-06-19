-- Add circle_id to circle_messages for multi-room E2E chat support
ALTER TABLE public.circle_messages 
  ADD COLUMN IF NOT EXISTS circle_id UUID REFERENCES public.learning_circles(id) ON DELETE CASCADE;

-- Drop old public policies on circle_messages
DROP POLICY IF EXISTS "messages read" ON public.circle_messages;
DROP POLICY IF EXISTS "messages insert own" ON public.circle_messages;
DROP POLICY IF EXISTS "circle_messages_read" ON public.circle_messages;
DROP POLICY IF EXISTS "circle_messages_insert" ON public.circle_messages;

-- Create new policies based on learning_circle membership
CREATE POLICY "circle_messages_read" ON public.circle_messages
  FOR SELECT TO authenticated USING (
    circle_id IS NULL OR -- support legacy global messages if needed, or enforce non-null later
    EXISTS (
      SELECT 1 FROM public.learning_circle_members m
      WHERE m.circle_id = circle_messages.circle_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "circle_messages_insert" ON public.circle_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND (
      circle_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.learning_circle_members m
        WHERE m.circle_id = circle_messages.circle_id AND m.user_id = auth.uid()
      )
    )
  );
