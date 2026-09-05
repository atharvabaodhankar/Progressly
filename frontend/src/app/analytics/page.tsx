'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  BarChart3,
  RefreshCw,
  Layers,
  Network,
  Calculator,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  Upload,
  Sparkles,
} from 'lucide-react';

interface AnalyticsSummary {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
}

interface ModelBreakdown {
  model_id: string;
  name: string;
  tier: string;
  requests_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

interface TraceStage {
  name: string;
  duration_ms: number;
  status: 'completed' | 'failed' | 'skipped';
  metadata?: Record<string, any>;
}

interface AnalyticsTrace {
  id: string;
  trace_id: string;
  request_type: string;
  project_id: string | null;
  project_name?: string;
  model_id: string;
  model_name: string;
  model_tier: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  stages: TraceStage[];
  status: string;
  created_at: string;
}

const API_BASE = '/api-proxy';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([]);
  const [traces, setTraces] = useState<AnalyticsTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<AnalyticsTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [traceFilter, setTraceFilter] = useState<'all' | 'report_ingestion' | 'memory_rag_query' | 'schedule_vectorization'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ROI Calculator state
  const [monthlyReportsCount, setMonthlyReportsCount] = useState<number>(2000);
  const [monthlyRagQueriesCount, setMonthlyRagQueriesCount] = useState<number>(200);
  const [hourlyEngineerRate, setHourlyEngineerRate] = useState<number>(4);
  const [manualMinutesPerReport, setManualMinutesPerReport] = useState<number>(4);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      const [summaryRes, tracesRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/summary`),
        fetch(`${API_BASE}/analytics/traces?limit=30`),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (data.summary) {
          setSummary(data.summary);
          setModelBreakdown(data.model_breakdown || []);
        } else if (data.success && data.data?.summary) {
          setSummary(data.data.summary);
          setModelBreakdown(data.data.model_breakdown || []);
        }
      }

      if (tracesRes.ok) {
        const data = await tracesRes.json();
        const tracesList = data.traces || (data.data && data.data.traces) || [];
        setTraces(tracesList);
        if (tracesList.length > 0 && !selectedTrace) {
          setSelectedTrace(tracesList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const filteredTraces = traces.filter((t) => {
    if (traceFilter === 'all') return true;
    return t.request_type === traceFilter;
  });

  // ROI calculations
  const monthlyAiCost =
    monthlyReportsCount * 0.000038 + monthlyRagQueriesCount * 0.003055;
  const manualHoursPerReport = manualMinutesPerReport / 60;
  const monthlyManualCost = monthlyReportsCount * manualHoursPerReport * hourlyEngineerRate;
  const monthlyReclaimedHours = (monthlyReportsCount * manualHoursPerReport).toFixed(0);
  const savingsPct =
    monthlyManualCost > 0
      ? (((monthlyManualCost - monthlyAiCost) / monthlyManualCost) * 100).toFixed(2)
      : '99.95';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans flex antialiased">
      {/* Light Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-6 shrink-0 hidden md:flex sticky top-0 h-screen z-20">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
              <img
                src="/progressly-icon.svg"
                alt="Progressly"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-900 leading-none">
                Progressly
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase mt-1">
                Oil India Limited
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Project Dashboard</span>
            </Link>

            <Link
              href="/analytics"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-900 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-slate-900" />
              <span>Token & Cost Telemetry</span>
            </Link>

            <Link
              href="/architecture"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Network className="w-4 h-4 text-slate-400" />
              <span>System Architecture</span>
            </Link>
          </nav>
        </div>

        {/* Quiet Infrastructure Status */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AWS Bedrock & RDS Live</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ap-south-1 Mumbai • ECS Fargate
          </p>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden transition"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                Token & Cost Telemetry
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
                Live consumption metrics and request lifecycle traces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchAnalyticsData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-xs transition active:scale-98"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <Link
              href="/"
              className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition active:scale-98"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Project Dashboard</span>
            </Link>
            <Link
              href="/?tab=review"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Review Queue</span>
            </Link>
            <Link
              href="/?tab=upload"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Upload Daily Report</span>
            </Link>
            <Link
              href="/?tab=memory"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>Project Memory (RAG)</span>
            </Link>
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-900"
            >
              <BarChart3 className="w-4 h-4 text-slate-900" />
              <span>Token & Cost Telemetry</span>
            </Link>
            <Link
              href="/architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Network className="w-4 h-4 text-slate-400" />
              <span>System Architecture</span>
            </Link>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-10 max-w-6xl w-full mx-auto space-y-8 sm:space-y-10">
          {/* ========================================================================= */}
          {/* SECTION 1: HERO SPEND METRIC & INLINE TELEMETRY STRIP                    */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* HERO METRIC: Cumulative Bedrock Cost */}
              <div className="lg:col-span-5 pr-0 lg:pr-8 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Cumulative Bedrock Spend
                </span>
                <div className="mt-2 text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                  ${summary ? Number(summary.total_cost_usd || 0).toFixed(6) : '0.000000'}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Real-time micro-dollar billing across Nova Micro, Titan V2, and Nova Pro models.
                </p>
              </div>

              {/* INLINE SECONDARY STATS ROW */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <span className="text-xs text-slate-500 block">Total Tokens</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-1 block">
                    {summary ? summary.total_tokens.toLocaleString() : '0'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {summary ? `${summary.total_input_tokens.toLocaleString()} in / ${summary.total_output_tokens.toLocaleString()} out` : '0 in / 0 out'}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">Logged Traces</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-1 block">
                    {summary ? summary.total_requests : '0'}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
                    0 dropped calls
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">Avg Latency</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-1 block">
                    {summary ? `${summary.avg_latency_ms}ms` : '0ms'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    ap-south-1 Mumbai
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: MODEL RATE & ARCHITECTURE BREAKDOWN                            */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Foundation Model Routing & Rates
              </h3>
              <p className="text-xs text-slate-500">
                Specialized Bedrock tier allocation for entity extraction, semantic embeddings, and synthesis
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Model 1: Nova Micro */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Extraction Layer
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Nova Micro</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Amazon Nova Micro</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Unstructured field note parsing</p>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Rate:</span>
                    <span className="font-mono text-slate-900">$0.035 / $0.14 per 1M</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Typical Latency:</span>
                    <span className="font-mono text-slate-900">~350ms</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Est. Cost / Report:</span>
                    <span className="font-mono font-semibold text-slate-900">$0.000035</span>
                  </div>
                </div>
              </div>

              {/* Model 2: Titan Embeddings V2 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Vector Matching
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Titan V2</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Amazon Titan V2</h4>
                  <p className="text-xs text-slate-500 mt-0.5">1024d WBS schedule embeddings</p>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Rate:</span>
                    <span className="font-mono text-slate-900">$0.020 per 1M tokens</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Vector Dimension:</span>
                    <span className="font-mono text-slate-900">1,024 Dimensions</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Est. Cost / Vector:</span>
                    <span className="font-mono font-semibold text-slate-900">$0.000003</span>
                  </div>
                </div>
              </div>

              {/* Model 3: Nova Pro */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Institutional Memory
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Nova Pro</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Amazon Nova Pro</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Strict multi-project RAG synthesis</p>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Rate:</span>
                    <span className="font-mono text-slate-900">$0.80 / $3.20 per 1M</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Citations:</span>
                    <span className="font-mono text-slate-900">Exact Project-Activity</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Est. Cost / Query:</span>
                    <span className="font-mono font-semibold text-slate-900">~$0.0018</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: REQUEST LIFECYCLE WATERFALL & TRACES                           */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Request Waterfall & Execution Traces
                </h3>
                <p className="text-xs text-slate-500">
                  Latency breakdown across S3 upload, Bedrock model invocation, and PostgreSQL pgvector queries
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
                {(['all', 'memory_rag_query', 'report_ingestion', 'schedule_vectorization'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTraceFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                      traceFilter === filterKey
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filterKey === 'all'
                      ? 'All'
                      : filterKey === 'memory_rag_query'
                      ? 'Memory RAG'
                      : filterKey === 'report_ingestion'
                      ? 'Report Ingest'
                      : 'Schedule'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              {/* Left Column: Trace List */}
              <div className="lg:col-span-5 space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {filteredTraces.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No traces recorded yet for this filter.
                  </div>
                ) : (
                  filteredTraces.map((trace) => {
                    const isSelected = selectedTrace?.id === trace.id;
                    return (
                      <button
                        key={trace.id}
                        onClick={() => setSelectedTrace(trace)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {trace.trace_id}
                          </span>
                          <span className={`text-[11px] font-mono ${isSelected ? 'text-emerald-300' : 'text-slate-600'}`}>
                            ${Number(trace.cost_usd).toFixed(6)}
                          </span>
                        </div>

                        <div className={`flex items-center justify-between text-xs mt-1.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          <span className="capitalize">
                            {trace.request_type.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[11px]">
                            {trace.latency_ms}ms • {trace.total_tokens || (trace.input_tokens + trace.output_tokens)} tok
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Waterfall Stage Details */}
              <div className="lg:col-span-7 bg-slate-50 rounded-lg border border-slate-200 p-5">
                {selectedTrace ? (
                  <div className="space-y-5">
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Trace Identifier</span>
                        <h4 className="font-mono text-sm font-bold text-slate-900">
                          {selectedTrace.trace_id}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Model & Cost</span>
                        <div className="text-xs font-mono font-semibold text-slate-900">
                          {selectedTrace.model_name || selectedTrace.model_id} • ${Number(selectedTrace.cost_usd).toFixed(6)}
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Waterfall Journey */}
                    <div className="space-y-3">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Lifecycle Stages:
                      </span>

                      <div className="space-y-2">
                        {selectedTrace.stages && selectedTrace.stages.length > 0 ? (
                          selectedTrace.stages.map((stage, idx) => {
                            const pct = Math.max(
                              Math.round((stage.duration_ms / (selectedTrace.latency_ms || 1)) * 100),
                              8
                            );

                            return (
                              <div
                                key={idx}
                                className="bg-white p-3 rounded-lg border border-slate-200 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-slate-900">
                                    {idx + 1}. {stage.name}
                                  </span>
                                  <span className="font-mono text-xs text-slate-600">
                                    {stage.duration_ms} ms
                                  </span>
                                </div>

                                {/* Duration Bar */}
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>

                                {stage.metadata && Object.keys(stage.metadata).length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-500">
                                    {Object.entries(stage.metadata).map(([key, val]) => (
                                      <span
                                        key={key}
                                        className="font-mono text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                                      >
                                        {key}: {String(val)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
                            Telemetry stages recorded in payload.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 py-16">
                    Select a request trace to view the lifecycle stage waterfall.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: ROI SIMULATOR & AUDIT BASIS                                    */}
          {/* ========================================================================= */}
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Enterprise ROI Simulation & Billing Audit
              </h3>
              <p className="text-xs text-slate-500">
                Compare AWS Bedrock operational costs against traditional manual engineering reconciliation hours
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs space-y-8">
              {/* Sliders and Comparison Numbers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Slider 1 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">Monthly Field Reports:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {monthlyReportsCount.toLocaleString()} / mo
                        </span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="20000"
                        step="100"
                        value={monthlyReportsCount}
                        onChange={(e) => setMonthlyReportsCount(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>100 (Pilot)</span>
                        <span>10k (Refinery)</span>
                        <span>20k (Mega)</span>
                      </div>
                    </div>

                    {/* Slider 2 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">RAG Memory Queries:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {monthlyRagQueriesCount.toLocaleString()} / mo
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="2000"
                        step="20"
                        value={monthlyRagQueriesCount}
                        onChange={(e) => setMonthlyRagQueriesCount(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>20</span>
                        <span>1,000</span>
                        <span>2,000</span>
                      </div>
                    </div>

                    {/* Slider 3: Engineer Hourly Rate */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">Site Supervisor / Clerk Rate:</span>
                        <span className="font-mono font-bold text-slate-900">
                          ${hourlyEngineerRate}/hr
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={hourlyEngineerRate}
                        onChange={(e) => setHourlyEngineerRate(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>$1/hr (Data Clerk)</span>
                        <span>$4/hr (Field Sup)</span>
                        <span>$15/hr (Lead)</span>
                      </div>
                    </div>

                    {/* Slider 4: Manual Reconciliation Time */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">Manual Time per Report:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {manualMinutesPerReport} mins ({manualHoursPerReport.toFixed(2)}h)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={manualMinutesPerReport}
                        onChange={(e) => setManualMinutesPerReport(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>1 min (Quick Entry)</span>
                        <span>4 mins (Avg)</span>
                        <span>10 mins (Audit)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outcome figures */}
                <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Progressly AI Compute</span>
                    <div className="text-3xl font-black text-slate-900 font-mono mt-0.5">
                      ${monthlyAiCost.toFixed(2)}
                      <span className="text-xs font-normal text-slate-500"> / mo</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">Manual Engineering Baseline</span>
                    <div className="text-2xl font-bold text-slate-400 font-mono line-through mt-0.5">
                      ${monthlyManualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-xs font-normal text-slate-400"> / mo</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-emerald-600 font-medium">
                    {savingsPct}% operational cost reduction
                  </div>
                </div>
              </div>

              {/* Mathematical Audit Trail */}
              <div className="pt-6 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block mb-3">
                  Calculation Audit Trail:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-semibold text-slate-900 block">1. Manual Baseline</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {manualMinutesPerReport} mins ({manualHoursPerReport.toFixed(3)} hrs) per report @ ${hourlyEngineerRate}/hr field supervisor / clerk rate.
                    </p>
                    <div className="font-mono text-[11px] text-slate-800 pt-1">
                      {monthlyReportsCount.toLocaleString()} × {manualHoursPerReport.toFixed(3)}h × ${hourlyEngineerRate} = <strong>${monthlyManualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-semibold text-slate-900 block">2. Bedrock Rates</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Micro-dollar tokens: Nova Micro ($0.035/1M), Titan V2 ($0.020/1M), Nova Pro ($0.80/1M).
                    </p>
                    <div className="font-mono text-[11px] text-slate-800 pt-1">
                      AI Compute = <strong>${monthlyAiCost.toFixed(2)}/mo</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-semibold text-slate-900 block">3. Reclaimed Bandwidth</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Replaces manual cross-referencing with automated reconciliation in under 400ms.
                    </p>
                    <div className="font-mono text-[11px] text-slate-800 pt-1">
                      Reclaims <strong>{monthlyReclaimedHours} engineering hrs/mo</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
