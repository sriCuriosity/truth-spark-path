import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Building2, Users, Award, CreditCard, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/institutional/")({
  head: () => ({ meta: [{ title: "NEXUS — Institutional Console" }] }),
  component: InstitutionalConsole,
});

function InstitutionalConsole() {
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["institutional-licenses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("institutional_licenses")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: issuedCredentials = [] } = useQuery({
    queryKey: ["issued-credentials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credentials")
        .select("*, profiles(*)")
        .order("issued_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <AppShell title="Institutional Console"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  return (
    <AppShell title="Institutional Console">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Institutional Management</h2>
            <p className="text-sm text-muted-foreground">Manage licenses and track institutional credentials</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition">
            <Plus className="h-4 w-4" />
            New License
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-accent-teal" />
              <div>
                <p className="text-2xl font-bold">{licenses.length}</p>
                <p className="text-sm text-muted-foreground">Active Licenses</p>
              </div>
            </div>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">
                  {licenses.reduce((sum: number, lic: any) => sum + (lic.seat_count || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Seats</p>
              </div>
            </div>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{issuedCredentials.length}</p>
                <p className="text-sm text-muted-foreground">Credentials Issued</p>
              </div>
            </div>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(licenses.map((l: any) => l.organization_name)).size}
                </p>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </div>
            </div>
          </div>
        </div>

        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-6 w-6 text-accent-teal" />
            <h3 className="font-semibold">Institutional Licenses</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b border-border">
                  <th className="pb-3">Organization</th>
                  <th className="pb-3">License Type</th>
                  <th className="pb-3">Seats</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license: any) => (
                  <tr key={license.id} className="border-b border-border">
                    <td className="py-3 font-medium">{license.organization_name}</td>
                    <td className="py-3 capitalize">{license.license_type}</td>
                    <td className="py-3">{license.seat_count}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        license.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        license.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm">
                      {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {licenses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No institutional licenses yet.
            </p>
          )}
        </div>

        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-6 w-6 text-accent-teal" />
            <h3 className="font-semibold">Recently Issued Credentials</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {issuedCredentials.map((credential: any) => (
              <div key={credential.id} className="p-4 bg-elevated rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{credential.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Issued to: {credential.profiles?.display_name || "Anonymous"}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    credential.is_revoked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {credential.is_revoked ? 'Revoked' : 'Active'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {credential.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Issued: {new Date(credential.issued_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {issuedCredentials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No credentials issued yet.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
