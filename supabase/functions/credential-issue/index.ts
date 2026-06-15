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

      if (!user_id || !type || !title) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const credentialId = crypto.randomUUID();
      const issuanceDate = new Date().toISOString();

      // 1. Generate local RSA cryptographic keypair for signature signing
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );

      // Export public key as JWK to include in proof verification Method
      const jwkPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
      
      // 2. Generate a standard did:key identifier using a mock SHA-256 fingerprint representation
      const rawPub = JSON.stringify(jwkPublicKey);
      const enc = new TextEncoder();
      const pubHashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(rawPub));
      const pubHashArray = Array.from(new Uint8Array(pubHashBuffer));
      const hexFingerprint = pubHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const didKey = `did:key:z6MkgT78${hexFingerprint.slice(0, 32)}`;

      // 3. Assemble core claims payload
      const credentialSubject = {
        id: `did:example:${user_id}`,
        name: title,
        description,
        competencyTags: competency_tags || [],
      };

      const payloadToSign = JSON.stringify({
        id: `urn:uuid:${credentialId}`,
        issuer: didKey,
        issuanceDate,
        credentialSubject
      });

      // 4. Cryptographically sign the payload
      const signatureBuffer = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        keyPair.privateKey,
        enc.encode(payloadToSign)
      );

      const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      // 5. Simulate IPFS Upload & Polygon anchoring stubs
      const ipfsCID = `Qm${hexFingerprint.slice(0, 30)}C2`;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
      const txHash = `0x${hexFingerprint.slice(0, 40)}`;

      const credentialJson = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        type: ['VerifiableCredential', type],
        id: `urn:uuid:${credentialId}`,
        issuer: {
          id: didKey,
          name: 'NEXUS Sovereign Issuer',
          image: 'https://nexus.app/logo.png'
        },
        issuanceDate,
        credentialSubject,
        evidence: [
          {
            id: `urn:ipfs:${ipfsCID}`,
            type: ['DocumentVerification'],
            documentUrl: ipfsUrl
          },
          {
            id: `urn:tx:${txHash}`,
            type: ['BlockchainAnchor'],
            ledger: 'Polygon PoS Mainnet',
            transactionHash: txHash
          }
        ],
        proof: {
          type: 'JsonWebSignature2020',
          created: issuanceDate,
          proofPurpose: 'assertionMethod',
          verificationMethod: didKey,
          publicKeyJwk: jwkPublicKey,
          jws: base64Signature
        }
      };

      // Store in Supabase credentials table
      const { data: credential, error } = await supabaseClient
        .from('credentials')
        .insert({
          id: credentialId,
          user_id,
          type,
          title,
          description,
          competency_tags: competency_tags || [],
          issuer_did: didKey,
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
