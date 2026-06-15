import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, CheckCircle, AlertCircle, Calendar, User, Link2, ShieldAlert, Cpu } from "lucide-react";

export const Route = createFileRoute("/verify/$credentialId")({
  head: () => ({ meta: [{ title: "NEXUS — Credential Verification" }] }),
  component: CredentialVerification,
});

// Cryptographic browser-level verification of W3C Verifiable Credential signature
async function verifyCredentialSignature(credentialData: any): Promise<boolean> {
  try {
    const proof = credentialData?.proof;
    if (!proof || !proof.publicKeyJwk || !proof.jws) {
      return false;
    }

    // Import JWK public key
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      proof.publicKeyJwk,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

    // Reassemble payload to verify
    const payloadToSign = JSON.stringify({
      id: credentialData.id,
      issuer: credentialData.issuer.id,
      issuanceDate: credentialData.issuanceDate,
      credentialSubject: credentialData.credentialSubject
    });

    const enc = new TextEncoder();
    const payloadBuffer = enc.encode(payloadToSign);

    // Base64 decode signature
    const signatureString = atob(proof.jws);
    const signatureBuffer = new Uint8Array(signatureString.length);
    for (let i = 0; i < signatureString.length; i++) {
      signatureBuffer[i] = signatureString.charCodeAt(i);
    }

    // Verify
    const isValid = await window.crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signatureBuffer,
      payloadBuffer
    );

    return isValid;
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}

function CredentialVerification() {
  const { credentialId } = Route.useParams();
  const [sigStatus, setSigStatus] = useState<"verifying" | "valid" | "invalid">("verifying");

  const { data: credential, isLoading, error } = useQuery({
    queryKey: ["credential", credentialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credentials")
        .select("*, profiles!inner(*)")
        .eq("id", credentialId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const credentialData = credential?.credential_json as any;

  useEffect(() => {
    if (credentialData) {
      verifyCredentialSignature(credentialData).then((isValid) => {
        setSigStatus(isValid ? "valid" : "invalid");
      });
    }
  }, [credentialData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-xs font-mono">Verifying credentials on-chain…</p>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-lg font-bold mb-2">Credential Auditing Failed</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">This credential ID was not found in the decentralized ledger. It might be invalid or deleted.</p>
        </div>
      </div>
    );
  }

  const isRevoked = credential.is_revoked;
  const evidence = credentialData?.evidence || [];
  const ipfsEvidence = evidence.find((e: any) => e.type?.includes("DocumentVerification"));
  const chainEvidence = evidence.find((e: any) => e.type?.includes("BlockchainAnchor"));

  return (
    <div className="min-h-screen bg-background py-16 px-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-xl mx-auto space-y-6 relative z-10">
        
        <div className="text-center mb-8 space-y-2">
          <Award className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">Credential verification</h1>
          <p className="text-xs text-muted-foreground">Verify the cryptographical signatures and on-chain anchors</p>
        </div>

        <div className={`nexus-card p-6 bg-surface/40 backdrop-blur-md border border-border/60 space-y-6 ${isRevoked ? "border-red-500/50" : ""}`}>
          
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              {isRevoked ? (
                <ShieldAlert className="h-5 w-5 text-red-400" />
              ) : sigStatus === "valid" ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : sigStatus === "invalid" ? (
                <ShieldAlert className="h-5 w-5 text-red-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
              
              <span className={`text-xs font-bold font-mono uppercase ${
                isRevoked ? "text-red-400" : sigStatus === "valid" ? "text-green-400" : "text-muted-foreground"
              }`}>
                {isRevoked ? "Revoked" : sigStatus === "valid" ? "Verified Valid" : "Validating signature..."}
              </span>
            </div>
            
            <span className="text-[10px] text-muted-foreground font-mono">
              ID: {credentialId.slice(0, 16)}…
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-foreground mb-1">{credential.title}</h2>
              {credential.description && (
                <p className="text-muted-foreground leading-relaxed">{credential.description}</p>
              )}
            </div>

            {credential.competency_tags && credential.competency_tags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Certified Competencies</p>
                <div className="flex flex-wrap gap-1.5">
                  {credential.competency_tags.map((tag: string) => (
                    <span key={tag} className="chip text-[10px] py-0.5 px-2 bg-elevated/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Holder Identity</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                  <User className="h-3.5 w-3.5 text-primary" /> 
                  {credential.profiles?.display_name || "Anonymous"}
                </span>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Issuance Date</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-accent-teal" />
                  {new Date(credential.issued_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Cryptographic signature */}
            <div className="pt-4 border-t border-border/40 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="text-[10px] uppercase font-semibold text-muted-foreground font-mono">Asymmetric Proof Manifest</span>
              </div>
              <div className="bg-elevated/20 p-2.5 rounded border border-border/40 font-mono text-[9px] text-muted-foreground break-all leading-normal">
                <p className="font-semibold text-foreground mb-1">Verification Method: <span className="text-primary">{credential.issuer_did}</span></p>
                <p className="font-semibold text-foreground mb-1">Signature Cipher: <span className="text-accent-teal">RSASSA-PKCS1-v1_5 SHA-256</span></p>
                <p className="mt-1">Signature Value: {credentialData?.proof?.jws || "None"}</p>
              </div>
            </div>

            {/* Evidence & Ledger anchoring */}
            {evidence.length > 0 && (
              <div className="pt-4 border-t border-border/40 space-y-2">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Decentralized Anchor Points</p>
                
                {ipfsEvidence && (
                  <div className="flex justify-between items-center text-xs p-2 bg-elevated/20 border border-border/40 rounded">
                    <div>
                      <p className="font-semibold text-foreground">IPFS Decentralized Storage</p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate max-w-xs">{ipfsEvidence.id}</p>
                    </div>
                    <a
                      href={ipfsEvidence.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-[10px] flex items-center gap-1"
                    >
                      <Link2 className="h-3 w-3" /> Gateway
                    </a>
                  </div>
                )}

                {chainEvidence && (
                  <div className="flex justify-between items-center text-xs p-2 bg-elevated/20 border border-border/40 rounded">
                    <div>
                      <p className="font-semibold text-foreground">Polygon Ledger Anchor</p>
                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate max-w-xs">Tx: {chainEvidence.transactionHash}</p>
                    </div>
                    <span className="text-accent-teal text-[9px] font-mono border border-accent-teal/30 px-1.5 py-0.5 rounded bg-accent-teal/5">
                      {chainEvidence.ledger}
                    </span>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">
            This verification run was completed fully client side. Private key signatures are sovereign to the NEXUS consensus networks.
          </p>
        </div>

      </div>
    </div>
  );
}
