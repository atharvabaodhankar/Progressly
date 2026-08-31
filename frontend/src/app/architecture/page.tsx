'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
  Workflow,
  Cloud,
  FileCode,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Boxes,
  Zap,
  ArrowLeft,
  Sparkles,
  Search,
  ExternalLink,
  Code2,
  Network,
  Binary,
  Radio,
  Clock,
  KeyRound,
  ShieldAlert,
  HardHat,
  LayoutDashboard,
  Upload,
  ChevronRight,
  Check,
  Info,
  Menu,
  Download,
  Maximize2,
  BarChart3,
} from 'lucide-react';

export default function ArchitecturePage() {
  const [activeFlow, setActiveFlow] = useState<'ingestion' | 'memory'>('ingestion');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [diagramOrientation, setDiagramOrientation] = useState<'landscape' | 'portrait'>('landscape');

  const ingestionSteps = [
    {
      step: '01',
      title: 'Supervisor Ingress',
      badge: 'Edge Ingress',
      desc: 'Free-text note, CSV, or scanned diary uploaded through Next.js Vercel Edge reverse proxy tunnel.',
      highlight: 'Zero CORS /api-proxy/*',
    },
    {
      step: '02',
      title: 'ALB & S3 Persistence',
      badge: 'Raw Evidence',
      desc: 'ALB routes payload to Express API. Raw evidence is persisted immutably in Amazon S3.',
      highlight: 'AES-256 Encrypted',
    },
    {
      step: '03',
      title: 'Lambda & SQS Buffer',
      badge: 'Event Trigger',
      desc: 'S3:ObjectCreated invokes Lambda router to decouple heavy AI extraction into Amazon SQS.',
      highlight: 'Decoupled Buffer',
    },
    {
      step: '04',
      title: 'Nova Micro Parsing',
      badge: 'Entity Extraction',
      desc: 'ECS AI Worker polls SQS and extracts technical entities (discipline, line number, location, qty).',
      highlight: '$0.041 / 1M Tokens',
    },
    {
      step: '05',
      title: 'Titan V2 Vector Search',
      badge: 'pgvector Cosine',
      desc: '1024d embedding computed for top-K cosine candidate ranking against Master WBS in RDS.',
      highlight: '1024-dim Dense Vector',
    },
    {
      step: '06',
      title: 'Policy Sync & Audit',
      badge: 'Schedule Update',
      desc: 'Deterministic rules calibrate confidence. Updates baseline schedule + immutable audit log.',
      highlight: 'Zero False Schedule Edits',
    },
  ];

  const memorySteps = [
    {
      step: '01',
      title: 'Planner Prompt',
      badge: 'User Query',
      desc: 'Lead planner queries historical delays directly from the dashboard memory bar.',
      highlight: 'e.g. "piping delays in Assam"',
    },
    {
      step: '02',
      title: 'Titan V2 Embedding',
      badge: 'Vectorization',
      desc: 'Backend generates 1024-dimensional query vector via Bedrock Titan V2.',
      highlight: 'amazon.titan-embed-text-v2',
    },
    {
      step: '03',
      title: 'pgvector Retrieval',
      badge: 'Cosine Search',
      desc: 'Extracts top matching records from 40 historical project records in RDS PostgreSQL.',
      highlight: 'Cosine Similarity Threshold',
    },
    {
      step: '04',
      title: 'Deterministic Stats',
      badge: 'Pre-computation',
      desc: 'Pre-computes authentic average delay days, root causes, and delay distributions.',
      highlight: 'Zero Math Hallucination',
    },
    {
      step: '05',
      title: 'Nova Pro Synthesis',
      badge: 'Bedrock Reasoning',
      desc: 'Synthesizes grounded executive briefing with strict citations over 300k context.',
      highlight: '300k Context Window',
    },
    {
      step: '06',
      title: 'Evidence Verification',
      badge: 'Provenance Modal',
      desc: 'Planner clicks citations to inspect exact historical record evidence and cosine score.',
      highlight: 'Clickable Provenance Proof',
    },
  ];

  const currentStepList = activeFlow === 'ingestion' ? ingestionSteps : memorySteps;

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#1B1B23] flex flex-col antialiased selection:bg-[#4648D4]/10 selection:text-[#4648D4]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-[#F5F2FE]/80 backdrop-blur-xl z-50 flex-col border-r border-[#C7C4D7]/30">
        <div className="p-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white p-1.5 shadow-sm border border-[#C7C4D7]/40 flex items-center justify-center">
            <img
              src="/progressly-logo.png"
              alt="Progressly Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-[#4648D4] tracking-tight">Progressly</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                PROD
              </span>
            </div>
            <p className="text-xs text-[#64748B] font-medium">Oil India Ltd • Baghjan</p>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23] transition-all"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Timeline Dashboard</span>
          </Link>

          <Link
            href="/?tab=review"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23] transition-all"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Review Queue</span>
          </Link>

          <Link
            href="/?tab=upload"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23] transition-all"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Daily Report</span>
          </Link>

          <Link
            href="/?tab=memory"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23] transition-all"
          >
            <Sparkles className="w-5 h-5" />
            <span>Project Memory (RAG)</span>
          </Link>

          <div className="pt-2 border-t border-[#C7C4D7]/20 my-2" />

          <Link
            href="/analytics"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23] transition-all"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Token & Cost Telemetry</span>
          </Link>

          <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm bg-[#4648D4] text-white shadow-lg shadow-[#4648D4]/25 transition-all">
            <Network className="w-5 h-5" />
            <span>System Architecture</span>
          </div>
        </nav>

        {/* User Card */}
        <div className="p-4 m-4 rounded-2xl bg-[#E9E6F3]/60 border border-[#C7C4D7]/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4648D4] text-white flex items-center justify-center font-bold text-sm">
            PS
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-[#1B1B23] truncate">Priya Sharma</span>
            <span className="text-xs text-[#64748B] truncate">Lead Planning Engineer</span>
          </div>
        </div>
      </aside>

      {/* Main Content Wrap */}
      <div className="lg:pl-72 flex-1 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-20 bg-white/85 backdrop-blur-xl border-b border-[#C7C4D7]/30 px-4 sm:px-8 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          {/* Mobile Menu Button & Title */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white p-1 shadow-sm border border-[#C7C4D7]/40 flex items-center justify-center">
                <img
                  src="/progressly-logo.png"
                  alt="Progressly Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-lg text-[#4648D4]">Progressly</span>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <Link href="/" className="hover:text-[#4648D4] transition">
              Progressly
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#1B1B23] font-semibold">Technical Architecture</span>
          </div>

          {/* Live Region Badge & Back Link */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-semibold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AWS ap-south-1 (Mumbai)
            </span>

            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#C7C4D7]/50 hover:border-[#4648D4] text-xs sm:text-sm font-semibold text-[#1B1B23] shadow-xs transition"
            >
              <ArrowLeft className="w-4 h-4 text-[#4648D4]" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-2">
            <Link
              href="/"
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Timeline Dashboard</span>
            </Link>
            <Link
              href="/?tab=review"
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Queue</span>
            </Link>
            <Link
              href="/?tab=upload"
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Daily Report</span>
            </Link>
            <Link
              href="/?tab=memory"
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Sparkles className="w-4 h-4" />
              <span>Project Memory (RAG)</span>
            </Link>
            <Link
              href="/analytics"
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Token & Cost Telemetry</span>
            </Link>
            <div className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium bg-[#4648D4] text-white">
              <Network className="w-4 h-4" />
              <span>System Architecture</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-10">
          {/* ========================================================================= */}
          {/* SECTION 1: HERO & LIVE HEALTH KPI STRIP                                   */}
          {/* ========================================================================= */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-mono font-bold uppercase tracking-wider">
                    Production System Blueprint
                  </span>
                  <span className="text-xs text-[#64748B] font-mono">
                    Multi-Account Split • Live AWS Infrastructure
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1B1B23]">
                  System Architecture & Data Topology
                </h1>
                <p className="text-sm sm:text-base text-[#64748B] max-w-2xl leading-relaxed">
                  End-to-end technical blueprint of Progressly&apos;s asynchronous schedule-linking pipeline and institutional memory RAG engine.
                </p>
              </div>

              {/* Diagram Format Controls */}
              <div className="bg-white p-1.5 rounded-2xl border border-[#C7C4D7]/40 shadow-xs flex items-center gap-1.5 self-start md:self-auto">
                <button
                  onClick={() => setDiagramOrientation('landscape')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    diagramOrientation === 'landscape'
                      ? 'bg-[#4648D4] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Technical Landscape (16:9)
                </button>
                <button
                  onClick={() => setDiagramOrientation('portrait')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    diagramOrientation === 'portrait'
                      ? 'bg-[#4648D4] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Technical Portrait (3:4)
                </button>
              </div>
            </div>

            {/* Live Health KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-[24px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748B] uppercase">Ingress & Edge</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-lg font-bold text-[#1B1B23] truncate">AWS ALB (Port 80)</p>
                <p className="text-xs font-mono text-[#4648D4] truncate">
                  progressly-alb-prod-1551208303
                </p>
              </div>

              <div className="bg-white p-5 rounded-[24px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748B] uppercase">Fargate Compute</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-lg font-bold text-[#1B1B23]">ECS Cluster</p>
                <p className="text-xs text-[#64748B]">2 Running Tasks (API + Worker)</p>
              </div>

              <div className="bg-white p-5 rounded-[24px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748B] uppercase">Vector & Relational</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-lg font-bold text-[#1B1B23]">RDS PostgreSQL 16.9</p>
                <p className="text-xs font-mono text-purple-700">pgvector (1024d Dense Vectors)</p>
              </div>

              <div className="bg-white p-5 rounded-[24px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748B] uppercase">Bedrock Model Mesh</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                </div>
                <p className="text-lg font-bold text-[#1B1B23]">3 AWS Models</p>
                <p className="text-xs text-[#64748B]">Nova Micro + Titan V2 + Nova Pro</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: HIGH-RESOLUTION MONOCHROME TECHNICAL SCHEMATIC                 */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C7C4D7]/20 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1B1B23] flex items-center gap-2.5">
                  <Workflow className="w-5 h-5 text-[#4648D4]" />
                  <span>Production Topology Blueprint</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                  Light-themed monochrome engineering schematic across Client, AWS Infrastructure VPC, and Amazon Bedrock.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={diagramOrientation === 'landscape' ? '/architecture-landscape.svg' : '/architecture-portrait.svg'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C7C4D7]/50 text-xs font-semibold text-slate-800 hover:border-[#4648D4] hover:text-[#4648D4] shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Vector</span>
                </a>
                <a
                  href={diagramOrientation === 'landscape' ? '/architecture-landscape.svg' : '/architecture-portrait.svg'}
                  download={
                    diagramOrientation === 'landscape'
                      ? 'progressly-architecture-landscape.svg'
                      : 'progressly-architecture-portrait.svg'
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4648D4] text-white text-xs font-semibold shadow-xs hover:bg-[#3B3DC0] transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </a>
              </div>
            </div>

            {/* EMBEDDED CRISP VECTOR BLUEPRINT */}
            <div className="rounded-2xl border border-[#C7C4D7]/40 bg-[#FFFFFF] p-2 sm:p-4 shadow-sm flex items-center justify-center overflow-hidden">
              <img
                src={diagramOrientation === 'landscape' ? '/architecture-landscape.svg' : '/architecture-portrait.svg'}
                alt="Progressly System Architecture Light Monochrome Schematic"
                className={`w-full h-auto object-contain rounded-lg ${
                  diagramOrientation === 'landscape' ? 'max-h-[640px]' : 'max-h-[920px]'
                }`}
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: STEP-BY-STEP DATA FLOW SEQUENCE MATRIX                         */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C7C4D7]/20 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1B1B23] flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-[#4648D4]" />
                  <span>Step-by-Step Data Flow Matrix</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                  Inspect the precise end-to-end execution path for report ingestion or institutional memory retrieval.
                </p>
              </div>

              {/* Flow Selector */}
              <div className="flex items-center bg-[#F5F2FE] p-1 rounded-xl border border-[#C7C4D7]/20 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setActiveFlow('ingestion');
                    setActiveStep(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeFlow === 'ingestion'
                      ? 'bg-white text-[#4648D4] shadow-sm'
                      : 'text-[#64748B] hover:text-[#1B1B23]'
                  }`}
                >
                  Flow A: Report Ingestion & Linking
                </button>
                <button
                  onClick={() => {
                    setActiveFlow('memory');
                    setActiveStep(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeFlow === 'memory'
                      ? 'bg-white text-[#4648D4] shadow-sm'
                      : 'text-[#64748B] hover:text-[#1B1B23]'
                  }`}
                >
                  Flow B: Project Memory (RAG)
                </button>
              </div>
            </div>

            {/* 6-Card Visual Sequence Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {currentStepList.map((s, idx) => {
                const isSelected = activeStep === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-white border-[#4648D4] ring-2 ring-[#4648D4]/20 shadow-md scale-[1.01]'
                        : 'bg-[#F8FAFF] border-[#C7C4D7]/40 hover:bg-white hover:border-[#4648D4]/60 shadow-xs'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                          isSelected
                            ? 'bg-[#4648D4] text-white border-[#4648D4]'
                            : 'bg-[#4648D4]/10 text-[#4648D4] border-[#4648D4]/20'
                        }`}>
                          {s.step}
                        </span>
                        <span className="text-[9px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[85px]">
                          {s.badge}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-[#1B1B23] leading-snug">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-3">
                        {s.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-mono text-[#4648D4] font-medium block truncate">
                        {s.highlight}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: AI PIPELINE & 3-TIER POLICY GATE                               */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#C7C4D7]/20 pb-4">
              <h2 className="text-xl font-bold text-[#1B1B23] flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>AI Pipeline & 3-Tier Policy Gating Funnel</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                How unstructured human notes are calibrated into verified schedule updates without hallucination.
              </p>
            </div>

            {/* 5-Stage Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="bg-[#F8FAFF] p-4 rounded-2xl border border-[#C7C4D7]/30 space-y-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                  STAGE 1
                </span>
                <p className="font-bold text-xs text-[#1B1B23]">Unstructured Input</p>
                <p className="text-[11px] text-[#64748B]">Daily site notes, spreadsheets, or scanned diaries.</p>
              </div>

              <div className="bg-[#F8FAFF] p-4 rounded-2xl border border-[#C7C4D7]/30 space-y-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">
                  STAGE 2
                </span>
                <p className="font-bold text-xs text-[#1B1B23]">Nova Micro Extract</p>
                <p className="text-[11px] text-[#64748B]">Discipline, line number, location, and quantities.</p>
              </div>

              <div className="bg-[#F8FAFF] p-4 rounded-2xl border border-[#C7C4D7]/30 space-y-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono">
                  STAGE 3
                </span>
                <p className="font-bold text-xs text-[#1B1B23]">Titan V2 Vector</p>
                <p className="text-[11px] text-[#64748B]">1024d pgvector cosine similarity search.</p>
              </div>

              <div className="bg-[#F8FAFF] p-4 rounded-2xl border border-[#C7C4D7]/30 space-y-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                  STAGE 4
                </span>
                <p className="font-bold text-xs text-[#1B1B23]">Rule Engine</p>
                <p className="text-[11px] text-[#64748B]">Semantic gate (≥0.70), +15% line, +10% disc, -8% line asymmetry.</p>
              </div>

              <div className="bg-[#F8FAFF] p-4 rounded-2xl border border-[#C7C4D7]/30 space-y-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                  STAGE 5
                </span>
                <p className="font-bold text-xs text-[#1B1B23]">Policy Funnel</p>
                <p className="text-[11px] text-[#64748B]">Tiered confidence action determination.</p>
              </div>
            </div>

            {/* 3-Tier Policy Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Tier 1 */}
              <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Tier 1: ≥ 95% Confidence
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="font-bold text-sm text-[#1B1B23]">Auto-Approved</p>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  High semantic similarity + exact physical constraint match. Baseline schedule progress is updated automatically with full immutable logging to <code className="font-mono text-[11px] bg-emerald-100/60 px-1 py-0.5 rounded">audit_log</code>.
                </p>
              </div>

              {/* Tier 2 */}
              <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Tier 2: 70% – 94% Confidence
                  </span>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <p className="font-bold text-sm text-[#1B1B23]">Planner Review Queue</p>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Moderate semantic match with partial constraint ambiguity. Routed to the human planner review queue for single-click verification and schedule sign-off.
                </p>
              </div>

              {/* Tier 3 */}
              <div className="bg-rose-50/50 border border-rose-200 p-5 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Tier 3: &lt; 70% Confidence
                  </span>
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <p className="font-bold text-sm text-[#1B1B23]">Manual Resolution</p>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Low confidence or novel scope. Flagged for engineering investigation, new WBS node creation, or schedule scope adjustment. Zero false schedule changes.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 5: MULTI-ACCOUNT SECURITY & SECRETS ISOLATION                     */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#C7C4D7]/20 pb-4">
              <h2 className="text-xl font-bold text-[#1B1B23] flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#4648D4]" />
                <span>Multi-Account Security & Credential Isolation Architecture</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Enterprise cross-account boundary separating application compute from AI foundation model access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account B Card */}
              <div className="bg-[#F8FAFF] p-6 rounded-2xl border border-[#C7C4D7]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4648D4] uppercase">Infrastructure Account (Account B)</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">736969242498</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Contains VPC, ALB, ECS Cluster, S3 Bucket, Lambda, SQS, and RDS PostgreSQL.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Secrets Manager (<code className="font-mono text-[11px] bg-slate-200 px-1 rounded">progressly/bedrock-credentials-prod-*</code>) securely holds Account A access keys.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Injected dynamically into ECS Fargate task definitions as runtime environment secrets.</span>
                  </li>
                </ul>
              </div>

              {/* Account A Card */}
              <div className="bg-purple-50/30 p-6 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase">Foundation Model Account (Account A)</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800">Bedrock Mesh</span>
                </div>
                <ul className="text-xs text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>IAM User scoped strictly to <code className="font-mono text-[11px] bg-purple-100 px-1 rounded">bedrock:InvokeModel</code> and <code className="font-mono text-[11px] bg-purple-100 px-1 rounded">bedrock:Converse</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Zero access to compute, S3 data buckets, or database tables in Account B.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Enterprise data provenance: customer data is never used to train foundation models.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 6: REAL PRODUCTION TECH STACK CHIP MATRIX                         */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-[#C7C4D7]/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#C7C4D7]/20 pb-4">
              <h2 className="text-xl font-bold text-[#1B1B23] flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-[#4648D4]" />
                <span>Active Production Technology Stack (12 Real Services)</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Zero placeholder services. Every component below is deployed and running in production today.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { name: 'Next.js 14 on Vercel', role: 'Frontend & Edge Reverse Proxy', tier: 'HTTPS Edge' },
                { name: 'AWS Application Load Balancer', role: 'Public Ingress & Routing', tier: 'Port 80' },
                { name: 'AWS ECS Fargate API', role: 'Express Backend API', tier: '0.5 vCPU / 1GB' },
                { name: 'AWS ECS Fargate Worker', role: 'AI Ingestion Engine', tier: '1.0 vCPU / 2GB' },
                { name: 'Amazon RDS PostgreSQL 16.9', role: 'Relational & pgvector Store', tier: 'db.t4g.micro' },
                { name: 'Amazon S3 Bucket', role: 'Raw Report Evidence', tier: 'AES-256' },
                { name: 'Amazon SQS Queue', role: 'Job Buffering Decoupling', tier: 'Standard Queue' },
                { name: 'AWS Lambda Router', role: 'S3 to SQS Trigger', tier: 'Node.js 20.x' },
                { name: 'AWS Secrets Manager', role: 'Encrypted Credential Store', tier: 'KMS Encrypted' },
                { name: 'Amazon Nova Micro', role: 'Entity Extraction Engine', tier: '$0.041 / 1M' },
                { name: 'Amazon Titan Embeddings V2', role: '1024d Dense Vector Search', tier: '$0.020 / 1M' },
                { name: 'Amazon Nova Pro', role: 'Institutional Memory RAG', tier: '300k Context' },
              ].map((tech, idx) => (
                <div
                  key={idx}
                  className="bg-[#F8FAFF] p-3.5 rounded-2xl border border-[#C7C4D7]/30 space-y-1 hover:border-[#4648D4] transition shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-[#1B1B23] truncate">{tech.name}</p>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-[#4648D4] border border-[#C7C4D7]/30 shrink-0">
                      {tech.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] truncate">{tech.role}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
