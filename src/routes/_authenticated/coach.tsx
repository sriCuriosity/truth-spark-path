import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { AICoachPanel } from "@/components/ai-coach-panel";
import { supabase } from "@/integrations/supabase/client";
import type { AIVoiceId } from "@/lib/ai-voices";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "NEXUS — AI Coach" }] }),
  component: CoachPage,
});

function CoachPage() {
  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("preferred_ai_voice").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const voice = (profile?.preferred_ai_voice ?? "socratic") as AIVoiceId;

  return (
    <AppShell title="AI Coach">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-sm text-muted-foreground">
          Questions first, answers never. Every question has a visible reasoning trail — click "Why this question?" anytime.
        </p>
        <AICoachPanel voiceId={voice} />
      </div>
    </AppShell>
  );
}
