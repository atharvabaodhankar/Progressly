# Progressly (BridgeIQ) — Hackathon Demo Video Recording Script

**Target Duration:** 3 to 5 Minutes  
**Live Production URL:** [https://progressly-frontend-amber.vercel.app/](https://progressly-frontend-amber.vercel.app/)

---

## 🎬 1. Pre-Recording Setup Checklist

Before pressing record:
1. **Open Browser Tabs:**
   * **Tab 1 (Main):** `https://progressly-frontend-amber.vercel.app/` (Zoom to 100% or 110% so text is crisp).
   * **Tab 2 (Backup / Architecture):** `architecture.md` diagram or AWS Console (optional, for the technical closing).
2. **Clipboard Ready:** Copy the **Sample Field Report** from Step 3 below so you can paste it smoothly on camera without typing delays.
3. **Screen Resolution:** 1920x1080 (1080p Full HD) at 60 FPS.
4. **Browser Cleanliness:** Hide bookmarks bar (`Ctrl + Shift + B`), close irrelevant tabs.

---

## 🕒 2. Step-by-Step Recording Timeline

```
0:00 - 0:40 ── Scene 1: The Problem & Introduction
0:40 - 1:30 ── Scene 2: The Operational Timeline Dashboard
1:30 - 2:30 ── Scene 3: Ingesting an Unstructured Daily Report
2:30 - 3:30 ── Scene 4: The 3-Tier Policy Review Queue & Auto-Linking
3:30 - 4:30 ── Scene 5: Project Memory (Institutional RAG with Nova Pro)
4:30 - 5:00 ── Scene 6: Architecture, Scalability & Closing
```

---

### Scene 1: The Problem & Introduction (0:00 – 0:40)
* **What to Show on Screen:** Start on the **Progressly Dashboard** (`https://progressly-frontend-amber.vercel.app/`).
* **What to Say (Voiceover Script):**
  > *"In mega-capital energy infrastructure projects like Oil India refineries and pipeline expansions, schedules cascade from high-level milestones down to thousands of micro L5 and L6 engineering activities.*
  > 
  > *Every single day, hundreds of site supervisors send WhatsApp messages, handwritten site diaries, and spreadsheets back from the field. Project planners spend hours trying to manually connect notes like 'spool erected today' with baseline activity codes like 'L6-PIP-0243'.*
  > 
  > *This is **Progressly** — an intelligent, event-driven data capture and schedule-linking layer powered by Amazon Bedrock and AWS Fargate that automates this entire pipeline in real-time."*

---

### Scene 2: The Operational Timeline Dashboard (0:40 – 1:30)
* **What to Show on Screen:** Hover over the **Metrics Cards**, click the **Filter Tabs** ("All Tasks", "Delayed", "In Progress"), and scroll through the **Gantt Schedule Bars**.
* **What to Say (Voiceover Script):**
  > *"Here on the Progressly Operational Timeline, you are looking at live production data connected to our AWS RDS PostgreSQL database.*
  > 
  > *At the top, we see our real WBS activity metrics: 15 active engineering activities across civil, piping, and electrical disciplines, with an authentic on-track rate and live pending review alerts.*
  > 
  > *Below, our Gantt-style execution schedule maps each activity's baseline planned dates against actual progress percentages. And at the bottom, our **Schedule Update Lineage** maintains an immutable audit trail of every automated and engineer-approved update."*

---

### Scene 3: Ingesting an Unstructured Field Report (1:30 – 2:30)
* **What to Show on Screen:** Click **"Upload Daily Report"** in the sidebar. Paste the text below into the narrative box, and click **"Upload & Link to Schedule"**.

#### 📋 Text to Copy & Paste on Camera:
```text
Daily Progress Report - Area 3 Tank Farm & Compressor Shelter
Date: 28-Aug-2026 | Submitter: Site Supervisor - Tank Farm

1. Piping Crew A completed welding of 14 spool joints on the 24-inch crude header line 24-XX at Tank Farm 3. Radiography (NDT) cleared 100% of joints.
2. Civil team poured 45 cubic meters of concrete for the compressor foundation pit foundation at equipment shelter area. Curing compound applied.
```

* **What to Say (Voiceover Script):**
  > *"Now let's see what happens when a site supervisor submits messy, unstructured daily progress notes.*
  > 
  > *I'll paste a real-world field update describing piping spool welding and compressor foundation concrete pouring, and submit it.*
  > 
  > *Behind the scenes, this immediately lands in an encrypted **Amazon S3** bucket, triggers an **AWS Lambda** event into **Amazon SQS**, and our **ECS Fargate AI Worker** consumes the message.*
  > 
  > *We use **Amazon Bedrock Nova Micro** to extract structured construction entities, and **Amazon Titan Embeddings V2** to convert those activities into 1024-dimensional vectors for cosine similarity matching against our schedule."*

---

### Scene 4: 3-Tier Policy Review Queue & Auto-Linking (2:30 – 3:30)
* **What to Show on Screen:** Click **"Review Queue"** in the sidebar. Show the extracted card with the confidence score. Click **"Approve & Update Schedule"**. Switch back to the **Timeline Dashboard** to show the updated progress bar and new audit log row!
* **What to Say (Voiceover Script):**
  > *"Progressly uses a strict 3-tier confidence policy gating:*
  > 
  > *Matches at or above 95% are auto-approved and update the schedule instantly.*
  > 
  > *Matches between 70% and 94% are routed here to the human **Review Queue**. Notice how Nova Micro extracted the line number, quantity, and location, while Titan V2 matched it to activity code `L6-PIP-0243`.*
  > 
  > *As the Lead Planning Engineer, I can review the extracted evidence and click **'Approve & Update Schedule'**.*
  > 
  > *Instantly, the schedule baseline progress is updated on the dashboard, and an immutable record with model versions and confidence scores is written to the audit log."*

---

### Scene 5: Project Memory & Institutional RAG (3:30 – 4:30)
* **What to Show on Screen:** Click **"Project Memory (RAG)"** in the sidebar. Click the preset prompt button: *"What caused piping delays in past projects?"*. Show the computed stats, the narrative answer, and the cited sources. Then click **"Browse All 40 Seeded Records"**.
* **What to Say (Voiceover Script):**
  > *"Next is our most powerful feature for capital project management: **Project Memory**.*
  > 
  > *Typically, lessons learned across past projects are buried in static PDF archives. Progressly turns that institutional memory into an active RAG knowledge base across 40 historical capital energy projects.*
  > 
  > *Let's ask: 'What caused piping delays in past projects?'*
  > 
  > *Our backend queries **PostgreSQL pgvector** using Titan V2 cosine distance, computes verified mathematical statistics, and feeds the context to **Amazon Bedrock Nova Pro**.*
  > 
  > *Notice that Nova Pro doesn't hallucinate: it gives us an executive summary, exact root causes (like 3LPE coating defects and valve lead times), and explicitly cites every source record in brackets with matching percentages.*
  > 
  > *If we toggle the knowledge base explorer, we can see all 40 historical records active with their 1024-dimensional vector embeddings."*

---

### Scene 6: Architecture, Scalability & Closing (4:30 – 5:00)
* **What to Show on Screen:** Show the clean **Progressly** branding on the dashboard or switch to the architecture overview.
* **What to Say (Voiceover Script):**
  > *"Under the hood, Progressly is built entirely on AWS enterprise primitives:*
  > * * **AWS ECS Fargate** containerized backend and AI workers for zero cold starts,*
  > * * **Amazon SQS** for absorbing high-volume 5:00 PM shift upload bursts,*
  > * * **Amazon RDS PostgreSQL 16 with pgvector** for transactional schedule data and vector search,*
  > * * And a cost-tiered Bedrock strategy combining **Nova Micro**, **Titan V2**, and **Nova Pro** to run at under $0.04 per 1,000 reports.*
  > 
  > *Progressly eliminates schedule blind spots, protects critical paths, and brings institutional memory to modern infrastructure execution.*
  > 
  > *Thank you!"*

---

## 🎯 Pro Tips for a Winning Video
1. **Don't Rush:** Speak at a calm, confident pace. Let the animations and toasts finish on screen before clicking the next tab.
2. **Move Cursor with Intent:** Use the mouse pointer as a laser pointer — hover briefly over the exact stat cards and badges you are discussing.
3. **Emphasize Real Data:** Mention words like *"live production database"*, *"real WBS activities"*, and *"1024-dimensional Titan V2 embeddings"* — judges look for real working software vs mockups.
