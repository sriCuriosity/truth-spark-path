import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Shield, Users, AlertTriangle, Heart, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guardian/")({
  head: () => ({ meta: [{ title: "NEXUS — Guardian Dashboard" }] }),
  component: GuardianDashboard,
});

function GuardianDashboard() {
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["guardian-connections"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("guardian_connections")
        .select("*, profiles!guardian_connections_guardian_id_fkey(*)")
        .eq("guardian_id", user.id);
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["guardian-alerts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("anti_addiction_alerts")
        .select("*, profiles(*)")
        .in("user_id", connections.map((c: any) => c.ward_id))
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: wellbeingData = [] } = useQuery({
    queryKey: ["wellbeing-data"],
    queryFn: async () => {
      const wardIds = connections.map((c: any) => c.ward_id);
      if (wardIds.length === 0) return [];
      const { data } = await (supabase as any)
        .from("wellbeing_checkins")
        .select("*")
        .in("user_id", wardIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <AppShell title="Guardian Dashboard"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  return (
    <AppShell title="Guardian Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Guardian Overview</h2>
            <p className="text-sm text-muted-foreground">Monitor and support your connected users</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-accent-teal" />
              <div>
                <p className="text-2xl font-bold">{connections.length}</p>
                <p className="text-sm text-muted-foreground">Connected Users</p>
              </div>
            </div>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
              </div>
            </div>
          </div>

          <div className="nexus-card p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-pink-400" />
              <div>
                <p className="text-2xl font-bold">{wellbeingData.length}</p>
                <p className="text-sm text-muted-foreground">Wellbeing Check-ins</p>
              </div>
            </div>
          </div>
        </div>

        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-accent-teal" />
            <h3 className="font-semibold">Connected Users</h3>
          </div>

          <div className="grid gap-4">
            {connections.map((connection: any) => (
              <div key={connection.id} className="p-4 bg-elevated rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{connection.profiles?.display_name || "Anonymous"}</h4>
                    <p className="text-xs text-muted-foreground">
                      Connected since {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    connection.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    connection.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {connection.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {connections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No connected users yet. Users can request guardian connections from their settings.
            </p>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="nexus-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
              <h3 className="font-semibold">Recent Alerts</h3>
            </div>

            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-md">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{alert.profiles?.display_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-orange-400 font-medium">
                      {alert.alert_type}
                    </span>
                  </div>
                  <p className="text-sm">{alert.alert_message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-6 w-6 text-accent-teal" />
            <h3 className="font-semibold">Wellbeing Overview</h3>
          </div>

          <div className="grid gap-4">
            {wellbeingData.slice(0, 5).map((checkin: any) => (
              <div key={checkin.id} className="p-4 bg-elevated rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    Energy Level: {checkin.energy_level}/10
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(checkin.created_at).toLocaleDateString()}
                  </p>
                </div>
                {checkin.emotion && (
                  <p className="text-sm text-muted-foreground">Emotion: {checkin.emotion}</p>
                )}
              </div>
            ))}
          </div>

          {wellbeingData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No wellbeing data available yet.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
