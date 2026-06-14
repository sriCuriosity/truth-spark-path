import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Wallet, Key, Shield, Plus, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wallet/")({
  head: () => ({ meta: [{ title: "NEXUS — SSI Wallet" }] }),
  component: Wallet,
});

function Wallet() {
  const qc = useQueryClient();

  const { data: didDocument, isLoading } = useQuery({
    queryKey: ["did-document"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("did_documents")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["verifiable-credentials"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("verifiable_credentials")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createDIDMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: didData } = await supabase.rpc("generate_did", {
        p_user_id: user.id,
        p_did_method: "web",
      });

      const { data, error } = await supabase
        .from("did_documents")
        .insert({
          user_id: user.id,
          did: didData.did,
          did_method: "web",
          public_key: didData.key_pair.public_key,
          private_key_encrypted: didData.key_pair.private_key,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["did-document"] });
      toast.success("DID created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create DID");
      console.error(error);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return <AppShell title="SSI Wallet"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  return (
    <AppShell title="SSI Wallet">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Self-Sovereign Identity</h2>
            <p className="text-sm text-muted-foreground">Manage your decentralized identity and credentials</p>
          </div>
        </div>

        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="h-6 w-6 text-accent-teal" />
            <h3 className="font-semibold">Your DID</h3>
          </div>

          {didDocument ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">DID Identifier</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-elevated rounded-md text-sm break-all">
                    {didDocument.did}
                  </code>
                  <button
                    onClick={() => copyToClipboard(didDocument.did)}
                    className="p-2 hover:bg-elevated rounded-md transition"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">DID Method</label>
                <p className="text-sm font-medium capitalize">{didDocument.did_method}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Public Key</label>
                <code className="block p-3 bg-elevated rounded-md text-xs break-all">
                  {didDocument.public_key}
                </code>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Active and verified</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No DID created yet</p>
              <button
                onClick={() => createDIDMutation.mutate()}
                disabled={createDIDMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                {createDIDMutation.isPending ? "Creating..." : "Create DID"}
              </button>
            </div>
          )}
        </div>

        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-accent-teal" />
            <h3 className="font-semibold">Verifiable Credentials</h3>
          </div>

          <div className="grid gap-4">
            {credentials.map((credential: any) => {
              const vcData = credential.credential_json as any;
              return (
                <div key={credential.id} className="p-4 bg-elevated rounded-md">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{vcData.credentialSubject?.name || "Unnamed Credential"}</h4>
                      <p className="text-xs text-muted-foreground">
                        Issued by: {vcData.issuer?.name || vcData.issuer?.id}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      credential.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      credential.status === 'revoked' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {credential.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {vcData.credentialSubject?.description || "No description"}
                  </p>
                </div>
              );
            })}
          </div>

          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No verifiable credentials yet. Complete IMA assessments to earn credentials.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
