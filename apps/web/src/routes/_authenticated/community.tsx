import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { HarmReportModal } from "@/components/harm-report-modal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "NEXUS — Learning Circle" }] }),
  component: Community,
});

function Community() {
  const [reportOpen, setReportOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: publicEntries = [] } = useQuery({
    queryKey: ["public-cortex"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cortex_entries")
        .select("id, title, body, entry_type, created_at, user_id, profiles:user_id(display_name, handle, avatar_url)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: questions = [], refetch: refetchQuestions } = useQuery({
    queryKey: ["community-questions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_questions")
        .select("id, question_text, domain, created_at, profiles:user_id(display_name, handle)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  async function postQuestion() {
    if (questionText.trim().length < 5) {
      toast.error("Write a real question — at least a few words.");
      return;
    }
    setPosting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("community_questions").insert({
      user_id: u.user.id,
      question_text: questionText.trim(),
    });
    setPosting(false);
    if (error) {
      toast.error("Couldn't post question");
      return;
    }
    toast.success("Question posted to the wall.");
    setQuestionText("");
    refetchQuestions();
  }

  return (
    <AppShell title="Learning Circle">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs hover:bg-elevated/70"
        >
          <Shield className="h-3.5 w-3.5" /> Report harm
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold">Recent activity</h2>
          {publicEntries.length === 0 ? (
            <div className="nexus-card p-10 text-center text-sm text-muted-foreground">
              Your circle is quiet. Post a question or share something you learned.
            </div>
          ) : (
            <div className="space-y-3">
              {publicEntries.map((e: any) => (
                <div key={e.id} className="nexus-card p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{e.profiles?.display_name ?? "Someone"}</span>
                    {e.profiles?.handle && <span>@{e.profiles.handle}</span>}
                    <span>· {new Date(e.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold">{e.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{e.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="nexus-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Question wall</p>
            <p className="mt-2 text-sm text-muted-foreground">Post a question you've always wanted to ask. Others will think with you.</p>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="What have you always wanted to ask?"
              className="mt-3 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={postQuestion}
              disabled={posting}
              className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {posting ? "…" : "Post a question"}
            </button>
          </div>

          {questions.length > 0 && (
            <div className="nexus-card p-5">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">On the wall</p>
              <div className="space-y-3">
                {questions.map((q: any) => (
                  <div key={q.id} className="border-b border-border/50 pb-3 last:border-0">
                    <p className="text-sm">{q.question_text}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {q.profiles?.display_name ?? "Someone"} · {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <HarmReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </AppShell>
  );
}
