import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Brain, Compass, Users, Lock, GraduationCap, HeartPulse, Settings, Bell, Search, LogOut, Sparkles, Layers, MessageCircle, Scale, BookOpen, Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { shouldShowTier } from "@/lib/tiers";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Sparkles },
  { to: "/cortex", label: "My Cortex", icon: Brain },
  { to: "/coach", label: "AI Coach", icon: MessageCircle },
  { to: "/domains", label: "Explore Domains", icon: Compass },
  { to: "/community", label: "Learning Circle", icon: Users },
  { to: "/knowledge-base", label: "Community Wiki", icon: BookOpen },
  { to: "/governance", label: "Governance", icon: Scale },
  { to: "/chamber", label: "The Chamber", icon: Lock },
  { to: "/mentor", label: "Mentor Connect", icon: GraduationCap },
  { to: "/institutional", label: "Institutional Space", icon: Building2 },
  { to: "/wellbeing", label: "Wellbeing Pulse", icon: HeartPulse },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;


export function AppShell({ title, children, fullBleed = false }: { title: string; children: React.ReactNode; fullBleed?: boolean }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return 0;
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", u.user.id).eq("read", false);
      return count ?? 0;
    },
  });

  const { data: pendingSuggestionsCount = 0 } = useQuery({
    queryKey: ["pending-suggestions-count"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return 0;
      const { count } = await (supabase as any).from("cortex_suggestions").select("*", { count: "exact", head: true }).eq("user_id", u.user.id).eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 ring-1 ring-primary/40">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">NEXUS</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to as any}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active ? "bg-elevated text-foreground" : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground"
                }`}
              >
                {active && <span className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full bg-primary" />}
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {/* Suggestions nav link */}
          <Link
            to="/integrations/suggestions"
            className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
              pathname === "/integrations/suggestions" ? "bg-elevated text-foreground" : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground"
            }`}
          >
            {pathname === "/integrations/suggestions" && <span className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full bg-primary" />}
            <span className="relative">
              <Layers className="h-4 w-4" />
              {pendingSuggestionsCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 h-3.5 min-w-3.5 rounded-full bg-accent-teal px-0.5 text-center text-[8px] font-bold leading-3.5 text-background">
                  {pendingSuggestionsCount}
                </span>
              )}
            </span>
            Suggestions
          </Link>
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-elevated text-sm font-semibold">
                  {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent-teal ring-2 ring-surface" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.display_name ?? "You"}</p>
              {shouldShowTier((profile as any)?.tier_visibility) && (
                <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{profile?.current_tier ?? "seeker"}</p>
              )}
            </div>
            <button onClick={signOut} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
          <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search your cortex…"
                className="w-64 rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Suggestions inbox icon */}
            <Link
              to="/integrations/suggestions"
              className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-surface hover:bg-elevated"
              title="Suggestions"
            >
              <Layers className="h-4 w-4" />
              {pendingSuggestionsCount > 0 && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-teal ring-2 ring-background" />
              )}
            </Link>

            <button className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-surface hover:bg-elevated">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-amber px-1 text-[10px] font-bold text-background">{unreadCount}</span>
              )}
            </button>
            <Link to="/wellbeing" className="grid h-9 w-9 place-items-center rounded-md border border-accent-teal/30 bg-surface hover:bg-elevated glow-teal">
              <HeartPulse className="h-4 w-4 text-accent-teal" />
            </Link>
          </div>
        </header>
        <main className={fullBleed ? "flex-1" : "flex-1 px-6 py-6"}>{children}</main>
        {/* Mobile bottom nav */}
        <nav className="sticky bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface px-2 py-2 md:hidden">
          {NAV.slice(0, 5).map(({ to, icon: Icon, label }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to as any} className={`grid place-items-center rounded-md px-3 py-2 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                <span className="mt-0.5">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
