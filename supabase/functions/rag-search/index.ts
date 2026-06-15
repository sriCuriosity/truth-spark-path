import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const { method } = req;

    if (method === 'POST') {
      const body = await req.json();
      const { query } = body;

      // Get user from auth header
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate embedding for query (in production, call OpenAI API)
      const queryEmbedding = await generateEmbedding(query);

      // Search for similar entries using pgvector
      const { data: similarEntries, error: searchError } = await supabaseClient
        .rpc('search_similar_entries', {
          p_user_id: user.id,
          p_query_embedding: queryEmbedding,
          p_limit: 5,
        });

      if (searchError) {
        return new Response(JSON.stringify({ error: searchError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get full entry details
      const entryIds = similarEntries?.map((e: any) => e.entry_id) || [];
      const { data: entries } = await supabaseClient
        .from('cortex_entries')
        .select('*')
        .in('id', entryIds);

      // Log to AI audit log
      const promptHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(query)
      );
      const promptHashHex = Array.from(new Uint8Array(promptHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      await supabaseClient.from('ai_audit_log').insert({
        user_id: user.id,
        function_name: 'rag-search',
        model: 'claude-sonnet-4-6',
        prompt_hash: promptHashHex,
        action_description: 'RAG search for similar Cortex entries',
      });

      // In production, this would call Claude API with the retrieved context
      // For now, return the similar entries
      return new Response(JSON.stringify({ 
        data: {
          similar_entries: entries,
          context: entries?.map((e: any) => `${e.title}: ${e.body}`).join('\n\n') || '',
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate embedding using NVIDIA embedding model
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("VITE_NVIDIA_API");
  if (!apiKey) {
    console.warn("VITE_NVIDIA_API key not found, using pseudo-deterministic vector fallback.");
    const vec = new Array(1536).fill(0);
    for (let i = 0; i < text.length && i < 1536; i++) {
      vec[i] = text.charCodeAt(i) / 256.0;
    }
    return vec;
  }

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: "nvidia/embed-qa-4",
        encoding_format: "float",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`NVIDIA embedding API returned: ${err}`);
    }

    const resData = await res.json();
    return resData.data?.[0]?.embedding || new Array(1536).fill(0);
  } catch (error) {
    console.error("Failed to generate NVIDIA embedding, using hash fallback:", error);
    const vec = new Array(1536).fill(0);
    for (let i = 0; i < text.length && i < 1536; i++) {
      vec[i] = text.charCodeAt(i) / 256.0;
    }
    return vec;
  }
}
