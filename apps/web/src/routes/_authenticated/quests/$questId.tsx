import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BookOpen, Code, Zap, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quests/$questId")({
  head: () => ({ meta: [{ title: "NEXUS — Quest Detail" }] }),
  component: QuestDetail,
});

function QuestDetail() {
  const { questId } = Route.useParams();
  const qc = useQueryClient();
  const [submission, setSubmission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: quest, isLoading } = useQuery({
    queryKey: ["quest", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("*")
        .eq("id", questId)
        .single();
      return data;
    },
  });

  const { data: existingSubmission } = useQuery({
    queryKey: ["quest-submission", questId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("quest_submissions")
        .select("*")
        .eq("quest_id", questId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("quest_submissions")
        .insert({
          quest_id: questId,
          user_id: user.id,
          submission_content: content,
          status: "submitted",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quest-submission", questId] });
      qc.invalidateQueries({ queryKey: ["quest-submissions"] });
      toast.success("Quest submitted! Your submission will be reviewed.");
      setSubmission("");
    },
    onError: (error) => {
      toast.error("Failed to submit quest");
      console.error(error);
    },
  });

  const handleSubmit = async () => {
    if (!submission.trim()) {
      toast.error("Please provide your submission");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync(submission);
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyColors = {
    1: "text-green-400",
    2: "text-blue-400",
    3: "text-yellow-400",
    4: "text-orange-400",
    5: "text-red-400",
  };

  if (isLoading) {
    return <AppShell title="Quest"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  if (!quest) {
    return <AppShell title="Quest"><p className="text-sm text-muted-foreground">Quest not found</p></AppShell>;
  }

  return (
    <AppShell title={quest.title}>
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quests
        </button>

        <div className="nexus-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center gap-2 ${difficultyColors[quest.difficulty as keyof typeof difficultyColors]}`}>
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Difficulty {quest.difficulty}</span>
            </div>
            <div className="flex items-center gap-1 text-accent-teal">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">{quest.xp_reward} XP</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{quest.title}</h1>
          <p className="text-muted-foreground mb-6">{quest.description}</p>

          {quest.competency_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {quest.competency_tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs bg-elevated rounded-full text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {quest.time_limit_days && (
            <div className="text-sm text-muted-foreground mb-6">
              Time limit: {quest.time_limit_days} days
            </div>
          )}

          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-4">Submission Type</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {quest.submission_type === "text" && <BookOpen className="h-4 w-4" />}
              {quest.submission_type === "project_url" && <Code className="h-4 w-4" />}
              <span className="capitalize">{quest.submission_type.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        {existingSubmission ? (
          <div className="nexus-card p-6">
            <h3 className="font-semibold mb-4">Your Submission</h3>
            <div className="bg-elevated p-4 rounded-md mb-4">
              <p className="text-sm whitespace-pre-wrap">{existingSubmission.submission_content}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                existingSubmission.status === "passed" ? "bg-green-500/20 text-green-400" :
                existingSubmission.status === "under_review" ? "bg-yellow-500/20 text-yellow-400" :
                existingSubmission.status === "restorative" ? "bg-orange-500/20 text-orange-400" :
                "bg-blue-500/20 text-blue-400"
              }`}>
                {existingSubmission.status.replace("_", " ")}
              </span>
            </div>
            {existingSubmission.mentor_feedback && (
              <div className="mt-4 p-4 bg-elevated rounded-md">
                <h4 className="font-medium mb-2">Mentor Feedback</h4>
                <p className="text-sm text-muted-foreground">{existingSubmission.mentor_feedback}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="nexus-card p-6">
            <h3 className="font-semibold mb-4">Submit Your Work</h3>
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Describe your work, share your insights, or provide the details of your submission..."
              className="w-full min-h-[200px] p-4 bg-elevated border border-border rounded-md resize-none focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !submission.trim()}
              className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Quest
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
