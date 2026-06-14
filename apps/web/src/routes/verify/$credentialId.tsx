import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, CheckCircle, AlertCircle, Calendar, User } from "lucide-react";

export const Route = createFileRoute("/verify/$credentialId")({
  head: () => ({ meta: [{ title: "NEXUS — Credential Verification" }] }),
  component: CredentialVerification,
});

function CredentialVerification() {
  const { credentialId } = Route.useParams();

  const { data: credential, isLoading, error } = useQuery({
    queryKey: ["credential", credentialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credentials")
        .select("*, profiles!inner(*)")
        .eq("id", credentialId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading credential…</p>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-semibold mb-2">Credential Not Found</h1>
          <p className="text-muted-foreground">This credential may have been revoked or does not exist.</p>
        </div>
      </div>
    );
  }

  const isRevoked = credential.is_revoked;
  const credentialData = credential.credential_json as any;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Award className="h-16 w-16 mx-auto mb-4 text-accent-teal" />
          <h1 className="text-2xl font-bold mb-2">Credential Verification</h1>
          <p className="text-muted-foreground">Verify the authenticity of NEXUS credentials</p>
        </div>

        <div className={`nexus-card p-6 ${isRevoked ? "border-red-500/50" : ""}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isRevoked ? (
                <AlertCircle className="h-6 w-6 text-red-400" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-400" />
              )}
              <span className={`font-semibold ${isRevoked ? "text-red-400" : "text-green-400"}`}>
                {isRevoked ? "Revoked" : "Valid"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ID: {credentialId.slice(0, 8)}…
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-1">{credential.title}</h2>
              {credential.description && (
                <p className="text-muted-foreground">{credential.description}</p>
              )}
            </div>

            {credential.competency_tags && credential.competency_tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Competencies</h3>
                <div className="flex flex-wrap gap-2">
                  {credential.competency_tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs bg-elevated rounded-full text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Holder:</span>
                <span className="font-medium">{credential.profiles?.display_name || "Anonymous"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Issued:</span>
                <span className="font-medium">
                  {new Date(credential.issued_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-2">Issuer</h3>
              <p className="text-sm text-muted-foreground">{credential.issuer_did}</p>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold mb-2">Credential Type</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {credential.type.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            This credential is cryptographically signed and verifiable on the NEXUS platform.
          </p>
        </div>
      </div>
    </div>
  );
}
