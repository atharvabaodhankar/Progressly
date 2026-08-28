# Progressly (BridgeIQ) — Official Hackathon Demo Video Recording Guide & Script

**Target Duration:** 3:30 to 5:00 Minutes  
**Live Production URL:** [https://progressly-frontend-amber.vercel.app/](https://progressly-frontend-amber.vercel.app/)  
**Alternative Architecture Route:** [https://progressly-frontend-amber.vercel.app/architecture](https://progressly-frontend-amber.vercel.app/architecture)  
**Demo Scenarios Lab Route:** [https://progressly-frontend-amber.vercel.app/test-options](https://progressly-frontend-amber.vercel.app/test-options)

---

## 🎬 1. Pre-Recording Setup Checklist

Before pressing record:
1. **Browser Setup:**
   - Open **`https://progressly-frontend-amber.vercel.app/`** in Google Chrome or Arc.
   - Set zoom to **100% or 110%** so all typography, badges, and charts are razor sharp.
   - Hide the bookmarks bar (`Ctrl + Shift + B` on Windows / `Cmd + Shift + B` on Mac).
   - Close all distracting browser tabs.
2. **Audio & Screen Recording:**
   - 1080p (1920x1080) or 4K resolution at 60 FPS.
   - Clear, crisp microphone audio.
3. **Cheat Sheet on Second Screen / Notepad:**
   - Have the copy-paste snippets from **Section 3** ready so you can paste with zero lag.

---

## 🕒 2. Master Recording Timeline & Flow

```
0:00 - 0:40 ── Scene 1: The Problem & Live Platform Introduction
0:40 - 1:25 ── Scene 2: Operational Timeline & Multi-Project Workspaces
1:25 - 2:20 ── Scene 3: Daily Field Report Ingestion (Nova Micro + S3)
2:20 - 3:10 ── Scene 4: 3-Tier Policy Review Queue & Live Schedule Linking
3:10 - 4:15 ── Scene 5: Project Memory (Institutional RAG + CSV Import + Closed-Loop Learning)
4:15 - 4:45 ── Scene 6: Architecture, Cost Optimization & Production Scalability
4:45 - 5:00 ── Scene 7: Impact & Closing
```

---

## 🎙️ 3. Scene-by-Scene Actions & Voiceover Script

---

### 📍 Scene 1: The Problem & Introduction (0:00 – 0:40)
* **What to Show on Screen:** Start on the **Progressly Dashboard** (`https://progressly-frontend-amber.vercel.app/`).
* **Visual Action:** Move cursor smoothly over the top header and the timeline summary cards.

> **🗣️ Voiceover Script:**
> *"In capital infrastructure projects like oil & gas pipelines, refineries, and metro systems, master schedules cascade into thousands of micro-level engineering activities.*
> 
> *Every single day, site supervisors submit unstructured field notes, WhatsApp messages, and spreadsheets. Planning engineers spend countless hours trying to manually connect vague notes like 'welded 14 spool joints' back to baseline Primavera or MS Project codes like `L6-PIP-0243`.*
> 
> *This is **Progressly** — an intelligent, event-driven data capture and schedule-linking layer powered by Amazon Bedrock and AWS ECS Fargate that automates field progress ingestion, protects critical paths, and turns historical project mistakes into institutional intelligence."*

---

### 📍 Scene 2: Operational Timeline & Multi-Project Workspaces (0:40 – 1:25)
* **What to Show on Screen:**
  1. Hover over the top **Metric Cards** (*15 Total Activities, 73.3% On-Track, 1 Critical Delay*).
  2. Click the **Project Dropdown Switcher** in the top right to show isolated enterprise projects:
     - `Baghjan Gas Gathering Station Project` (Oil India Ltd)
     - `Paradip-Hyderabad Pipeline Extension` (IOCL)
  3. Scroll down to show the **Gantt Schedule Bars** and the **Schedule Update Lineage (Audit Log)**.

> **🗣️ Voiceover Script:**
> *"Here on the Progressly Operational Dashboard, we are looking at live production data connected to AWS RDS PostgreSQL.*
> 
> *Progressly provides strict multi-tenant enterprise scoping: with a single click, planners can switch between isolated projects — from Oil India's Baghjan Gas Gathering Station to Indian Oil's Paradip-Hyderabad Pipeline.*
> 
> *Below, our live Gantt timeline tracks baseline planned dates against actual field progress, while the immutable **Audit Lineage** at the bottom logs every automated and planner-approved update with exact Bedrock confidence scores."*

---

### 📍 Scene 3: Ingesting an Unstructured Daily Field Report (1:25 – 2:20)
* **What to Show on Screen:**
  1. Click **`Ingest Report`** (or `Upload Daily Report`) in the left sidebar.
  2. Notice the target project badge: `Target Project: Baghjan Gas Gathering Station`.
  3. Paste the snippet below into the narrative text box.
  4. Click **`Upload & Link to Schedule`**.
  5. Watch the animated button transition (*"Transmitting to S3 & Bedrock..."*) and green success toast.

#### 📋 Copy-Paste Snippet #1 (Daily Report):
```text
Daily Progress Report - Area 3 Tank Farm & Compressor Shelter
Date: 28-Aug-2026 | Submitter: Site Supervisor - Tank Farm

1. Piping Crew A completed welding of 14 spool joints on 24-inch crude header line 24-XX at Tank Farm 3. Radiography (NDT) cleared 100% of joints.
2. Civil team poured 45 cubic meters of concrete for the compressor foundation pit at equipment shelter area. Curing compound applied.
```

> **🗣️ Voiceover Script:**
> *"Now let's see what happens when a site supervisor submits real-world field notes.*
> 
> *I'll paste an unstructured daily report covering piping spool welding and compressor foundation concrete pouring, and click 'Upload & Link to Schedule'.*
> 
> *Instantly, the document is encrypted in **Amazon S3**, triggers an event-driven **Amazon SQS** queue, and our **ECS Fargate AI Worker** kicks in.*
> 
> *We use **Amazon Bedrock Nova Micro** to extract structured construction entities with zero hallucination, and **Amazon Titan Embeddings V2** to convert those activities into 1024-dimensional semantic vectors for cosine similarity matching against our schedule database."*

---

### 📍 Scene 4: 3-Tier Policy Review Queue & Live Schedule Update (2:20 – 3:10)
* **What to Show on Screen:**
  1. Click **`Review Queue`** in the left sidebar.
  2. Point out the extracted cards:
     - Show **Nova Micro's extracted fields** (*Line: 24-XX, Location: Tank Farm 3, Qty: 14 joints*).
     - Show **Titan V2's matched activity** (*Target: L6-PIP-0243 — Erect 24-inch crude header spools*).
     - Point out the **Confidence Badge** (e.g. *92.4% • Tier 2 Verification*).
  3. Click **`Approve & Update Schedule`**.
  4. Click **`Timeline Dashboard`** in the sidebar to show the updated progress bar and the newly added audit log entry!

> **🗣️ Voiceover Script:**
> *"Progressly governs all AI recommendations using a strict 3-tier confidence policy:*
> - *Tier 1 (≥95%): Auto-approved directly into the schedule.*
> - *Tier 2 (70–94%): Routed here to the human Review Queue for engineer verification.*
> - *Tier 3 (<70%): Flagged for supervisor clarification.*
> 
> *Notice how Nova Micro extracted the line numbers and quantities, while Titan V2 matched it with 92% confidence to activity code `L6-PIP-0243`.*
> 
> *As the Lead Planning Engineer, I click **'Approve & Update Schedule'**.*
> 
> *Immediately, the schedule baseline is updated in PostgreSQL, and an immutable record with model versions and confidence scores is written to the audit lineage."*

---

### 📍 Scene 5: Project Memory — Institutional RAG, CSV Import & Closed-Loop Learning (3:10 – 4:15)
* **What to Show on Screen:**
  1. Click **`Project Memory (RAG)`** in the left sidebar.
  2. Click the preset pill: *"What caused piping delays in past projects?"* (or type it in the search bar and hit Enter).
  3. Show the **Bedrock Nova Pro synthesis**:
     - Point out the computed statistical summary (*Average delay: 10.3 days, Material shortages: 50%*).
     - Click on one of the **Source Citations** in brackets (e.g. `[Mumbai High Offshore — Underwater Spool Tie-In]`) to open the Grounding Verification Modal!
  4. Click **`+ Import Past CSV`** button in the top right of the memory card:
     - Click **"Paste Sample Data"** $\rightarrow$ Click **"Embed & Ingest to Memory"**.
     - Point out the counter updating with new Titan V2 vector embeddings.
  5. Click **`Archive Active Project`** button:
     - Show the toast confirming **Closed-Loop Learning**: *"Archived active project activities into institutional memory!"*

#### 📋 Copy-Paste Snippet #2 (If typing memory query):
```text
What caused piping delays in past projects?
```

> **🗣️ Voiceover Script:**
> *"Now for our flagship enterprise feature: **Project Memory**.*
> 
> *In capital construction, lessons learned from past projects are almost always lost in forgotten PDF archives. Progressly transforms company history into an active institutional intelligence layer.*
> 
> *When we ask: 'What caused piping delays in past projects?', our backend retrieves relevant historical records via Titan V2 cosine similarity, calculates mathematically verified statistics, and uses **Amazon Bedrock Nova Pro** to generate a grounded, cited answer.*
> 
> *Notice that Nova Pro strictly cites every claim — clicking any source card displays the exact grounding record with planned vs actual days.*
> 
> *Even better, Progressly supports two ingestion loops:*
> *1. **Spreadsheet Ingestion**: Click '+ Import Past CSV' to embed years of historical company spreadsheets using Titan V2.*
> *2. **Closed-Loop Learning**: Click 'Archive Active Project' to automatically vectorize completed project logs, making the system smarter for every future project."*

---

### 📍 Scene 6: Architecture, Scalability & Cost Breakdown (4:15 – 4:45)
* **What to Show on Screen:**
  - Click **`System Architecture`** in the left sidebar (navigating to `/architecture`).
  - Scroll through the **AWS Cloud Architecture Topology Diagram** and the **Cost Optimization Table**.

> **🗣️ Voiceover Script:**
> *"Under the hood, Progressly is built entirely on production AWS infrastructure:*
> - * **AWS ECS Fargate** containerized backend and AI workers for zero cold starts,*
> - * **Amazon SQS** for absorbing high-volume 5:00 PM shift report upload bursts,*
> - * **Amazon RDS PostgreSQL with pgvector** for ACID schedule integrity and vector similarity,*
> - * And a cost-tiered Bedrock architecture: **Nova Micro** for sub-second report extraction at $0.000035 per report, **Titan V2** for embeddings, and **Nova Pro** for deep institutional synthesis.*
> 
> *The entire ingestion pipeline runs at under **$0.04 per 1,000 daily reports**."*

---

### 📍 Scene 7: Conclusion & Impact (4:45 – 5:00)
* **What to Show on Screen:** Switch back to the **Progressly Operational Timeline** dashboard (`/`).

> **🗣️ Voiceover Script:**
> *"Progressly eliminates critical-path schedule surprises, automates the burden of daily site report linking, and ensures that mega-infrastructure projects never repeat the same mistake twice.*
> 
> *Thank you!"*

---

## 💡 4. Quick Reference Copy-Paste Data Bank

| Item | Content to Copy |
|---|---|
| **Field Report Text** | `Daily Progress Report - Area 3 Tank Farm & Compressor Shelter`<br>`Date: 28-Aug-2026 \| Submitter: Site Supervisor - Tank Farm`<br><br>`1. Piping Crew A completed welding of 14 spool joints on 24-inch crude header line 24-XX at Tank Farm 3. Radiography (NDT) cleared 100% of joints.`<br>`2. Civil team poured 45 cubic meters of concrete for the compressor foundation pit at equipment shelter area. Curing compound applied.` |
| **RAG Query #1** | `What caused piping delays in past projects?` |
| **RAG Query #2** | `What lessons were learned on the Paradip-Hyderabad pipeline project?` |
| **Sample Memory CSV** | `project_name,discipline,activity_description,planned_duration_days,actual_duration_days,delay_cause,notes`<br>`Mumbai High Offshore,Piping,Underwater Spool Tie-In,14,28,Heavy monsoons & subsea crane failure,Pre-book backup hydraulic cranes during coastal monsoon`<br>`Jamnagar Refinery Phase 3,Civil,Furnace Concrete Pour,8,17,Excavation waterlogging,Install automatic dewatering sumps before casting` |

---

## 🎯 5. Pro Tips for a 10/10 Hackathon Score

1. **Speak with Energy & Authority:** Project your voice like a Lead Solutions Architect demonstrating an enterprise platform to an executive board.
2. **Smooth Cursor Motion:** Don't jerk the mouse around. Move directly to the button you're about to click.
3. **Let AI Responses Render:** When you click *Query Memory* or *Approve & Update*, pause for 1 second to let the animated progress bar and toast pop up clearly.
4. **Highlight Grounding:** Explicitly click on the citation tag `[Project Name — Activity]` in Project Memory to show the judges that the LLM is 100% grounded and cannot hallucinate.
