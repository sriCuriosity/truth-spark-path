import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    const url = new URL(req.url);

    if (method === 'POST') {
      // Create Cortex entry
      const body = await req.json();
      const { entry_type, title, body: entryBody, outcome, what_i_learned, previous_belief, new_belief, domains, is_public, happened_at } = body;

      // Get user from auth header
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Call Nvidia embeddings API
      const apiKey = Deno.env.get("VITE_NVIDIA_API");
      let embeddingVector = new Array(1536).fill(0);
      
      if (apiKey) {
        try {
          const embedRes = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              input: [`${title} ${entryBody}`],
              model: "nvidia/embed-qa-4",
              encoding_format: "float",
            }),
          });
          if (embedRes.ok) {
            const embedData = await embedRes.json();
            embeddingVector = embedData.data?.[0]?.embedding || embeddingVector;
          } else {
            console.error("NVIDIA embedding error status:", embedRes.status);
            // fallback pseudo-deterministic vector
            for (let i = 0; i < title.length && i < 1536; i++) {
              embeddingVector[i] = title.charCodeAt(i) / 256.0;
            }
          }
        } catch (err) {
          console.error("Failed to generate embedding for cortex entry:", err);
          // fallback pseudo-deterministic vector
          for (let i = 0; i < title.length && i < 1536; i++) {
            embeddingVector[i] = title.charCodeAt(i) / 256.0;
          }
        }
      }

      // Create entry with embedding
      const { data: entry, error: entryError } = await supabaseClient
        .from('cortex_entries')
        .insert({
          user_id: user.id,
          entry_type,
          title,
          body: entryBody,
          outcome,
          what_i_learned,
          previous_belief,
          new_belief,
          domains: domains || [],
          is_public: is_public ?? true,
          happened_at: happened_at || null,
          embedding: embeddingVector,
        })
        .select()
        .single();

      if (entryError) {
        return new Response(JSON.stringify({ error: entryError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Award XP for entry creation
      await supabaseClient.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: 10,
        p_source: 'cortex_entry_created',
        p_reference_id: entry.id,
      });

      return new Response(JSON.stringify({ data: entry }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      // Get entries
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: entries, error } = await supabaseClient
        .from('cortex_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: entries }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH') {
      // Update entry
      const body = await req.json();
      const { id, ...updateData } = body;

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: entry, error } = await supabaseClient
        .from('cortex_entries')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: entry }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      // Soft delete entry
      const { id } = await req.json();

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseClient
        .from('cortex_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
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
