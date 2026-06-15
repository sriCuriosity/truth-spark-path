import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Send, Sparkles, Brain, HeartPulse, GraduationCap,
  Layers, ArrowLeft, Loader2, MessageSquare,
  CheckCircle2, Clock, Target, Plus, Shield, Key, Eye, User, ChevronRight, XCircle, Trash, Calendar
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { nextTier, tierProgress, type TierName } from "@/lib/tiers";
import { chatWithMentor } from "@/lib/api/mentor.functions";

const MENTOR_COVENANT = `I am here to walk beside, not to lead.
I share my experience, not universal truth.
I am still learning. I will be wrong.
I will not use this relationship for anything except mutual growth.
If I fail in this, I expect the community to hold me accountable.`;

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "NEXUS — Mentor Hub" }] }),
  component: MentorPage,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

// AES-GCM Encryption Helpers for local-first E2E security
async function encryptMessage(text: string, keyString: string): Promise<string> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(keyString.padEnd(32, '0').slice(0, 32));
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptMessage(base64: string, keyString: string): Promise<string> {
  try {
    const combined = new Uint8Array(
      atob(base64).split("").map((c) => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const enc = new TextEncoder();
    const rawKey = enc.encode(keyString.padEnd(32, '0').slice(0, 32));
    const key = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    return "[Decryption Failed — Key Mismatch]";
  }
}

// Sub-component to decrypt reactively when key or message updates
function EncryptedMessageText({ ciphertext, passphrase }: { ciphertext: string; passphrase: string }) {
  const [decrypted, setDecrypted] = useState<string>("...");

  useEffect(() => {
    if (!passphrase) {
      setDecrypted("[Encrypted Message — Enter Passphrase to Decrypt]");
      return;
    }
    decryptMessage(ciphertext, passphrase).then((text) => {
      setDecrypted(text);
    });
  }, [ciphertext, passphrase]);

  return <span className="break-words font-sans">{decrypted}</span>;
}

function MentorPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"ai-mentor" | "human-mentee" | "human-mentor">("ai-mentor");
  const [covenantAccepted, setCovenantAccepted] = useState(false);
  const [joining, setJoining] = useState(false);
  
  // Encryption Passphrase (stored in component state/memory only)
  const [passphrase, setPassphrase] = useState<string>("");

  // AI Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mentor Workspace State
  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);
  const [viewingCortexEntryId, setViewingCortexEntryId] = useState<string | null>(null);
  
  // Goal Modal/Form State
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [goalDate, setGoalDate] = useState("");

  // Closure Form State
  const [closureOpen, setClosureOpen] = useState(false);
  const [closureReason, setClosureReason] = useState("completed");
  const [closureNotes, setClosureNotes] = useState("");

  // Chat Message Input
  const [asyncChatInput, setAsyncChatInput] = useState("");

  // Get Current User Profile
  const { data: profile } = useQuery({
    queryKey: ["me-profile-full"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  // Check if current user is eligible to mentor
  const { data: mentorDev } = useQuery({
    queryKey: ["mentor-dev-status"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("mentor_development").select("*").eq("mentor_id", u.user.id).maybeSingle();
      return data;
    }
  });

  // Cortex Entries (own)
  const { data: entries = [] } = useQuery({
    queryKey: ["cortex-entries-all"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("cortex_entries")
        .select("id, title, entry_type, domains, created_at")
        .eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  // Wellbeing (own)
  const { data: wellbeing } = useQuery({
    queryKey: ["latest-wellbeing-checkin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("wellbeing_checkins")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Integrations (own)
  const { data: integrations = [] } = useQuery({
    queryKey: ["connected-integrations-list"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("user_integrations")
        .select("platform, is_connected")
        .eq("user_id", u.user.id)
        .eq("is_connected", true);
      return data ?? [];
    },
  });

  // ----------------------------------------------------
  // HUMAN CO-MENTORSHIP QUERIES (AS MENTEE)
  // ----------------------------------------------------
  const { data: activeMentorshipAsMentee } = useQuery({
    queryKey: ["mentorship-as-mentee"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("mentorships")
        .select("*, mentor:profiles!mentor_id(display_name, handle, avatar_url, bio)")
        .eq("mentee_id", u.user.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    }
  });

  // ----------------------------------------------------
  // HUMAN CO-MENTORSHIP QUERIES (AS MENTOR)
  // ----------------------------------------------------
  const { data: activeMentees = [] } = useQuery({
    queryKey: ["active-mentees"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("mentorships")
        .select("*, mentee:profiles!mentee_id(id, display_name, handle, avatar_url, bio, current_tier, total_xp)")
        .eq("mentor_id", u.user.id)
        .eq("status", "active");
      return data ?? [];
    }
  });

  // Find selected mentee details
  const selectedMenteeRelation = activeMentees.find(m => m.mentee_id === selectedMenteeId);

  // Query selected mentee's cortex entries
  const { data: menteeCortexEntries = [] } = useQuery({
    queryKey: ["mentee-cortex", selectedMenteeId],
    enabled: !!selectedMenteeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cortex_entries")
        .select("*")
        .eq("user_id", selectedMenteeId)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
  });

  // Query mentorship goals
  const activeMentorshipId = activeMentorshipAsMentee?.id || selectedMenteeRelation?.id;
  
  const { data: mentorshipGoals = [] } = useQuery({
    queryKey: ["mentorship-goals", activeMentorshipId],
    enabled: !!activeMentorshipId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentorship_goals")
        .select("*")
        .eq("mentorship_id", activeMentorshipId)
        .order("created_at", { ascending: true });
      return data ?? [];
    }
  });

  // Query async messages
  const { data: asyncMessages = [] } = useQuery({
    queryKey: ["mentor-messages", activeMentorshipId],
    enabled: !!activeMentorshipId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_messages")
        .select("*, sender:profiles!sender_id(display_name, avatar_url)")
        .eq("mentorship_id", activeMentorshipId)
        .order("created_at", { ascending: true });
      return data ?? [];
    }
  });

  // Query cortex access logs
  const { data: accessLogs = [] } = useQuery({
    queryKey: ["cortex-access-logs", activeMentorshipId],
    enabled: !!activeMentorshipId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const isMentee = activeMentorshipAsMentee?.id === activeMentorshipId;
      const menteeUid = isMentee ? u.user.id : selectedMenteeId;
      const { data } = await supabase
        .from("cortex_access_logs")
        .select("*, cortex_entry:cortex_entries(title)")
        .eq("mentee_id", menteeUid)
        .order("accessed_at", { ascending: false });
      return data ?? [];
    }
  });

  // ----------------------------------------------------
  // MUTATIONS (Goals, Logs, Messages, Closures)
  // ----------------------------------------------------
  const addGoalMutation = useMutation({
    mutationFn: async () => {
      if (!activeMentorshipId || !goalTitle.trim()) return;
      await supabase.from("mentorship_goals").insert({
        mentorship_id: activeMentorshipId,
        title: goalTitle.trim(),
        description: goalDesc.trim() || null,
        target_date: goalDate || null,
        completed: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-goals", activeMentorshipId] });
      setGoalTitle("");
      setGoalDesc("");
      setGoalDate("");
      toast.success("Shared goal established.");
    }
  });

  const toggleGoalMutation = useMutation({
    mutationFn: async ({ goalId, completed }: { goalId: string; completed: boolean }) => {
      await supabase
        .from("mentorship_goals")
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq("id", goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-goals", activeMentorshipId] });
      toast.success("Goal milestone updated.");
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await supabase.from("mentorship_goals").delete().eq("id", goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-goals", activeMentorshipId] });
      toast.success("Goal deleted.");
    }
  });

  const sendAsyncMessageMutation = useMutation({
    mutationFn: async () => {
      if (!activeMentorshipId || !asyncChatInput.trim() || !passphrase) {
        throw new Error("Missing passphrase or message content");
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      
      const cipherText = await encryptMessage(asyncChatInput.trim(), passphrase);
      await supabase.from("mentor_messages").insert({
        mentorship_id: activeMentorshipId,
        sender_id: u.user.id,
        encrypted_content: cipherText
      });
    },
    onSuccess: () => {
      setAsyncChatInput("");
      queryClient.invalidateQueries({ queryKey: ["mentor-messages", activeMentorshipId] });
      toast.success("Encrypted message sent async.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send encrypted message.");
    }
  });

  const logCortexAccessMutation = useMutation({
    mutationFn: async (entryId: string) => {
      if (!selectedMenteeId) return;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      await supabase.from("cortex_access_logs").insert({
        mentor_id: u.user.id,
        mentee_id: selectedMenteeId,
        cortex_entry_id: entryId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cortex-access-logs", activeMentorshipId] });
    }
  });

  const closeMentorshipMutation = useMutation({
    mutationFn: async () => {
      if (!activeMentorshipId) return;
      await supabase
        .from("mentorships")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closure_reason: closureReason,
          closure_notes: closureNotes.trim() || null
        })
        .eq("id", activeMentorshipId);
    },
    onSuccess: () => {
      setClosureOpen(false);
      setSelectedMenteeId(null);
      queryClient.invalidateQueries({ queryKey: ["active-mentees"] });
      queryClient.invalidateQueries({ queryKey: ["mentorship-as-mentee"] });
      toast.success("Mentorship relationship closed restfully.");
    }
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("mentor_development").upsert({
        mentor_id: u.user.id,
        development_phase: "onboarding",
        mentor_covenant_accepted: true,
        covenant_accepted_at: new Date().toISOString(),
      }, { onConflict: "mentor_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-dev-status"] });
      toast.success("Covenant accepted. You have entered the co-mentorship waitlist.");
    }
  });

  // Initialize welcome message once profile is loaded
  useEffect(() => {
    if (profile && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Greetings, **${profile.display_name || "Seeker"}**. I am your NEXUS AI Mentor. I have synthesized your Cortex progress report. What learning, pattern, or perspective shift shall we reflect on today?`,
          timestamp: new Date(),
        }
      ]);
    }
  }, [profile, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading]);

  // Calculations for prompt and UI
  const currentTier = (profile?.current_tier ?? "seeker") as TierName;
  const totalXp = (profile as { total_xp?: number })?.total_xp ?? 0;
  const nxt = nextTier(currentTier);
  const tProgress = tierProgress(totalXp, currentTier);

  const perspectiveShifts = entries.filter((e) => e.entry_type === "perspective_shift").length;
  const experiments = entries.filter((e) => e.entry_type === "experiment").length;
  const insights = entries.filter((e) => e.entry_type === "insight").length;
  const uniqueDomains = [...new Set(entries.flatMap((e) => e.domains ?? []))];

  // Send message to Nvidia AI model
  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    setInput("");
    
    const userMessage: ChatMessage = {
      role: "user",
      content: userMessageText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    const recentLogsSummary = entries
      .slice(0, 3)
      .map((e) => `"${e.title}" (${e.entry_type})`)
      .join(", ");

    const systemPrompt = `You are NEXUS AI Mentor, a deep, socratic, and highly intuitive learning guidance system. Your purpose is to walk beside the user, helping them connect the dots of their learning journey, challenge assumptions, and suggest reflective pathways.

Here is the user's live Progress Report:
- Name: ${profile?.display_name ?? "Seeker"}
- Bio: ${profile?.bio ?? "Not set"}
- Current Tier: ${profile?.current_tier ?? "seeker"} (XP: ${profile?.total_xp ?? 0})
- Connected Platforms: ${integrations.map((i: any) => i.platform).join(", ") || "None"}
- Personal Core Values: ${profile?.values?.join(", ") || "None specified"}
- Active Open Question: ${profile?.open_questions?.[0] ? `"${profile.open_questions[0]}"` : "None set yet"}
- Total Cortex Entries: ${entries.length} (${perspectiveShifts} perspective shifts, ${experiments} experiments, ${insights} insights)
- Learning Domains/Topics explored: ${uniqueDomains.join(", ") || "None yet"}
- Recent Wellbeing State: ${wellbeing ? `Feeling ${wellbeing.emotion} with energy ${wellbeing.energy_level}/10` : "No recent check-ins"}
- Recent Cortex logs: ${recentLogsSummary || "No entries yet"}

STANCE & STYLE GUIDELINES:
1. Socratic & Reflective: Ask probing questions to lead the user to self-realization rather than lecturing. Do not prescribe rigid answers.
2. Connected: Naturally reference their progress report. When they ask "How is my progress?" or "Give me my report," summarize their stats, values, wellbeing check-ins, and cortex counts in a mentoring and encouraging voice.
3. Empathetic and authentic: Treat the user's wellbeing and cognitive health seriously. If they mention burnout or low energy, help them balance reflection with pause.
4. Keep answers concise, clear, and formatted nicely in Markdown. Use bullets or short paragraphs. Ensure a highly premium mentoring presence.`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || "";

      const res = await chatWithMentor({
        data: {
          accessToken,
          systemPrompt,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      const answer = res.content || "I am reflecting on your path, but couldn't formulate a response right now. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error("AI Mentor Chat Error:", err);
      toast.error(err.message || "Failed to communicate with AI Mentor.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ **System Notice**: I failed to reach the NVIDIA reasoning model. Please ensure the API token is configured correctly on the server.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Handle cortex entry expand to log access
  const handleViewCortexEntry = (entry: any) => {
    if (viewingCortexEntryId === entry.id) {
      setViewingCortexEntryId(null);
    } else {
      setViewingCortexEntryId(entry.id);
      // Log it
      logCortexAccessMutation.mutate(entry.id);
    }
  };

  return (
    <AppShell title="Co-Mentorship Hub">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/80 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("ai-mentor")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === "ai-mentor" ? "bg-primary text-black" : "bg-elevated hover:bg-elevated/70"}`}
            >
              AI Mentor
            </button>
            <button
              onClick={() => setActiveTab("human-mentee")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === "human-mentee" ? "bg-primary text-black" : "bg-elevated hover:bg-elevated/70"}`}
            >
              My Human Mentor
            </button>
            <button
              onClick={() => setActiveTab("human-mentor")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === "human-mentor" ? "bg-primary text-black" : "bg-elevated hover:bg-elevated/70"}`}
            >
              Mentees Dashboard
            </button>
          </div>
          
          <div className="text-xs text-muted-foreground font-mono">
            Tier Status: <strong className="capitalize text-foreground">{currentTier}</strong>
          </div>
        </div>

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 1: AI SOCRATIC COACH */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "ai-mentor" && (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            
            {/* Left Column: Glassmorphic Progress Report */}
            <div className="space-y-4">
              <div className="nexus-card p-5 relative overflow-hidden bg-surface/50 backdrop-blur-md border border-border/60">
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-elevated text-md font-semibold">
                      {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-md font-semibold">{profile?.display_name ?? "You"}</h3>
                    <p className="text-xs text-muted-foreground">@{profile?.handle || "seeker"}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Current Tier: <strong className="capitalize text-foreground">{currentTier}</strong></span>
                    {nxt && <span className="font-mono text-[10px]">→ {nxt.label}</span>}
                  </div>
                  
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0">
                      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--primary)" strokeWidth="3"
                          strokeDasharray={`${(tProgress / 100) * 94.25} 94.25`}
                          transform="rotate(-90 18 18)" strokeLinecap="round" />
                      </svg>
                      <Sparkles className="absolute inset-2 h-6 w-6 text-primary/70" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{totalXp} XP</p>
                      <p className="text-[10px] text-muted-foreground">{entries.length} cortex entries</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cortex Stats */}
              <div className="nexus-card p-5 bg-surface/50 backdrop-blur-md border border-border/60">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-primary" /> Cortex Composition
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Perspective Shifts</span>
                    <span className="font-semibold text-accent-teal">{perspectiveShifts}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Experiments</span>
                    <span className="font-semibold text-accent-amber">{experiments}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Insights</span>
                    <span className="font-semibold text-primary">{insights}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Chat Panel */}
            <div className="nexus-card flex flex-col h-[600px] bg-surface/30 backdrop-blur-md border border-border/60 p-0 overflow-hidden">
              <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between bg-surface/40">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500" />
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 border border-primary/20">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">AI Socratic Mentor</h3>
                    <p className="text-[9px] font-mono text-muted-foreground uppercase">Nemotron-3 Omni Reasoning</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((m, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2.5 max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className="h-7 w-7 shrink-0 rounded-md border border-border bg-elevated grid place-items-center text-xs font-bold font-display">
                          {m.role === "user" ? "U" : "M"}
                        </div>
                        <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed border ${
                          m.role === "user" 
                            ? "bg-primary/10 text-foreground border-primary/30 rounded-tr-none" 
                            : "bg-elevated/50 text-foreground border-border/80 rounded-tl-none"
                        }`}>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <span className="block text-[9px] text-muted-foreground/60 text-right mt-1.5">
                            {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2.5 max-w-[80%] items-center">
                        <div className="h-7 w-7 shrink-0 rounded-md border border-border bg-elevated grid place-items-center text-xs font-bold font-display">M</div>
                        <div className="rounded-xl px-4 py-3 bg-elevated/40 border border-border/50 rounded-tl-none flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground font-mono">Formulating Socratic response...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/60 bg-surface/40 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your AI Mentor about your progress..."
                  className="flex-1 rounded-lg border border-border bg-elevated px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 2: MY HUMAN MENTOR (FOR MENTEES) */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "human-mentee" && (
          <div className="space-y-6">
            {activeMentorshipAsMentee ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
                {/* Main panel */}
                <div className="space-y-6">
                  {/* Bio & Details */}
                  <div className="nexus-card p-6 bg-surface/40 border border-border/60 flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-lg font-bold border border-primary/30">
                      {activeMentorshipAsMentee.mentor?.display_name?.slice(0, 1).toUpperCase() || "M"}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground">
                        Co-Mentor: {activeMentorshipAsMentee.mentor?.display_name || "Unknown Mentor"}
                      </h3>
                      <p className="text-xs text-muted-foreground">@{activeMentorshipAsMentee.mentor?.handle || "mentor"}</p>
                      {activeMentorshipAsMentee.mentor?.bio && (
                        <p className="text-sm mt-3 text-muted-foreground/80">{activeMentorshipAsMentee.mentor.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Encrypted Async Messaging */}
                  <div className="nexus-card p-6 bg-surface/30 border border-border/60 space-y-4">
                    <div className="flex justify-between items-center border-b border-border/40 pb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" /> Encrypted Async Messages
                      </h4>
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-accent-teal" />
                        <input
                          type="password"
                          placeholder="Passphrase"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          className="bg-elevated border border-border text-xs rounded px-2 py-1 w-32 focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="h-60 overflow-y-auto space-y-3 p-2 bg-surface/10 rounded border border-border/30">
                      {asyncMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center pt-24">No messages yet.</p>
                      ) : (
                        asyncMessages.map((msg: any) => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender_id === profile?.id ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[85%] rounded px-3 py-2 text-xs border ${
                              msg.sender_id === profile?.id 
                                ? "bg-primary/10 border-primary/30 text-foreground" 
                                : "bg-elevated border-border/60 text-foreground"
                            }`}>
                              <EncryptedMessageText ciphertext={msg.encrypted_content} passphrase={passphrase} />
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                              {msg.sender?.display_name || "Co-Learner"} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write encrypted async reply..."
                        value={asyncChatInput}
                        onChange={(e) => setAsyncChatInput(e.target.value)}
                        disabled={!passphrase}
                        className="flex-1 bg-elevated border border-border rounded px-3 py-2 text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                      />
                      <button
                        onClick={() => sendAsyncMessageMutation.mutate()}
                        disabled={!passphrase || !asyncChatInput.trim()}
                        className="bg-primary text-black px-4 rounded text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Send className="h-3.5 w-3.5" /> Send
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar details */}
                <div className="space-y-6">
                  {/* Shared Goals / Milestones */}
                  <div className="nexus-card p-5 bg-surface/40 border border-border/60 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Co-Mentoring Milestones
                    </h4>
                    <div className="space-y-2">
                      {mentorshipGoals.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-4">No active milestones configured.</p>
                      ) : (
                        mentorshipGoals.map((g: any) => (
                          <div key={g.id} className="flex items-start gap-2.5 p-2 bg-surface/20 rounded border border-border/40">
                            <input
                              type="checkbox"
                              checked={g.completed}
                              onChange={(e) => toggleGoalMutation.mutate({ goalId: g.id, completed: e.target.checked })}
                              className="mt-1 h-3.5 w-3.5 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold ${g.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {g.title}
                              </p>
                              {g.description && <p className="text-[10px] text-muted-foreground mt-0.5">{g.description}</p>}
                              {g.target_date && (
                                <p className="text-[9px] text-primary/70 mt-1 flex items-center gap-1 font-mono">
                                  <Calendar className="h-3 w-3" /> Target: {g.target_date}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Cortex Access Logs Timeline */}
                  <div className="nexus-card p-5 bg-surface/40 border border-border/60 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent-teal" /> Cortex Access Timeline
                    </h4>
                    <p className="text-[10px] text-muted-foreground">Every time your co-mentor reviews your cortex entries, an entry is cryptographically audited here.</p>
                    
                    <div className="relative border-l border-border/40 ml-2.5 pl-4 space-y-4">
                      {accessLogs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-2 py-2">No audits logged yet.</p>
                      ) : (
                        accessLogs.slice(0, 5).map((log: any) => (
                          <div key={log.id} className="relative text-xs">
                            <span className="absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full bg-accent-teal ring-4 ring-background" />
                            <p className="font-semibold text-foreground">
                              Mentor reviewed: <span className="text-accent-teal">"{log.cortex_entry?.title || "Cortex Entry"}"</span>
                            </p>
                            <span className="text-[9px] text-muted-foreground block mt-0.5">
                              {new Date(log.accessed_at).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Waitlist onboarding/pathway component */
              <div className="mx-auto max-w-2xl space-y-6">
                <div className="nexus-card p-10 text-center space-y-4">
                  <GraduationCap className="h-12 w-12 text-primary mx-auto" />
                  <h2 className="font-display text-2xl font-bold">Initiate Co-Mentorship Pathway</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect with human guides who have achieved CONTRIBUTOR+ tier status. Mentors inside NEXUS share context, validate claims, and check-in async using E2E encrypted messages.
                  </p>
                </div>

                <div className="nexus-card p-6 space-y-4">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" /> Mentor Covenant & Rules
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-md border border-border bg-elevated p-4 font-sans text-xs text-muted-foreground">{MENTOR_COVENANT}</pre>
                  
                  {mentorDev?.mentor_covenant_accepted ? (
                    <div className="p-3 bg-primary/10 border border-primary/30 rounded text-xs text-primary flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Covenant Accepted. You are on the pairing waitlist.
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={covenantAccepted} 
                          onChange={(e) => setCovenantAccepted(e.target.checked)} 
                          className="mt-0.5 h-4 w-4 accent-primary" 
                        />
                        <span>I understand the rules of mentorship transparency and consent. I agree to hold my co-mentor accountable.</span>
                      </label>
                      <button
                        onClick={() => joinWaitlistMutation.mutate()}
                        disabled={!covenantAccepted || joinWaitlistMutation.isPending}
                        className="rounded-md bg-primary text-black px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {joinWaitlistMutation.isPending ? "Submitting..." : "Accept Covenant & Enter Waitlist"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 3: MENTEES DASHBOARD (FOR MENTORS) */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === "human-mentor" && (
          <div className="space-y-6">
            {!mentorDev?.solo_eligible && profile?.current_tier !== "Architect" && profile?.current_tier !== "Contributor" ? (
              <div className="nexus-card p-8 text-center space-y-4 max-w-xl mx-auto">
                <Lock className="h-10 w-10 text-accent-amber mx-auto" />
                <h3 className="font-display text-lg font-bold">Contributor Tier Required</h3>
                <p className="text-xs text-muted-foreground">
                  To access the Mentees Dashboard and guide other co-learners, you must earn a reputation score of **Contributor** tier or above (minimum 2000 XP) and sign the Mentor Covenant.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
                {/* Left Side: Mentee List */}
                <div className="space-y-4">
                  <div className="nexus-card p-4 bg-surface/40 border border-border/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      My Mentees ({activeMentees.length})
                    </h4>
                    <div className="space-y-1">
                      {activeMentees.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No active mentees assigned.</p>
                      ) : (
                        activeMentees.map((m: any) => (
                          <button
                            key={m.mentee_id}
                            onClick={() => {
                              setSelectedMenteeId(m.mentee_id);
                              setViewingCortexEntryId(null);
                            }}
                            className={`w-full text-left p-2.5 rounded text-xs flex items-center justify-between transition ${
                              selectedMenteeId === m.mentee_id ? "bg-primary text-black font-semibold" : "bg-elevated hover:bg-elevated/70 text-foreground"
                            }`}
                          >
                            <span className="truncate">{m.mentee?.display_name || "Co-Learner"}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Active Mentee workspace */}
                {selectedMenteeRelation ? (
                  <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Mentee workspace contents */}
                    <div className="space-y-6">
                      {/* Health Decay and Header */}
                      <div className="nexus-card p-5 bg-surface/40 border border-border/60 flex items-center justify-between">
                        <div>
                          <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Workspace: {selectedMenteeRelation.mentee?.display_name}
                          </h3>
                          <p className="text-xs text-muted-foreground">Tier: {selectedMenteeRelation.mentee?.current_tier} • XP: {selectedMenteeRelation.mentee?.total_xp}</p>
                        </div>
                        
                        {/* Health Decay Status */}
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase font-mono block">Relationship Health</span>
                          <div className="flex items-center gap-2 mt-1 justify-end">
                            <HeartPulse className={`h-4.5 w-4.5 ${
                              Number(selectedMenteeRelation.relationship_health_decay) < 0.60 ? "text-red-500 animate-pulse" : "text-green-500"
                            }`} />
                            <span className="text-xs font-bold font-mono">
                              {Math.round(Number(selectedMenteeRelation.relationship_health_decay) * 100)}%
                            </span>
                          </div>
                          {Number(selectedMenteeRelation.relationship_health_decay) < 0.60 && (
                            <span className="text-[9px] text-red-400 font-medium">Decaying status. Send a check-in message!</span>
                          )}
                        </div>
                      </div>

                      {/* Mentee Shared Cortex Entries */}
                      <div className="nexus-card p-6 bg-surface/30 border border-border/60 space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" /> Shared Cortex Entries
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Reviewing cortexes logs your ID directly in their transparency audit logs.
                        </p>
                        
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {menteeCortexEntries.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-6">No cortex entries shared yet.</p>
                          ) : (
                            menteeCortexEntries.map((entry: any) => (
                              <div key={entry.id} className="border border-border/40 rounded-lg p-3.5 bg-surface/20 space-y-2">
                                <div className="flex justify-between items-start">
                                  <h5 className="text-xs font-bold text-foreground">{entry.title}</h5>
                                  <span className="chip text-[9px] py-0.5 px-1 bg-elevated">{entry.entry_type}</span>
                                </div>
                                
                                <button
                                  onClick={() => handleViewCortexEntry(entry)}
                                  className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                                >
                                  <Eye className="h-3 w-3" /> 
                                  {viewingCortexEntryId === entry.id ? "Hide Entry Content" : "Inspect Cortex (Audit Logged)"}
                                </button>

                                {viewingCortexEntryId === entry.id && (
                                  <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground space-y-2 leading-relaxed bg-surface/10 p-2 rounded">
                                    <p className="whitespace-pre-wrap">{entry.body}</p>
                                    {entry.outcome && <p><strong>Outcome:</strong> {entry.outcome}</p>}
                                    {entry.what_i_learned && <p><strong>Lesson:</strong> {entry.what_i_learned}</p>}
                                    {entry.domains && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {entry.domains.map((dom: string) => (
                                          <span key={dom} className="chip text-[9px] py-0.5 px-1.5">{dom}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Async Chat messaging channel */}
                      <div className="nexus-card p-6 bg-surface/30 border border-border/60 space-y-4">
                        <div className="flex justify-between items-center border-b border-border/40 pb-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" /> Encrypted Async Messages
                          </h4>
                          <div className="flex items-center gap-2">
                            <Key className="h-3.5 w-3.5 text-accent-teal" />
                            <input
                              type="password"
                              placeholder="Passphrase"
                              value={passphrase}
                              onChange={(e) => setPassphrase(e.target.value)}
                              className="bg-elevated border border-border text-xs rounded px-2 py-1 w-32 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="h-44 overflow-y-auto space-y-2 p-2 bg-surface/10 rounded border border-border/30">
                          {asyncMessages.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center pt-16">No messages.</p>
                          ) : (
                            asyncMessages.map((msg: any) => (
                              <div key={msg.id} className={`flex flex-col ${msg.sender_id === profile?.id ? "items-end" : "items-start"}`}>
                                <div className={`max-w-[85%] rounded px-2.5 py-1.5 text-xs border ${
                                  msg.sender_id === profile?.id 
                                    ? "bg-primary/10 border-primary/30 text-foreground" 
                                    : "bg-elevated border-border/60 text-foreground"
                                }`}>
                                  <EncryptedMessageText ciphertext={msg.encrypted_content} passphrase={passphrase} />
                                </div>
                                <span className="text-[8px] text-muted-foreground mt-0.5">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type reply..."
                            value={asyncChatInput}
                            onChange={(e) => setAsyncChatInput(e.target.value)}
                            disabled={!passphrase}
                            className="flex-1 bg-elevated border border-border rounded px-3 py-2 text-xs focus:outline-none disabled:opacity-50"
                          />
                          <button
                            onClick={() => sendAsyncMessageMutation.mutate()}
                            disabled={!passphrase || !asyncChatInput.trim()}
                            className="bg-primary text-black px-4 rounded text-xs font-bold hover:opacity-90 disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Goal Configuration & Action buttons */}
                    <div className="space-y-6">
                      {/* Shared goals configurator */}
                      <div className="nexus-card p-5 bg-surface/40 border border-border/60 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" /> Active Milestones
                        </h4>
                        
                        <div className="space-y-2">
                          {mentorshipGoals.map((g: any) => (
                            <div key={g.id} className="flex items-start justify-between p-2 bg-surface/20 rounded border border-border/40">
                              <div className="flex items-start gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={g.completed}
                                  onChange={(e) => toggleGoalMutation.mutate({ goalId: g.id, completed: e.target.checked })}
                                  className="mt-1 h-3.5 w-3.5 accent-primary"
                                />
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold ${g.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {g.title}
                                  </p>
                                </div>
                              </div>
                              <button onClick={() => deleteGoalMutation.mutate(g.id)} className="text-muted-foreground hover:text-red-500">
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add Goal form */}
                        <div className="border-t border-border/40 pt-3 space-y-2.5">
                          <p className="text-[10px] uppercase text-muted-foreground font-semibold">New Goal</p>
                          <input
                            type="text"
                            placeholder="Goal Title"
                            value={goalTitle}
                            onChange={(e) => setGoalTitle(e.target.value)}
                            className="w-full bg-elevated border border-border text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Brief Description"
                            value={goalDesc}
                            onChange={(e) => setGoalDesc(e.target.value)}
                            className="w-full bg-elevated border border-border text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                          />
                          <input
                            type="date"
                            value={goalDate}
                            onChange={(e) => setGoalDate(e.target.value)}
                            className="w-full bg-elevated border border-border text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-muted-foreground"
                          />
                          <button
                            onClick={() => addGoalMutation.mutate()}
                            disabled={!goalTitle.trim()}
                            className="w-full bg-primary text-black py-1.5 rounded text-xs font-bold hover:opacity-90 disabled:opacity-50"
                          >
                            Add Goal
                          </button>
                        </div>
                      </div>

                      {/* Audited actions/Access logs display */}
                      <div className="nexus-card p-5 bg-surface/40 border border-border/60 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4 text-accent-teal" /> Audit Logs History
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {accessLogs.slice(0, 4).map((log: any) => (
                            <div key={log.id} className="text-[10px] text-muted-foreground border-b border-border/20 pb-2">
                              <p>Accessed: <strong>"{log.cortex_entry?.title || "Cortex Entry"}"</strong></p>
                              <span className="text-[8px]">{new Date(log.accessed_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Close relationship button */}
                      <button
                        onClick={() => setClosureOpen(true)}
                        className="w-full rounded border border-red-500/30 bg-red-950/20 text-red-400 py-2.5 text-xs font-semibold hover:bg-red-950/40 transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="h-4 w-4" /> Initiate Closure Session
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="nexus-card p-12 text-center text-muted-foreground text-xs italic">
                    Select a mentee from the left side panel to review cortexes, manage milestones, and chat async.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* CLOSURE TEMPLATE MODAL */}
        {/* -------------------------------------------------------------------------------- */}
        {closureOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="nexus-card p-6 max-w-md w-full bg-surface border border-border/80 space-y-4">
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" /> Co-Mentorship Closure Session
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                NEXUS inverts normal education by ending relationships restfully. Reflect on the outcome, document lessons learned, and declare this mentorship complete.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Reason for closure</label>
                  <select
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full bg-elevated border border-border text-xs rounded p-2 focus:outline-none focus:border-primary"
                  >
                    <option value="completed">Milestones Completed Successfully</option>
                    <option value="burnout">Burnout / Low Energy Pause</option>
                    <option value="incompatible">Different Perspective Paths</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Final Reflection / Notes</label>
                  <textarea
                    placeholder="Enter final observations, takeaways, and next steps for the mentee..."
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-elevated border border-border text-xs rounded p-2 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setClosureOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-elevated hover:bg-elevated/70 text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => closeMentorshipMutation.mutate()}
                  className="px-4 py-2 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Close Restfully
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
