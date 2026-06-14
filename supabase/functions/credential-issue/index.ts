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
      const { user_id, type, title, description, competency_tags } = body;

      // Generate credential JSON-LD (W3C Verifiable Credential)
      const credentialId = crypto.randomUUID();
      const issuanceDate = new Date().toISOString();
      
      const credentialJson = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        type: ['VerifiableCredential', type],
        id: `urn:uuid:${credentialId}`,
        issuer: {
          id: Deno.env.get('CREDENTIAL_ISSUER_DID') || 'did:web:nexus.app',
          name: 'NEXUS',
          image: 'https://nexus.app/logo.png'
        },
        issuanceDate,
        credentialSubject: {
          id: `did:example:${user_id}`,
          name: title,
          description,
          competencyTags: competency_tags || [],
        },
        evidence: []
      };

      // Store credential
      const { data: credential, error } = await supabaseClient
        .from('credentials')
        .insert({
          user_id,
          type,
          title,
          description,
          competency_tags: competency_tags || [],
          issuer_did: Deno.env.get('CREDENTIAL_ISSUER_DID') || 'did:web:nexus.app',
          credential_json: credentialJson,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: credential }), {
        status: 201,
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
