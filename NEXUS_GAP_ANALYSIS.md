# NEXUS Gap Analysis & Code Audit Report

This report provides a brutal, file-by-file audit of the current NEXUS codebase against the 11 target products and features specified in the NEXUS System Context. It identifies what has been implemented, what is partially complete (stubs/mocks), what is entirely missing, critical architectural dependencies, and immediate roadmap steps to achieve a Minimum Viable Product (MVP).

---

## 1. Overall Progress Summary

The workspace currently represents a well-structured monorepo utilizing **Turborepo** (`turbo.json`) and **pnpm** workspaces (`pnpm-workspace.yaml`). It consists of a frontend web application (`apps/web`) built on Vite, React 19, Tailwind CSS, and TanStack Start; a basic Chrome Browser Extension (`apps/extension`); a helper TypeScript/JavaScript SDK client (`packages/sdk`); and a Supabase backend configuration (`supabase`) with 11 SQL migration files and 9 Edge Functions. 

While the database schemas are comprehensive and the frontend contains a visually premium layout with full routing, **almost all AI, cryptographic, and cross-platform integrations are heavily stubbed or mocked**. The Socratic AI Coach runs on simple client-side template engines; the RAG pipeline returns placeholder zero-vectors; blockchain and IPFS storage are represented by local database columns; and the Content Studio CMS is completely missing.

*   **MVP Completion Percentage: 25%**  
    *The skeleton, schemas, and UI layout are mostly in place for NEXUS Core (Product 1) and the AI Guardrail schemas (Product 7), but the Content Studio (Product 9) is 0% complete, and there is no active server-side LLM integration for Socratic reasoning or guardrail auditing.*
*   **Total Vision Completion Percentage: 15%**  
    *Across all 11 products, only the Core web app and browser extension have structural presence, while mobile, on-device tracking, and CMS elements are non-existent.*

---

## 2. Product-by-Product Analysis

### PRODUCT 1: NEXUS Core (PWA)
NEXUS Core is the primary surface. The frontend routing and layout are implemented, but features are largely mocked.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **Sovereign Authentication** | **Partial** | Standard Supabase OAuth and magic link are handled in [auth.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/auth.tsx), but WebAuthn/Passkeys are completely missing. |
| **Consent Management** | **Partial** | Configured in [settings.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/settings.tsx) as UI sliders, but database row-level policies do not actively enforce these settings across endpoints. |
| **Deprogramming Phase** | **Partial** | Onboarding screens in [onboarding.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/onboarding.tsx) cover Phase 0, but the 5 interactive modules are missing. |
| **Six Foundation Domains** | **Partial** | Domain cards are listed in [domains.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/domains.tsx), but clicking them displays a "modules coming soon" placeholder. |
| **The Cortex Core** | **Partial** | Timeline and CRUD are functional in [cortex.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/cortex.tsx) and [add-to-cortex-modal.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/components/add-to-cortex-modal.tsx). Live automated metadata enrichment is missing. |
| **Contribution Score** | **Partial** | Append-only ledger exists in [20260614120000_guardrails_and_core.sql](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/migrations/20260614120000_guardrails_and_core.sql) (`public.xp_ledger`), but the peer verification weighting algorithm is absent. |
| **Tier Progression** | **Partial** | Defined mathematically in [tiers.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/lib/tiers.ts), but does not lock/unlock features programmatically. |
| **Learning Circles & Question Wall** | **Partial** | Fronted in [community.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/community.tsx) and DB table `community_questions`, but live messaging/grouping is mock-only. |
| **AI Coach** | **Partial** | Implemented as static local rule-based templates in [ai-voices.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/lib/ai-voices.ts) and [ai-coach-panel.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/components/ai-coach-panel.tsx) instead of dynamic LLM RAG. |
| **Knowledge Graph Explorer** | **Partial** | Uses `react-force-graph-2d` in [knowledge-map/index.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/knowledge-map/index.tsx), but graph data is entirely hardcoded/mocked. |
| **Wellbeing Pulse** | **Partial** | Basic emotion wheel and log in [wellbeing.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/wellbeing.tsx), but no rhythm dashboards or synchronization helpers. |
| **Community Governance** | **Missing** | No code or routes represent community voting, moderation policies, or proposal structures. |
| **Data Export & Privacy** | **Missing** | Export buttons are missing; no data packing/download functions are implemented. |

**Verdict**: *Product 1 is halfway there.* The visual core is complete, but backend systems are represented by stubs.

---

### PRODUCT 2: NEXUS Mobile App (React Native)
A native app intended to mirror NEXUS Core with offline synchronization and native health integrations.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **All Features** | **Missing** | **No mobile application folder exists in the monorepo.** No React Native dependencies or configurations are initialized. |

**Verdict**: *Product 2 is non-existent.*

---

### PRODUCT 3: NEXUS Browser Extension (Chrome/Firefox)
A Manifest V3 extension designed to capture web-based learning signals.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **Site Detection Engine** | **Partial** | Configured in [content-script.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/extension/src/content/content-script.ts), but the `shouldInject()` logic is a stub returning `true` unconditionally. |
| **One-Click "Add to Cortex"** | **Partial** | The action is sent to the service worker via messages, but it extracts only raw page title/URL. No automated semantic analysis. |
| **Pattern Detection** | **Missing** | No local time aggregation engine is written in the extension scripts. |
| **Cross-Connection Surfacing** | **Missing** | No integration connects web contexts back to the NEXUS knowledge graph nodes dynamically. |
| **Consent Gate** | **Partial** | Options dashboard in [options.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/extension/src/options/options.tsx) saves an API token, but there is no mechanism to review/edit activity before dispatch. |

**Verdict**: *Product 3 is halfway there.* The manifest, option panels, and event communications exist, but automation and local classification are stubbed.

---

### PRODUCT 4: NEXUS SDK (npm package)
Developer tools to allow external platforms to push to the Cortex.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **JS/TS SDK Wrapper** | **Partial** | Exists in [packages/sdk/src/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/packages/sdk/src/index.ts) as a simple client class with basic inserts, but lacks error bounds or token validation helpers. |
| **Python & Ruby Wrappers** | **Missing** | No folder, wrapper libraries, or configurations are defined for these languages. |
| **Sandbox Environment** | **Missing** | No mock servers or local sandbox wrappers are present for offline developer testing. |
| **Consent Flow UI Components** | **Missing** | No reusable web components for integration authentication gates are compiled in the SDK. |
| **Standardized Activity Schema** | **Partial** | Type definitions exist in [packages/types/src/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/packages/types/src/index.ts), but the client wrapper does not actively enforce schemas. |

**Verdict**: *Product 4 is mostly non-existent.* Only a barebones JS client class is implemented.

---

### PRODUCT 5: NEXUS Mentor Console
A workspace area for human co-mentors.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **Waitlist Pathway** | **Partial** | A front-end onboarding gate exists in [mentor.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/mentor.tsx) that inserts users into the `mentor_development` table. |
| **Mentee Cortex View** | **Missing** | There is no interface or secure access route for mentors to review their mentees' entries. |
| **Goal Tracking & Messaging** | **Missing** | No goal-setting cards, shared milestones, or long-form chat systems exist. |
| **Health Indicators & Transition**| **Missing** | Relationships are represented by DB schemas, but logic for decay metrics or termination protocols is absent. |

**Verdict**: *Product 5 is mostly non-existent.*

---

### PRODUCT 6: NEXUS Institutional Console
aggregate, anonymized dashboards for enterprise/school deployment.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **Aggregate Dashboard** | **Partial** | Route [institutional/index.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/institutional/index.tsx) presents cohort visualizations, but the data is completely simulated. |
| **Wellbeing & Mentor Pools** | **Partial** | Mock wellbeing dials and mentor allocation lists are present. |
| **Legacy Bridge (Exporter)** | **Partial** | Code blocks for PDF resume generation and transcript conversions are mock-only. |
| **SSO & White-Labelling** | **Missing** | No SAML/SSO configs or multi-tenant workspace custom style templates are implemented. |

**Verdict**: *Product 6 is halfway there.* The UI mockups are complete, but no real database aggregation or multi-tenant SSO is wired up.

---

### PRODUCT 7: NEXUS AI Guardrail Service
An internal moderation and audit pipeline to keep AI interactions safe.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **Adversarial Audit Pipeline** | **Partial** | **Blocked by Database Schema Bug.** Edge function [adversarial-audit](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/adversarial-audit/index.ts) triggers a database function that attempts to write into missing table columns. |
| **Anomaly Detection & Alerting** | **Missing** | No monitoring service processes AI prompt patterns for anomalies. |
| **Socratic Explanation API** | **Partial** | DB table `ai_question_explanations` exists, but explanations are generated using client-side strings in [ai-voices.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/lib/ai-voices.ts). |
| **Harm Classifier & Handoff** | **Partial** | Basic client-side regex in [ai-boundaries.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/lib/ai-boundaries.ts) triggers mental health help cards, but there is no server-side model processing this. |
| **Transparency Reports** | **Missing** | No logs aggregator produces regular audit records. |

**Verdict**: *Product 7 is halfway there.* The guardrail framework and crisis boundaries are visually represented, but database execution is broken and LLM auditing is missing.

---

### PRODUCT 8: NEXUS Verifiable Credential Service
Cryptographic credential infrastructure.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **JSON-LD W3C Conversion** | **Partial** | Edge Function [credential-issue](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/credential-issue/index.ts) constructs W3C JSON-LD schemas, but leaves signature headers empty. |
| **Blockchain Anchoring** | **Missing** | No Polygon smart contract calls or transaction anchors are written. |
| **IPFS Storage** | **Missing** | No IPFS pinning service integrations (e.g., Pinata) are connected. |
| **Wallet UI** | **Partial** | Wallet routes in [wallet/index.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/wallet/index.tsx) display local DID keys and credentials. |
| **Public Verification Portal** | **Partial** | Route [verify/$credentialId.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/verify/$credentialId.tsx) displays validity status based purely on database presence, without verifying cryptographic signatures. |

**Verdict**: *Product 8 is halfway there.* The schemas and wallet screens exist, but cryptographic signing and decentralized anchors are missing.

---

### PRODUCT 9: NEXUS Content Studio (CMS)
NEXUS-specific content creation engine.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **All Features** | **Missing** | **No CMS application, folder, or pages exist.** There are no templates or tools for editing narrative branches. |

**Verdict**: *Product 9 is non-existent.*

---

### PRODUCT 10: NEXUS Activity Tracking Pack
On-device encrypted background service.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **All Features** | **Missing** | **No background service code exists.** The project does not contain scripts for local filesystem note tracking or location context tagging. |

**Verdict**: *Product 10 is non-existent.*

---

### PRODUCT 11: NEXUS Community Knowledge Base
A wiki-like peer-reviewed knowledge structure connected to the graph.

| Feature | Status | Notes (Specific Files & What's Missing) |
|:---|:---|:---|
| **Article Submission** | **Missing** | No edit screens or submission structures exist. |
| **Peer Validation Flow** | **Partial** | Edge function [peer-validate](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/peer-validate) exists as an endpoint stub, but is completely disconnected from the client. |
| **Multiple Perspectives & History** | **Missing** | No conflict flagging or citation parsing engines exist. |

**Verdict**: *Product 11 is mostly non-existent.*

---

## 3. Critical Missing Features (Blockers)

The following foundational blockers must be addressed before the rest of the application can function:

1.  **Supabase Database Schema Bug (High Severity)**
    *   **File**: [20260614120000_guardrails_and_core.sql](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/migrations/20260614120000_guardrails_and_core.sql) and [20260614270000_adversarial_audit.sql](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/migrations/20260614270000_adversarial_audit.sql)
    *   **Issue**: The `ai_audit_log` table definition is missing the `risk_score` (float) and `flags` (jsonb) columns. However, the `run_adversarial_audit` and `batch_audit_recent_entries` database functions attempt to write to these columns. This causes database execution failures whenever an audit function is triggered.
    *   **Dependency**: Product 7 (AI Guardrails) and all services writing to `ai_audit_log` depend on a fix to this schema.

2.  **Live LLM Integration (NVIDIA / Anthropic APIs)**
    *   **Files**: [mentor.functions.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/lib/api/mentor.functions.ts), [classify/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/sdk/classify/index.ts), and [ai-assess/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/ai-assess/index.ts)
    *   **Issue**: Currently, LLM endpoints are either bypassed with static text (AI Coach, RAG search) or rely on environment variables that run directly on client surfaces, causing CORS preflight blocks.
    *   **Dependency**: AI Socratic coaching, automated evidence classification, and AI-driven assessments cannot function without a secure server-side LLM orchestration layer.

3.  **Product 9 (Content Studio)**
    *   **Issue**: The CMS project is completely missing.
    *   **Dependency**: The five interactive deprogramming modules (Phase 1) and core domains cannot be loaded, structured, or mapped to the knowledge graph without the Content Studio to define the learning paths.

4.  **Decentralized Credential Trust Chain**
    *   **Files**: [credential-issue/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/credential-issue/index.ts) and [wallet/index.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/wallet/index.tsx)
    *   **Issue**: Credentials are format-mapped but lack cryptographic signatures. DIDs are simply database keys rather than valid decentralized anchors.
    *   **Dependency**: The sovereignty verification portal cannot independently verify credentials without platform database lookup.

---

## 4. Partially Implemented Features (Needs Work)

These features have a code foundation but require functionality improvements:

*   **RAG Search Pipeline**  
    *   *Path*: [rag-search/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/rag-search/index.ts)
    *   *Remaining Work*: Replace the mock zero-vector embedding generation with a live embedding model call (e.g., OpenAI or Anthropic). Enable pgvector similarity searches rather than mock matches.
*   **Browser Extension Capture**  
    *   *Path*: [content-script.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/extension/src/content/content-script.ts)
    *   *Remaining Work*: Build a parsing script to pull metadata (e.g., reading time, authors, repository structures) from learning sites (GitHub, YouTube) instead of just the browser tab's title and URL.
*   **Integral Mastery Assessment (IMA)**  
    *   *Path*: [ima/index.tsx](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/apps/web/src/routes/_authenticated/ima/index.tsx) and [ai-assess/index.ts](file:///d:/Sri%20Nithilan/Documents/GitHub/truth-spark-path/supabase/functions/ai-assess/index.ts)
    *   *Remaining Work*: Connect submission actions to the `ai-assess` Supabase function to query real narrative feedback and dimension scores, rather than generating static mock data.

---

## 5. What Has Been Done Well

The existing workspace demonstrates strong design and architectural decisions:

*   **Robust Monorepo Foundation**: Standardizing on Turborepo, pnpm workspaces, and TanStack Start allows clean compilation and code-sharing across frontend and packages.
*   **Visual Excellence**: The web UI features a polished dark-mode interface with clean glassmorphism (`backdrop-blur`), subtle transitions, and responsive grid layouts.
*   **Database Design**: Aside from the `ai_audit_log` discrepancy, the database schemas for append-only logs, mental health resources, quests, and DID wallets are well-indexed and secure.
*   **Extensible Extension Framework**: The browser extension uses a modern Manifest V3 structure and bundles smoothly into target build directories.

---

## 6. Recommended Next Steps

### Short-Term (Next 2 Weeks)
1.  **Resolve Database Schema Bug**: Write a migration to add `risk_score` (float) and `flags` (jsonb) to `public.ai_audit_log` to restore the adversarial audit function pipeline.
2.  **Secure LLM Handshakes**: Establish a secure server-side endpoint inside Supabase Edge Functions to bridge the frontend to the NVIDIA/Anthropic API, eliminating CORS blocks on the client.
3.  **Bridge the RAG Pipeline**: Replace the mock 1536-dimensional zero vector inside `rag-search` with a live embedding model, enabling similarity lookups.

### Medium-Term (1–3 Months)
1.  **Initialize Product 9 (Content Studio)**: Create a workspace app (`/apps/cms`) to allow editors to author deprogramming narrative branches and structure domain nodes.
2.  **Develop Interactive Onboarding Modules**: Complete the 5 deprogramming modules to replace the current placeholder cards.
3.  **Incorporate Cryptographic Signing**: Integrate a library like `noble-secp256k1` or similar within the `credential-issue` function to cryptographically sign W3C credentials.

### Long-Term (6+ Months)
1.  **Build Product 2 (Mobile App)**: Bootstrap a React Native client directory that shares the packages/types validation rules.
2.  **Build Product 10 (Activity Tracking Pack)**: Develop the on-device desktop tracker daemon to support offline-first local activity logs.

---

## Self-Check

- **All 11 Products Reviewed?** Yes, audited sequentially and detailed in Section 2.
- **MVP Scope Covered?** Yes, mapped progress for Product 1 (Core), Product 9 (Content Studio), and Product 7 (AI Guardrails).
- **Brutally Honest?** Yes, highlighted schema bugs, mock embedding logic, and missing services explicitly.
- **File References Included?** Yes, linked to specific project files throughout.
