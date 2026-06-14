import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Auth: JWT or Bearer token from api_tokens
  const authHeader = req.headers.get("authorization") ?? "";
  let userId: string | null = null;

  if (authHeader.startsWith("Bearer nexus_")) {
    // API token auth
    const rawToken = authHeader.replace("Bearer ", "");
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: tokenRow } = await supabase.from("api_tokens").select("user_id").eq("token_hash", tokenHash).maybeSingle();
    if (!tokenRow) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    userId = tokenRow.user_id;
    await supabase.from("api_tokens").update({ last_used: new Date().toISOString() }).eq("token_hash", tokenHash);
  } else {
    // JWT auth
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    userId = user.id;
  }

  const body = await req.json();
  const activities = body.activities ?? [];

  let suggestionsCreated = 0;

  for (const activity of activities) {
    await supabase.from("external_activity_log").insert({
      user_id: userId,
      platform: activity.platform,
      activity_type: activity.activity_type,
      raw_metadata: { ...activity.metadata, source_url: activity.source_url, occurred_at: activity.occurred_at },
      processed: false,
    });

    let shouldSuggest = false;
    let suggestionType = "action";

    if (activity.platform === "github" && activity.activity_type === "push") {
      shouldSuggest = true;
      suggestionType = "contribution";
    } else if (activity.platform === "youtube" && (activity.metadata?.watch_percentage ?? 0) > 70) {
      shouldSuggest = true;
      suggestionType = "experiment";
    } else if (activity.platform === "linkedin" && activity.activity_type === "article_published") {
      shouldSuggest = true;
      suggestionType = "contribution";
    }

    if (shouldSuggest) {
      await supabase.from("cortex_suggestions").insert({
        user_id: userId,
        platform: activity.platform,
        suggestion_type: suggestionType,
        title: activity.metadata?.title ?? `${activity.platform} activity`,
        body: activity.metadata?.description ?? "",
        domains: activity.metadata?.domains ?? [],
        evidence_data: activity.metadata ?? {},
        source_url: activity.source_url,
        status: "pending",
      });
      suggestionsCreated++;
    }
  }

  return new Response(JSON.stringify({ received: activities.length, suggestions_created: suggestionsCreated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
