import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function resolveUser(req: Request, supabaseUrl: string, anonKey: string, serviceKey: string) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer nexus_")) {
    const rawToken = authHeader.replace("Bearer ", "");
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: tokenRow } = await supabase.from("api_tokens").select("user_id").eq("token_hash", tokenHash).maybeSingle();
    return tokenRow?.user_id ?? null;
  }
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  return user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  // GET /sdk/suggestions/pending
  if (req.method === "GET" && pathParts.includes("pending")) {
    const userId = await resolveUser(req, supabaseUrl, anonKey, serviceKey);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const platform = url.searchParams.get("platform");
    let query = supabase.from("cortex_suggestions").select("*").eq("user_id", userId).eq("status", "pending").order("created_at", { ascending: false }).limit(limit);
    if (platform) query = query.eq("platform", platform);
    const { data, error } = await query;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // POST /sdk/suggestions/:id/accept
  if (req.method === "POST" && pathParts.includes("accept")) {
    const userId = await resolveUser(req, supabaseUrl, anonKey, serviceKey);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const suggestionId = pathParts[pathParts.indexOf("suggestions") + 1];
    const body = await req.json();

    const { data: suggestion } = await supabase.from("cortex_suggestions").select("*").eq("id", suggestionId).eq("user_id", userId).maybeSingle();
    if (!suggestion) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

    const { data: entry, error } = await supabase.from("cortex_entries").insert({
      user_id: userId,
      entry_type: body.entry_type ?? suggestion.suggestion_type ?? "action",
      title: body.title ?? suggestion.title,
      body: body.body ?? suggestion.body ?? "",
      domains: body.domains ?? suggestion.domains ?? [],
    }).select().single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    await supabase.from("cortex_suggestions").update({ status: "accepted", actioned_at: new Date().toISOString() }).eq("id", suggestionId);

    return new Response(JSON.stringify(entry), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // POST /sdk/suggestions/:id/discard
  if (req.method === "POST" && pathParts.includes("discard")) {
    const userId = await resolveUser(req, supabaseUrl, anonKey, serviceKey);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const suggestionId = pathParts[pathParts.indexOf("suggestions") + 1];
    await supabase.from("cortex_suggestions").update({ status: "discarded", actioned_at: new Date().toISOString() }).eq("id", suggestionId).eq("user_id", userId);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
});
