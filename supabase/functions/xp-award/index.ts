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
      const { user_id, amount, source, reference_id, metadata } = body;

      // Award XP
      const { data: xpEntry, error } = await supabaseClient
        .from('xp_ledger')
        .insert({
          user_id,
          amount,
          source,
          reference_id,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update user's total XP and check tier
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('total_xp')
        .eq('id', user_id)
        .single();

      if (profile) {
        const newTotalXp = (profile.total_xp || 0) + amount;
        let newTier = 'seeker';

        if (newTotalXp >= 10000) newTier = 'architect';
        else if (newTotalXp >= 5000) newTier = 'contributor';
        else if (newTotalXp >= 2000) newTier = 'builder';
        else if (newTotalXp >= 500) newTier = 'explorer';

        await supabaseClient
          .from('profiles')
          .update({
            total_xp: newTotalXp,
            current_tier: newTier,
          })
          .eq('id', user_id);
      }

      return new Response(JSON.stringify({ data: xpEntry }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: xpLedger, error } = await supabaseClient
        .from('xp_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: xpLedger }), {
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
