import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { claim, context } = await req.json();

    if (!claim) {
      return new Response(JSON.stringify({ error: 'Missing claim parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nvidiaApiKey = Deno.env.get('VITE_NVIDIA_API') || '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';

    const systemPrompt = `You are a Socratic Explanation Assistant. Your job is to take complex claims, dense academic material, or controversial articles and compile them into clear, simple, layperson-friendly Socratic summaries.
Guidelines:
1. Simplify without loss of meaning.
2. Structure the explanation as:
   - "Core Claim": The fundamental thesis.
   - "Underlying Assumptions": Unspoken premises that must hold true for the claim to stand.
   - "Socratic Questions to Consider": Probing questions to help the reader audit the claim's validity.
3. Keep the tone completely neutral, objective, and non-authoritative. Format the response beautifully in Markdown.`;

    const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaApiKey}`,
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze the following claim: "${claim}"\nContext: ${context || 'None provided'}` }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!nvidiaResponse.ok) {
      const errorText = await nvidiaResponse.text();
      throw new Error(`Nvidia API failed: ${errorText}`);
    }

    const resJson = await nvidiaResponse.json();
    const result = resJson.choices?.[0]?.message?.content || 'Unable to generate Socratic explanation.';

    return new Response(
      JSON.stringify({ explanation: result }),
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
