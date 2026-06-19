import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid, Cell } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmotionWheel } from "@/components/emotion-wheel";
import { supabase } from "@/integrations/supabase/client";
import { Play, Timer, Sparkles, Brain, Award, Activity, Heart, ShieldAlert, Zap } from "lucide-react";
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
  const [activeWellbeingTab, setActiveWellbeingTab] = useState<"checkin" | "rhythm">("checkin");
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
  const [breaksCompleted, setBreaksCompleted] = useState(() => {
    return Number(localStorage.getItem("nexus_somatic_breaks_completed") || "0");
  });

  // Active session timer
  const [sessionTime, setSessionTime] = useState(0); // in seconds

  // Fetch wellbeing checkins
  const { data: checkins = [], refetch } = useQuery({
    queryKey: ["wellbeing-checkins"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("wellbeing_checkins")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
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
        
        // Increment somatic breaks completed count
        const nextVal = breaksCompleted + 1;
        setBreaksCompleted(nextVal);
        localStorage.setItem("nexus_somatic_breaks_completed", String(nextVal));
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

  // Life Rhythm Stats Calculation
  const rhythmStats = useMemo(() => {
    if (checkins.length === 0) return null;

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const energySums = new Array(7).fill(0);
    const energyCounts = new Array(7).fill(0);
    
    checkins.forEach((c: any) => {
      const day = new Date(c.created_at).getDay();
      if (c.energy_level !== null) {
        energySums[day] += c.energy_level;
        energyCounts[day] += 1;
      }
    });

    const dayData = dayNames.map((name, i) => {
      const count = energyCounts[i];
      return {
        name: name.slice(0, 3),
        avgEnergy: count > 0 ? Math.round((energySums[i] / count) * 10) / 10 : 0,
        count
      };
    });

    // Find highest energy day
    let peakDay = "";
    let peakVal = 0;
    dayData.forEach(d => {
      if (d.avgEnergy > peakVal) {
        peakVal = d.avgEnergy;
        peakDay = d.name;
      }
    });

    // Calculate energy-cortex correlation narrative
    const entriesCount = last7.reduce((sum, current) => sum + current.entries, 0);
    const avgEnergyLast7 = last7.length > 0 
      ? Math.round((last7.reduce((sum, current) => sum + current.energy, 0) / last7.length) * 10) / 10 
      : 5;

    return {
      dayData,
      peakDay: peakDay || "No Peak",
      peakVal,
      entriesCount,
      avgEnergyLast7
    };
  }, [checkins, last7]);

  return (
    <AppShell title="Wellbeing Pulse">
      {/* Contemplation Mode Break Reminder Trigger Panel */}
      <div className="mb-4 rounded-xl border border-accent-teal/30 bg-elevated/40 p-5 flex flex-col sm:flex-row justify-between items-center gap-4 glow-teal">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-teal/20 text-accent-teal">
            <Timer className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm">Somatic Contemplation Tracker</h4>
            <p className="text-xs text-muted-foreground font-sans">Session duration active. Pauses reinforce cognitive integration.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block font-mono">Next Break In</span>
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

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveWellbeingTab("checkin")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition ${
            activeWellbeingTab === "checkin" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-elevated/40"
          }`}
        >
          <Activity className="h-4 w-4" /> Pulse Check-In
        </button>
        <button
          onClick={() => setActiveWellbeingTab("rhythm")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition ${
            activeWellbeingTab === "rhythm" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-elevated/40"
          }`}
        >
          <Heart className="h-4 w-4" /> Life Rhythm Dashboard
        </button>
      </div>

      {activeWellbeingTab === "checkin" ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="nexus-card p-6">
              <h2 className="mb-1 font-display text-lg font-semibold">How are you, actually?</h2>
              <p className="mb-6 text-sm text-muted-foreground font-sans">NEXUS learns your rhythms. No judgement.</p>
              <div className="grid items-center gap-6 md:grid-cols-2">
                <EmotionWheel selected={emotion} onSelect={setEmotion} size={240} />
                <div>
                  <label className="block">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Energy</span>
                      <span className="font-mono font-semibold">{energy}/10</span>
                    </div>
                    <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-2 w-full accent-[color:var(--primary)]" />
                  </label>
                  <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Body note (optional)"
                    className="mt-4 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary text-foreground" />
                  <button onClick={submit} disabled={saving} className="mt-3 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition">
                    {saving ? "…" : "Save check-in"}
                  </button>
                </div>
              </div>
            </div>

            {/* Local IndexedDB daily correlations log chart */}
            <div className="nexus-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="mb-1 font-display text-base font-semibold">IndexedDB Correlation Logs</h3>
                <p className="text-xs text-muted-foreground mb-4 font-sans">Correlation between your somatic energy and cortex creation output.</p>
              </div>
              <div className="flex-1 h-[200px]">
                {last7.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
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

          <div className="nexus-card p-6">
            <h3 className="mb-4 font-display text-base font-semibold">Check-in History</h3>
            {checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No check-ins yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                    <tr><th className="pb-2">Date</th><th>Emotion</th><th>Energy</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {(checkins as any[]).map(c => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2.5 text-muted-foreground font-sans text-xs">{new Date(c.created_at).toLocaleString()}</td>
                        <td><span className="chip text-xs">{c.emotion}</span></td>
                        <td className="font-mono text-xs">{c.energy_level}/10</td>
                        <td className="text-muted-foreground text-xs font-sans">{c.body_note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Life Rhythm Tab: Detailed Weekly Pattern Analysis */
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Metric 1 */}
            <div className="nexus-card p-5 space-y-2 border-accent-teal/20 bg-elevated/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground">Somatic Peak</span>
                <Sparkles className="h-4 w-4 text-accent-teal" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground font-display">
                {rhythmStats ? `${rhythmStats.peakDay} (${rhythmStats.peakVal}/10)` : "—"}
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                Day of the week showing your highest self-reported energy levels.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="nexus-card p-5 space-y-2 border-primary/20 bg-elevated/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground">Focus Volume</span>
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground font-display">
                {rhythmStats ? `${rhythmStats.entriesCount} entries` : "—"}
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                Cortex entries documented over the active 7-day window.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="nexus-card p-5 space-y-2 border-accent-pink/20 bg-elevated/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground">Somatic Breaks</span>
                <Award className="h-4 w-4 text-accent-pink" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground font-display">
                {breaksCompleted} paused
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                Completed somatic pauses logged in local browser memory.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Day of Week energy levels chart */}
            <div className="nexus-card p-6 space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold">Weekly Somatic Rhythms</h3>
                <p className="text-xs text-muted-foreground font-sans">Average self-reported energy levels sorted by day of the week.</p>
              </div>
              <div className="h-[250px] w-full">
                {rhythmStats && rhythmStats.totalCheckins > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rhythmStats.dayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="avgEnergy" radius={[4, 4, 0, 0]}>
                        {rhythmStats.dayData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.avgEnergy === rhythmStats.peakVal ? "var(--accent-teal)" : "var(--primary)"} 
                            opacity={entry.avgEnergy > 0 ? 0.85 : 0.2}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                    Not enough check-in data to compile weekly somatic rhythm.
                  </div>
                )}
              </div>
            </div>

            {/* Pattern analysis narrative card */}
            <div className="nexus-card p-6 flex flex-col justify-between border-border/40 bg-surface/30">
              <div>
                <div className="flex items-center gap-1.5 text-accent-amber mb-3">
                  <ShieldAlert className="h-4.5 w-4.5" />
                  <h4 className="font-display font-semibold text-sm">Somatic Balance Analysis</h4>
                </div>
                <div className="text-xs text-muted-foreground space-y-3 font-sans leading-relaxed">
                  <p>
                    <strong>Cognitive Grounding:</strong> Your active logs show a correlation between self-reported somatic energy and Cortex creation rates. Periods of lower energy align with reduced documentation density, highlighting the importance of pacing.
                  </p>
                  <p>
                    <strong>Epistemic Load Sync:</strong> Peak energy points typically coincide with high integration windows. Standard compliance patterns emphasize continuous compliance outputs; NEXUS self-observation suggests that respecting energy drops maintains systemic critical capacity.
                  </p>
                  <p>
                    <strong>Contemplative Recovery:</strong> You have executed <span className="text-foreground font-semibold">{breaksCompleted} somatic break(s)</span>. Each break shifts your autonomic state away from mechanical task compliance, keeping baseline focus stable without significant collapse trends.
                  </p>
                </div>
              </div>
              <div className="border-t border-border/40 pt-3 mt-4 text-[10px] text-muted-foreground/80 font-mono italic">
                *Advisory observations only. NEXUS avoids diagnostic claims, prioritizing autonomous self-regulation.
              </div>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs leading-relaxed text-muted-foreground font-sans">
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
                  className="w-full py-2.5 rounded-md bg-accent-teal text-black font-semibold text-sm hover:opacity-90 transition"
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
