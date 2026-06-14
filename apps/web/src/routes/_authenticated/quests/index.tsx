import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, Code, Zap, Users, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quests/")({
  head: () => ({ meta: [{ title: "NEXUS — Quests" }] }),
  component: Quests,
});

function Quests() {
  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("*")
        .eq("is_published", true)
        .order("difficulty", { ascending: true });
      return data ?? [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["quest-submissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("quest_submissions")
        .select("*, quest:quests(*)")
        .eq("user_id", user.id);
      return data ?? [];
    },
  });

  const submittedQuestIds = new Set(submissions.map((s: any) => s.quest_id));

  const difficultyIcons = {
    1: <Zap className="h-4 w-4 text-green-400" />,
    2: <Zap className="h-4 w-4 text-blue-400" />,
    3: <Zap className="h-4 w-4 text-yellow-400" />,
    4: <Zap className="h-4 w-4 text-orange-400" />,
    5: <Zap className="h-4 w-4 text-red-400" />,
  };

  const submissionTypeIcons = {
    text: <BookOpen className="h-4 w-4" />,
    project_url: <Code className="h-4 w-4" />,
    file: <Award className="h-4 w-4" />,
    video_url: <Users className="h-4 w-4" />,
    cortex_entry_id: <BookOpen className="h-4 w-4" />,
  };

  if (isLoading) {
    return <AppShell title="Quests"><p className="text-sm text-muted-foreground">Loading quests…</p></AppShell>;
  }

  return (
    <AppShell title="Quests">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Available Quests</h2>
            <p className="text-sm text-muted-foreground">Challenges to demonstrate your mastery</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quests.map((quest: any) => {
            const isSubmitted = submittedQuestIds.has(quest.id);
            const submission = submissions.find((s: any) => s.quest_id === quest.id);
            
            return (
              <div
                key={quest.id}
                className={`nexus-card p-5 transition-all ${
                  isSubmitted ? "opacity-60" : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {difficultyIcons[quest.difficulty as keyof typeof difficultyIcons]}
                    <span className="text-xs font-medium text-muted-foreground">
                      Difficulty {quest.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-accent-teal">
                    <Zap className="h-3 w-3" />
                    {quest.xp_reward} XP
                  </div>
                </div>

                <h3 className="font-semibold mb-2">{quest.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {quest.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  {submissionTypeIcons[quest.submission_type as keyof typeof submissionTypeIcons]}
                  <span className="text-xs text-muted-foreground capitalize">
                    {quest.submission_type.replace("_", " ")}
                  </span>
                </div>

                {quest.competency_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {quest.competency_tags.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] bg-elevated rounded-full text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isSubmitted ? (
                  <div className="w-full py-2 text-center text-sm text-muted-foreground border border-border rounded-md">
                    {submission?.status === "passed" ? "✓ Completed" : "Submitted"}
                  </div>
                ) : (
                  <button
                    onClick={() => window.location.href = `/quests/${quest.id}`}
                    className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
                  >
                    Start Quest
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {quests.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No quests available yet</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
