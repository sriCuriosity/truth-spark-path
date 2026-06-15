import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("authorization") ?? "";
  let userId: string | null = null;

  if (authHeader.startsWith("Bearer nexus_")) {
    const rawToken = authHeader.replace("Bearer ", "");
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: tokenRow } = await supabase.from("api_tokens").select("user_id").eq("token_hash", tokenHash).maybeSingle();
    if (!tokenRow) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    userId = tokenRow.user_id;
  } else {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    userId = user.id;
  }

  const body = await req.json();
  const { url, title, content_snippet, platform } = body;

  const prompt = `Classify this web page activity for a learning portfolio system.
URL: ${url}
Title: ${title}
Platform: ${platform}
Snippet: ${content_snippet?.slice(0, 500) ?? ""}

Return JSON only (no markdown): { "is_educational": boolean, "domains": string[], "suggested_entry_type": "action"|"experiment"|"contribution"|"perspective_shift"|null, "relevance_text": string }
relevance_text must be max 20 words.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/llm-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM Proxy returned error: ${errorText}`);
    }

    const aiData = await response.json();
    const text = aiData.choices?.[0]?.message?.content ?? "{}";
    
    // Extract JSON block if output contains markdown code fence
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsedText = jsonMatch ? jsonMatch[0] : text;

    const result = JSON.parse(parsedText);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Classification error:", err);
    return new Response(JSON.stringify({ 
      is_educational: false, 
      domains: [], 
      suggested_entry_type: null, 
      relevance_text: "Could not classify" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
