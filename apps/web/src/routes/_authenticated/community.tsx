import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, MessageSquare, Key, Users, Send, AlertTriangle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { HarmReportModal } from "@/components/harm-report-modal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "NEXUS — Learning Circle" }] }),
  component: Community,
});

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
    decryptMessage(ciphertext, passphrase).then((text) => {
      setDecrypted(text);
    });
  }, [ciphertext, passphrase]);

  return <span className="break-words">{decrypted}</span>;
}

function Community() {
  const [reportOpen, setReportOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [posting, setPosting] = useState(false);
  
  // Realtime Encrypted Chat States
  const [activeTab, setActiveTab] = useState<"chat" | "activity">("chat");
  const [passphrase, setPassphrase] = useState("nexus-default-key");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sendingChat, setSendingChat] = useState(false);

  // Fetch public cortex entries
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

  // Fetch community questions
  const { data: questions = [], refetch: refetchQuestions } = useQuery({
    queryKey: ["community-questions"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("community_questions")
        .select("id, question_text, domain, created_at, profiles:user_id(display_name, handle)")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  // Fetch initial circle messages
  useEffect(() => {
    async function loadInitialMessages() {
      const { data } = await (supabase as any)
        .from("circle_messages")
        .select("id, encrypted_content, created_at, user_id, profiles:user_id(display_name, handle, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (data) setMessages(data);
    }
    loadInitialMessages();
  }, []);

  // Real-time PostgreSQL subscription for chat and questions
  useEffect(() => {
    const chatChannel = supabase
      .channel("circle-messages-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "circle_messages" },
        async (payload) => {
          // Retrieve profile info for the user who posted the message
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, handle, avatar_url")
            .eq("id", payload.new.user_id)
            .maybeSingle();

          const newMsg = {
            ...payload.new,
            profiles: profile,
          };
          setMessages((prev) => [newMsg, ...prev]);
        }
      )
      .subscribe();

    const questionsChannel = supabase
      .channel("community-questions-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_questions" },
        () => {
          refetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(questionsChannel);
    };
  }, [refetchQuestions]);

  // Post Question
  async function postQuestion() {
    if (questionText.trim().length < 5) {
      toast.error("Write a real question — at least a few words.");
      return;
    }
    setPosting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await (supabase as any).from("community_questions").insert({
        user_id: u.user.id,
        question_text: questionText.trim(),
      });
      if (error) throw error;
      toast.success("Question posted to the wall.");
      setQuestionText("");
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't post question");
    } finally {
      setPosting(false);
    }
  }

  // Send Encrypted Chat Message
  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setSendingChat(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");

      // Encrypt the chat content locally before saving to database
      const encrypted = await encryptMessage(chatInput.trim(), passphrase);

      const { error } = await (supabase as any).from("circle_messages").insert({
        user_id: u.user.id,
        encrypted_content: encrypted,
      });

      if (error) throw error;
      setChatInput("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send encrypted message");
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <AppShell title="Learning Circle">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "chat" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground hover:bg-elevated/70"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Encrypted Chat
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "activity" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground hover:bg-elevated/70"
            }`}
          >
            <Users className="h-4 w-4" /> Public Activity
          </button>
        </div>
        <button
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs hover:bg-elevated/70 text-accent-amber"
        >
          <Shield className="h-3.5 w-3.5" /> Report harm
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {activeTab === "chat" ? (
          <div className="flex flex-col h-[70vh] nexus-card p-5 overflow-hidden">
            {/* Key configuration header */}
            <div className="flex flex-col gap-2 border-b border-border pb-4 mb-4 sm:flex-row sm:items-center justify-between">
              <div>
                <h3 className="font-display font-semibold flex items-center gap-1.5 text-accent-teal">
                  <Key className="h-4 w-4" /> Sovereign E2E Chat
                </h3>
                <p className="text-xs text-muted-foreground">Encryption key stays in your browser memory.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">Secret Key:</span>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent-teal w-44 font-mono text-accent-teal"
                  placeholder="Set symmetric secret..."
                />
              </div>
            </div>

            {/* Chat message area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 flex flex-col-reverse">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No secure chat transcripts found. Initiate conversation.</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 p-1">
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} className="h-8 w-8 rounded-full object-cover mt-0.5" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-elevated text-xs font-semibold mt-0.5">
                        {(m.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-foreground">{m.profiles?.display_name ?? "Anonymous Seeker"}</span>
                        {m.profiles?.handle && <span className="text-[10px] text-muted-foreground">@{m.profiles.handle}</span>}
                        <span className="text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="mt-1 text-sm bg-elevated/40 border border-border/40 rounded px-3 py-1.5 inline-block max-w-full">
                        <EncryptedMessageText ciphertext={m.encrypted_content} passphrase={passphrase} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message input */}
            <form onSubmit={sendChatMessage} className="mt-4 border-t border-border pt-4 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Write message... (encrypted automatically)"
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent-teal"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="bg-accent-teal text-black rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm font-semibold transition"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </form>
          </div>
        ) : (
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
        )}

        <div className="space-y-4">
          <div className="nexus-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-accent-amber" /> Question wall
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Post a question you've always wanted to ask. Others will think with you.</p>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="What have you always wanted to ask?"
              className="mt-3 w-full resize-none rounded-md border border-border bg-elevated px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={postQuestion}
              disabled={posting}
              className="mt-3 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {posting ? "…" : "Post a question"}
            </button>
          </div>

          {questions.length > 0 && (
            <div className="nexus-card p-5">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">On the wall</p>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {questions.map((q: any) => (
                  <div key={q.id} className="border-b border-border/50 pb-3 last:border-0">
                    <p className="text-sm">{q.question_text}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {q.profiles?.display_name ?? "Someone"} · {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <HarmReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </AppShell>
  );
}

