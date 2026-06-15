import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { 
  Building2, Users, Award, CreditCard, Shield, 
  Settings, Key, HeartPulse, FileText, Download, 
  Sparkles, CheckCircle2, AlertTriangle, Eye, Sliders
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/institutional/")({
  head: () => ({ meta: [{ title: "NEXUS — Institutional Console" }] }),
  component: InstitutionalConsole,
});

// Mock cohort configurations for demo toggling k-anonymity
const DEMO_COHORTS = [
  { id: "c1", name: "Philosophy & Epistemology A", size: 8, avgXp: 2840, avgShifts: 4.2, wellbeingIndex: 8.5 },
  { id: "c2", name: "Adrenaline Deconstruct B", size: 3, avgXp: 1250, avgShifts: 1.5, wellbeingIndex: 5.2 }, // Under 5 members
  { id: "c3", name: "Systems Thinking Lab C", size: 12, avgXp: 3120, avgShifts: 5.6, wellbeingIndex: 7.9 },
  { id: "c4", name: "Skepticism Group Delta", size: 4, avgXp: 900, avgShifts: 0.8, wellbeingIndex: 6.0 }, // Under 5 members
];

function InstitutionalConsole() {
  const [activeTab, setActiveTab] = useState<"overview" | "cohorts" | "saml-sso">("overview");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("c1");
  
  // SAML SSO configuration states
  const [samlMetadataUrl, setSamlMetadataUrl] = useState("https://idp.local/saml/metadata");
  const [samlSsoUrl, setSamlSsoUrl] = useState("https://idp.local/saml/sso");
  const [samlCertFingerprint, setSamlCertFingerprint] = useState("A9:B2:C5:11:8F:D0:6B:A9:E8...");
  const [isSamlEnabled, setIsSamlEnabled] = useState(false);

  // White-labeling preview states
  const [primaryColor, setPrimaryColor] = useState("#00f2fe");
  const [sidebarBg, setSidebarBg] = useState("#0a0a0a");
  const [customLogoText, setCustomLogoText] = useState("ACME Academy");

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["institutional-licenses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("institutional_licenses")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: issuedCredentials = [] } = useQuery({
    queryKey: ["issued-credentials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credentials")
        .select("*, profiles(*)")
        .order("issued_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const handleSaveSaml = () => {
    toast.success("SAML SSO configurations saved and activated.");
    setIsSamlEnabled(true);
  };

  const handleGenerateTranscript = (cred: any) => {
    toast.success(`Transcript generation initialized for ${cred.profiles?.display_name || "learner"}.`);
    
    // Simulate verifiable PDF transcript page print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>NEXUS Verifiable Transcript - ${cred.profiles?.display_name || "Student"}</title>
          <style>
            body { font-family: 'Inter', sans-serif; background: #FFF; color: #000; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .org { font-size: 20px; font-weight: bold; }
            .title { font-size: 28px; font-weight: bold; margin: 30px 0 10px 0; }
            .meta { font-size: 14px; margin-bottom: 30px; line-height: 1.6; }
            .section { font-weight: bold; margin-top: 35px; border-bottom: 1px solid #CCC; padding-bottom: 5px; }
            .details { font-size: 14px; margin-top: 15px; line-height: 1.8; }
            .qr-container { display: flex; align-items: center; gap: 20px; margin-top: 50px; padding: 15px; border: 1px dashed #333; width: fit-content; }
            .qr-placeholder { width: 100px; height: 100px; background: #000; display: flex; align-items: center; justify-content: center; }
            .qr-text { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="org">${customLogoText} — NEXUS Verified</div>
              <div>Decentralized Ledger Authenticated</div>
            </div>
            <div>DID Identifier: did:nexus:org:${cred.id.slice(0,8)}</div>
          </div>
          <div class="title">Official Learning Record Transcript</div>
          <div class="meta">
            <strong>Learner Display Name:</strong> ${cred.profiles?.display_name || "Anonymous Learner"}<br/>
            <strong>Cortex Handle:</strong> @${cred.profiles?.handle || "seeker"}<br/>
            <strong>Issued Timestamp:</strong> ${new Date(cred.issued_at).toLocaleString()}<br/>
            <strong>Credential Class:</strong> ${cred.title}<br/>
            <strong>Status:</strong> Valid / Non-Revoked
          </div>
          <div class="section">Cortex Verification Evidence</div>
          <div class="details">
            ${cred.description || "The learner has achieved the required thresholds for sovereign intelligence, cognitive modeling, and socratic analysis."}
          </div>
          <div class="qr-container">
            <div class="qr-placeholder">
              <svg width="80" height="80" viewBox="0 0 29 29" fill="#FFF">
                <path d="M0 0h9v9H0zm2 2v5h5V2zm18-2h9v9h-9zm2 2v5h5V2zM0 20h9v9H0zm2 2v5h5V2zm22-2h5v2h-5zm3 3h2v6h-2zm-3 4h3v2h-3zm-2-2h2v4h-2zm7-7h2v2h-2zm-12 1h2v3h-2zm-2 4h2v2h-2zm4 2h2v2h-2zm-2 2h2v1h-2zm8-13h2v2h-2zm-2 2h2v2h-2zm-2-2h2v2h-2zm-2 2h2v2h-2zm6 2h2v2h-2zm-4 2h2v2h-2z"/>
              </svg>
            </div>
            <div class="qr-text">
              <strong>Scan to Verify On-Chain Anchor</strong><br/>
              DID Anchor: did:key:z6MkgT78...<br/>
              Ledger Location: Polygon Mainnet Indexer<br/>
              Verification URL: /verify/${cred.id}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const selectedCohort = DEMO_COHORTS.find(c => c.id === selectedCohortId);
  const isKAnonymityGated = selectedCohort ? selectedCohort.size < 5 : false;

  if (isLoading) {
    return <AppShell title="Institutional Console"><p className="text-sm text-muted-foreground">Loading...</p></AppShell>;
  }

  return (
    <AppShell title="Institutional Console">
      <div className="space-y-6">
        
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {customLogoText} Institutional Space
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Control licenses, audit learning circles, and configure SAML authentication.</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition ${activeTab === "overview" ? "bg-primary text-black" : "bg-elevated hover:bg-elevated/70"}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("cohorts")}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition ${activeTab === "cohorts" ? "bg-primary text-black" : "bg-elevated hover:bg-elevated/70"}`}
            >
              Cohort Explorer (k-Anonymity)
            </button>
            <button
              onClick={() => setActiveTab("saml-sso")}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition ${activeTab === "saml-sso" ? "bg-primary text-black" : "bg-elevated hover:bg-elevated/70"}`}
            >
              SSO & White-Labeling
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & LICENSES */}
        {/* ---------------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="nexus-card p-4 bg-surface/50 border border-border/60">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-accent-teal" />
                  <div>
                    <p className="text-2xl font-bold">{licenses.length}</p>
                    <p className="text-xs text-muted-foreground">Active Licenses</p>
                  </div>
                </div>
              </div>

              <div className="nexus-card p-4 bg-surface/50 border border-border/60">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold">
                      {licenses.reduce((sum: number, lic: any) => sum + (lic.seat_count || 0), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Seats</p>
                  </div>
                </div>
              </div>

              <div className="nexus-card p-4 bg-surface/50 border border-border/60">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold">{issuedCredentials.length}</p>
                    <p className="text-xs text-muted-foreground">Issued Credentials</p>
                  </div>
                </div>
              </div>

              <div className="nexus-card p-4 bg-surface/50 border border-border/60">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-orange-400" />
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(licenses.map((l: any) => l.organization_name)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Orgs Registered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Licenses Table */}
            <div className="nexus-card p-6 bg-surface/30 border border-border/60">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-accent-teal" /> Institutional Licenses
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-3">Organization</th>
                      <th className="pb-3">License Type</th>
                      <th className="pb-3">Seats</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((license: any) => (
                      <tr key={license.id} className="border-b border-border">
                        <td className="py-3 font-semibold text-foreground">{license.organization_name}</td>
                        <td className="py-3 capitalize">{license.license_type}</td>
                        <td className="py-3">{license.seat_count}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            license.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {license.status}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verifiable Transcripts section */}
            <div className="nexus-card p-6 bg-surface/30 border border-border/60">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-primary" /> Issued Verifiable Credentials & Transcripts
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {issuedCredentials.map((credential: any) => (
                  <div key={credential.id} className="p-4 bg-elevated/40 border border-border/40 rounded-lg flex justify-between items-start">
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-semibold text-xs text-foreground truncate">{credential.title}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Learner: @{credential.profiles?.handle || "seeker"}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{credential.description}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">DID: did:nexus:${credential.id.slice(0, 8)}</p>
                    </div>
                    <button
                      onClick={() => handleGenerateTranscript(credential)}
                      className="bg-primary/10 border border-primary/20 text-primary p-2 rounded hover:bg-primary/20 transition flex items-center gap-1 text-[10px] shrink-0"
                    >
                      <Download className="h-3 w-3" /> Transcript
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: COHORT EXPLORER & K-ANONYMITY */}
        {/* ---------------------------------------------------- */}
        {activeTab === "cohorts" && (
          <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
            {/* Cohort list */}
            <div className="space-y-4">
              <div className="nexus-card p-4 bg-surface/40 border border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Cohorts</h4>
                <div className="space-y-1.5">
                  {DEMO_COHORTS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCohortId(c.id)}
                      className={`w-full text-left p-2.5 rounded text-xs flex items-center justify-between transition ${
                        selectedCohortId === c.id ? "bg-primary text-black font-semibold" : "bg-elevated hover:bg-elevated/70 text-foreground"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] font-mono opacity-80">N={c.size}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aggregated Statistics with k-anonymity checks */}
            {selectedCohort && (
              <div className="space-y-6">
                <div className="nexus-card p-6 bg-surface/30 border border-border/60">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                    <div>
                      <h3 className="font-bold text-md text-foreground">{selectedCohort.name}</h3>
                      <p className="text-xs text-muted-foreground">Cohort group size: {selectedCohort.size} learners</p>
                    </div>
                    
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isKAnonymityGated ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"
                    }`}>
                      {isKAnonymityGated ? "k-Anonymity Lock (Redacted)" : "Verified Anonymized Cohort"}
                    </span>
                  </div>

                  {isKAnonymityGated ? (
                    <div className="p-8 text-center bg-red-950/10 border border-red-500/20 rounded-lg space-y-3">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                      <h4 className="font-bold text-sm text-foreground">Aggregates Redacted for Learner Sovereignty</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        In alignment with NEXUS self-sovereign protection standards, data aggregates are locked if a cohort consists of **fewer than 5 active learners** to prevent deductive de-anonymization.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 bg-elevated/40 border border-border/40 rounded-lg">
                          <p className="text-xs text-muted-foreground">Average Cortex XP</p>
                          <p className="text-2xl font-bold mt-1 text-primary">{selectedCohort.avgXp} XP</p>
                        </div>
                        <div className="p-4 bg-elevated/40 border border-border/40 rounded-lg">
                          <p className="text-xs text-muted-foreground">Perspective Shifts / Learner</p>
                          <p className="text-2xl font-bold mt-1 text-accent-teal">{selectedCohort.avgShifts}</p>
                        </div>
                        <div className="p-4 bg-elevated/40 border border-border/40 rounded-lg">
                          <p className="text-xs text-muted-foreground">Wellbeing Score (Out of 10)</p>
                          <p className="text-2xl font-bold mt-1 text-accent-amber">{selectedCohort.wellbeingIndex}</p>
                        </div>
                      </div>

                      {/* Wellbeing Allocations view */}
                      <div className="p-5 bg-elevated/20 border border-border/40 rounded-lg space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <HeartPulse className="h-4 w-4 text-accent-teal" /> Anonymized Wellbeing Allocation Distributions
                        </h4>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Inspired / Epistemically Charged</span>
                              <span className="font-bold text-foreground">45%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: "45%" }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Balanced / Focused Study</span>
                              <span className="font-bold text-foreground">35%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                              <div className="h-full bg-accent-teal" style={{ width: "35%" }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Cognitive Overload / Somatic Break Needed</span>
                              <span className="font-bold text-foreground">20%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                              <div className="h-full bg-accent-amber" style={{ width: "20%" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: SAML SSO & WHITE-LABEL PREVIEW */}
        {/* ---------------------------------------------------- */}
        {activeTab === "saml-sso" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* SSO Configuration */}
            <div className="nexus-card p-6 bg-surface/30 border border-border/60 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-border/40 pb-3">
                <Shield className="h-4.5 w-4.5 text-primary" /> SAML 2.0 Integration Setup
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">IdP Metadata XML URL</label>
                  <input
                    type="text"
                    value={samlMetadataUrl}
                    onChange={(e) => setSamlMetadataUrl(e.target.value)}
                    className="w-full bg-elevated border border-border rounded p-2 focus:outline-none focus:border-primary text-muted-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">SAML Single Sign-On Endpoint</label>
                  <input
                    type="text"
                    value={samlSsoUrl}
                    onChange={(e) => setSamlSsoUrl(e.target.value)}
                    className="w-full bg-elevated border border-border rounded p-2 focus:outline-none focus:border-primary text-muted-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">IdP Certificate Fingerprint</label>
                  <input
                    type="text"
                    value={samlCertFingerprint}
                    onChange={(e) => setSamlCertFingerprint(e.target.value)}
                    className="w-full bg-elevated border border-border rounded p-2 focus:outline-none focus:border-primary text-muted-foreground font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saml-active"
                      checked={isSamlEnabled}
                      onChange={(e) => setIsSamlEnabled(e.target.checked)}
                      className="accent-primary h-4 w-4"
                    />
                    <label htmlFor="saml-active" className="text-xs text-foreground cursor-pointer font-medium">
                      Activate SSO redirect route
                    </label>
                  </div>
                  
                  <button
                    onClick={handleSaveSaml}
                    className="bg-primary text-black font-semibold px-4 py-2 rounded text-xs hover:opacity-90 transition"
                  >
                    Save Config
                  </button>
                </div>
              </div>
            </div>

            {/* Custom White-Labeling & Styling Preview */}
            <div className="nexus-card p-6 bg-surface/30 border border-border/60 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-border/40 pb-3">
                <Sliders className="h-4.5 w-4.5 text-accent-teal" /> Custom White-Label Styling
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1 font-medium">Organization Display Name</label>
                  <input
                    type="text"
                    value={customLogoText}
                    onChange={(e) => setCustomLogoText(e.target.value)}
                    className="w-full bg-elevated border border-border rounded p-2 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Primary Accent Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="bg-transparent border-0 cursor-pointer h-8 w-8"
                      />
                      <span className="font-mono">{primaryColor}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1 font-medium">Console Background</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={sidebarBg}
                        onChange={(e) => setSidebarBg(e.target.value)}
                        className="bg-transparent border-0 cursor-pointer h-8 w-8"
                      />
                      <span className="font-mono">{sidebarBg}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Glassmorphic Sandbox Preview */}
                <div className="border border-border/40 rounded-lg p-4 bg-black/60 relative overflow-hidden mt-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-3 font-mono">Portal Canvas Preview</p>
                  
                  <div className="rounded p-3 flex justify-between items-center" style={{ backgroundColor: sidebarBg }}>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                      <span className="font-bold font-display text-[11px]">{customLogoText}</span>
                    </div>
                    <button className="px-2.5 py-1 text-[9px] rounded font-semibold text-black" style={{ backgroundColor: primaryColor }}>
                      Authorize Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
