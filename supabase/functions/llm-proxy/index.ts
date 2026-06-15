import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, model, temperature, max_tokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("VITE_NVIDIA_API");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "NVIDIA API key not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetModel = model || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

    // Call NVIDIA LLM
    const nvidiaRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature: temperature ?? 0.5,
        max_tokens: max_tokens ?? 1024,
      }),
    });

    if (!nvidiaRes.ok) {
      const errorText = await nvidiaRes.text();
      return new Response(JSON.stringify({ error: `NVIDIA API returned error: ${errorText}` }), {
        status: nvidiaRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resData = await nvidiaRes.json();

    // Log the interaction securely to public.ai_audit_log via service role client
    const supabaseService = createClient(supabaseUrl, serviceKey);
    const promptText = JSON.stringify(messages);
    const promptHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(promptText));
    const promptHashHex = Array.from(new Uint8Array(promptHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const responseText = resData.choices?.[0]?.message?.content || "";
    
    // Analyze content simple safety check
    let riskScore = 0.1;
    const flags = [];
    if (responseText.match(/(hate|harass|threat|violence)/i)) {
      riskScore = 0.8;
      flags.push({ type: "safety_alert", detail: "Potential hostile language detected" });
    }

    await supabaseService.from("ai_audit_log").insert({
      user_id: user.id,
      function_name: "llm-proxy",
      model: targetModel,
      prompt_hash: promptHashHex,
      action_description: `Proxied LLM chat query using ${targetModel}`,
      risk_score: riskScore,
      flags: flags,
    });

    return new Response(JSON.stringify(resData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
