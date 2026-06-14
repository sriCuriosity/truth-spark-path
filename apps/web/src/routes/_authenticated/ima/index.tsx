import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Award, FileText, Plus, CheckCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ima/")({
  head: () => ({ meta: [{ title: "NEXUS — IMA Portal" }] }),
  component: IMAPortal,
});

function IMAPortal() {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["ima-assessments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ima_assessments")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["credentials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credentials")
        .select("*")
        .order("issued_at", { ascending: false });
      return data ?? [];
    },
  });

  const statusIcons = {
    draft: <Clock className="h-4 w-4 text-muted-foreground" />,
    submitted: <FileText className="h-4 w-4 text-blue-400" />,
    under_review: <Clock className="h-4 w-4 text-yellow-400" />,
    passed: <CheckCircle className="h-4 w-4 text-green-400" />,
    restorative: <FileText className="h-4 w-4 text-orange-400" />,
  };

  const statusColors = {
    draft: "text-muted-foreground",
    submitted: "text-blue-400",
    under_review: "text-yellow-400",
    passed: "text-green-400",
    restorative: "text-orange-400",
  };

  if (isLoading) {
    return <AppShell title="IMA Portal"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  return (
    <AppShell title="IMA Portal">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Integral Mastery Assessments</h2>
            <p className="text-sm text-muted-foreground">Portfolio-based credential assessments</p>
          </div>
          <button
            onClick={() => window.location.href = "/ima/new"}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            New Assessment
          </button>
        </div>

        <div className="grid gap-4">
          {assessments.map((assessment: any) => (
            <div key={assessment.id} className="nexus-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {statusIcons[assessment.status as keyof typeof statusIcons]}
                    <span className={`text-sm font-medium capitalize ${statusColors[assessment.status as keyof typeof statusColors]}`}>
                      {assessment.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{assessment.title}</h3>
                  {assessment.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{assessment.description}</p>
                  )}
                </div>
                <button
                  onClick={() => window.location.href = `/ima/${assessment.id}`}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-elevated transition"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {assessments.length === 0 && (
          <div className="text-center py-12">
            <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No assessments yet</p>
            <button
              onClick={() => window.location.href = "/ima/new"}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
            >
              Start Your First Assessment
            </button>
          </div>
        )}

        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold mb-4">Your Credentials</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {credentials.map((credential: any) => (
              <div key={credential.id} className="nexus-card p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-accent-teal" />
                  <div>
                    <h4 className="font-semibold">{credential.title}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{credential.type.replace("_", " ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Complete an IMA assessment to earn credentials
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
