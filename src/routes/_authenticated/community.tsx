import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "NEXUS — Learning Circle" }] }),
  component: Community,
});

function Community() {
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

  return (
    <AppShell title="Learning Circle">
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
        <div className="nexus-card h-fit p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Question wall</p>
          <p className="mt-2 text-sm text-muted-foreground">Post a question you've always wanted to ask. Others will think with you.</p>
          <button className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Post a question</button>
        </div>
      </div>
    </AppShell>
  );
}
