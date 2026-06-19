import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, MessageSquare, Key, Users, Send, AlertTriangle, HelpCircle, Plus, LogOut, CheckCircle, ChevronDown, ChevronUp, Lock } from "lucide-react";
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
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"chat" | "insights" | "members">("chat");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Form states
  const [questionText, setQuestionText] = useState("");
  const [postingQuestion, setPostingQuestion] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [creatingCircle, setCreatingCircle] = useState(false);
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [submittingResponse, setSubmittingResponse] = useState<Record<string, boolean>>({});

  // Active Circle selection
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(() => {
    return localStorage.getItem("nexus_active_circle_id");
  });

  // Passphrase management per circle
  const [passphrase, setPassphrase] = useState("nexus-default-key");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sendingChat, setSendingChat] = useState(false);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Load passphrase for active circle from local storage
  useEffect(() => {
    if (selectedCircleId) {
      const savedKey = localStorage.getItem(`nexus_circle_key_${selectedCircleId}`);
      setPassphrase(savedKey || `nexus-key-${selectedCircleId.slice(0, 8)}`);
    } else {
      setPassphrase("nexus-default-key");
    }
  }, [selectedCircleId]);

  // Save passphrase changes
  const handlePassphraseChange = (val: string) => {
    setPassphrase(val);
    if (selectedCircleId) {
      localStorage.setItem(`nexus_circle_key_${selectedCircleId}`, val);
    }
  };

  // Save circle selection to local storage
  const handleCircleSelect = (id: string | null) => {
    setSelectedCircleId(id);
    if (id) {
      localStorage.setItem("nexus_active_circle_id", id);
    } else {
      localStorage.removeItem("nexus_active_circle_id");
    }
    setMessages([]);
  };

  // Fetch learning circles user belongs to
  const { data: userCircleMemberships = [], refetch: refetchUserCircles } = useQuery({
    queryKey: ["user-circles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_circle_members")
        .select(`
          circle_id,
          role,
          joined_at,
          learning_circles (
            id,
            name,
            description,
            created_by,
            max_members,
            created_at
          )
        `)
        .eq("user_id", user?.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all active circles to browse
  const { data: allActiveCircles = [], refetch: refetchAllCircles } = useQuery({
    queryKey: ["all-circles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_circles")
        .select("id, name, description, created_by, max_members, created_at")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate joinable circles
  const joinedCircleIds = userCircleMemberships.map(m => m.circle_id);
  const joinableCircles = allActiveCircles.filter(c => !joinedCircleIds.includes(c.id));

  // Fetch current circle members
  const { data: activeCircleMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ["circle-members", selectedCircleId],
    enabled: !!selectedCircleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_circle_members")
        .select(`
          id,
          role,
          joined_at,
          user_id,
          profiles:user_id (
            display_name,
            handle,
            avatar_url,
            current_tier
          )
        `)
        .eq("circle_id", selectedCircleId);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cortex feed for members of active circle
  const { data: circleInsights = [], refetch: refetchCircleInsights } = useQuery({
    queryKey: ["circle-insights", selectedCircleId, activeCircleMembers.length],
    enabled: !!selectedCircleId && activeCircleMembers.length > 0,
    queryFn: async () => {
      const memberIds = activeCircleMembers.map(m => m.user_id);
      const { data, error } = await supabase
        .from("cortex_entries")
        .select("id, title, body, entry_type, created_at, user_id, profiles:user_id(display_name, handle, avatar_url, current_tier)")
        .in("user_id", memberIds)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch community questions
  const { data: questions = [], refetch: refetchQuestions } = useQuery({
    queryKey: ["community-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_questions")
        .select("id, question_text, domain, created_at, profiles:user_id(display_name, handle)")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch responses for expanded question
  const { data: questionResponses = [], refetch: refetchResponses } = useQuery({
    queryKey: ["question-responses", expandedQuestionId],
    enabled: !!expandedQuestionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_responses")
        .select("id, question_id, user_id, body, is_validation_opportunity, peer_validation_id, created_at, profiles:user_id(display_name, handle, avatar_url, current_tier)")
        .eq("question_id", expandedQuestionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch circle chat messages
  useEffect(() => {
    if (!selectedCircleId) return;

    async function loadCircleMessages() {
      const { data, error } = await supabase
        .from("circle_messages")
        .select("id, encrypted_content, created_at, user_id, circle_id, profiles:user_id(display_name, handle, avatar_url)")
        .eq("circle_id", selectedCircleId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setMessages(data);
      }
    }

    loadCircleMessages();
  }, [selectedCircleId]);

  // Real-time PostgreSQL subscription for chat and questions
  useEffect(() => {
    if (!selectedCircleId) return;

    const chatChannel = supabase
      .channel(`circle-messages-${selectedCircleId}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "circle_messages",
          filter: `circle_id=eq.${selectedCircleId}`
        },
        async (payload) => {
          // Retrieve profile info for the user who posted
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

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [selectedCircleId]);

  // Subscription for community questions & responses
  useEffect(() => {
    const qChannel = supabase
      .channel("community-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_questions" },
        () => {
          refetchQuestions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_responses" },
        () => {
          if (expandedQuestionId) {
            refetchResponses();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(qChannel);
    };
  }, [refetchQuestions, refetchResponses, expandedQuestionId]);

  // Create Circle
  async function handleCreateCircle(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newCircleName.trim().length < 3) {
      toast.error("Circle name must be at least 3 characters.");
      return;
    }
    setCreatingCircle(true);
    try {
      const { data: newCircle, error: createError } = await supabase
        .from("learning_circles")
        .insert({
          name: newCircleName.trim(),
          description: newCircleDesc.trim() || null,
          created_by: user.id,
          max_members: 8
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add user as creator
      const { error: memberError } = await supabase
        .from("learning_circle_members")
        .insert({
          circle_id: newCircle.id,
          user_id: user.id,
          role: "creator"
        });

      if (memberError) throw memberError;

      toast.success(`Circle "${newCircle.name}" created!`);
      setNewCircleName("");
      setNewCircleDesc("");
      refetchUserCircles();
      refetchAllCircles();
      handleCircleSelect(newCircle.id);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create learning circle");
    } finally {
      setCreatingCircle(false);
    }
  }

  // Join Circle
  async function handleJoinCircle(circleId: string) {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("learning_circle_members")
        .insert({
          circle_id: circleId,
          user_id: user.id,
          role: "member"
        });

      if (error) throw error;

      toast.success("Joined circle successfully!");
      refetchUserCircles();
      refetchAllCircles();
      handleCircleSelect(circleId);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to join circle");
    }
  }

  // Leave Circle
  async function handleLeaveCircle(circleId: string) {
    if (!user) return;
    if (!confirm("Are you sure you want to leave this circle?")) return;
    try {
      const { error } = await supabase
        .from("learning_circle_members")
        .delete()
        .eq("circle_id", circleId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Left circle.");
      refetchUserCircles();
      refetchAllCircles();
      if (selectedCircleId === circleId) {
        handleCircleSelect(null);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to leave circle");
    }
  }

  // Post Question to Wall
  async function postQuestion() {
    if (questionText.trim().length < 5) {
      toast.error("Write a real question — at least a few words.");
      return;
    }
    setPostingQuestion(true);
    try {
      if (!user) return;
      const { error } = await supabase.from("community_questions").insert({
        user_id: user.id,
        question_text: questionText.trim(),
      });
      if (error) throw error;
      toast.success("Question posted to the wall.");
      setQuestionText("");
      refetchQuestions();
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't post question");
    } finally {
      setPostingQuestion(false);
    }
  }

  // Submit response to question
  async function submitResponse(qId: string) {
    const responseText = responseTexts[qId];
    if (!responseText || responseText.trim().length < 3) {
      toast.error("Response is too short.");
      return;
    }
    setSubmittingResponse(prev => ({ ...prev, [qId]: true }));
    try {
      if (!user) return;
      const { error } = await supabase.from("question_responses").insert({
        question_id: qId,
        user_id: user.id,
        body: responseText.trim(),
        is_validation_opportunity: true
      });

      if (error) throw error;
      toast.success("Response posted.");
      setResponseTexts(prev => ({ ...prev, [qId]: "" }));
      refetchResponses();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post response");
    } finally {
      setSubmittingResponse(prev => ({ ...prev, [qId]: false }));
    }
  }

  // Convert Question Response to Peer Validation
  async function convertToPeerValidation(resp: any) {
    if (!user) return;
    try {
      // 1. Create a Cortex Entry for the responder (owner)
      const { data: newEntry, error: entryErr } = await supabase
        .from("cortex_entries")
        .insert({
          user_id: resp.user_id,
          entry_type: "collaboration",
          title: "Socratic Response on Question Wall",
          body: resp.body,
          outcome: "Peer validated through response interaction",
          is_public: true,
          happened_at: new Date().toISOString()
        })
        .select()
        .single();

      if (entryErr) throw entryErr;

      // 2. Insert the validation log (which awards XP to the entry owner)
      const { data: valData, error: valErr } = await supabase
        .from("peer_validations")
        .insert({
          entry_id: newEntry.id,
          validator_id: user.id,
          owner_id: resp.user_id,
          validation_text: `Validated peer response to question: "${resp.body.slice(0, 60)}..."`,
          specific_aspect: "Intellectual collaboration & answer accuracy"
        })
        .select()
        .single();

      if (valErr) throw valErr;

      // 3. Update the response row with the peer validation id
      const { error: respErr } = await supabase
        .from("question_responses")
        .update({
          peer_validation_id: valData.id,
          is_validation_opportunity: false
        })
        .eq("id", resp.id);

      if (respErr) throw respErr;

      toast.success("Response validated! XP awarded to co-responder.");
      refetchResponses();
    } catch (err: any) {
      toast.error(err.message ?? "Validation conversion failed");
    }
  }

  // Send Encrypted Chat Message
  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !selectedCircleId) return;
    setSendingChat(true);
    try {
      if (!user) throw new Error("Not authenticated");

      // Encrypt the chat content locally before saving to database
      const encrypted = await encryptMessage(chatInput.trim(), passphrase);

      const { error } = await supabase.from("circle_messages").insert({
        user_id: user.id,
        circle_id: selectedCircleId,
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

  const activeCircle = userCircleMemberships.find(m => m.circle_id === selectedCircleId)?.learning_circles;

  return (
    <AppShell title="Learning Circle">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-display font-semibold text-foreground tracking-tight">Community Commons</h2>
        <button
          onClick={() => setReportOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-1.5 text-xs hover:bg-elevated/70 text-accent-amber transition"
        >
          <Shield className="h-3.5 w-3.5" /> Report harm
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_340px]">
        {/* LEFT COLUMN: Circles Management */}
        <div className="space-y-5">
          {/* Your Circles list */}
          <div className="nexus-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Your Circles
            </h3>
            {userCircleMemberships.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">You aren't in any circles yet.</p>
            ) : (
              <div className="space-y-2">
                {userCircleMemberships.map((membership: any) => {
                  const circle = membership.learning_circles;
                  if (!circle) return null;
                  const isSelected = selectedCircleId === circle.id;
                  return (
                    <div 
                      key={circle.id}
                      onClick={() => handleCircleSelect(circle.id)}
                      className={`group p-2.5 rounded-lg border text-left cursor-pointer transition flex justify-between items-center ${
                        isSelected 
                          ? "border-primary bg-primary/10 text-foreground" 
                          : "border-border/40 bg-surface/30 hover:bg-elevated/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{circle.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{membership.role}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveCircle(circle.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition text-xs"
                        title="Leave Circle"
                      >
                        <LogOut className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Joinable Circles list */}
          <div className="nexus-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-accent-teal" /> Discover Circles
            </h3>
            {joinableCircles.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No other public circles found.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {joinableCircles.map((circle: any) => (
                  <div key={circle.id} className="p-2.5 rounded-lg border border-border/30 bg-surface/20 flex flex-col gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{circle.name}</p>
                      {circle.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{circle.description}</p>}
                    </div>
                    <button
                      onClick={() => handleJoinCircle(circle.id)}
                      className="w-full text-center py-1 bg-accent-teal text-black rounded text-[11px] font-semibold hover:opacity-90 transition"
                    >
                      Join Circle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Circle form */}
          <div className="nexus-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-3">Create new circle</h3>
            <form onSubmit={handleCreateCircle} className="space-y-2">
              <input
                type="text"
                placeholder="Circle Name"
                value={newCircleName}
                onChange={e => setNewCircleName(e.target.value)}
                className="w-full text-xs rounded border border-border bg-surface px-2.5 py-1.5 outline-none focus:border-primary"
              />
              <textarea
                placeholder="Description (optional)"
                rows={2}
                value={newCircleDesc}
                onChange={e => setNewCircleDesc(e.target.value)}
                className="w-full text-xs rounded border border-border bg-surface px-2.5 py-1.5 outline-none focus:border-primary resize-none"
              />
              <button
                type="submit"
                disabled={creatingCircle}
                className="w-full py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {creatingCircle ? "Creating..." : "Establish Circle"}
              </button>
            </form>
          </div>
        </div>

        {/* CENTER COLUMN: Circle Area */}
        <div className="flex flex-col min-w-0">
          {activeCircle ? (
            <div className="flex flex-col h-[75vh] nexus-card p-0 overflow-hidden">
              {/* Header and tabs */}
              <div className="border-b border-border/60 bg-surface/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-lg text-foreground">{activeCircle.name}</h3>
                    {activeCircle.description && <p className="text-xs text-muted-foreground mt-0.5">{activeCircle.description}</p>}
                  </div>
                  <span className="text-[11px] bg-elevated border border-border/40 px-2 py-0.5 rounded text-muted-foreground font-mono">
                    Max: {activeCircle.max_members} members
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition ${
                      activeTab === "chat" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground hover:bg-elevated/70"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Encrypted Chat
                  </button>
                  <button
                    onClick={() => setActiveTab("insights")}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition ${
                      activeTab === "insights" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground hover:bg-elevated/70"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" /> Member Insights
                  </button>
                  <button
                    onClick={() => setActiveTab("members")}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition ${
                      activeTab === "members" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground hover:bg-elevated/70"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" /> Circle Members ({activeCircleMembers.length})
                  </button>
                </div>
              </div>

              {/* Chat View */}
              {activeTab === "chat" && (
                <div className="flex flex-col flex-1 overflow-hidden p-4">
                  {/* Key config */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3 mb-3 bg-surface/10 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-accent-teal" />
                      <div className="text-[11px]">
                        <span className="text-accent-teal font-semibold">Circle E2E Key</span>
                        <p className="text-[9px] text-muted-foreground">Encryption is computed on your client before broadcasting.</p>
                      </div>
                    </div>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => handlePassphraseChange(e.target.value)}
                      className="rounded border border-border bg-surface px-2 py-0.5 text-xs outline-none focus:border-accent-teal w-44 font-mono text-accent-teal text-center"
                      placeholder="Passphrase"
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col-reverse">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground font-mono">No encrypted transcripts for this circle. Set key & send.</p>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className="flex items-start gap-2.5">
                          {m.profiles?.avatar_url ? (
                            <img src={m.profiles.avatar_url} className="h-7 w-7 rounded-full object-cover mt-0.5" />
                          ) : (
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-elevated text-xs font-semibold mt-0.5">
                              {(m.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs font-medium text-foreground">{m.profiles?.display_name ?? "Anonymous"}</span>
                              {m.profiles?.handle && <span className="text-[9px] text-muted-foreground">@{m.profiles.handle}</span>}
                              <span className="text-[8px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="mt-1 text-xs bg-elevated/40 border border-border/30 rounded px-2.5 py-1 inline-block max-w-full font-sans leading-relaxed">
                              <EncryptedMessageText ciphertext={m.encrypted_content} passphrase={passphrase} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Form */}
                  <form onSubmit={sendChatMessage} className="mt-3 border-t border-border/40 pt-3 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Write secure message..."
                      className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent-teal"
                    />
                    <button
                      type="submit"
                      disabled={sendingChat || !chatInput.trim()}
                      className="bg-accent-teal text-black rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1 text-xs font-semibold transition"
                    >
                      <Send className="h-3 w-3" /> Send
                    </button>
                  </form>
                </div>
              )}

              {/* Shared Insights View */}
              {activeTab === "insights" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Circle Knowledge Stream</h4>
                  {circleInsights.length === 0 ? (
                    <div className="text-center p-8 text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
                      No public cortex insights shared by members of this circle yet.
                    </div>
                  ) : (
                    circleInsights.map((entry: any) => (
                      <div key={entry.id} className="border border-border/50 bg-elevated/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {entry.profiles?.avatar_url ? (
                              <img src={entry.profiles.avatar_url} className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-surface grid place-items-center text-[10px] font-semibold">
                                {(entry.profiles?.display_name || "?").slice(0,1).toUpperCase()}
                              </div>
                            )}
                            <div className="text-[11px]">
                              <span className="font-semibold text-foreground">{entry.profiles?.display_name}</span>
                              <span className="text-muted-foreground ml-1">@{entry.profiles?.handle}</span>
                            </div>
                          </div>
                          <span className="chip text-[9px] uppercase tracking-wider font-mono">{entry.entry_type}</span>
                        </div>
                        <h5 className="text-sm font-semibold text-foreground">{entry.title}</h5>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{entry.body}</p>
                        <p className="text-[9px] text-muted-foreground/60">{new Date(entry.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Members List View */}
              {activeTab === "members" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Active Circle Seekers</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeCircleMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/30 bg-surface/10">
                        {member.profiles?.avatar_url ? (
                          <img src={member.profiles.avatar_url} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-elevated grid place-items-center text-xs font-semibold">
                            {(member.profiles?.display_name || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{member.profiles?.display_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">@{member.profiles?.handle}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] uppercase font-mono tracking-widest text-accent-teal">{member.profiles?.current_tier}</span>
                            <span className="text-[9px] text-muted-foreground capitalize">· {member.role}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="nexus-card h-[75vh] flex flex-col items-center justify-center text-center p-8">
              <Users className="h-12 w-12 text-primary/40 mb-3" />
              <h3 className="font-display font-semibold text-lg text-foreground mb-1">Establish secure alignment</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Learning circles are decentralized trust zones of up to 8 members.
                Messages are encrypted end-to-end locally before reaching servers.
              </p>
              <div className="text-xs text-muted-foreground border border-border/60 bg-elevated/40 rounded-lg p-3 max-w-sm text-left font-mono">
                <span className="text-accent-teal font-semibold">Decentralized protocols active:</span>
                <ul className="list-disc list-inside mt-1.5 space-y-1">
                  <li>Symmetric AES-GCM in-browser encryption</li>
                  <li>No database record of plaintext chats</li>
                  <li>Sovereign validation score sharing</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Question Wall */}
        <div className="space-y-4">
          {/* Ask Question block */}
          <div className="nexus-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-accent-amber" /> Question Wall
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Post a question. Other seekers can respond, collaborating toward peer validation.
            </p>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="What systemic assumptions or patterns are you auditing?"
              className="mt-3 w-full resize-none rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={postQuestion}
              disabled={postingQuestion}
              className="mt-3 w-full rounded-md bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              {postingQuestion ? "Posting..." : "Write to Wall"}
            </button>
          </div>

          {/* Wall listings */}
          {questions.length > 0 && (
            <div className="nexus-card p-4">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Decentered Inquiries</p>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {questions.map((q: any) => {
                  const isExpanded = expandedQuestionId === q.id;
                  return (
                    <div key={q.id} className="border-b border-border/40 pb-3 last:border-0 last:pb-0 space-y-2">
                      <div>
                        <p className="text-xs text-foreground leading-relaxed font-sans font-medium">{q.question_text}</p>
                        <div className="flex items-center justify-between mt-1.5 text-[9px] text-muted-foreground font-mono">
                          <span>{q.profiles?.display_name}</span>
                          <span>{new Date(q.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Expand / responses indicator */}
                      <button
                        onClick={() => {
                          setExpandedQuestionId(isExpanded ? null : q.id);
                        }}
                        className="text-[10px] text-accent-teal hover:underline flex items-center gap-1 transition"
                      >
                        {isExpanded ? (
                          <>Hide Responses <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>View Responses <ChevronDown className="h-3 w-3" /></>
                        )}
                      </button>

                      {/* Expandable Response Zone */}
                      {isExpanded && (
                        <div className="border-t border-border/30 pt-2 space-y-2 bg-surface/20 p-2 rounded">
                          {/* Responses List */}
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {questionResponses.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic">No thoughts shared yet.</p>
                            ) : (
                              questionResponses.map((resp: any) => {
                                const isOwnResponse = resp.user_id === user?.id;
                                const isValidated = !!resp.peer_validation_id;
                                return (
                                  <div key={resp.id} className="p-2 border border-border/30 bg-surface/50 rounded space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-semibold text-foreground font-mono">@{resp.profiles?.handle}</span>
                                      <span className="text-[8px] text-muted-foreground">{new Date(resp.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">{resp.body}</p>
                                    
                                    {/* Action items */}
                                    <div className="flex items-center justify-end">
                                      {isValidated ? (
                                        <span className="text-[9px] text-accent-teal font-semibold flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" /> Validated (+20 XP Owner)
                                        </span>
                                      ) : isOwnResponse ? (
                                        <span className="text-[8px] text-muted-foreground/60 italic">Your response</span>
                                      ) : (
                                        <button
                                          onClick={() => convertToPeerValidation(resp)}
                                          className="bg-accent-teal text-black text-[9px] px-1.5 py-0.5 rounded font-semibold hover:opacity-90 transition"
                                        >
                                          Peer Validate
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Submit Response Input */}
                          <div className="flex gap-1 border-t border-border/30 pt-2">
                            <input
                              type="text"
                              value={responseTexts[q.id] || ""}
                              onChange={e => setResponseTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Add reflection..."
                              className="flex-1 rounded border border-border bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent-teal"
                              onKeyDown={e => e.key === "Enter" && submitResponse(q.id)}
                            />
                            <button
                              onClick={() => submitResponse(q.id)}
                              disabled={submittingResponse[q.id]}
                              className="bg-accent-teal text-black px-2 py-1 rounded text-[11px] font-semibold hover:opacity-90 disabled:opacity-50 transition"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <HarmReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </AppShell>
  );
}
