import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmotionWheel } from "@/components/emotion-wheel";
import { supabase } from "@/integrations/supabase/client";
import { Play, Timer, Sparkles, Brain, Award } from "lucide-react";
import { awardXp } from "@/lib/tiers";

export const Route = createFileRoute("/_authenticated/wellbeing")({
  head: () => ({ meta: [{ title: "NEXUS — Wellbeing" }] }),
  component: Wellbeing,
});

// 1. Local-first IndexedDB Database Setup for daily correlation logging
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nexus_wellbeing_db", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("correlations")) {
        db.createObjectStore("correlations", { keyPath: "date" });
      }
    };
  });
}

async function saveDailyLog(log: { date: string; entries_created: number; avg_energy: number }) {
  const db = await openIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("correlations", "readwrite");
    const store = tx.objectStore("correlations");
    store.put(log);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getDailyLogs(): Promise<any[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("correlations", "readonly");
      const store = tx.objectStore("correlations");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("IndexedDB not ready", err);
    return [];
  }
}

function Wellbeing() {
  const [emotion, setEmotion] = useState<string | null>(null);
  const [energy, setEnergy] = useState(6);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // IndexedDB correlation state
  const [dbLogs, setDbLogs] = useState<any[]>([]);

  // Somatic contemplation break states
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakTimerActive, setBreakTimerActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breakAwarded, setBreakAwarded] = useState(false);

  // Active session timer
  const [sessionTime, setSessionTime] = useState(0); // in seconds

  // Fetch wellbeing checkins
  const { data: checkins = [], refetch } = useQuery({
    queryKey: ["wellbeing-checkins"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("wellbeing_checkins").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  // Track session timer for 45-minute notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => {
        const next = prev + 1;
        // 45 minutes = 2700 seconds
        if (next === 2700) {
          triggerContemplationBreak();
        }
        return next;
      });
    }, 1000);

    // Request notification permissions
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, []);

  function triggerContemplationBreak() {
    // Native desktop notification if permitted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("NEXUS Contemplation Pause", {
        body: "You have been active for 45 minutes. Traditional schools enforce compliance; NEXUS encourages somatic breaks. Take a 60-second breath.",
      });
    }
    setShowBreakModal(true);
    setSecondsLeft(60);
    setBreakTimerActive(true);
  }

  // Somatic pause timer breath cycle engine
  useEffect(() => {
    if (!breakTimerActive) return;
    if (secondsLeft === 0) {
      setBreakTimerActive(false);
      handleBreakCompletion();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        const nextSec = s - 1;
        const phaseSec = 60 - nextSec;
        // 6 second breathing cycle: Inhale 2s, Hold 2s, Exhale 2s
        const cycleIndex = phaseSec % 6;
        if (cycleIndex < 2) setBreathPhase("inhale");
        else if (cycleIndex < 4) setBreathPhase("hold");
        else setBreathPhase("exhale");

        return nextSec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breakTimerActive, secondsLeft]);

  async function handleBreakCompletion() {
    setBreakAwarded(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        // Award XP for somatic break
        await awardXp(u.user.id, "evidence_attached"); // Use evidence_attached (5 XP) as a delegate
        toast.success("Somatic pause completed. +5 XP added to your Cortex.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Sync Supabase wellbeing logs & cortex entries to local IndexedDB daily logs
  useEffect(() => {
    async function syncToIndexedDB() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: entries } = await supabase
        .from("cortex_entries")
        .select("created_at")
        .eq("user_id", u.user.id);

      // Aggregate data by date YYYY-MM-DD
      const dateLogs: Record<string, { entries: number; energies: number[] }> = {};

      // Initialize past 7 days
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dateLogs[dateStr] = { entries: 0, energies: [] };
      }

      // Add entries count
      (entries ?? []).forEach((e) => {
        const dateStr = new Date(e.created_at).toISOString().split("T")[0];
        if (dateLogs[dateStr]) {
          dateLogs[dateStr].entries += 1;
        }
      });

      // Add checkins energy
      (checkins ?? []).forEach((c) => {
        const dateStr = new Date(c.created_at).toISOString().split("T")[0];
        if (dateLogs[dateStr] && c.energy_level !== null) {
          dateLogs[dateStr].energies.push(c.energy_level);
        }
      });

      // Write logs to IndexedDB
      for (const [dateStr, val] of Object.entries(dateLogs)) {
        const avgEnergy = val.energies.length
          ? val.energies.reduce((a, b) => a + b, 0) / val.energies.length
          : 5.0; // fallback default energy
        
        await saveDailyLog({
          date: dateStr,
          entries_created: val.entries,
          avg_energy: Math.round(avgEnergy * 10) / 10,
        });
      }

      // Read back from IndexedDB to state
      const logs = await getDailyLogs();
      // Sort logs by date ascending
      logs.sort((a, b) => a.date.localeCompare(b.date));
      setDbLogs(logs.slice(-7)); // Last 7 days
    }

    if (checkins.length > 0) {
      syncToIndexedDB();
    }
  }, [checkins]);

  async function submit() {
    if (!emotion) { toast.error("Pick an emotion first"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase.from("wellbeing_checkins").insert({
        user_id: u.user.id,
        emotion,
        energy_level: energy,
        body_note: note
      });
      if (error) throw error;
      toast.success("Check-in saved.");
      setEmotion(null); setNote("");
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save check-in");
    } finally {
      setSaving(false);
    }
  }

  // 7-day energy data formatting
  const last7 = dbLogs.map(log => ({
    day: new Date(log.date).toLocaleDateString(undefined, { weekday: "short" }),
    energy: log.avg_energy,
    entries: log.entries_created
  }));

  // Format time remaining for next 45-minute somatic break
  const secondsToBreak = Math.max(0, 2700 - (sessionTime % 2700));
  const minToBreak = Math.floor(secondsToBreak / 60);
  const secToBreak = secondsToBreak % 60;

  return (
    <AppShell title="Wellbeing Pulse">
      {/* Contemplation Mode Break Reminder Trigger Panel */}
      <div className="mb-6 rounded-xl border border-accent-teal/30 bg-elevated/40 p-5 flex flex-col sm:flex-row justify-between items-center gap-4 glow-teal">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-teal/20 text-accent-teal">
            <Timer className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">Somatic Contemplation Tracker</h4>
            <p className="text-xs text-muted-foreground">Session duration active. Pauses reinforce cognitive integration.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Next Break In</span>
            <span className="font-mono text-sm text-accent-teal font-bold">{minToBreak}m {secToBreak}s</span>
          </div>
          <button
            onClick={triggerContemplationBreak}
            className="flex items-center gap-1.5 rounded-md bg-accent-teal px-4 py-2 text-xs font-semibold text-black hover:opacity-90 transition"
          >
            <Play className="h-3.5 w-3.5" /> Force Somatic Break
          </button>
        </div>
      </div>

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

        {/* Local IndexedDB daily correlations log chart */}
        <div className="nexus-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="mb-1 font-display text-base font-semibold">IndexedDB Correlation Logs</h3>
            <p className="text-xs text-muted-foreground mb-4">Correlation between your somatic energy and cortex creation output.</p>
          </div>
          <div className="flex-1 h-[200px]">
            {last7.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Collecting data. Complete wellbeing check-ins and add cortex entries to start correlating logs.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" domain={[1, 10]} stroke="var(--accent-teal)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} stroke="var(--primary)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend verticalAlign="top" height={36} iconSize={10} fontSize={11} />
                  <Line yAxisId="left" type="monotone" name="Avg Energy (IndexedDB)" dataKey="energy" stroke="var(--accent-teal)" strokeWidth={2.5} dot={{ fill: "var(--accent-teal)", r: 3 }} />
                  <Line yAxisId="right" type="monotone" name="Cortex Submissions" dataKey="entries" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: "var(--primary)", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
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

      {/* Contemplation breathing overlay modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-accent-teal/20 bg-accent-teal/5">
              {/* Pulsing breathing animation sphere */}
              <div
                className={`absolute rounded-full bg-accent-teal/15 transition-all duration-1000 ${
                  breathPhase === "inhale" ? "h-28 w-28 scale-100 opacity-80" :
                  breathPhase === "hold" ? "h-28 w-28 scale-105 opacity-100" :
                  "h-16 w-16 scale-75 opacity-40"
                }`}
              />
              <Brain className="h-10 w-10 text-accent-teal z-10" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold tracking-tight text-accent-teal uppercase">
                {breathPhase === "inhale" && "Inhale deeply..."}
                {breathPhase === "hold" && "Hold the breath..."}
                {breathPhase === "exhale" && "Exhale slowly..."}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">Contemplation timer: {secondsLeft} seconds remaining</p>
            </div>

            <div className="nexus-card p-5 border-accent-teal/20 bg-elevated/40 text-left">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Traditional education drills physical compliance by demanding long focus loops that reduce critical cognitive resistance. NEXUS inverts this by forcing contemplation periods. Resetting somatic rhythm restores truth-seeking capacity.
              </p>
            </div>

            {breakAwarded ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-1 text-accent-teal font-semibold text-sm">
                  <Award className="h-5 w-5" /> Somatic break logged successfully! (+5 XP)
                </div>
                <button
                  onClick={() => {
                    setShowBreakModal(false);
                    setBreakAwarded(false);
                  }}
                  className="w-full py-2.5 rounded-md bg-accent-teal text-black font-semibold text-sm"
                >
                  Return to NEXUS
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setBreakTimerActive(false);
                  setShowBreakModal(false);
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Skip contemplation break (reduce integration speed)
              </button>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

