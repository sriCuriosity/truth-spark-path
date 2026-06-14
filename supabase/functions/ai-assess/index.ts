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
      const { submission_id, submission_content, rubric } = body;

      // Get user from auth header
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log AI action to audit log
      const promptHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify({ submission_content, rubric }))
      );
      const promptHashHex = Array.from(new Uint8Array(promptHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      await supabaseClient.from('ai_audit_log').insert({
        user_id: user.id,
        function_name: 'ai-assess',
        model: 'claude-sonnet-4-6',
        prompt_hash: promptHashHex,
        action_description: 'AI assessment triggered for submission',
      });

      // For now, return a mock assessment
      // In production, this would call Claude API
      const mockAssessment = {
        dimension_scores: {
          depth: 0.8,
          creativity: 0.7,
          emotional_intelligence: 0.75,
          real_world_application: 0.65,
          self_authorship: 0.85,
        },
        narrative_feedback: 'This submission demonstrates strong understanding and personal reflection. The depth of analysis is commendable, and there are clear connections to real-world applications.',
        evidence_gaps: ['Consider adding more specific examples', 'Could benefit from peer validation'],
        confidence: 0.85,
      };

      // Store assessment
      const { data: assessment, error: assessmentError } = await supabaseClient
        .from('ai_assessments')
        .insert({
          submission_id,
          model_version: 'claude-sonnet-4-6',
          prompt_hash: promptHashHex,
          dimension_scores: mockAssessment.dimension_scores,
          narrative_feedback: mockAssessment.narrative_feedback,
          evidence_gaps: mockAssessment.evidence_gaps,
          confidence: mockAssessment.confidence,
          contested: false,
        })
        .select()
        .single();

      if (assessmentError) {
        return new Response(JSON.stringify({ error: assessmentError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: assessment }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      const url = new URL(req.url);
      const assessmentId = url.searchParams.get('id');

      if (!assessmentId) {
        return new Response(JSON.stringify({ error: 'Assessment ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: assessment, error } = await supabaseClient
        .from('ai_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: assessment }), {
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
