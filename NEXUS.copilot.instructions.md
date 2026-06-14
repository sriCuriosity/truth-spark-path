# NEXUS — Copilot Master Instructions
> AI-optimized reference for VS Code GitHub Copilot. No filler. Every section is signal.
> Version: 0.1.0-alpha | Status: Active Development | Last Updated: 2025-06

---

## TABLE OF CONTENTS
1. [System Overview](#1-system-overview)
2. [9-Layer Architecture](#2-9-layer-architecture)
3. [Products & Surfaces](#3-products--surfaces)
4. [PRD — Product Requirements](#4-prd--product-requirements)
5. [FRD — Functional Requirements](#5-frd--functional-requirements)
6. [SRS — Software Requirements Specification](#6-srs--software-requirements-specification)
7. [TechSpec — Technical Specification](#7-techspec--technical-specification)
8. [Database Schema](#8-database-schema)
9. [Application Flow](#9-application-flow)
10. [Design System](#10-design-system)
11. [Implementation Plan](#11-implementation-plan)
12. [Task Tracker](#12-task-tracker)
13. [Coding Rules & Standards](#13-coding-rules--standards)
14. [Test Plan / QA Strategy](#14-test-plan--qa-strategy)
15. [Risk Register](#15-risk-register)
16. [Deployment Guide](#16-deployment-guide)
17. [Maintenance & Support Plan](#17-maintenance--support-plan)
18. [User Documentation](#18-user-documentation)
19. [Change Log](#19-change-log)

---

## 1. SYSTEM OVERVIEW

### Mission
NEXUS is a self-sovereign learning operating system. It inverts the control variables of the traditional examination paradigm — replacing grades/fear/compliance with mastery/adrenaline/autonomy. It is not a replacement for school; it is a counter-system that wins minds by being more desirable.

### Core Philosophy
- Learning is driven by **adrenaline toward truth**, not fear of failure.
- **Sovereignty**: the learner owns all data, credentials, and identity — no institution can revoke it.
- **Cortex** = a living, chronological, multi-modal proof of who you are and what you have done. Unfakeable, unrevokable.
- **IMA (Integral Mastery Assessment)** = the credentialing festival that replaces the exam — multi-modal, portfolio-based, peer + AI + expert validated.
- Gamification is a **means**, not an end. If it becomes a Skinner box, it has failed.

### Counter-System Equation
```
Old System:  Grade = f(Memory × Time × Fear)
NEXUS:       Mastery = f(Evidence × Peer_Validation × Real_World_Impact × Self_Authorship)
```

### Primary Users
| Persona | Role |
|---|---|
| Learner | Core user. Builds Cortex, earns mastery badges, completes IMA |
| Mentor | Guides learners, validates peer evidence |
| Assessor | Expert reviewer for IMA submissions |
| Admin | Platform governance, content moderation |
| Organization | Employer / institution consuming verified credentials |

---

## 2. 9-LAYER ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 9 │ xAPI / Learning Record Store (LRS)               │
├─────────────────────────────────────────────────────────────┤
│  Layer 8 │ Simulation Environments                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 7 │ RAG Pipeline (Retrieval-Augmented Generation)    │
├─────────────────────────────────────────────────────────────┤
│  Layer 6 │ Agentic AI Network                               │
├─────────────────────────────────────────────────────────────┤
│  Layer 5 │ Knowledge Graph                                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 4 │ Self-Sovereign Identity (SSI)                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 3 │ Credential Infrastructure                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 2 │ AI Assessment Engine                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 1 │ Cortex Core + SDK + Browser Extension            │
└─────────────────────────────────────────────────────────────┘
```

### Layer Descriptions

#### Layer 1 — Cortex Core + SDK + Browser Extension
- **Purpose**: Capture all learning evidence across the internet and local activity into the learner's Cortex.
- **Components**: Web app, Browser Extension (MV3), Desktop SDK, Edge Functions (Supabase), Cortex DB.
- **Key concept**: "Add to Cortex" — one-click evidence capture from any surface.

#### Layer 2 — AI Assessment Engine
- **Purpose**: Evaluate learner submissions for depth, creativity, emotional intelligence, and mastery (not recall).
- **Components**: Assessment API, Rubric Engine, Anti-Gaming Detector, Feedback Generator.
- **Sovereignty guardrail**: AI scores are advisory. Learner can contest. Human mentor has override.

#### Layer 3 — Credential Infrastructure
- **Purpose**: Issue, store, verify cryptographically signed mastery credentials.
- **Components**: Badge Issuer, Verifiable Credential (VC) Generator, Public Verification Portal.
- **Standard**: W3C Verifiable Credentials + Open Badges 3.0.

#### Layer 4 — Self-Sovereign Identity (SSI)
- **Purpose**: Learner owns their identity — no platform lock-in.
- **Components**: DID (Decentralized Identifier) Generator, Wallet Interface, Key Management.
- **Stack**: did:key or did:web initially; migrate to did:ion if scale demands.

#### Layer 5 — Knowledge Graph
- **Purpose**: Map learner's demonstrated competencies across domains. Surface gaps and connections.
- **Components**: Graph DB (Neo4j or equivalent), Competency Ontology, Skill Relationship Mapper.
- **Output**: Visual "Mastery Map" for learner dashboard.

#### Layer 6 — Agentic AI Network
- **Purpose**: AI agents that proactively support learning — not direct it.
- **Agents**: ChallengeAgent (surfaces quests), MentorAgent (nudges not prescribes), AuditAgent (checks AI authority creep), ReflectionAgent (Socratic questioning).
- **Hard rule**: No agent can add to Cortex without explicit learner consent.

#### Layer 7 — RAG Pipeline
- **Purpose**: Ground AI responses in learner's own Cortex evidence.
- **Components**: Embedding Store (pgvector), Retrieval API, Context Injector, Citation Engine.
- **Privacy**: RAG only over learner's own data unless they explicitly share.

#### Layer 8 — Simulation Environments
- **Purpose**: Real-world challenge simulations for IMA assessment and practice.
- **Types**: Code sandboxes, debate arenas, project simulations, peer teaching scenarios.
- **Stack**: Isolated containers (Docker), WebSocket-based real-time, xAPI event emitters.

#### Layer 9 — xAPI / LRS
- **Purpose**: Standardized learning event store. All activity across all layers emits xAPI statements.
- **Components**: LRS API (TinCan compatible), Statement Validator, Analytics Aggregator.
- **Use**: Evidence source for Cortex, audit trail, analytics for learner + mentor + admin.

---

## 3. PRODUCTS & SURFACES

### 3.1 Web Application (`/apps/web`)
**Stack**: React 19, TypeScript, Vite, Tailwind CSS, Supabase JS client
**Routes**:
```
/                    → Landing / marketing
/login               → Auth (magic link + OAuth)
/dashboard           → Learner home — Cortex summary, tier status, active quests
/cortex              → Full Cortex timeline view
/cortex/entry/:id    → Single entry detail
/cortex/new          → Manual entry creation
/ima                 → IMA portal — active assessments, submissions, results
/ima/:assessmentId   → Single IMA detail
/credentials         → Issued badges + VCs, share/verify links
/knowledge-map       → Interactive competency graph
/quests              → Active + available challenge quests
/quests/:questId     → Quest detail + submission
/mentors             → Find / connect with mentors
/profile             → Learner profile + settings + sovereignty controls
/admin               → Admin panel (role-gated)
/verify/:credentialId → Public credential verification (no auth required)
```

### 3.2 Browser Extension (`/apps/extension`)
**Manifest**: V3
**Stack**: TypeScript, Webpack, Supabase JS
**Permissions**: `activeTab`, `storage`, `scripting`, `identity`
**Files**:
```
manifest.json
background/service-worker.ts   → Intercepts activity, queues Cortex events
content/content-script.ts      → DOM listener, "Add to Cortex" injector
popup/popup.tsx                → Quick capture UI
options/options.tsx             → Extension settings, auth, privacy controls
utils/cortex-client.ts         → API wrapper for Cortex Edge Functions
utils/activity-classifier.ts   → Classifies page type (article/video/forum/code)
utils/xapi-emitter.ts          → Emits xAPI statements from browser activity
```
**Key flows**:
- User visits YouTube video → extension classifies → user clicks "Add to Cortex" → modal captures context + reflection → POST to `/api/cortex/entries`
- User completes a GitHub commit → extension detects → prompts optional capture
- All captures require explicit user action (no silent tracking)

### 3.3 Desktop SDK (`/packages/sdk`)
**Stack**: TypeScript, Node.js, published as npm package
**Purpose**: Allow third-party apps / tools to push evidence into learner's Cortex with consent
**Exports**:
```typescript
CortexClient          // Core client — auth, CRUD on entries
ActivityCapture       // Capture local file, terminal, IDE activity
xAPIEmitter           // Emit xAPI statements to LRS
ConsentGate           // Every write goes through explicit consent check
```

### 3.4 Admin Panel (`/apps/admin`)
Built into web app at `/admin`, role-gated. Handles:
- Manual worker/mentor verification
- Content moderation queue
- Credential issuance oversight
- AI audit log review
- Analytics dashboard

---

## 4. PRD — PRODUCT REQUIREMENTS

### P1 — Core (Must have for v1)
| ID | Requirement |
|---|---|
| P1-01 | Learner can create an account with email magic link or OAuth (Google) |
| P1-02 | Learner can create a Cortex entry manually (text, link, file, reflection) |
| P1-03 | Browser extension can capture web activity with explicit user action |
| P1-04 | Learner has a dashboard showing Cortex timeline, tier level, active quests |
| P1-05 | Tier system (5 tiers) with XP, leveling, and adrenaline spike notifications |
| P1-06 | Peer validation — learner can request validation from another user |
| P1-07 | AI generates non-prescriptive feedback on Cortex entries |
| P1-08 | Basic credential issuance — mastery badge for completed quest |
| P1-09 | Public credential verification URL (no auth) |
| P1-10 | Learner can delete all their data (right to erasure) |
| P1-11 | AI audit log — every AI action on learner data is logged and viewable |

### P2 — Enhanced (v1.5)
| ID | Requirement |
|---|---|
| P2-01 | IMA portal — learner can submit a full assessment portfolio |
| P2-02 | Expert assessor review flow with scoring rubric |
| P2-03 | Knowledge map — visual competency graph |
| P2-04 | Mentor connect — find, invite, accept mentors |
| P2-05 | RAG-powered AI — AI responses grounded in learner's own Cortex |
| P2-06 | Simulation environments — code sandbox, debate arena |
| P2-07 | xAPI LRS — full learning record store |

### P3 — Future
| ID | Requirement |
|---|---|
| P3-01 | SSI / DID wallet — self-sovereign identity |
| P3-02 | Organization portal — employers verify credentials |
| P3-03 | Agentic AI network — proactive challenge and reflection agents |
| P3-04 | Zero-knowledge credential proofs |
| P3-05 | Open SDK — third parties can build Cortex integrations |

---

## 5. FRD — FUNCTIONAL REQUIREMENTS

### 5.1 Authentication & Identity
- Magic link login via email (Supabase Auth)
- OAuth: Google
- Session: JWT, refresh token rotation
- Role enum: `learner | mentor | assessor | admin | org`
- All routes except `/verify/:id` and `/` require auth

### 5.2 Cortex Entry System
```
Entry types: article | video | project | reflection | conversation | achievement | book | course | code | other
Evidence types: url | file | screenshot | text | xapi_statement
```
- Entry = {id, user_id, type, title, body, evidence[], tags[], visibility, created_at, updated_at}
- Entry visibility: `private | peers | public`
- Max file size per evidence: 10MB
- File storage: Supabase Storage bucket `cortex-evidence`
- Full-text search on title + body + tags
- Soft delete (deleted_at) — hard delete on explicit "erase my data" request

### 5.3 Tier / XP System (Adrenaline Architecture)
```
Tier 1 — Seeker     (0–499 XP)
Tier 2 — Explorer   (500–1,999 XP)
Tier 3 — Builder    (2,000–4,999 XP)
Tier 4 — Contributor(5,000–9,999 XP)
Tier 5 — Architect  (10,000+ XP)
```
XP Sources:
```
cortex_entry_created:        +10 XP
evidence_attached:           +5 XP
peer_validation_received:    +20 XP
peer_validation_given:       +15 XP
quest_completed:             +50–200 XP (by difficulty)
ima_submitted:               +100 XP
ima_passed:                  +500 XP
streak_7day:                 +25 XP bonus
```
- XP is append-only. Never deducted. No punishment mechanics.
- Tier upgrade triggers: push notification + in-app animation (adrenaline spike)
- All XP events logged in `xp_ledger` table

### 5.4 Peer Validation
- Learner requests validation on a Cortex entry from a specific user or "any peer"
- Validator sees entry + evidence, submits: `{rating: 1–5, comment, competency_tags[]}`
- Learner can dispute a validation → goes to mentor review
- A single entry can have max 5 peer validations
- Validator earns XP for giving validation

### 5.5 Quest System
- Quest = {id, title, description, competency_tags[], difficulty: 1–5, xp_reward, time_limit_days, submission_type}
- Submission types: `text | project_url | file | video_url | cortex_entry_id`
- Quest states: `available | active | submitted | under_review | passed | failed_restorative`
- No hard "fail" state. Failed → Restorative Justice Protocol:
  - AI + mentor feedback explaining gap
  - Learner chooses: retry | reframe | abandon
- Quests can be: platform-created | mentor-created | learner-defined (self-inquiry)

### 5.6 AI Assessment Engine
- Input: submission content + rubric + learner's Cortex context (RAG)
- Output: {dimension_scores{}, narrative_feedback, suggested_evidence_gaps, confidence: 0–1}
- Dimensions: `depth | creativity | emotional_intelligence | real_world_application | self_authorship`
- All AI outputs stored in `ai_assessments` table
- Every AI output includes: model_version, prompt_hash, timestamp → audit log
- Learner can flag any AI assessment as "contested" → human mentor reviews

### 5.7 Credential Issuance
- Badge = W3C Verifiable Credential + Open Badges 3.0 JSON-LD
- Issued when: quest passed | IMA passed | milestone reached
- Stored in `credentials` table + Supabase Storage
- Public verify URL: `/verify/:credentialId` → shows badge + evidence summary + issuer signature
- Credentials are signed with platform private key (RS256)
- Learner can export credential as: JSON-LD | PNG badge | PDF certificate

### 5.8 Sovereignty Controls
Every learner has a Sovereignty Dashboard at `/profile#sovereignty`:
- View all AI actions taken on their data (AI audit log)
- Toggle: AI feedback on/off per entry
- Export all data as JSON
- Delete all data (triggers hard delete cascade after 30-day hold)
- Revoke any peer validator's access to their entries
- Zero-knowledge mode: entries encrypted client-side before upload (v2 feature)

---

## 6. SRS — SOFTWARE REQUIREMENTS SPECIFICATION

### 6.1 Performance
| Metric | Target |
|---|---|
| Page load (LCP) | < 2.5s |
| API response (p95) | < 500ms |
| Extension popup open | < 300ms |
| AI assessment response | < 10s (async, streamed) |
| Credential verification | < 1s |

### 6.2 Scalability
- Target scale: 500–5,000 active users (v1)
- Supabase free tier → Pro at 1,000 users
- Edge Functions: stateless, horizontally scalable
- File storage: Supabase Storage (S3-compatible)
- AI calls: rate-limited per user (10 AI assessments/day on free tier)

### 6.3 Security
- All API routes authenticated via Supabase JWT
- Row Level Security (RLS) enforced on all Supabase tables
- RLS policy: users can only read/write their own rows (except public entries)
- File uploads: virus scanned via Edge Function before storage
- AI audit log: append-only, no update/delete permissions
- Admin actions: logged with actor_id + timestamp
- Rate limiting: 100 req/min per user on all API endpoints

### 6.4 Availability
- Target: 99.5% uptime (Supabase SLA)
- Graceful degradation: if AI service down, manual review queue activated
- Offline: extension queues captures locally (IndexedDB) and syncs on reconnect

### 6.5 Compliance
- GDPR: right to erasure implemented, data export implemented
- COPPA: age gate at signup (under 13 requires guardian consent flow)
- Data residency: Supabase region = ap-south-1 (India) preferred

---

## 7. TECHSPEC — TECHNICAL SPECIFICATION

### 7.1 Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State Management | Zustand + React Query (TanStack) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Edge Functions | Supabase Edge Functions (Deno) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Embeddings | OpenAI text-embedding-3-small → pgvector |
| Browser Extension | TypeScript, Webpack, Manifest V3 |
| SDK | TypeScript, Node.js |
| Credential Signing | jose (JWT/JWK), W3C VC Data Model |
| Graph DB | Neo4j Aura (Layer 5, v2) |
| LRS | SCORM Cloud or self-hosted LRS (Layer 9, v2) |
| Monorepo | Turborepo |
| CI/CD | GitHub Actions |
| Hosting | Vercel (web) + Supabase (backend) |

### 7.2 Monorepo Structure
```
nexus/
├── apps/
│   ├── web/                    # React web app
│   │   ├── src/
│   │   │   ├── pages/          # Route components
│   │   │   ├── components/     # Shared UI components
│   │   │   │   ├── cortex/     # Cortex entry components
│   │   │   │   ├── quest/      # Quest components
│   │   │   │   ├── credential/ # Badge/VC components
│   │   │   │   ├── tier/       # XP/tier components
│   │   │   │   └── ui/         # Base design system
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── lib/            # API clients, utils
│   │   │   ├── types/          # TypeScript type definitions
│   │   │   └── styles/         # Tailwind config, global CSS
│   │   └── vite.config.ts
│   ├── extension/              # Browser extension
│   │   ├── src/
│   │   │   ├── background/
│   │   │   ├── content/
│   │   │   ├── popup/
│   │   │   └── options/
│   │   └── webpack.config.ts
│   └── admin/                  # Admin panel (routes in web app)
├── packages/
│   ├── sdk/                    # npm-publishable SDK
│   │   ├── src/
│   │   │   ├── CortexClient.ts
│   │   │   ├── ActivityCapture.ts
│   │   │   ├── xAPIEmitter.ts
│   │   │   └── ConsentGate.ts
│   │   └── package.json
│   ├── types/                  # Shared TypeScript types (all apps)
│   └── utils/                  # Shared utility functions
├── supabase/
│   ├── functions/              # Edge Functions (Deno)
│   │   ├── cortex-entry/       # CRUD for Cortex entries
│   │   ├── ai-assess/          # AI assessment trigger
│   │   ├── xp-award/           # XP ledger + tier check
│   │   ├── credential-issue/   # VC generation + signing
│   │   ├── peer-validate/      # Peer validation flow
│   │   └── lrs-ingest/         # xAPI statement ingestion
│   ├── migrations/             # SQL migrations (sequential)
│   └── seed/                   # Dev seed data
├── turbo.json
├── package.json
└── NEXUS.copilot.instructions.md   # THIS FILE
```

### 7.3 Key API Endpoints (Edge Functions)

```
POST   /functions/v1/cortex-entry          → Create Cortex entry
GET    /functions/v1/cortex-entry/:id      → Get entry
PATCH  /functions/v1/cortex-entry/:id      → Update entry
DELETE /functions/v1/cortex-entry/:id      → Soft delete entry

POST   /functions/v1/ai-assess             → Trigger AI assessment on submission
GET    /functions/v1/ai-assess/:id         → Get assessment result

POST   /functions/v1/xp-award             → Award XP (internal, from other functions)
GET    /functions/v1/xp-ledger            → Get learner XP history

POST   /functions/v1/peer-validate        → Submit peer validation
GET    /functions/v1/peer-validate/:entryId → Get validations for entry

POST   /functions/v1/credential-issue     → Issue VC badge
GET    /functions/v1/credential/:id       → Get credential (public)

POST   /functions/v1/lrs-ingest          → Ingest xAPI statement
GET    /functions/v1/lrs-query           → Query LRS statements
```

### 7.4 AI Integration Rules
```typescript
// ALWAYS follow these rules when calling Claude API:
// 1. System prompt MUST include sovereignty clause
// 2. NEVER send entry data of user B when assessing user A
// 3. ALWAYS log: { function_name, user_id, model, prompt_hash, timestamp } to ai_audit_log
// 4. NEVER store raw prompts — store only prompt_hash (SHA-256)
// 5. Output must include confidence score; if < 0.6 → flag for human review
// 6. Learner can contest any AI output → triggers mentor review queue

const AI_SYSTEM_PROMPT_BASE = `
You are a learning companion, not an authority.
Your role: surface insights, ask questions, reflect evidence — never prescribe.
You cannot add to the learner's Cortex without their explicit action.
All feedback is advisory. The learner's judgment supersedes yours.
`;
```

---

## 8. DATABASE SCHEMA

### 8.1 Core Tables (PostgreSQL via Supabase)

```sql
-- USERS (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','mentor','assessor','admin','org')),
  sovereignty_settings JSONB DEFAULT '{"ai_feedback": true, "public_cortex": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CORTEX IDENTITY (per-learner Cortex metadata)
CREATE TABLE public.cortex_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_entries INT DEFAULT 0,
  total_xp INT DEFAULT 0,
  current_tier INT DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 5),
  streak_days INT DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CORTEX ENTRIES
CREATE TABLE public.cortex_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('article','video','project','reflection','conversation','achievement','book','course','code','other')),
  title TEXT NOT NULL,
  body TEXT,
  source_url TEXT,
  tags TEXT[] DEFAULT '{}',
  competency_tags TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','peers','public')),
  xp_awarded INT DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CORTEX EVIDENCE (attachments per entry)
CREATE TABLE public.cortex_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES cortex_entries(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('url','file','screenshot','text','xapi_statement')),
  content TEXT,                     -- URL or text content
  storage_path TEXT,                -- Supabase Storage path for files
  file_size_bytes INT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PEER VALIDATIONS
CREATE TABLE public.peer_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES cortex_entries(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES profiles(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  competency_tags TEXT[] DEFAULT '{}',
  contested BOOLEAN DEFAULT FALSE,
  mentor_review_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, validator_id)
);

-- XP LEDGER (append-only)
CREATE TABLE public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  source TEXT NOT NULL,             -- e.g. 'cortex_entry_created', 'quest_completed'
  reference_id UUID,                -- ID of the triggering object
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUESTS
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  competency_tags TEXT[] DEFAULT '{}',
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  xp_reward INT NOT NULL,
  time_limit_days INT,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('text','project_url','file','video_url','cortex_entry_id')),
  is_learner_defined BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUEST SUBMISSIONS
CREATE TABLE public.quest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_content TEXT,
  submission_url TEXT,
  storage_path TEXT,
  cortex_entry_id UUID REFERENCES cortex_entries(id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','passed','restorative')),
  ai_assessment_id UUID,
  mentor_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI ASSESSMENTS
CREATE TABLE public.ai_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES quest_submissions(id),
  entry_id UUID REFERENCES cortex_entries(id),
  model_version TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,        -- SHA-256 of the prompt sent
  dimension_scores JSONB NOT NULL,  -- { depth, creativity, emotional_intelligence, real_world_application, self_authorship }
  narrative_feedback TEXT NOT NULL,
  evidence_gaps TEXT[],
  confidence FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  contested BOOLEAN DEFAULT FALSE,
  contested_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI AUDIT LOG (append-only, no update/delete)
CREATE TABLE public.ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  action_description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREDENTIALS (Verifiable Credentials)
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mastery_badge','ima_certificate','milestone')),
  title TEXT NOT NULL,
  description TEXT,
  competency_tags TEXT[] DEFAULT '{}',
  issuer_did TEXT NOT NULL,
  credential_json JSONB NOT NULL,   -- Full W3C VC JSON-LD
  storage_path TEXT,                -- PNG badge image
  is_revoked BOOLEAN DEFAULT FALSE,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMA (Integral Mastery Assessment)
CREATE TABLE public.ima_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cortex_entry_ids UUID[] DEFAULT '{}',
  self_reflection TEXT,
  assessor_id UUID REFERENCES profiles(id),
  ai_assessment_id UUID REFERENCES ai_assessments(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','passed','restorative')),
  final_score JSONB,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERSPECTIVE LINKS (cross-entry connections)
CREATE TABLE public.cortex_perspective_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entry_id UUID NOT NULL REFERENCES cortex_entries(id) ON DELETE CASCADE,
  target_entry_id UUID NOT NULL REFERENCES cortex_entries(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('builds_on','contradicts','synthesizes','applies','inspired_by')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (source_entry_id != target_entry_id)
);

-- XAPI STATEMENTS (LRS)
CREATE TABLE public.xapi_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  actor JSONB NOT NULL,
  verb JSONB NOT NULL,
  object JSONB NOT NULL,
  result JSONB,
  context JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stored_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMBEDDINGS (for RAG)
CREATE TABLE public.cortex_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES cortex_entries(id) ON DELETE CASCADE,
  embedding vector(1536),           -- OpenAI text-embedding-3-small dimension
  content_hash TEXT NOT NULL,       -- SHA-256 of content embedded
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON cortex_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### 8.2 Row Level Security Policies

```sql
-- Profiles: users see only their own row
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles USING (auth.uid() = id);

-- Cortex entries: private=owner only, peers=authenticated, public=all
ALTER TABLE cortex_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cortex_read" ON cortex_entries FOR SELECT USING (
  user_id = auth.uid()
  OR (visibility = 'peers' AND auth.role() = 'authenticated')
  OR visibility = 'public'
);
CREATE POLICY "cortex_write" ON cortex_entries FOR ALL USING (user_id = auth.uid());

-- AI Audit Log: users see only their own log
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_audit" ON ai_audit_log FOR SELECT USING (user_id = auth.uid());
-- No update/delete policy → append-only enforced

-- XP Ledger: read only by owner
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_xp" ON xp_ledger FOR SELECT USING (user_id = auth.uid());
-- No direct user insert — XP awarded only via Edge Function (service role)
```

---

## 9. APPLICATION FLOW

### 9.1 Onboarding Flow
```
Signup → Email OTP → Profile Setup (name, avatar, learning intent)
→ Sovereignty Consent Screen (explicitly accept data use terms)
→ Install Extension prompt (optional, skippable)
→ First Quest prompt → Dashboard
```

### 9.2 Cortex Entry Flow
```
[Manual]    Dashboard → "New Entry" → Select type → Fill form → Attach evidence
            → Add competency tags → Set visibility → Submit
            → Edge Fn: create entry → award XP → check tier → update cortex_identity

[Extension] Browse web → Click "Add to Cortex" in popup / injected button
            → Modal: pre-filled title/URL → Add reflection → Submit
            → Same Edge Fn flow as manual
```

### 9.3 Quest Flow
```
Browse quests → Select quest → "Start Quest" (sets status=active, records start_at)
→ Work on quest (learner's own time) → "Submit" → Attach submission
→ Edge Fn: create quest_submission → trigger ai-assess function (async)
→ AI assessment result returns → if confidence < 0.6 → mentor review queue
→ Result shown to learner: passed (award XP + credential) OR restorative (feedback + retry options)
```

### 9.4 Peer Validation Flow
```
Learner: Entry detail → "Request Validation" → Select peer(s) or "Open to peers"
→ Peer: notification → "Validate" CTA → View entry + evidence → Submit rating + comment
→ XP awarded to both → Entry gets validation badge
→ If contested → mentor review → resolution logged
```

### 9.5 IMA Flow
```
Learner: IMA portal → "Start Assessment" → Select relevant Cortex entries
→ Write self-reflection → Submit portfolio
→ AI Assessment runs → Assessor assigned (human expert)
→ Assessor reviews: AI scores + human rubric → Final score
→ Passed: credential issued → stored in credentials table → share URL generated
→ Restorative: gap analysis + retry options
```

### 9.6 Credential Verification Flow (public, no auth)
```
/verify/:credentialId → fetch credential_json from credentials table
→ Verify issuer signature (RS256) → Display: badge + holder name + competencies
+ evidence summary + issue date → "Verify Authenticity" expands cryptographic proof
```

---

## 10. DESIGN SYSTEM

### 10.1 Visual Identity
- **Theme**: Dark-first. Deep space aesthetic — learning as exploration.
- **Primary palette**: Deep navy (`#0A0E1A`), Electric indigo (`#4F46E5`), Plasma cyan (`#06B6D4`)
- **Accent**: Amber (`#F59E0B`) for XP/tier events (adrenaline color)
- **Success**: Emerald (`#10B981`)
- **Danger**: Rose (`#F43F5E`) — used sparingly, never for failure messaging
- **Font**: `Inter` (UI), `JetBrains Mono` (code, IDs, hashes)

### 10.2 Component Conventions
```
All UI components: /apps/web/src/components/ui/  (shadcn/ui base)
Domain components: /apps/web/src/components/{domain}/
Naming: PascalCase for components, camelCase for hooks (useXxx), kebab-case for files
```

### 10.3 Key UI Patterns
- **Tier badge**: Always visible in nav — animated pulse on upgrade
- **XP bar**: Progress bar in dashboard header — smooth fill animation
- **Entry cards**: Timeline view — chronological, filterable by type/tag
- **Adrenaline spike**: Full-screen celebration overlay on tier upgrade / quest pass (3s, dismissible)
- **Sovereignty indicator**: Lock icon on private entries; always visible on AI audit log access
- **No red F**: Failed quest → amber "Restorative Path" card, never red failure state

---

## 11. IMPLEMENTATION PLAN

### Phase 0 — Foundation (Current)
- [x] Monorepo setup (Turborepo)
- [x] Supabase project init
- [x] Basic auth (magic link)
- [x] Primitive web app shell
- [x] Basic browser extension (MV3)
- [ ] Core DB schema migration (all tables in Section 8)
- [ ] RLS policies
- [ ] Supabase Storage buckets: `cortex-evidence`, `credential-badges`

### Phase 1 — Cortex Core (Sprint 1–3)
- [ ] Cortex entry CRUD (Edge Function + UI)
- [ ] Evidence attachment (file upload + URL)
- [ ] Cortex timeline view (dashboard)
- [ ] XP ledger + tier system
- [ ] Basic extension: "Add to Cortex" popup flow

### Phase 2 — Social Layer (Sprint 4–6)
- [ ] Peer validation flow (request + submit + contest)
- [ ] Peer notifications (Supabase Realtime)
- [ ] Sovereignty dashboard (AI audit log view, data export, delete)
- [ ] Quest system (browse + start + submit)

### Phase 3 — AI Layer (Sprint 7–9)
- [ ] AI Assessment Engine (Claude API integration)
- [ ] AI audit log (every call logged)
- [ ] RAG setup (pgvector + embeddings pipeline)
- [ ] Credential issuance (VC generation + signing)

### Phase 4 — IMA + Credentials (Sprint 10–12)
- [ ] IMA portal (portfolio submission + assessor review)
- [ ] Public credential verification page
- [ ] Knowledge map (basic competency graph, D3.js)
- [ ] Mentor connect

### Phase 5 — Advanced Layers (v2)
- [ ] xAPI LRS
- [ ] Simulation environments
- [ ] SSI / DID wallet
- [ ] Agentic AI network
- [ ] Neo4j knowledge graph
- [ ] Organization portal

---

## 12. TASK TRACKER

### Active Sprints
| ID | Task | Layer | Priority | Status |
|---|---|---|---|---|
| T-001 | Run full DB schema migration | Layer 1 | P0 | TODO |
| T-002 | RLS policies for all tables | Layer 1 | P0 | TODO |
| T-003 | cortex-entry Edge Function (CRUD) | Layer 1 | P0 | TODO |
| T-004 | Cortex entry form UI | Layer 1 | P0 | TODO |
| T-005 | Cortex timeline component | Layer 1 | P0 | TODO |
| T-006 | XP award Edge Function | Layer 1 | P1 | TODO |
| T-007 | Tier upgrade trigger + animation | Layer 1 | P1 | TODO |
| T-008 | Extension: content script add-to-cortex | Layer 1 | P1 | TODO |
| T-009 | Peer validation Edge Function | Layer 1 | P1 | TODO |
| T-010 | AI assess Edge Function (Claude API) | Layer 2 | P1 | TODO |

### Known Bugs
| ID | Bug | Severity | Status |
|---|---|---|---|
| B-001 | Extension popup auth state not persisting | High | Open |
| B-002 | Extension activity classifier false-positives on SPAs | Medium | Open |

---

## 13. CODING RULES & STANDARDS

### TypeScript
- Strict mode: ON (`"strict": true` in tsconfig)
- No `any` — use `unknown` and narrow
- All API response types defined in `/packages/types`
- Shared enums co-located with types

### React
- Functional components only. No class components.
- All data fetching via React Query (`useQuery`, `useMutation`)
- Global state: Zustand stores in `/apps/web/src/stores/`
- No prop drilling beyond 2 levels → use context or store
- File naming: `ComponentName.tsx`, `useHookName.ts`

### Edge Functions (Deno)
- Every function: validate auth JWT first line
- Every function: validate request body with Zod schema
- Every AI call: log to `ai_audit_log` before returning response
- No direct DB writes from client — all writes through Edge Functions
- Return shape: `{ data: T | null, error: string | null }`

### Git
- Branch naming: `feature/T-XXX-short-description`, `fix/B-XXX-description`
- Commit format: `type(scope): message` — types: `feat | fix | chore | docs | test | refactor`
- PR requires: passing CI + one review
- No force push to `main`

### AI Sovereignty Rules (Non-negotiable)
- NEVER write to `cortex_entries` from AI without user-triggered action
- NEVER read another user's private entries for AI context
- ALWAYS include `prompt_hash` + `model_version` in `ai_assessments`
- ALWAYS write to `ai_audit_log` on every AI call
- If AI confidence < 0.6 → flag as `contested = true` → human review queue

---

## 14. TEST PLAN / QA STRATEGY

### Unit Tests (Vitest)
- All utility functions in `/packages/utils`
- All Zustand store actions
- XP calculation logic
- Credential signing / verification logic
- Coverage target: 80%

### Integration Tests (Vitest + Supabase local)
- Edge Functions: each function tested with valid + invalid inputs
- RLS policies: test that user A cannot access user B's private data
- AI audit log: test that every AI call produces a log entry

### E2E Tests (Playwright)
- Onboarding flow
- Create Cortex entry (manual + extension)
- Complete a quest (submit → AI assess → result)
- Peer validation flow
- Credential issuance + public verification

### AI-Specific Tests
- Assert AI cannot write to Cortex without user action
- Assert contested flag set when confidence < 0.6
- Assert audit log row created on every AI call
- Test restorative path renders on failed quest (no red "fail" UI)

### Extension Tests
- Popup opens within 300ms
- "Add to Cortex" button injects on article pages
- Offline queue stores entries in IndexedDB and syncs on reconnect
- Auth state persists across browser restart

---

## 15. RISK REGISTER

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | AI Authority Creep — AI starts directing instead of reflecting | Medium | High | AuditAgent monitors AI output patterns; learner can disable AI per entry; all AI output is advisory-only in UI |
| R-02 | Gamification Paradox — XP chasing replaces intrinsic motivation | Medium | High | XP cannot be the goal; quests require real evidence; AI flags XP-chasing patterns; periodic "strip the XP" reflection prompts |
| R-03 | Content Moderation at Scale | High | Medium | Peer flagging system; mentor review queue; Admin panel; NSFW classifier on uploads |
| R-04 | Zero Punishment Edge Cases — learner endlessly resubmits | Low | Medium | Restorative protocol has max 3 retries → escalates to mentor conversation |
| R-05 | Free Forever Funding — unsustainable | Medium | High | Freemium model: core free; advanced AI + IMA assessment = paid; org verification API = B2B revenue |
| R-06 | Privacy Risk — extension tracking feels invasive | High | High | No silent tracking; all captures are explicit user actions; extension settings clearly shown; GDPR compliant |
| R-07 | Credential Revocation — platform shuts down | Low | High | Credentials stored as self-contained JSON-LD + cryptographic proof; learner exports and self-hosts |
| R-08 | Supabase vendor lock-in | Low | Medium | Schema is standard PostgreSQL; Edge Functions are Deno-standard; migration path documented |

---

## 16. DEPLOYMENT GUIDE

### Environments
| Environment | Branch | URL |
|---|---|---|
| Development | `develop` | `localhost:5173` |
| Staging | `staging` | `nexus-staging.vercel.app` |
| Production | `main` | `nexus.app` (TBD) |

### Local Dev Setup
```bash
# Prerequisites: Node 20+, pnpm, Supabase CLI, Docker

git clone https://github.com/your-org/nexus
cd nexus
pnpm install

# Start Supabase local
supabase start
supabase db reset  # runs all migrations + seed

# Set environment variables
cp apps/web/.env.example apps/web/.env.local
# Fill: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY

# Start web app
pnpm --filter web dev

# Build extension (watch mode)
pnpm --filter extension dev
# Load /apps/extension/dist as unpacked extension in Chrome
```

### Environment Variables
```
# Web App
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Edge Functions (Supabase secrets)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=           # for embeddings
CREDENTIAL_SIGNING_KEY=   # RS256 private key (PEM)
CREDENTIAL_ISSUER_DID=    # Platform DID

# Extension
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

### CI/CD (GitHub Actions)
```yaml
# .github/workflows/ci.yml triggers on: PR to main/staging
# Steps: install → lint → type-check → unit tests → E2E tests → deploy
```

### Production Deployment
```bash
# Web: Vercel (auto-deploy on merge to main)
# Edge Functions: supabase functions deploy --all
# DB migrations: supabase db push (staging first, then prod)
# Extension: manual publish to Chrome Web Store (build → zip → upload)
```

---

## 17. MAINTENANCE & SUPPORT PLAN

### Monitoring
- Supabase dashboard: DB performance, Edge Function logs, Auth events
- Vercel analytics: Web vitals, error rates
- AI usage: Track tokens/day per user → alert at 80% of plan limit
- Uptime: UptimeRobot or Better Uptime on `/verify/health`

### Routine Tasks
| Frequency | Task |
|---|---|
| Daily | Review AI audit log anomalies; check moderation queue |
| Weekly | Review failed quest → restorative conversion rate; check XP-gaming patterns |
| Monthly | Rotate credential signing keys; review DB performance; update AI model version |
| Quarterly | Full security audit of RLS policies; dependency updates; risk register review |

### Support Tiers
- Self-serve: `/help` in-app docs
- Community: Discord (learner + mentor community)
- Email support: for credential disputes and data erasure requests
- SLA for data erasure: 30 days (GDPR)

---

## 18. USER DOCUMENTATION

### Learner Quick Start
1. Sign up → verify email → complete profile
2. Accept Sovereignty Terms (read them — they're short and human)
3. Create your first Cortex entry: anything you learned this week
4. Install the browser extension to capture learning as you go
5. Browse quests — start one that excites you
6. Request peer validation on an entry you're proud of
7. When ready: submit an IMA portfolio for a formal credential

### Key Concepts
| Concept | Plain Language |
|---|---|
| Cortex | Your living proof of learning — everything you've done, verified |
| Tier | Your exploration level (Seeker → Architect) — it only goes up |
| XP | Recognition for real learning actions — not a score, a ledger |
| Quest | A challenge designed to reveal mastery — not test memory |
| IMA | Your assessment festival — you choose what to show |
| Credential | Cryptographically verified proof of what you can do |
| Peer Validation | A trusted human confirming your evidence is real |

### Extension Guide
- **Install**: Add to Chrome → sign in with your NEXUS account
- **Capture**: On any page, click extension icon → "Add to Cortex" → add reflection → save
- **Privacy**: The extension sees only the pages you actively capture. No silent tracking.
- **Offline**: Captures queue locally if offline and sync automatically.

### Sovereignty Controls (at `/profile#sovereignty`)
- Toggle AI feedback on/off per entry
- View every AI action taken on your data
- Export all your data as JSON
- Delete all your data (30-day hold, then permanent)

---

## 19. CHANGE LOG

### v0.1.0-alpha (Current)
- Initial monorepo setup
- Basic web app shell with auth
- Primitive browser extension (MV3)
- Basic SDK scaffold

### Planned: v0.2.0
- Full DB schema + RLS
- Cortex CRUD (manual entry)
- XP + tier system
- Extension "Add to Cortex" flow

### Planned: v0.3.0
- Peer validation
- Quest system
- AI Assessment Engine (Claude API)
- AI audit log

### Planned: v1.0.0
- IMA portal
- Credential issuance + public verification
- Knowledge map
- Mentor connect
- Full E2E test coverage

---

*This file is the single source of truth for Copilot. All architectural decisions live here. Update this file when decisions change — do not let it drift from the codebase.*
