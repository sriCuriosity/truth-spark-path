import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmotionWheel } from "@/components/emotion-wheel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/wellbeing")({
  head: () => ({ meta: [{ title: "NEXUS — Wellbeing" }] }),
  component: Wellbeing,
});

function Wellbeing() {
  const [emotion, setEmotion] = useState<string | null>(null);
  const [energy, setEnergy] = useState(6);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: checkins = [], refetch } = useQuery({
    queryKey: ["wellbeing-checkins"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("wellbeing_checkins").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  async function submit() {
    if (!emotion) { toast.error("Pick an emotion first"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("wellbeing_checkins").insert({ user_id: u.user.id, emotion, energy_level: energy, body_note: note });
    setSaving(false);
    if (error) { toast.error("Couldn't save"); return; }
    toast.success("Check-in saved.");
    setEmotion(null); setNote("");
    refetch();
  }

  // 7-day energy data
  const last7 = [...Array(7)].map((_, i) => {
    const day = new Date(); day.setDate(day.getDate() - (6 - i)); day.setHours(0,0,0,0);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const dayCheckins = (checkins as any[]).filter(c => {
      const t = new Date(c.created_at); return t >= day && t < next;
    });
    const avg = dayCheckins.length ? dayCheckins.reduce((s, c) => s + (c.energy_level ?? 0), 0) / dayCheckins.length : null;
    return { day: day.toLocaleDateString(undefined, { weekday: "short" }), energy: avg };
  });

  return (
    <AppShell title="Wellbeing Pulse">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="nexus-card p-6">
          <h2 className="mb-1 font-display text-lg font-semibold">How are you, actually?</h2>
          <p className="mb-6 text-sm text-muted-foreground">NEXUS learns your rhythms. No judgement.</p>
          <div className="grid items-center gap-6 md:grid-cols-2">
            <EmotionWheel selected={emotion} onSelect={setEmotion} size={240} />
            <div>
              <label className="block">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="font-mono">{energy}/10</span>
                </div>
                <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-2 w-full accent-[color:var(--primary)]" />
              </label>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Body note (optional)"
                className="mt-4 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={submit} disabled={saving} className="mt-3 w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving ? "…" : "Save check-in"}
              </button>
            </div>
          </div>
        </div>

        <div className="nexus-card p-6">
          <h3 className="mb-4 font-display text-base font-semibold">7-day energy</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={last7}>
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 10]} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={20} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="energy" stroke="var(--accent-teal)" strokeWidth={2.5} dot={{ fill: "var(--accent-teal)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 nexus-card p-6">
        <h3 className="mb-4 font-display text-base font-semibold">History</h3>
        {checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="pb-2">Date</th><th>Emotion</th><th>Energy</th><th>Note</th></tr>
              </thead>
              <tbody>
                {(checkins as any[]).map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2.5 text-muted-foreground">{new Date(c.created_at).toLocaleString()}</td>
                    <td><span className="chip">{c.emotion}</span></td>
                    <td className="font-mono">{c.energy_level}/10</td>
                    <td className="text-muted-foreground">{c.body_note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
