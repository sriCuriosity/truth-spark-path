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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service role to run administrative scans
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );

    // Run scans for anomalies
    // 1. Find users with excessive recent cortex additions (potential bots)
    const { data: velocityLogs, error: velocityError } = await supabaseClient.rpc('check_cortex_addition_velocity', {});
    
    // 2. Scan ai_audit_log for high risk actions (risk_score > 0.8)
    const { data: highRiskLogs, error: riskError } = await supabaseClient
      .from('ai_audit_log')
      .select('id, user_id, action_type, risk_score, created_at')
      .gt('risk_score', 0.8)
      .order('created_at', { ascending: false });

    // 3. Automatically quarantine cortex entries that have risk scores > 0.85
    let quarantinedCount = 0;
    if (highRiskLogs && highRiskLogs.length > 0) {
      for (const log of highRiskLogs) {
        // Find associated entry if any
        if (log.action_type === 'cortex_submission') {
          // Quarantine the entry: in our schema let's say we set is_public = false or add a flag
          const { error: qErr } = await supabaseClient
            .from('cortex_entries')
            .update({ is_public: false }) // Hide from public space
            .eq('user_id', log.user_id);
          
          if (!qErr) quarantinedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        scan_time: new Date().toISOString(),
        anomalies_detected: highRiskLogs?.length ?? 0,
        quarantined_count: quarantinedCount,
        details: {
          high_risk_incidents: highRiskLogs || [],
          velocity_warnings: velocityLogs || []
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
