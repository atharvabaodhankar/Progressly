'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  Inbox,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  Building2,
  Sparkles,
  LayoutDashboard,
  Calendar,
  History,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity as ActivityIcon,
  Search,
} from 'lucide-react';

const API_BASE = '/api-proxy';

interface ActivityItem {
  id: string;
  wbs_node_id: string;
  activity_code: string;
  description: string;
  discipline: string;
  line: string | null;
  location: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  progress_pct: number | null;
  has_embedding: boolean;
  wbs_level?: string;
  wbs_name?: string;
}

interface MatchItem {
  id: string;
  event_id: string;
  activity_id: string;
  confidence_score: string | number;
  status: 'pending' | 'auto_approved' | 'planner_approved' | 'rejected' | 'manual_resolution';
  model_version: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  activity_code: string;
  activity_description: string;
  activity_discipline: string;
  activity_line: string | null;
  activity_location: string | null;
  event_description: string;
  event_discipline: string;
  event_line: string | null;
  event_location: string | null;
  event_type: 'start' | 'end' | 'progress';
  quantity: number | null;
  report_id: string;
  report_file_path?: string;
  report_file_type?: string;
  report_uploaded_by?: string;
}

interface AuditLogEntry {
  id: string;
  match_id: string;
  action: string;
  source_report_id: string;
  confidence_score: string | number;
  model_version: string;
  approver: string;
  previous_value: Record<string, unknown> | string;
  new_value: Record<string, unknown> | string;
  timestamp: string;
  report_uploaded_by?: string;
  report_file_type?: string;
  activity_code?: string;
  activity_description?: string;
  activity_discipline?: string;
  event_description?: string;
  event_discipline?: string;
  event_line?: string | null;
  event_location?: string | null;
  event_type?: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function BridgeIQApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'upload' | 'memory'>('dashboard');

  // Screen 1: Upload State
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('text');
  const [uploadedBy, setUploadedBy] = useState('Site Supervisor - Tank Farm');
  const [reportText, setReportText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<{
    id: string;
    file_type: string;
    uploaded_by: string;
    created_at: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Screen 2: Review Queue State
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'manual_resolution' | 'all'>('pending');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Screen 3: Dashboard State
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Screen 4: Project Memory (Institutional RAG) State
  const [memoryQuery, setMemoryQuery] = useState('What caused piping delays in past projects?');
  const [isQueryingMemory, setIsQueryingMemory] = useState(false);
  const [memoryResult, setMemoryResult] = useState<{
    query: string;
    answer: string;
    sources: string[];
    computed_stats: {
      totalRetrieved: number;
      delayedCount: number;
      averageDelayDays: number;
      causeBreakdown: Record<string, number>;
      maxDelayDays: number;
    };
    model_used: string;
    retrieved_records: any[];
  } | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [historicalRecords, setHistoricalRecords] = useState<any[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [showAllHistorical, setShowAllHistorical] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch Matches
  const fetchMatches = useCallback(async () => {
    setIsLoadingMatches(true);
    try {
      const url =
        statusFilter === 'all'
          ? `${API_BASE}/matches`
          : `${API_BASE}/matches?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load matches');
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching matches';
      console.error(msg);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [statusFilter]);

  // Fetch Dashboard Data (Activities & Audit Logs)
  const fetchDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const [actRes, audRes, allMatchesRes] = await Promise.all([
        fetch(`${API_BASE}/activities`),
        fetch(`${API_BASE}/audit-log`),
        fetch(`${API_BASE}/matches`),
      ]);

      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }

      if (audRes.ok) {
        const audData = await audRes.json();
        setAuditLogs(audData.audit_logs || []);
      }

      if (allMatchesRes.ok) {
        const allMatchesData = await allMatchesRes.json();
        if (statusFilter === 'all') {
          setMatches(allMatchesData.matches || []);
        }
      }
    } catch (err: unknown) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMatches();
    fetchDashboardData();
  }, [fetchMatches, fetchDashboardData]);

  // Counts & Summary KPIs
  const totalActivities = activities.length;
  const pendingMatchesCount = matches.filter((m) => m.status === 'pending').length;
  const manualResolutionCount = matches.filter((m) => m.status === 'manual_resolution').length;
  const autoApprovedCount = matches.filter((m) => m.status === 'auto_approved').length;
  const totalMatchesCount = matches.length;

  const autoApprovedPct =
    totalMatchesCount > 0 ? Math.round((autoApprovedCount / totalMatchesCount) * 100) : 0;
  const pendingReviewPct =
    totalMatchesCount > 0 ? Math.round((pendingMatchesCount / totalMatchesCount) * 100) : 0;

  // Handle Report Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      let res: Response;

      if (uploadMode === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload.');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('uploaded_by', uploadedBy);
        res = await fetch(`${API_BASE}/reports`, {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!reportText.trim()) {
          throw new Error('Please enter daily report text.');
        }
        res = await fetch(`${API_BASE}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text_content: reportText,
            uploaded_by: uploadedBy,
            file_type: 'free-text',
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      setUploadSuccess(data.report);
      showToast('Report received successfully. Ingested for schedule processing.', 'success');
      setReportText('');
      setSelectedFile(null);
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Project Memory RAG Queries
  const handleMemoryQuery = async (queryText?: string) => {
    const q = queryText !== undefined ? queryText : memoryQuery;
    if (!q || !q.trim()) return;
    setIsQueryingMemory(true);
    setMemoryError(null);
    try {
      const res = await fetch(`${API_BASE}/memory/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), topK: 6 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to query institutional memory');
      }
      setMemoryResult(data);
      showToast('Institutional memory synthesized successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error querying memory';
      setMemoryError(msg);
      showToast(msg, 'error');
    } finally {
      setIsQueryingMemory(false);
    }
  };

  const fetchHistoricalRecords = async () => {
    setIsLoadingHistorical(true);
    try {
      const res = await fetch(`${API_BASE}/memory/records`);
      const data = await res.json();
      if (res.ok && data.records) {
        setHistoricalRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch historical records:', err);
    } finally {
      setIsLoadingHistorical(false);
    }
  };

  // Handle Match Approval / Rejection
  const handleMatchAction = async (
    matchId: string,
    action: 'planner_approved' | 'rejected',
    activityCode: string
  ) => {
    setActionInProgress(matchId);
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          resolved_by: 'Planner User (Lead Engineer)',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} match`);
      }

      // Optimistic update: Remove from pending list
      setMatches((prev) => prev.filter((m) => m.id !== matchId));

      const actionText = action === 'planner_approved' ? 'approved & schedule updated' : 'rejected';
      showToast(`Match for ${activityCode} was ${actionText}.`, 'success');

      // Refresh dashboard to show linked dates and audit log
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update match';
      showToast(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Helper for Confidence Badges
  const getConfidenceBadge = (score: string | number) => {
    const num = typeof score === 'string' ? parseFloat(score) : score;
    const pct = Math.round(num > 1 ? num : num * 100);

    if (pct >= 95) {
      return {
        label: `${pct}%`,
        tier: 'Auto-Approved Tier (≥95%)',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    }
    if (pct >= 70) {
      return {
        label: `${pct}%`,
        tier: 'Planner Review Tier (70–94%)',
        bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    return {
      label: `${pct}%`,
      tier: 'Manual Resolution (<70%)',
      bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      dot: 'bg-rose-400',
    };
  };

  // Helper for Schedule Variance / Deviation
  const getScheduleDeviation = (act: ActivityItem) => {
    if (!act.actual_start) {
      return { status: 'not_started', label: 'Not Started', badge: 'bg-slate-800 text-slate-400 border-slate-700' };
    }

    if (act.progress_pct === 100) {
      if (act.planned_start && act.actual_start) {
        const planned = new Date(act.planned_start).getTime();
        const actual = new Date(act.actual_start).getTime();
        const diffDays = Math.round((actual - planned) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          return {
            status: 'completed_delayed',
            label: `Completed (+${diffDays}d delay)`,
            badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          };
        }
      }
      return { status: 'completed_ontime', label: 'Completed (On Time)', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    }

    if (act.planned_start) {
      const planned = new Date(act.planned_start).getTime();
      const actual = new Date(act.actual_start).getTime();
      const diffDays = Math.round((actual - planned) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        return {
          status: 'delayed_start',
          label: `Delayed Start (+${diffDays}d)`,
          badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        };
      }
    }

    return { status: 'in_progress', label: `In Progress (${act.progress_pct || 0}%)`, badge: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
  };

  // Filtered Activities
  const filteredActivities = activities.filter((act) => {
    const matchesDiscipline =
      disciplineFilter === 'all' ||
      act.discipline.toLowerCase() === disciplineFilter.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      act.activity_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.location && act.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDiscipline && matchesSearch;
  });

  const uniqueDisciplines = Array.from(new Set(activities.map((a) => a.discipline)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-center gap-3 transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/95 border-sky-500/50 text-sky-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-sky-400 shrink-0" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <Layers className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-white">BridgeIQ</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Oil India Ltd
                </span>
              </div>
              <p className="text-xs text-slate-400">Schedule-Linking & Verification Layer</p>
            </div>
          </div>

          {/* Navigation Tabs (3 Screens) */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Project Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${
                activeTab === 'review'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Queue</span>
              {pendingMatchesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-xs font-semibold bg-amber-400 text-slate-950 rounded-full">
                  {pendingMatchesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Report</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('memory');
                if (historicalRecords.length === 0) fetchHistoricalRecords();
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'memory'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Project Memory</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ========================================================================= */}
        {/* SCREEN 3: PROJECT DASHBOARD                                               */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Header with Project Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                  <span>Project Schedule Dashboard</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Live Schedule Sync
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Oil India Ltd - Duliajan Infrastructure • Real-time progress tracking and automated schedule updates
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchDashboardData}
                  disabled={isLoadingDashboard}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDashboard ? 'animate-spin' : ''}`} />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>

            {/* Section C: Summary Stats KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Activities */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Schedule Activities
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">{totalActivities}</span>
                  <span className="text-xs text-slate-400 font-medium">L6 Activities</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Across 6 engineering disciplines</p>
              </div>

              {/* Card 2: Auto-Approved % */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Auto-Approved (Tier 1)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{autoApprovedPct}%</span>
                  <span className="text-xs text-slate-400 font-medium">({autoApprovedCount} events)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Directly updated schedule ($\ge 95\%$ confidence)</p>
              </div>

              {/* Card 3: Requires Review % */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Planner Review (Tier 2)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{pendingReviewPct}%</span>
                  <span className="text-xs text-slate-400 font-medium">({pendingMatchesCount} pending)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Awaiting human planner verification (70–94%)</p>
              </div>

              {/* Card 4: Manual Resolution */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    Manual Resolution (Tier 3)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-rose-400 tracking-tight">{manualResolutionCount}</span>
                  <span className="text-xs text-slate-400 font-medium">unmatched items</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Unplanned site works flagged for review</p>
              </div>
            </div>

            {/* Section A: Planned vs Actual Schedule Intelligence */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <span>Planned vs Actual Schedule Timeline</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Baseline milestone tracking linked directly to verified supervisor reports
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search activity or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setDisciplineFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        disciplineFilter === 'all'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All
                    </button>
                    {uniqueDisciplines.map((disc) => (
                      <button
                        key={disc}
                        onClick={() => setDisciplineFilter(disc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                          disciplineFilter === disc
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {disc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activities Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Activity Code</th>
                      <th className="py-3 px-4">Description & Scope</th>
                      <th className="py-3 px-4">Discipline / Line</th>
                      <th className="py-3 px-4">Planned Dates</th>
                      <th className="py-3 px-4">Actual Dates</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4 text-right">Variance / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredActivities.map((act) => {
                      const dev = getScheduleDeviation(act);

                      return (
                        <tr key={act.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {act.activity_code}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-200 max-w-xs truncate">
                            {act.description}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="capitalize px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                {act.discipline}
                              </span>
                              {act.line && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-mono">
                                  L-{act.line}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {act.planned_start ? act.planned_start.slice(0, 10) : '—'} →{' '}
                            {act.planned_end ? act.planned_end.slice(0, 10) : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {act.actual_start ? (
                              <span className="text-white">
                                {act.actual_start.slice(0, 10)}
                                {act.actual_end && ` → ${act.actual_end.slice(0, 10)}`}
                              </span>
                            ) : (
                              <span className="text-slate-600">Pending link</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 min-w-[120px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>{act.progress_pct || 0}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    act.progress_pct === 100
                                      ? 'bg-emerald-500'
                                      : act.progress_pct && act.progress_pct > 0
                                      ? 'bg-sky-400'
                                      : 'bg-transparent'
                                  }`}
                                  style={{ width: `${act.progress_pct || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${dev.badge}`}>
                              {dev.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B: Audit Trail & Lineage ("Why Did This Update Happen?") */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    <span>Audit Trail & Schedule Update Lineage</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable audit log of all automated and planner-approved schedule updates
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                  {auditLogs.length} Verified Entries
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800/60">
                  <History className="w-6 h-6 mx-auto text-slate-600" />
                  <p className="text-xs">No audit records logged yet. Approve a match in the Review Queue to generate an entry.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const isExpanded = expandedAuditId === log.id;
                    const conf = getConfidenceBadge(log.confidence_score);

                    return (
                      <div
                        key={log.id}
                        className="bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition"
                      >
                        {/* Summary Header */}
                        <div
                          onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                          className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                              <Check className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-400 text-xs">
                                  {log.activity_code || 'Activity Update'}
                                </span>
                                <span className="text-slate-300 font-medium text-xs">
                                  {log.activity_description || 'Schedule Link'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Approver: <span className="text-slate-300">{log.approver}</span> • Model: {log.model_version}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${conf.bg}`}>
                              {conf.label}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expandable Explanation Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Source Extraction */}
                              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  Source Field Extraction
                                </span>
                                <p className="font-medium text-slate-200">
                                  {log.event_description || 'Extracted construction activity'}
                                </p>
                                <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                                  {log.event_discipline && <span>Discipline: {log.event_discipline}</span>}
                                  {log.event_line && <span>• Line: {log.event_line}</span>}
                                  {log.event_location && <span>• Loc: {log.event_location}</span>}
                                </div>
                              </div>

                              {/* State Transition Diff */}
                              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  State Transition
                                </span>
                                <div className="text-slate-400">
                                  <span className="text-rose-400">- Previous:</span>{' '}
                                  {typeof log.previous_value === 'string'
                                    ? log.previous_value
                                    : JSON.stringify(log.previous_value)}
                                </div>
                                <div className="text-emerald-400">
                                  <span className="text-emerald-400">+ New:</span>{' '}
                                  {typeof log.new_value === 'string'
                                    ? log.new_value
                                    : JSON.stringify(log.new_value)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: REVIEW QUEUE                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                  <span>Planner Review Queue</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-normal">
                    AI Schedule Matcher
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Verify or reject schedule activity updates flagged by confidence gating policy.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Review</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px]">
                    {matches.filter((m) => m.status === 'pending').length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('manual_resolution')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                    statusFilter === 'manual_resolution'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Manual Resolution</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-400/20 text-rose-300 text-[10px]">
                    {matches.filter((m) => m.status === 'manual_resolution').length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>All ({matches.length})</span>
                </button>

                <button
                  onClick={fetchMatches}
                  disabled={isLoadingMatches}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMatches ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Matches List */}
            {isLoadingMatches ? (
              <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/30 rounded-2xl border border-slate-800/60">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                <p className="text-sm font-medium">Loading match items...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-4 bg-slate-900/30 rounded-2xl border border-slate-800/60">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">No items in this queue</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    All matches matching filter &quot;{statusFilter}&quot; have been resolved.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload a Field Report</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((item) => {
                  const conf = getConfidenceBadge(item.confidence_score);
                  const isProcessing = actionInProgress === item.id;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition shadow-lg space-y-4"
                    >
                      {/* Card Header: Confidence & Status Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${conf.bg}`}>
                            <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                            <span>Confidence: {conf.label}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">{conf.tier}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">
                            Match ID: {item.id.slice(0, 8)}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                              item.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : item.status === 'auto_approved' || item.status === 'planner_approved'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : item.status === 'manual_resolution'
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Card Body: Side-by-Side Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Left: Extracted Field Event */}
                        <div className="md:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold uppercase tracking-wider text-slate-300">
                              Extracted Field Event
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px] uppercase">
                              {item.event_type}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-white leading-snug">
                            {item.event_description}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                              Discipline: {item.event_discipline}
                            </span>
                            {item.event_line && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-300 font-mono">
                                Line: {item.event_line}
                              </span>
                            )}
                            {item.event_location && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-300">
                                Loc: {item.event_location}
                              </span>
                            )}
                            {item.quantity && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-teal-300">
                                Qty: {item.quantity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Arrow */}
                        <div className="md:col-span-2 flex flex-col items-center justify-center gap-1 text-slate-500 py-1">
                          <ArrowRight className="w-5 h-5 text-emerald-400/80 hidden md:block" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                            Candidate
                          </span>
                        </div>

                        {/* Right: Matched Baseline Schedule Activity */}
                        <div className="md:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold uppercase tracking-wider text-slate-300">
                              Schedule Baseline Activity
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                              {item.activity_code}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-white leading-snug">
                            {item.activity_description}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                              Discipline: {item.activity_discipline}
                            </span>
                            {item.activity_line && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-300 font-mono">
                                Line: {item.activity_line}
                              </span>
                            )}
                            {item.activity_location && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-300">
                                Loc: {item.activity_location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Metadata & Approval Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/50">
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>Report: {item.report_file_type || 'free-text'}</span>
                          {item.report_uploaded_by && <span>• Uploaded by: {item.report_uploaded_by}</span>}
                          <span>• Model: {item.model_version}</span>
                        </div>

                        {/* Action Buttons (Enabled for Pending Items) */}
                        {item.status === 'pending' && (
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() =>
                                handleMatchAction(item.id, 'rejected', item.activity_code)
                              }
                              disabled={isProcessing}
                              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject Match</span>
                            </button>

                            <button
                              onClick={() =>
                                handleMatchAction(item.id, 'planner_approved', item.activity_code)
                              }
                              disabled={isProcessing}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-emerald-950/40 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve & Link Schedule</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: UPLOAD                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Ingest Field Report</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Submit site supervisor updates, spreadsheets, or contractor logs for automated schedule linking.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Project: Duliajan Infrastructure</span>
              </div>
            </div>

            {uploadSuccess && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-300">Report received successfully</h3>
                    <p className="text-xs text-emerald-400/80">
                      Report ID: {uploadSuccess.id} • Type: {uploadSuccess.file_type} • Uploaded by: {uploadSuccess.uploaded_by}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setUploadSuccess(null);
                      setActiveTab('review');
                      fetchMatches();
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition"
                  >
                    <span>Go to Review Queue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setUploadSuccess(null)}
                    className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
                  >
                    Submit Another Report
                  </button>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Uploader Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Uploaded By (Role / Department)
                </label>
                <input
                  type="text"
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="e.g. Site Supervisor - Tank Farm"
                  required
                />
              </div>

              {/* Mode Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Submission Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadMode('text')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition ${
                      uploadMode === 'text'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Free-Text Update</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition ${
                      uploadMode === 'file'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>File Attachment (CSV, PDF, Excel)</span>
                  </button>
                </div>
              </div>

              {/* Free-Text Input */}
              {uploadMode === 'text' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-400">
                      Report Narrative / Supervisor Site Log
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReportText(
                            'Team completed erection of three spools on line 24 near the tank farm today. Alignment checked, ready for welding tomorrow. No issues reported. Weather clear, full crew of 6 present.'
                          )
                        }
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Sample: Spools
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReportText(
                            'Hydrotest prep started on the 24-inch line at tank farm. Pressure gauges installed, isolation valves confirmed closed.'
                          )
                        }
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Sample: Hydrotest
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Type or paste the field report narrative here (e.g. 'Completed erection of 3 spools on Line 24 in Tank Farm today...')"
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition leading-relaxed resize-y"
                    required={uploadMode === 'text'}
                  />
                </div>
              ) : (
                /* File Upload Dropzone */
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-400">Attach Document</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-emerald-500/60 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/80 group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv,.txt,.pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition text-slate-400 group-hover:text-emerald-400">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-300">
                          Click to select a file or drag & drop here
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports CSV, PDF daily sheets, Excel spreadsheets, plain text, or site photos
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Report...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Submit Report for Schedule Linking</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: PROJECT MEMORY (INSTITUTIONAL RAG)                              */}
        {/* ========================================================================= */}
        {activeTab === 'memory' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-emerald-400" />
                      <span>Project Memory & Historical RAG</span>
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium">
                      Titan V2 + Nova Pro
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Query institutional memory across 40 past capital energy projects to prevent recurring schedule delays.
                  </p>
                </div>
                <button
                  onClick={() => setShowAllHistorical(!showAllHistorical)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>{showAllHistorical ? 'Hide Seeded Dataset' : 'Browse All 40 Seeded Records'}</span>
                </button>
              </div>

              {/* Search Form */}
              <div className="mt-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memoryQuery}
                      onChange={(e) => setMemoryQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMemoryQuery()}
                      placeholder="Ask any question about past project delays, piping risks, material shortages..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                  <button
                    onClick={() => handleMemoryQuery()}
                    disabled={isQueryingMemory || !memoryQuery.trim()}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition shrink-0"
                  >
                    {isQueryingMemory ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Query Memory</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Preset Prompt Suggestions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs text-slate-500 font-medium">Try asking:</span>
                  {[
                    'What caused piping delays in past projects?',
                    'What are the common risks in civil foundation works?',
                    'How long did substation cable tray installation take?',
                    'Show safety and HSE incident patterns.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMemoryQuery(preset);
                        handleMemoryQuery(preset);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {memoryError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <p>{memoryError}</p>
              </div>
            )}

            {/* Synthesized Answer Result */}
            {memoryResult && (
              <div className="space-y-6">
                {/* Quantitative Stats Bar */}
                {memoryResult.computed_stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Records Analyzed</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {memoryResult.computed_stats.totalRetrieved}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Delayed Activities</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1">
                        {memoryResult.computed_stats.delayedCount}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Avg Delay Days</p>
                      <p className="text-2xl font-bold text-rose-400 mt-1">
                        +{memoryResult.computed_stats.averageDelayDays}d
                      </p>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 uppercase font-semibold">Synthesis Model</p>
                      <p className="text-xs font-mono font-semibold text-purple-300 mt-2 truncate" title={memoryResult.model_used}>
                        {memoryResult.model_used.replace('apac.amazon.', '').replace(':0', '')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Synthesized Narrative */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-lg text-white">Synthesized Institutional Memory</h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Grounded via pgvector
                    </span>
                  </div>

                  <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {memoryResult.answer}
                  </div>
                </div>

                {/* Retrieved Source Records */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Verified Retrieved Grounding Sources ({memoryResult.retrieved_records?.length || 0})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memoryResult.retrieved_records?.map((record, idx) => (
                      <div
                        key={record.id || idx}
                        className="bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl space-y-2 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                              {record.discipline}
                            </span>
                            <h4 className="font-semibold text-sm text-slate-100 mt-1">
                              {record.project_name}
                            </h4>
                          </div>
                          {record.similarity_score && (
                            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {(record.similarity_score * 100).toFixed(1)}% match
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 font-medium">
                          {record.activity_description}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>Planned: {record.planned_duration_days}d</span>
                          <span>Actual: {record.actual_duration_days}d</span>
                          <span className={record.delay_days > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
                            {record.delay_days > 0 ? `+${record.delay_days}d delay` : 'On Schedule'}
                          </span>
                        </div>

                        {record.notes && (
                          <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/40">
                            &quot;{record.notes}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Seeded Dataset Explorer (40 records) */}
            {showAllHistorical && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">Historical Knowledge Base (40 Records)</h3>
                    <p className="text-xs text-slate-400">All records embedded with 1024-dimensional Titan V2 vectors</p>
                  </div>
                  {isLoadingHistorical && <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />}
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Project</th>
                        <th className="p-3">Discipline</th>
                        <th className="p-3">Activity</th>
                        <th className="p-3">Delay</th>
                        <th className="p-3">Primary Cause</th>
                        <th className="p-3">Embedding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {historicalRecords.map((hr, idx) => (
                        <tr key={hr.id || idx} className="hover:bg-slate-800/30">
                          <td className="p-3 font-medium text-slate-200">{hr.project_name}</td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono text-[10px]">
                              {hr.discipline}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs truncate" title={hr.activity_description}>
                            {hr.activity_description}
                          </td>
                          <td className="p-3">
                            {hr.delay_days > 0 ? (
                              <span className="text-amber-400 font-semibold">+{hr.delay_days}d</span>
                            ) : (
                              <span className="text-emerald-400">0d</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">{hr.delay_cause || 'None'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                              1024d ✓
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
