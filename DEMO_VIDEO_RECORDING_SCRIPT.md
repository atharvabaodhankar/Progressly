# Progressly — Hackathon Pitch & Demo Video Recording Script
## Team: Consensus Labs
**Problem Statement ID:** 26122  
**Problem Statement Title:** Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management: Real-Time Actual Progress Tracking (Planning-to-Execution Bridge)  
**Organization / Department:** Oil India Limited  
**Category:** Software | **Theme:** Smart Automation  
**Deployment Status:** 🟢 **100% Live & Production-Ready on AWS Cloud (Not Localhost / Not a Mockup)**  
**Target Video Duration:** 3:30 to 5:00 Minutes  
**Live Production URL:** [https://progressly-frontend-amber.vercel.app/](https://progressly-frontend-amber.vercel.app/)  
**Live Production ALB API:** `http://progressly-alb-prod-1551208303.ap-south-1.elb.amazonaws.com`  
**YouTube Pitch Video:** `[INSERT_YOUTUBE_LINK_HERE]`

---

## 📋 Problem Statement Alignment Matrix

| Problem Statement 26122 Requirement | How Progressly (Consensus Labs) Solves It Live | Demo Scene |
|---|---|---|
| **Heterogeneous Input Ingestion** (Free-text notes, spreadsheets, site diaries, Primavera/MS Project CSVs) | Multi-format S3 & API ingestion supporting unstructured narrative text, discipline-wise Excel/CSV spreadsheets, and baseline WBS exports. | **Scene 3** |
| **Low-Friction 'Time Agent' Capture** for site supervisors across Civil, Piping, Electrical, Equipment, HSE | Free-text and voice-ready natural language submission box that eliminates rigid forms while preserving structured entity extraction. | **Scene 3** |
| **Fuzzy-Matching & Terminology Resolution** ('spool erected' vs plan's 'Erect Line 24-XX') | **Amazon Bedrock Nova Micro** entity extraction + **Titan Embeddings V2** 1024-dimensional semantic similarity matching against L5/L6 nodes. | **Scene 3 & 4** |
| **3-Tier Policy Gating & No Silent Drops** (Auto-approve high confidence, flag unmatched for review) | **Tier 1 (≥95%):** Instant schedule update.<br>**Tier 2 (70–94%):** Human-in-the-loop Review Queue.<br>**Tier 3 (<70%):** Flagged for planner clarification. | **Scene 4** |
| **Real-Time PMIS Schedule Update & Immutable Audit Trail** | Live Gantt chart updates in production PostgreSQL with audit log capturing exact timestamp, model version, and confidence score. | **Scene 2 & 4** |
| **Institutional Memory & Closed-Loop Learning** (Preventing lost project knowledge, queryable delay root causes) | **Project Memory (RAG)** powered by **Amazon Bedrock Nova Pro** + pgvector with strict citations, CSV archive import (Way 1), and 1-click active project learning (Way 2). | **Scene 5** |

---

## 🎬 Pre-Recording Setup Checklist

1. **Browser Setup:**
   - Open **`https://progressly-frontend-amber.vercel.app/`** in Google Chrome.
   - Set zoom to **100% or 110%** for crisp presentation typography.
   - Hide bookmarks bar (`Ctrl + Shift + B` on Windows / `Cmd + Shift + B` on Mac).
   - Close all unnecessary tabs.
2. **Emphasize Live Production Environment:**
   - Notice that the URL in the address bar is the **live public production URL (`progressly-frontend-amber.vercel.app`)**, powered by a live AWS ALB and Amazon RDS cluster — make sure judges see this is a real deployed cloud application, not `localhost:3000`.
3. **Recording Quality:**
   - 1080p (1920x1080) at 60 FPS.
   - Clear voice recording with energetic, professional delivery.

---

## ⏱️ Master Recording Timeline

```
0:00 - 0:45 ── Scene 1: Team Intro, Problem Statement 26122 & Live Production Cloud System
0:45 - 1:30 ── Scene 2: Live Operational Timeline, Gantt Variety & Multi-Project Isolation
1:30 - 2:25 ── Scene 3: Ingesting Heterogeneous Daily Reports (Nova Micro + S3 + SQS)
2:25 - 3:15 ── Scene 4: 3-Tier Policy Review Queue & Real-Time Schedule Linking
3:15 - 4:15 ── Scene 5: Institutional Memory (RAG, CSV Ingestion & Closed-Loop Learning)
4:15 - 4:45 ── Scene 6: Production AWS Architecture & Cost Optimization ($0.038 / 1k reports)
4:45 - 5:00 ── Scene 7: Impact & Closing
```

---

## 🎙️ Word-for-Word Pitch & Recording Script

---

### 📍 Scene 1: Team Intro & Problem Statement 26122 (0:00 – 0:45)
* **Screen:** Open on the **Progressly Dashboard** (`https://progressly-frontend-amber.vercel.app/`).
* **Visual Action:** Move cursor across the top header displaying *Oil India Limited • Baghjan Gas Gathering Station Project* and the live browser URL bar.

> **🗣️ Voiceover Script:**
> *"Hello judges. We are **Team Consensus Labs**, presenting our solution for **Problem Statement 26122: Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management** for **Oil India Limited**.*
> 
> *Everything you are seeing today is running on a **100% live, production-ready AWS cloud deployment** — with containerized microservices on AWS ECS Fargate, Amazon RDS PostgreSQL with pgvector, and Amazon Bedrock — not a local demo or prototype.*
> 
> *In mega-capital projects, master schedules cascade into thousands of micro L5 and L6 engineering activities across Civil, Piping, Electrical, and HSE. While baseline plans are structured in Primavera or MS Project, actual progress comes back through fragmented daily reports, site diaries, and WhatsApp messages.*
> 
> *There is no reliable bridge linking supervisor jargon like 'spool erected' to Primavera codes like `L6-PIP-0243`. Schedule updates lag by weeks, and hard-won project knowledge is lost forever.*
> 
> *This is **Progressly** — an event-driven AI data capture and schedule-linking layer powered by Amazon Bedrock that automates this entire bridge in real-time."*

---

### 📍 Scene 2: Live Operational Timeline, Gantt Variety & Multi-Project Scoping (0:45 – 1:30)
* **Screen:** Stay on the **Timeline Dashboard** (`/`).
* **Visual Action:**
  1. Hover over the **4 Metric Cards**:
     - **Total Activities: 15** *(100% Titan V2 embedded)*
     - **On Track Rate: 93%** *(Authentic execution metric calculated directly from PostgreSQL)*
     - **Review Queue: 2** *(Items requiring planner sign-off)*
     - **Project Memory: 40** *(Active historical project records)*
  2. Click through the **Status Filter Tabs** above the Gantt chart:
     - Click **`All Tasks (15)`** $\rightarrow$ Click **`In Progress (5)`** $\rightarrow$ Click **`Completed (2)`** $\rightarrow$ Click back to **`All Tasks (15)`**.
  3. Scroll down through the **Execution Schedule & Gantt Tracking**:
     - Show the **Completed activities in green** (*Construct Tank Farm Foundation Pad, Pour Concrete Pedestal C-12*).
     - Show the **In-Progress activities in amber/progress bars** (*Align Pump Skid P-101 at 90%, Backfill Foundation Area B at 80%, Erect Line 24-XX at 65%, Install Cable Tray Section 4 at 40%, Install Pressure Transmitter at 25%*).
     - Show **Pending activities in grey** (*Weld Line 24-XX Spool Joints at 0% — ready to be updated live in Scene 4!*).
  4. Click the **Project Dropdown Switcher** in the top right:
     - Show `Baghjan Gas Gathering Station Project` (Oil India Ltd) and `Paradip-Hyderabad Pipeline Extension` (IOCL) to prove multi-tenant project isolation.
  5. Scroll down to show the **Schedule Update Lineage (Audit Log)**.

> **🗣️ Voiceover Script:**
> *"Here on the Progressly Operational Dashboard, we are connected directly to our live AWS RDS PostgreSQL production database in the cloud.*
> 
> *At the top, we see our real WBS activity metrics: 15 active engineering activities, a 93% On-Track execution rate, and live pending review alerts.*
> 
> *Below, our Execution Schedule and Gantt Tracking gives planners complete visual transparency across all disciplines — showing completed foundations in green, active equipment alignment and piping erection in progress, and upcoming welding activities pending execution.*
> 
> *Progressly also provides strict enterprise multi-project scoping: planners can switch seamlessly between projects — from Oil India's Baghjan Station to the Paradip Pipeline Extension.*
> 
> *And at the bottom, our **Schedule Update Lineage** maintains an immutable audit trail of every automated and engineer-approved change, capturing model versions, submitter identities, and confidence scores."*

---

### 📍 Scene 3: Ingesting Unstructured Field Reports (1:30 – 2:25)
* **Screen:** Click **`Ingest Report`** in the left sidebar.
* **Visual Action:**
  1. Point out the active target project badge (`Baghjan Gas Gathering Station`).
  2. Copy and paste the text block below into the **Daily Progress Notes** area.
  3. Click **`Upload & Link to Schedule`**.
  4. Show the live button state transition (*"Transmitting to S3 & Bedrock..."*) and green success toast.

---

#### 📋 [COPY THIS] Daily Field Report Text to Paste:
```text
Daily Progress Report - Area 3 Tank Farm & Compressor Shelter
Date: 28-Aug-2026 | Submitter: Site Supervisor - Tank Farm

1. Piping Crew A completed welding of 14 spool joints on 24-inch crude header line 24-XX at Tank Farm 3. Radiography (NDT) cleared 100% of joints.
2. Civil team poured 45 cubic meters of concrete for the compressor foundation pit at equipment shelter area. Curing compound applied.
```

---

> **🗣️ Voiceover Script:**
> *"Now let's demonstrate our low-friction supervisor ingestion.*
> 
> *Instead of forcing field supervisors to navigate complex Primavera forms, they simply paste their daily text notes, upload a site spreadsheet, or dictate notes into Progressly.*
> 
> *When I click 'Upload & Link to Schedule', the payload is encrypted in **Amazon S3**, triggers an event-driven **Amazon SQS** queue, and our **ECS Fargate AI Worker** processes the report in the cloud.*
> 
> *We use **Amazon Bedrock Nova Micro** for sub-second extraction of line numbers, disciplines, and quantities, and **Amazon Titan Embeddings V2** to vectorize the activity into 1024 dimensions for semantic cosine matching against our schedule WBS nodes."*

---

### 📍 Scene 4: 3-Tier Policy Review Queue & Real-Time Schedule Linking (2:25 – 3:15)
* **Screen:** Click **`Review Queue`** in the left sidebar.
* **Visual Action:**
  1. Highlight the extracted match card:
     - Show **Nova Micro's extracted entity** (*Line: 24-XX, Location: Tank Farm 3, Qty: 14 joints*).
     - Show **Titan V2's matched schedule node** (*Activity: L6-PIP-0243 — Erect 24-inch crude header spools / Weld Spool Joints*).
     - Point out the **Confidence Badge** (*92.4% • Tier 2 Verification*).
  2. Click **`Approve & Update Schedule`**.
  3. Switch back to the **Timeline Dashboard** to show the live progress update and the new audit log entry!

> **🗣️ Voiceover Script:**
> *"To ensure enterprise governance, Progressly enforces a strict 3-tier confidence policy:*
> - *Tier 1 (≥95%): Auto-approved into the schedule with zero manual intervention.*
> - *Tier 2 (70–94%): Routed here to the human Review Queue for planner verification.*
> - *Tier 3 (<70%): Flagged for supervisor clarification — preventing silent drops or bad data.*
> 
> *Notice how Nova Micro extracted the physical evidence while Titan V2 resolved the terminology mismatch, linking 'welded 14 spool joints on line 24-XX' to activity code `L6-PIP-0243`.*
> 
> *As the Planning Engineer, I click **'Approve & Update Schedule'**.*
> 
> *Instantly, the schedule progress bar updates in PostgreSQL, and a permanent entry with model metadata is written to the audit log."*

---

### 📍 Scene 5: Institutional Memory — RAG, CSV Import & Closed-Loop Learning (3:15 – 4:15)
* **Screen:** Click **`Project Memory (RAG)`** in the left sidebar.
* **Visual Action 1 (RAG Search):**
  - Click the preset prompt pill: *"What caused piping delays in past projects?"* (or copy and paste the prompt below into the search bar and press Enter).
  - Show the **Bedrock Nova Pro synthesis**:
    - Point out the mathematical dataset summary (*Average delay: 10.3 days, Material shortages: 50%*).
    - Click a source citation in brackets (e.g. `[Mumbai High Offshore — Underwater Spool Tie-In]`) to open the **Grounding Verification Modal**.

---

#### 📋 [COPY THIS] Memory RAG Query #1:
```text
What caused piping delays in past projects?
```

---

* **Visual Action 2 (Importing Past Archives - Way 1):**
  - Click the purple **`+ Import Past CSV`** button in the top right.
  - Click **"Paste Sample Data"** (or copy and paste the CSV block below).
  - Click **"Embed & Ingest to Memory"**.
  - Show the database counter increasing live with new Titan V2 embeddings!

---

#### 📋 [COPY THIS] Historical Past Project CSV (for Import Modal):
```csv
project_name,discipline,activity_description,planned_duration_days,actual_duration_days,delay_cause,notes
Mumbai High Offshore,Piping,Underwater Spool Tie-In,14,28,Heavy monsoons & subsea crane failure,Pre-book backup hydraulic cranes during coastal monsoon
Jamnagar Refinery Phase 3,Civil,Furnace Concrete Pour,8,17,Excavation waterlogging,Install automatic dewatering sumps before casting
```

---

* **Visual Action 3 (Closed-Loop Learning - Way 2):**
  - Click **`Archive Active Project`** button.
  - Show the green confirmation toast: *"Closed-loop learning complete: successfully archived activities from active project into Institutional Memory!"*

> **🗣️ Voiceover Script:**
> *"Now for the final requirement of Problem 26122: **Institutional Memory Building**.*
> 
> *When a project finishes, lessons learned are usually lost in paper archives. Progressly transforms historical records into an active RAG knowledge base across 40 capital projects.*
> 
> *When we ask: 'What caused piping delays in past projects?', our backend retrieves relevant past records via pgvector cosine distance, computes verified mathematical statistics, and uses **Amazon Bedrock Nova Pro** to generate a grounded, cited synthesis.*
> 
> *Every single finding cites the exact historical record — clicking any citation reveals the full grounding details.*
> 
> *Furthermore, Progressly supports two live ingestion loops:*
> *1. **Spreadsheet Ingestion**: Planners can click '+ Import Past CSV' to embed years of historical company archives with Titan V2.*
> *2. **Closed-Loop Learning**: Planners can click 'Archive Active Project' to automatically vectorize completed project execution data, ensuring future projects learn from current field performance."*

---

### 📍 Scene 6: Production AWS Architecture & Cost Breakdown (4:15 – 4:45)
* **Screen:** Click **`System Architecture`** in the left sidebar (`/architecture`).
* **Visual Action:** Scroll through the **AWS Architecture Topology Diagram** and the **Cost Optimization Matrix**.

> **🗣️ Voiceover Script:**
> *"Under the hood, Progressly is deployed on fully managed, enterprise-grade AWS cloud infrastructure:*
> - * **AWS ECS Fargate** for containerized, auto-scaling microservices with zero server maintenance,*
> - * **Amazon SQS** for absorbing peak 5:00 PM shift report upload spikes without dropping requests,*
> - * **Amazon RDS PostgreSQL 16 with pgvector** for ACID schedule integrity and sub-second vector similarity,*
> - * And a cost-tiered Bedrock architecture: **Nova Micro** for report extraction at $0.000035 per report, **Titan V2** for embeddings, and **Nova Pro** for deep institutional reasoning.*
> 
> *The entire ingestion pipeline runs at under **$0.04 per 1,000 daily reports** in production."*

---

### 📍 Scene 7: Impact & Closing (4:45 – 5:00)
* **Screen:** Switch back to the **Progressly Operational Timeline** dashboard (`/`).

> **🗣️ Voiceover Script:**
> *"By bridging the gap between field execution and master schedules, Progressly eliminates schedule lag, protects critical paths, and ensures Oil India never repeats past project mistakes.*
> 
> *Everything shown is live, scalable, and production-ready in the AWS cloud.*
> 
> *We are **Team Consensus Labs**. Thank you!"*

---

## 🎯 Pro Tips for Recording

1. **Highlight the Live URL:** Mention *"Everything you see is live on our production deployment at progressly-frontend-amber.vercel.app connected to AWS ECS and RDS"* right at the beginning and end.
2. **Keep this document open side-by-side or on a tablet:** Each scene has its own exact copy-paste box right above the script.
3. **Mention Problem ID 26122 and Oil India Limited:** State both clearly in the first 15 seconds.
4. **Click Grounding Modal:** Click on `[Mumbai High Offshore — Underwater Spool Tie-In]` in Project Memory to prove zero hallucination to judges.
