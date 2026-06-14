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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { method } = req;

    if (method === 'POST') {
      const body = await req.json();
      const { actor, verb, object, result, context } = body;

      // Validate xAPI statement structure
      if (!actor || !verb || !object) {
        return new Response(JSON.stringify({ error: 'Missing required xAPI fields: actor, verb, object' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Ingest statement using database function
      const { data, error } = await supabaseClient.rpc('ingest_xapi_statement', {
        p_actor: actor,
        p_verb: verb,
        p_object: object,
        p_result: result || null,
        p_context: context || null,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: { statement_id: data } }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      const verb = url.searchParams.get('verb');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      const { data: statements, error } = await supabaseClient.rpc('query_xapi_statements', {
        p_user_id: userId || null,
        p_verb: verb || null,
        p_limit: limit,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: statements }), {
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
