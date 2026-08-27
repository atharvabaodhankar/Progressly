# Intelligent Data Capture & Schedule-Linking Layer
### SIH Problem Statement 26122 — Oil India Limited

**Category:** Software | **Theme:** Smart Automation

---

## 1. Problem Summary

Infrastructure project schedules cascade from macro milestones (L1) down to micro executable activities (L5/L6) across disciplines — civil, piping, static/rotating equipment, electrical, instrumentation, HSE. Actual execution data comes back through daily reports, site diaries, and spreadsheets, each in its own format, disconnected from the plan's L5/L6 activity IDs.

**Core problem:** No reliable, low-friction way to capture actual start/end times of activities and auto-link them back to the baseline schedule, across inconsistent terminology and granularity (e.g. "spool erected" vs. plan's "Erect Line 24-XX").

**What we're building:** A pipeline that ingests heterogeneous field inputs, extracts structured activity events, semantically matches them to the correct schedule node with a confidence score, routes low-confidence matches to human review, updates the schedule/PMIS with a full audit trail, and builds a queryable institutional memory of real project execution patterns.

---

## 2. Product Shape

- **Web app** (primary product) — for Project Managers, Planners, HSE, Discipline Leads, Management
- **Lightweight mobile-web / PWA view** — for Site Supervisors and Field Engineers only. Minimal surface:
  - "What happened?" → Record Voice / Type Update
  - Attach photo
  - Submit

No standalone native mobile app for the MVP — that's explicitly scoped as a future step.

---

## 3. Final Locked Architecture

```
                    ┌───────────────┐
                    │    Vercel     │
                    │ React/Next.js │
                    └───────┬───────┘
                            │ HTTPS
                            ▼
                     ┌─────────────┐
                     │   AWS ALB   │
                     └──────┬──────┘
                            ▼
                    ┌───────────────┐
                    │  ECS Fargate  │
                    │  Express API  │
                    └───┬───────┬───┘
                        │       │
              ┌─────────┘       └─────────┐
              ▼                           ▼
             S3                     PostgreSQL (RDS)
        raw reports/                source of truth
        evidence files              + pgvector embeddings
              │                           ▲
              ▼                           │
           Lambda                         │
              │                           │
              ▼                           │
             SQS                          │
              │                           │
              ▼                           │
         AI Worker                        │
         (Fargate task / Lambda)          │
              │                           │
      ┌───────┴────────┐                  │
      ▼                ▼                  │
   Bedrock          Bedrock                │
   Nova Micro       Titan Embeddings V2    │
   Extraction       → query vector         │
   (Flex tier)                             │
      │                │                  │
      └───────┬────────┘                  │
              ▼                           │
     pgvector cosine similarity ──────────┘
     search (top-N candidates)
              │
              ▼
     Business-rule filtering
     (discipline / line / location)
              │
              ▼
     Optional reranker (top 3, Nova Micro)
              │
              ▼
        Confidence Score
              │
     ┌────────┴─────────┐
     ▼                   ▼
Auto-approve         Human Review
(≥95%, logged)       (70–95% planner,
     │                <70% manual)
     └────────┬─────────┘
              ▼
       PostgreSQL (audit_log)
              │
              ▼
         Live Dashboard
```

**Project Memory (separate subsystem — genuine RAG):**

```
Historical reports + events
            │
            ▼
       Embeddings (Titan V2)
            │
            ▼
   pgvector store (or OpenSearch later)
            │
            ▼
   Query: "What caused piping
   delays in past projects?"
            │
            ▼
   Retrieve relevant historical
   records + source evidence
            │
            ▼
   Bedrock — Claude Sonnet 5
   (Standard tier)
            │
            ▼
  Evidence-backed answer,
  sources shown (not invented)
```

---

## 4. Component Breakdown

| Layer | Service | Notes |
|---|---|---|
| Frontend hosting | **Vercel** | Web app; faster iteration than S3+CloudFront |
| Edge / Load balancing | **AWS ALB** | Fronts Fargate; visible scaling demo point |
| Core API | **ECS Fargate** (containerized Express) | Always-on, no cold starts, real request/response — better for live demo and conversational "time agent" interactions than raw Lambda |
| File ingestion | **S3** | Raw daily reports, spreadsheets, scanned diaries, evidence |
| Event trigger | **S3 → Lambda** | Fires on new file upload |
| Job buffering | **SQS** | Decouples ingestion bursts (e.g. 50 supervisors uploading at once) from AI processing; gives retry/failure handling |
| AI processing worker | **Fargate task or Lambda**, pulling from SQS | Runs extraction + matching pipeline |
| LLM extraction + reranking | **Amazon Bedrock — Nova Micro** | Free text/spreadsheet → structured JSON event; also reranks top candidate matches |
| Embeddings | **Amazon Bedrock — Titan Text Embeddings V2** | Converts activity descriptions (schedule + field reports) into vectors |
| Vector similarity | **pgvector extension on RDS Postgres** | Cosine similarity search for MVP — no separate vector DB needed |
| Source of truth DB | **RDS PostgreSQL** | Relational: Project → WBS → Discipline → Area → L5/L6 Activity → Actual Events → Reports → Matches → Audit Log |
| Project Memory / RAG | **Amazon Bedrock — Claude Sonnet 5** | Synthesizes evidence-backed answers from retrieved historical records; low call volume, reasoning-critical |
| Auth | **Cognito or JWT** with role-based access | Supervisor / Planner / Manager views gated by role |
| Secrets | **AWS Secrets Manager** | DB credentials, API keys — never hardcoded |
| Observability | **CloudWatch** | Logs/metrics across Fargate + Lambda |
| Local dev | **Docker Compose** | Express container + Postgres+pgvector container — full dev/prod parity, no AWS needed for day-to-day coding |

---

## 5. AI Pipeline (Detailed)

**Not a single "LLM does everything" call.** Structured as:

```
Raw field input
      ↓
Preprocessing
      ↓
LLM extraction (Nova Micro) → structured event
      ↓
Candidate retrieval (pgvector similarity search)
      ↓
Business-rule filtering (discipline, line, location, equipment)
      ↓
Optional reranker on shortlisted candidates (Nova Micro)
      ↓
Confidence score
      ↓
Policy-gated approval (auto / review / manual)
```

**Worked example:**

Input: *"Three spools for Line 24 were erected near Tank Farm today."*

Extracted JSON:
```json
{
  "discipline": "Piping",
  "activity_description": "spool erection",
  "line": "24",
  "location": "Tank Farm",
  "quantity": 3,
  "event": "progress"
}
```

Candidate matches (embedding similarity):
```
L6-PIP-0241  Erect Line 24-XX     → 0.96
L6-PIP-0242  Erect Line 25-XX     → 0.71
L6-CIV-0112  Construct Tank Farm  → 0.13
             Foundation
```

After rule filtering (discipline=Piping, line=24, location=Tank Farm):
```
L6-PIP-0241 → final confidence 98.7%
```

### Embeddings vs. RAG — kept distinct on purpose

- **Embeddings** (Titan V2 + pgvector) power the **schedule-matching engine** — turning text into vectors for similarity search. This is the core of the product, runs on every report, and needs to be cheap.
- **RAG** (retrieval + LLM generation) is used **only** in the separate **Project Memory** assistant, where a manager asks a natural-language question and gets an evidence-backed answer built from retrieved historical records. This runs rarely and needs to be high-quality, not cheap.

Conflating the two would be architecturally sloppy — matching doesn't need generative answers, and Project Memory does.

### Confidence policy

| Confidence | Action |
|---|---|
| ≥ 95% | Auto-approved (still fully logged) |
| 70–95% | Routed to planner review queue |
| < 70% | Flagged for manual resolution |

Every entry — auto-approved or not — writes to `audit_log`: source report, extracted event, matched activity, confidence score, model version, approver (AI or human), timestamp.

---

## 6. Model Selection & Cost Rationale

Two distinct workloads, two distinct model choices — picked on fit, not on a single "best model" default.

### Extraction + Matching (high-volume, simple bounded task)

| Model | Input $/1M | Output $/1M | Cost per 1,000 reports* |
|---|---|---|---|
| **Nova Micro (chosen)** | $0.041 | $0.164 | **$0.037** |
| Nova Lite | $0.071 | $0.284 | $0.064 |
| gpt-oss-20b | $0.08 | $0.35 | $0.077 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $1.05 |
| Claude Sonnet 5 | $2.00 | $10.00 | $2.10 |

*assuming ~300 input / ~150 output tokens per report

**Why Nova Micro:** structured JSON extraction and candidate reranking are bounded, well-specified tasks — they don't need frontier reasoning. Nova Micro is AWS-native (no third-party integration overhead), effectively free at any realistic report volume, and fully sufficient for this step. Paying for Claude here would add cost with no quality gain on this specific task.

### Project Memory / RAG (low-volume, judge-facing, reasoning-critical)

| Model | Input $/1M | Output $/1M | Cost per 200 queries** |
|---|---|---|---|
| Nova Micro | $0.041 | $0.164 | $0.033 |
| Qwen3 Next 80B A3B | $0.18 | $1.41 | $0.213 |
| **Claude Sonnet 5 (chosen)** | $2.00 | $10.00 | **$1.80** |
| Claude Opus 5 | $5.00 | $25.00 | $4.50 |

**assuming ~2,000 input / ~500 output tokens per query

**Why Claude Sonnet 5 here specifically:** this is a harder, fuzzier task — synthesizing an evidence-backed answer across multiple retrieved historical records, not just classifying one report. At this call volume (a handful of queries per demo, maybe a few hundred a month in light real use), the entire monthly cost is under $2 — cost is not a real constraint here, so the decision is made on synthesis quality, where Sonnet is the stronger choice. This is the one place in the pipeline where paying for a better model is worth it, and it's cheap in absolute terms regardless.

**Net effect:** the "expensive" model appears exactly once, in the one place reasoning quality is visibly the differentiator. Total AI spend for the whole system at demo scale is under $2.

### Service tiers used

| Call | Tier | Why |
|---|---|---|
| Extraction + matching (async, SQS worker) | **Flex** (~50% of Standard rate) | Not latency-critical — user already got "upload successful" before this runs |
| Project Memory (live, manager waiting on screen) | **Standard** | Latency-sensitive, judge-facing — don't trade responsiveness for a negligible cost saving here |

Reserved/Priority tiers are not used — Reserved only pays off at sustained high volume, Priority is unnecessary for a demo with no strict SLA.

---

## 7. Why SQS

Without it, concurrent uploads (e.g. 50 site supervisors submitting around the same time) hammer the processing pipeline directly. SQS decouples ingestion from processing:

```
50 uploads → 50 jobs queued → workers process safely → failures retry
```

Not required to get a basic MVP working (`Upload → Express → AI → DB` works fine at low volume), but included in the locked architecture because it's what makes the burst-absorption and reliability story genuinely defensible to a technical judge — and it's cheap to add.

---

## 8. Why pgvector, Not OpenSearch, for the MVP

Amazon OpenSearch Serverless is the correct **production-scale** vector store (k-NN, designed for large indexes). But for a schedule with roughly 1,000–10,000 activities, brute-force cosine similarity inside Postgres via `pgvector` is:

- One fewer service to configure, secure, and pay for
- Running in the *same* database as the relational schedule data — no sync problem
- Fully sufficient at this scale

**Stated migration path** (mention in the pitch, don't build): `pgvector` → OpenSearch Serverless k-NN as schedule size and query volume grow.

---

## 9. Why Fargate, Not Pure Lambda, for the Core API

| | Lambda | Fargate |
|---|---|---|
| Cold starts | Yes — can lag during a live demo | None |
| Long-lived connections (conversational "time agent") | Awkward | Natural fit |
| Scaling visibility for demo | Invisible | Visible — ALB + task count scaling is a literal demo prop |
| Enterprise/PSU familiarity | Less standard | More standard, service-based model |

Lambda is still used, but only for the event-driven side task of reacting to S3 uploads and enqueuing jobs — not for the core request/response API.

---

## 10. MVP Scope (What We're Actually Demoing)

**In scope:**
- 2–3 input formats: free-text daily report, CSV/Excel spreadsheet, one PDF/text report
- Extraction → embedding-based matching → confidence scoring
- Review / approve / reject workflow
- Full audit trail
- Updated schedule + planned-vs-actual dashboard
- Project Memory query (RAG) with cited sources

**Explicitly out of scope for MVP** (roadmap only):
- Production-grade OCR/ASR (problem statement explicitly says this isn't required)
- Native mobile app
- Photo-based evidence analysis
- Predictive risk/delay forecasting
- OpenSearch migration

---

## 11. Local Development

- `docker compose up` — runs Express API container + Postgres (with pgvector) container
- Entire team codes against real Postgres locally, no AWS dependency for day-to-day work
- AWS is only touched when testing S3 triggers, Bedrock calls, or deploying
- Same container image ships to Fargate — dev/prod parity

---

## 12. Demo Narrative (Order Matters)

1. Submit a messy free-text report + upload a spreadsheet (2 input formats)
2. Show live extraction → structured JSON
3. Show embedding match → ranked candidates → confidence score
4. One high-confidence entry auto-updates the schedule; one low-confidence entry routes to the review queue
5. Show the dashboard reflecting planned-vs-actual
6. Click into the audit trail — "why did this change happen"
7. Query Project Memory — *"What caused piping delays in past projects?"* → evidence-backed answer with sources
8. **Only if asked:** show the architecture diagram, mention containerization + horizontal scalability on AWS, mention model-tiering cost strategy

The workflow story is the centerpiece. The infrastructure story is a closing note, not the opener.

---

## 13. Open Items Before Build

- Confirm Bedrock model access (Nova Micro, Titan Embeddings V2, Claude Sonnet 5) is enabled in the target AWS region before relying on it in dev
- Finalize RBAC roles (Supervisor / Planner / Discipline Lead / Manager) and what each can see/approve
- Decide exact schema for `audit_log` and `matches` tables (next step)
