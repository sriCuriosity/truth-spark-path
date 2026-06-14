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
      const { entry_id, validation_text, specific_aspect } = body;

      // Get user from auth header
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get entry to find owner
      const { data: entry, error: entryError } = await supabaseClient
        .from('cortex_entries')
        .select('user_id')
        .eq('id', entry_id)
        .single();

      if (entryError || !entry) {
        return new Response(JSON.stringify({ error: 'Entry not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create peer validation
      const { data: validation, error: validationError } = await supabaseClient
        .from('peer_validations')
        .insert({
          entry_id,
          validator_id: user.id,
          owner_id: entry.user_id,
          validation_text,
          specific_aspect,
        })
        .select()
        .single();

      if (validationError) {
        return new Response(JSON.stringify({ error: validationError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Award XP to validator
      await supabaseClient.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: 15,
        p_source: 'peer_validation_given',
        p_reference_id: validation.id,
      });

      return new Response(JSON.stringify({ data: validation }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      const url = new URL(req.url);
      const entryId = url.searchParams.get('entry_id');

      if (!entryId) {
        return new Response(JSON.stringify({ error: 'Entry ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: validations, error } = await supabaseClient
        .from('peer_validations')
        .select('*')
        .eq('entry_id', entryId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: validations }), {
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
