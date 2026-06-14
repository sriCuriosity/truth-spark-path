import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChamberSafetyFooter } from "@/components/chamber-safety-footer";

export const Route = createFileRoute("/_authenticated/chamber")({
  head: () => ({ meta: [{ title: "NEXUS — The Chamber" }] }),
  component: Chamber,
});

function Chamber() {
  const [content, setContent] = useState("");
  const [entryId, setEntryId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["chamber-history"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("chamber_entries").select("id, created_at, updated_at").eq("user_id", u.user.id).order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  // Load today's entry on mount, or selected
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      if (selectedDate) {
        const { data } = await supabase.from("chamber_entries").select("*").eq("id", selectedDate).maybeSingle();
        if (data) { setContent(data.content ?? ""); setEntryId(data.id); }
        return;
      }
      const today = new Date(); today.setHours(0,0,0,0);
      const { data } = await supabase.from("chamber_entries").select("*").eq("user_id", u.user.id).gte("created_at", today.toISOString()).maybeSingle();
      if (data) { setContent(data.content ?? ""); setEntryId(data.id); }
      else { setContent(""); setEntryId(null); }
    })();
  }, [selectedDate]);

  const save = useCallback(async (text: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (entryId) {
      await supabase.from("chamber_entries").update({ content: text, updated_at: new Date().toISOString() }).eq("id", entryId);
    } else {
      const { data } = await supabase.from("chamber_entries").insert({ user_id: u.user.id, content: text }).select().single();
      if (data) setEntryId(data.id);
    }
    setSavedAt(new Date());
    refetchHistory();
  }, [entryId, refetchHistory]);

  function onChange(v: string) {
    setContent(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(v), 1500);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* date nav */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:block">
        <div className="px-5 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <p className="mt-6 text-[10px] uppercase tracking-wider text-muted-foreground">Past entries</p>
          <button onClick={() => setSelectedDate(null)} className={`mt-2 block w-full rounded px-2 py-1.5 text-left text-xs ${!selectedDate ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Today
          </button>
          {history.map((h: any) => (
            <button key={h.id} onClick={() => setSelectedDate(h.id)}
              className={`block w-full rounded px-2 py-1.5 text-left text-xs ${selectedDate === h.id ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {new Date(h.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between px-6">
          <span className="font-display text-sm font-bold tracking-tight">NEXUS</span>
          <span className="text-[11px] text-muted-foreground">
            {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Auto-saves"}
          </span>
        </header>
        <p className="px-6 text-center text-xs text-muted-foreground">This space is yours alone. NEXUS does not read this.</p>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What's actually on your mind?"
          className="flex-1 resize-none bg-background px-6 py-8 text-lg leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
          style={{ minHeight: "60vh" }}
        />
        <ChamberSafetyFooter />
      </div>
    </div>
  );
}
