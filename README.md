# Enterprise AI Customer Support & Operations Agent

**Live Production Demo:** [https://smart-support-ai-agent.vercel.app/](https://smart-support-ai-agent.vercel.app/)

A full-stack, bilingual (**Arabic / English**) AI Support & Operations Agent built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Vercel AI SDK**, **Google Gemini**, and **Supabase (`pgvector`)**.

Designed with a **Split-Screen Workspace Architecture**, combining a customer-facing chat interface with a live operations & ticketing dashboard that synchronizes in real time as the agent executes backend tools and requests human approvals.

---

## Key Engineering Features

1. **Bilingual Multimodal RAG & Knowledge Ingestion (`/api/agent/upload` & `lib/rag.ts`):**
   - Upload **PDF, TXT, or MD** files up to 5MB.
   - Uses Gemini Multimodal + `unpdf` fallback to extract, clean, and translate documents automatically into both **Arabic** and **English**, chunking with overlap and indexing embeddings (`gemini-embedding-001`) into Supabase `pgvector` and local memory.
2. **Human-in-the-Loop (HITL) Governance (`requestOrderCancellation`):**
   - Financial/destructive actions (order cancellations and refunds) are never executed autonomously by the LLM.
   - The agent creates a pending approval request (`APR-xxx`) in the Admin Dashboard; the order transitions to `Cancelled / ملغي` only after an explicit manager action (`PATCH /api/agent`).
3. **Autonomous Multi-Tool Execution (`/api/agent`):**
   - `searchKnowledgeBase`: Semantic/keyword RAG retrieval across store policies and product catalogs.
   - `checkOrderStatus`: Real-time order status and estimated delivery lookup (`ORD-101`, `ORD-102`, `ORD-103`).
   - `bookAppointment`: Bilingual maintenance/consultation appointment scheduling.
   - `createSupportTicket`: Automated complaint escalation with urgency classification (`low`, `medium`, `high`).
   - `requestOrderCancellation`: Escalates cancellation requests for manager sign-off.
4. **High Availability & Hybrid Persistence (`lib/store.ts` & `lib/supabase.ts`):**
   - Automatic multi-model failover across Gemini Flash models upon rate-limit (`429`) errors, plus a deterministic local fallback engine.
   - Instant disk persistence (`.data/store.json`) paired with non-blocking background synchronization to **Supabase PostgreSQL**.

---

## Modular Project Structure

```text
smart-support-agent/
├── app/
│   ├── api/
│   │   └── agent/
│   │       ├── route.ts                 # Unified REST + AI Agent endpoint (GET, PUT, PATCH, POST)
│   │       └── upload/route.ts          # Bilingual PDF/TXT/MD extractor & RAG indexer
│   ├── components/
│   │   ├── AppHeader.tsx                # Responsive header, theme toggle, AR/EN switcher & mobile tabs
│   │   ├── ChatPanel.tsx                # Customer live chat, quick prompts & tool execution logs
│   │   ├── AdminPanel.tsx               # KPIs, HITL approvals, orders table/cards, tickets & policies
│   │   └── KnowledgeUploader.tsx        # PDF/TXT/MD uploader with bilingual indexing feedback
│   ├── page.tsx                         # Main workspace state container & persistence orchestrator
│   ├── layout.tsx                       # Root layout, Arabic/Latin fonts & zero-FOUC theme script
│   └── globals.css                      # Warm Light / Charcoal Dark CSS variables & Tailwind v4
├── lib/
│   ├── i18n.ts                          # Complete Arabic (RTL) & English (LTR) dictionary
│   ├── store.ts                         # Hybrid persistent store (.data/store.json + Supabase sync)
│   ├── rag.ts                           # Text chunking, vector embeddings & fast keyword search
│   └── supabase.ts                      # Lazy server-side Supabase admin client
├── supabase-schema.sql                  # Ready-to-run PostgreSQL + pgvector schema for Supabase
└── .env.example                         # Environment variable template
```

---

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and set your `GOOGLE_GENERATIVE_AI_API_KEY` (and optional Supabase URL/key).
3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
