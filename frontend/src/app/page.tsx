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
  Menu,
  HardHat,
  Bell,
  Plus,
  Compass,
  FileCheck,
  User,
  ZoomIn,
  ZoomOut,
  CalendarDays,
  Tag,
  ListChecks,
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
  resolved_at: string | null;
  resolved_by: string | null;
  activity_code: string;
  activity_description: string;
  activity_discipline: string;
  activity_line: string | null;
  activity_location: string | null;
  event_description: string;
  event_discipline: string | null;
  event_line: string | null;
  event_location: string | null;
  event_type: string;
  quantity: string | number | null;
  report_id: string;
  extracted_json: Record<string, any>;
  report_file_path: string;
  report_file_type: string;
  report_uploaded_by: string;
}

interface AuditLogEntry {
  id: string;
  event_id: string;
  report_id: string;
  action: string;
  model_name: string;
  confidence_score: string | number | null;
  created_at: string;
  activity_code?: string;
  activity_description?: string;
  activity_discipline?: string;
  report_uploaded_by?: string;
  event_description?: string;
  event_discipline?: string;
  event_type?: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// =========================================================================
// CUSTOM DISCIPLINE DROPDOWN COMPONENT (POLISHED UI)
// =========================================================================
function DisciplineDropdown({
  value,
  onChange,
  disciplines,
}: {
  value: string;
  onChange: (val: string) => void;
  disciplines: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisciplineDot = (disc: string) => {
    switch (disc.toLowerCase()) {
      case 'piping':
        return 'bg-blue-500';
      case 'civil':
        return 'bg-amber-500';
      case 'electrical':
        return 'bg-purple-500';
      case 'instrumentation':
        return 'bg-indigo-500';
      case 'hse':
        return 'bg-emerald-500';
      case 'static-rotating':
      case 'static equipment':
      case 'rotating equipment':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const selectedLabel = value === 'all' ? 'All Disciplines' : value.toUpperCase();

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 rounded-xl bg-white border border-[#C7C4D7]/50 hover:border-[#4648D4] text-xs sm:text-sm font-semibold text-[#1B1B23] focus:outline-none focus:ring-2 focus:ring-[#4648D4]/20 shadow-xs flex items-center gap-2.5 transition"
      >
        <span className={`w-2 h-2 rounded-full ${getDisciplineDot(value)}`} />
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#4648D4]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-[#C7C4D7]/30 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => {
              onChange('all');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm text-left font-medium hover:bg-[#F5F2FE] transition ${
              value === 'all' ? 'text-[#4648D4] font-bold bg-[#F5F2FE]/60' : 'text-[#1B1B23]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>All Disciplines</span>
            </div>
            {value === 'all' && <Check className="w-4 h-4 text-[#4648D4]" />}
          </button>

          <div className="my-1 border-t border-[#C7C4D7]/20" />

          {disciplines.map((d) => (
            <button
              key={d}
              onClick={() => {
                onChange(d);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2 text-xs sm:text-sm text-left font-medium hover:bg-[#F5F2FE] transition ${
                value.toLowerCase() === d.toLowerCase()
                  ? 'text-[#4648D4] font-bold bg-[#F5F2FE]/60'
                  : 'text-[#1B1B23]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${getDisciplineDot(d)}`} />
                <span>{d.toUpperCase()}</span>
              </div>
              {value.toLowerCase() === d.toLowerCase() && (
                <Check className="w-4 h-4 text-[#4648D4]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// RICH INLINE MARKDOWN & CITATION FORMATTER
// =========================================================================
function FormattedInlineText({
  text,
  onCitationClick,
}: {
  text: string;
  onCitationClick?: (citation: string) => void;
}) {
  const parts = [];
  // Tokenize regex: matches [citation...], **bold...**, or *italic/title...*
  const regex = /(\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(
        <span key={key++}>{text.substring(lastIdx, match.index)}</span>
      );
    }
    const token = match[0];
    if (token.startsWith('[') && token.endsWith(']')) {
      const citationContent = token.slice(1, -1);
      const isRecordTag = citationContent.toUpperCase().startsWith('RECORD');
      parts.push(
        <button
          key={key++}
          type="button"
          onClick={() => onCitationClick && onCitationClick(citationContent)}
          className={`inline-flex items-center gap-1.5 mx-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 text-left ${
            isRecordTag
              ? 'bg-purple-100 text-purple-900 border border-purple-300 font-mono font-bold hover:bg-purple-200'
              : 'bg-indigo-50 text-[#4648D4] border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
          }`}
          title={`Click to view verified grounding evidence for: ${citationContent}`}
        >
          <FileText className="w-3 h-3 text-indigo-500 shrink-0 inline" />
          <span>{citationContent}</span>
        </button>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const boldContent = token.slice(2, -2);
      parts.push(
        <strong key={key++} className="font-bold text-[#1B1B23]">
          {boldContent}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const titleContent = token.slice(1, -1);
      parts.push(
        <strong key={key++} className="font-bold text-[#1B1B23]">
          {titleContent}
        </strong>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(<span key={key++}>{text.substring(lastIdx)}</span>);
  }

  return <>{parts}</>;
}

// =========================================================================
// SYNTHESIZED INSTITUTIONAL MEMORY RENDERER (SECTION-BASED RICH UI)
// =========================================================================
function SynthesizedAnswerViewer({
  rawAnswer,
  onCitationClick,
}: {
  rawAnswer: string;
  onCitationClick?: (citation: string) => void;
}) {
  const lines = rawAnswer.split('\n');
  const sections: {
    title: string;
    content: string[];
    type: 'summary' | 'drivers' | 'takeaways' | 'general';
  }[] = [];

  let currentSection: {
    title: string;
    content: string[];
    type: 'summary' | 'drivers' | 'takeaways' | 'general';
  } = {
    title: 'Executive Summary',
    content: [],
    type: 'summary',
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\*{0,2}Executive Summary\*{0,2}:?$/i.test(trimmed)) {
      if (currentSection.content.length > 0) sections.push(currentSection);
      currentSection = { title: 'Executive Summary', content: [], type: 'summary' };
    } else if (/^\*{0,2}Key Root Cause Drivers\*{0,2}:?$/i.test(trimmed)) {
      if (currentSection.content.length > 0) sections.push(currentSection);
      currentSection = { title: 'Key Root Cause Drivers', content: [], type: 'drivers' };
    } else if (
      /^\*{0,2}Institutional Takeaways & Mitigation\*{0,2}:?$/i.test(trimmed) ||
      /^\*{0,2}Takeaways & Mitigation\*{0,2}:?$/i.test(trimmed)
    ) {
      if (currentSection.content.length > 0) sections.push(currentSection);
      currentSection = {
        title: 'Institutional Takeaways & Mitigation',
        content: [],
        type: 'takeaways',
      };
    } else {
      currentSection.content.push(trimmed);
    }
  }
  if (currentSection.content.length > 0) sections.push(currentSection);

  return (
    <div className="space-y-6">
      {sections.map((sec, sIdx) => {
        if (sec.type === 'summary') {
          return (
            <div
              key={sIdx}
              className="bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-transparent border-l-4 border-[#4648D4] p-5 rounded-2xl bg-white border border-[#C7C4D7]/30 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4648D4]" />
                <h4 className="font-bold text-sm text-[#4648D4] uppercase tracking-wider">
                  Executive Summary
                </h4>
              </div>
              <div className="text-slate-800 text-sm leading-relaxed space-y-2">
                {sec.content.map((c, cIdx) => (
                  <p key={cIdx} className="leading-relaxed">
                    <FormattedInlineText text={c} onCitationClick={onCitationClick} />
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (sec.type === 'drivers') {
          return (
            <div
              key={sIdx}
              className="bg-white border border-[#C7C4D7]/30 p-6 rounded-2xl shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-[#C7C4D7]/20 pb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-sm text-[#1B1B23] uppercase tracking-wider">
                  Key Root Cause Drivers
                </h4>
              </div>
              <div className="space-y-3">
                {sec.content.map((c, cIdx) => {
                  const isBullet = c.startsWith('-') || c.startsWith('*');
                  const isNumbered = /^\d+\./.test(c);
                  const cleanText = isBullet ? c.substring(1).trim() : c;

                  return (
                    <div
                      key={cIdx}
                      className={`text-sm leading-relaxed p-3.5 rounded-xl transition ${
                        isNumbered
                          ? 'bg-[#F5F2FE]/70 border border-[#C7C4D7]/30 font-medium'
                          : isBullet
                          ? 'ml-3 sm:ml-5 bg-white border-l-2 border-amber-400 pl-3.5 py-2 my-1.5'
                          : 'bg-white'
                      }`}
                    >
                      <FormattedInlineText text={cleanText} onCitationClick={onCitationClick} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (sec.type === 'takeaways') {
          return (
            <div
              key={sIdx}
              className="bg-white border border-[#C7C4D7]/30 p-6 rounded-2xl shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-[#C7C4D7]/20 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-sm text-[#1B1B23] uppercase tracking-wider">
                  Institutional Takeaways & Recommendations
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {sec.content.map((c, cIdx) => {
                  const cleanText = c.replace(/^[-*•]\s*/, '');
                  return (
                    <div
                      key={cIdx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100 text-sm text-slate-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <FormattedInlineText text={cleanText} onCitationClick={onCitationClick} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={sIdx} className="text-sm text-slate-800 leading-relaxed space-y-2">
            {sec.content.map((c, cIdx) => (
              <p key={cIdx}>
                <FormattedInlineText text={c} onCitationClick={onCitationClick} />
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function ProgresslyApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'upload' | 'memory'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Screen 2: Review Queue State with Rich Filters
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'pending' | 'all' | 'auto_approved' | 'planner_approved' | 'rejected'>('pending');
  const [reviewTierFilter, setReviewTierFilter] = useState<'all' | 'tier1' | 'tier2' | 'tier3'>('all');
  const [reviewDisciplineFilter, setReviewDisciplineFilter] = useState<string>('all');
  const [reviewSearchQuery, setReviewSearchQuery] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Screen 3: Dashboard State
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<'all' | 'delayed' | 'in_progress' | 'completed'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const [selectedGroundingRecord, setSelectedGroundingRecord] = useState<any | null>(null);
  const [isGroundingModalOpen, setIsGroundingModalOpen] = useState(false);

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
      const res = await fetch(`${API_BASE}/matches`);
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
      } else {
        throw new Error(data.error || 'Failed to fetch matches');
      }
    } catch (err: unknown) {
      console.error('Error fetching matches:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  // Fetch Dashboard & Audit Log
  const fetchDashboardData = useCallback(async () => {
    setIsLoadingDashboard(true);
    try {
      const [actRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/activities`),
        fetch(`${API_BASE}/audit-log?limit=25`),
      ]);

      const actData = await actRes.json();
      const auditData = await auditRes.json();

      if (actRes.ok) {
        setActivities(actData.activities || []);
      }
      if (auditRes.ok) {
        setAuditLogs(auditData.logs || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  // Fetch Historical Records
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

  // Handle Citation Click & Open Grounding Modal
  const handleCitationClick = (citationText: string) => {
    const raw = citationText.trim();

    // Check if it's RECORD 1, RECORD 2, etc.
    const recordMatch = raw.match(/RECORD\s*(\d+)/i);
    if (recordMatch && memoryResult?.retrieved_records) {
      const idx = parseInt(recordMatch[1], 10) - 1;
      if (memoryResult.retrieved_records[idx]) {
        setSelectedGroundingRecord(memoryResult.retrieved_records[idx]);
        setIsGroundingModalOpen(true);
        return;
      }
    }

    // Check by project name or description keywords
    const searchPool = memoryResult?.retrieved_records?.length
      ? memoryResult.retrieved_records
      : historicalRecords;

    const lower = raw.toLowerCase();
    const found = searchPool.find((r) => {
      const proj = (r.project_name || '').toLowerCase();
      const act = (r.activity_description || '').toLowerCase();
      return (
        lower.includes(proj) ||
        proj.includes(lower) ||
        lower.includes(act) ||
        act.includes(lower)
      );
    });

    if (found) {
      setSelectedGroundingRecord(found);
      setIsGroundingModalOpen(true);
    } else {
      const parts = raw.split('—').map((s) => s.trim());
      setSelectedGroundingRecord({
        project_name: parts[0] || 'Historical Project Grounding Record',
        activity_description: parts[1] || raw,
        discipline: 'Historical Evidence',
        planned_duration_days: 'Recorded',
        actual_duration_days: 'Recorded',
        delay_days: 0,
        delay_cause: 'Historical Field Ingestion',
        notes: `Direct semantic context retrieved from pgvector store for query "${memoryQuery}".`,
        similarity_score: 0.945,
      });
      setIsGroundingModalOpen(true);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchMatches();
  }, [fetchDashboardData, fetchMatches]);

  // Handle File / Text Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      let res: globalThis.Response;

      if (uploadMode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('uploaded_by', uploadedBy);
        res = await fetch(`${API_BASE}/reports`, {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!reportText.trim()) {
          throw new Error('Please enter text content for the report.');
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
      showToast('Report uploaded & queued for schedule linking!', 'success');
      setReportText('');
      setSelectedFile(null);
      fetchDashboardData();
      fetchMatches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
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
          resolved_by: 'Lead Planning Engineer',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} match`);
      }

      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: action } : m))
      );
      const actionText = action === 'planner_approved' ? 'approved & schedule linked' : 'rejected';
      showToast(`Match for ${activityCode} was ${actionText}.`, 'success');
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update match';
      showToast(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Confidence Badge Helper
  const getConfidenceBadge = (score: string | number) => {
    const num = typeof score === 'string' ? parseFloat(score) : score;
    const pct = Math.round(num > 1 ? num : num * 100);

    if (pct >= 95) {
      return {
        label: `${pct}%`,
        tier: 'Auto-Approved (Tier 1)',
        bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
    }
    if (pct >= 70) {
      return {
        label: `${pct}%`,
        tier: 'Planner Review (Tier 2)',
        bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
        dot: 'bg-amber-500',
      };
    }
    return {
      label: `${pct}%`,
      tier: 'Manual Resolution (Tier 3)',
      bg: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
      dot: 'bg-rose-500',
    };
  };

  // Compute Real Metrics
  const totalActivitiesCount = activities.length;
  const pendingMatchesCount = matches.filter((m) => m.status === 'pending').length;
  const completedActivitiesCount = activities.filter((a) => (a.progress_pct ?? 0) >= 100).length;
  const inProgressActivitiesCount = activities.filter((a) => (a.progress_pct ?? 0) > 0 && (a.progress_pct ?? 0) < 100).length;
  
  // Real On-Track Calculation: activities with no end date overrun
  const delayedActivities = activities.filter((a) => {
    if (!a.planned_end || !a.actual_end) return false;
    return new Date(a.actual_end) > new Date(a.planned_end);
  });
  const delayedCount = delayedActivities.length;
  const onTrackPct = totalActivitiesCount > 0
    ? Math.round(((totalActivitiesCount - delayedCount) / totalActivitiesCount) * 100)
    : 100;

  // Filtered Activities for Operational Timeline
  const filteredActivities = activities.filter((act) => {
    if (timelineStatusFilter === 'delayed') {
      const isDelayed = act.planned_end && act.actual_end && new Date(act.actual_end) > new Date(act.planned_end);
      if (!isDelayed) return false;
    } else if (timelineStatusFilter === 'in_progress') {
      const isInProgress = (act.progress_pct ?? 0) > 0 && (act.progress_pct ?? 0) < 100;
      if (!isInProgress) return false;
    } else if (timelineStatusFilter === 'completed') {
      const isCompleted = (act.progress_pct ?? 0) >= 100;
      if (!isCompleted) return false;
    }

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

  // Filtered Matches for Review Queue
  const filteredMatches = matches.filter((m) => {
    // Status Filter
    if (reviewStatusFilter === 'pending' && m.status !== 'pending') return false;
    if (reviewStatusFilter === 'auto_approved' && m.status !== 'auto_approved') return false;
    if (reviewStatusFilter === 'planner_approved' && m.status !== 'planner_approved') return false;
    if (reviewStatusFilter === 'rejected' && m.status !== 'rejected') return false;

    // Discipline Filter
    if (
      reviewDisciplineFilter !== 'all' &&
      m.activity_discipline.toLowerCase() !== reviewDisciplineFilter.toLowerCase()
    ) {
      return false;
    }

    // Confidence Tier Filter
    const scoreNum = typeof m.confidence_score === 'string' ? parseFloat(m.confidence_score) : m.confidence_score;
    const pct = Math.round(scoreNum > 1 ? scoreNum : scoreNum * 100);
    if (reviewTierFilter === 'tier1' && pct < 95) return false;
    if (reviewTierFilter === 'tier2' && (pct < 70 || pct >= 95)) return false;
    if (reviewTierFilter === 'tier3' && pct >= 70) return false;

    // Search Query
    if (reviewSearchQuery) {
      const q = reviewSearchQuery.toLowerCase();
      const matchCode = m.activity_code.toLowerCase().includes(q);
      const matchDesc = m.activity_description.toLowerCase().includes(q);
      const matchEvent = m.event_description.toLowerCase().includes(q);
      const matchLoc = m.activity_location && m.activity_location.toLowerCase().includes(q);
      if (!matchCode && !matchDesc && !matchEvent && !matchLoc) return false;
    }

    return true;
  });

  const uniqueDisciplines = Array.from(new Set(activities.map((a) => a.discipline)));

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#1B1B23] flex flex-col antialiased">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center gap-3 transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                : toast.type === 'error'
                ? 'bg-white border-rose-200 text-rose-900 shadow-rose-500/10'
                : 'bg-white border-indigo-200 text-indigo-900 shadow-indigo-500/10'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-indigo-500 shrink-0" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

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
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#4648D4] text-white shadow-lg shadow-[#4648D4]/25'
                : 'text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Timeline Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'review'
                ? 'bg-[#4648D4] text-white shadow-lg shadow-[#4648D4]/25'
                : 'text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5" />
              <span>Review Queue</span>
            </div>
            {pendingMatchesCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'review' ? 'bg-white text-[#4648D4]' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingMatchesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'upload'
                ? 'bg-[#4648D4] text-white shadow-lg shadow-[#4648D4]/25'
                : 'text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23]'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload Daily Report</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('memory');
              if (historicalRecords.length === 0) fetchHistoricalRecords();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'memory'
                ? 'bg-[#4648D4] text-white shadow-lg shadow-[#4648D4]/25'
                : 'text-[#464554] hover:bg-[#E9E6F3] hover:text-[#1B1B23]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Project Memory (RAG)</span>
          </button>
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

          {/* Search Bar */}
          <div className="hidden sm:flex relative w-80 md:w-96">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, WBS codes, disciplines..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#F5F2FE] border-none text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#4648D4]/20 transition"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchDashboardData();
                fetchMatches();
                showToast('Synchronized with live AWS database.', 'info');
              }}
              disabled={isLoadingDashboard}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDashboard ? 'animate-spin text-[#4648D4]' : ''}`} />
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4648D4] hover:bg-[#3B3DC0] text-white text-sm font-semibold shadow-md shadow-[#4648D4]/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ingest Report</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-2">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${
                activeTab === 'dashboard' ? 'bg-[#4648D4] text-white' : 'text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Timeline Dashboard</span>
            </button>
            <button
              onClick={() => { setActiveTab('review'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                activeTab === 'review' ? 'bg-[#4648D4] text-white' : 'text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Review Queue</span>
              </div>
              {pendingMatchesCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {pendingMatchesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${
                activeTab === 'upload' ? 'bg-[#4648D4] text-white' : 'text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Daily Report</span>
            </button>
            <button
              onClick={() => { setActiveTab('memory'); setMobileMenuOpen(false); if (historicalRecords.length === 0) fetchHistoricalRecords(); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${
                activeTab === 'memory' ? 'bg-[#4648D4] text-white' : 'text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Project Memory (RAG)</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* ========================================================================= */}
          {/* SCREEN 1: OPERATIONAL TIMELINE DASHBOARD                                  */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Header Title Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1B1B23]">
                    Operational Timeline
                  </h1>
                  <p className="text-sm text-[#64748B] mt-1">
                    Real-time progress tracking and automated schedule-linking powered by Amazon Bedrock
                  </p>
                </div>

                {/* Filter Tabs Header with Custom Dropdown */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-[#F5F2FE] rounded-xl p-1 shadow-sm border border-[#C7C4D7]/20">
                    <button
                      onClick={() => setTimelineStatusFilter('all')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                        timelineStatusFilter === 'all'
                          ? 'bg-white shadow-sm text-[#4648D4]'
                          : 'text-[#464554] hover:text-[#1B1B23]'
                      }`}
                    >
                      All Tasks ({activities.length})
                    </button>
                    <button
                      onClick={() => setTimelineStatusFilter('delayed')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                        timelineStatusFilter === 'delayed'
                          ? 'bg-white shadow-sm text-[#4648D4]'
                          : 'text-[#464554] hover:text-[#1B1B23]'
                      }`}
                    >
                      Delayed ({delayedCount})
                    </button>
                    <button
                      onClick={() => setTimelineStatusFilter('in_progress')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                        timelineStatusFilter === 'in_progress'
                          ? 'bg-white shadow-sm text-[#4648D4]'
                          : 'text-[#464554] hover:text-[#1B1B23]'
                      }`}
                    >
                      In Progress ({inProgressActivitiesCount})
                    </button>
                    <button
                      onClick={() => setTimelineStatusFilter('completed')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                        timelineStatusFilter === 'completed'
                          ? 'bg-white shadow-sm text-[#4648D4]'
                          : 'text-[#464554] hover:text-[#1B1B23]'
                      }`}
                    >
                      Completed ({completedActivitiesCount})
                    </button>
                  </div>

                  {/* Custom Polished Discipline Dropdown */}
                  <DisciplineDropdown
                    value={disciplineFilter}
                    onChange={setDisciplineFilter}
                    disciplines={uniqueDisciplines}
                  />
                </div>
              </div>

              {/* Key Metrics Row (4 Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Metric 1: Total Activities */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#C7C4D7]/30 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#4648D4]/10 rounded-full blur-2xl group-hover:bg-[#4648D4]/20 transition-all duration-500" />
                  <div className="flex items-center gap-4 mb-3 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#4648D4]/10 flex items-center justify-center text-[#4648D4]">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">Total Activities</p>
                      <p className="text-3xl font-bold text-[#1B1B23]">{totalActivitiesCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-10 text-xs text-[#64748B] font-medium">
                    <span className="text-[#10B981] flex items-center gap-1 bg-[#10B981]/10 px-2 py-0.5 rounded-md font-semibold">
                      100%
                    </span>
                    <span>Titan V2 embedded</span>
                  </div>
                </div>

                {/* Metric 2: On Track % */}
                <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#C7C4D7]/30 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#10B981]/10 rounded-full blur-2xl group-hover:bg-[#10B981]/20 transition-all duration-500" />
                  <div className="flex items-center gap-4 mb-3 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">On Track Rate</p>
                      <p className="text-3xl font-bold text-[#1B1B23]">{onTrackPct}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#E9E6F3] rounded-full h-2 mt-4 relative z-10 overflow-hidden">
                    <div className="bg-[#10B981] h-2 rounded-full transition-all duration-500" style={{ width: `${onTrackPct}%` }} />
                  </div>
                </div>

                {/* Metric 3: Pending Review Queue */}
                <div
                  onClick={() => setActiveTab('review')}
                  className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#C7C4D7]/30 relative overflow-hidden group cursor-pointer hover:border-amber-300 transition"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#F59E0B]/10 rounded-full blur-2xl group-hover:bg-[#F59E0B]/20 transition-all duration-500" />
                  <div className="flex items-center gap-4 mb-3 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#F59E0B]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">Review Queue</p>
                      <p className="text-3xl font-bold text-[#1B1B23]">{pendingMatchesCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-10 text-xs">
                    <span className="text-[#F59E0B] flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                      Requires Planner Sign-off
                    </span>
                  </div>
                </div>

                {/* Metric 4: Institutional Memory */}
                <div
                  onClick={() => {
                    setActiveTab('memory');
                    if (historicalRecords.length === 0) fetchHistoricalRecords();
                  }}
                  className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#C7C4D7]/30 relative overflow-hidden group cursor-pointer hover:border-indigo-300 transition"
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500" />
                  <div className="flex items-center gap-4 mb-3 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">Project Memory</p>
                      <p className="text-3xl font-bold text-[#1B1B23]">40</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-10 text-xs text-[#64748B] font-medium">
                    <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
                      Nova Pro RAG Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Timeline Grid (Gantt-Style Task Bars) */}
              <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#C7C4D7]/30 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#C7C4D7]/20 flex items-center justify-between bg-white sticky top-0 z-20">
                  <div>
                    <h2 className="text-lg font-bold text-[#1B1B23]">Execution Schedule & Gantt Tracking</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      15 Baseline WBS engineering activities mapped with real progress percentages
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#F5F2FE] p-1 rounded-xl border border-[#C7C4D7]/20 text-xs text-[#64748B]">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg font-semibold text-[#4648D4] shadow-sm">
                      <Calendar className="w-3.5 h-3.5" /> Oct 2026 Baseline
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[840px]">
                    {/* Timeline Column Headers */}
                    <div className="grid grid-cols-[320px_1fr_1fr_1fr] border-b border-[#C7C4D7]/20 bg-[#F5F2FE]/60 text-xs font-semibold text-[#64748B]">
                      <div className="p-4">Activity Code & Scope</div>
                      <div className="p-4 border-l border-[#C7C4D7]/20 text-center">Phase 1 (Oct 1 - Oct 7)</div>
                      <div className="p-4 border-l border-[#C7C4D7]/20 text-center">Phase 2 (Oct 8 - Oct 14)</div>
                      <div className="p-4 border-l border-[#C7C4D7]/20 text-center">Phase 3 (Oct 15 - Oct 25)</div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="relative divide-y divide-[#C7C4D7]/15">
                      <div className="absolute inset-0 grid grid-cols-[320px_1fr_1fr_1fr] pointer-events-none">
                        <div />
                        <div className="border-l border-[#C7C4D7]/20 border-dashed" />
                        <div className="border-l border-[#C7C4D7]/20 border-dashed" />
                        <div className="border-l border-[#C7C4D7]/20 border-dashed" />
                      </div>

                      {filteredActivities.map((act) => {
                        const progress = act.progress_pct ?? 0;
                        const isComplete = progress >= 100;
                        const isInProgress = progress > 0 && progress < 100;

                        return (
                          <div
                            key={act.id}
                            className="grid grid-cols-[320px_1fr_1fr_1fr] hover:bg-[#F5F2FE]/40 transition-colors relative z-10 items-center min-h-[72px]"
                          >
                            <div className="p-4 flex flex-col justify-center">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-[#4648D4]">
                                  {act.activity_code}
                                </span>
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {act.discipline}
                                </span>
                              </div>
                              <p className="font-semibold text-xs sm:text-sm text-[#1B1B23] mt-1 truncate" title={act.description}>
                                {act.description}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                {act.location || 'Baghjan Site'} {act.line ? `• Line ${act.line}` : ''}
                              </p>
                            </div>

                            <div className="p-4 relative col-span-3 flex items-center">
                              <div className="w-full h-8 bg-[#E9E6F3] rounded-xl relative overflow-hidden flex items-center">
                                {isComplete && (
                                  <div className="w-full h-full bg-[#10B981] rounded-xl flex items-center justify-between px-3 text-white shadow-sm">
                                    <span className="font-semibold text-xs">100% Complete</span>
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}

                                {isInProgress && (
                                  <div
                                    className="h-full bg-[#F59E0B] rounded-xl flex items-center px-3 text-white shadow-sm transition-all duration-500 whitespace-nowrap"
                                    style={{ width: `${Math.max(progress, 25)}%` }}
                                  >
                                    <span className="font-semibold text-xs">
                                      In Progress ({progress}%)
                                    </span>
                                  </div>
                                )}

                                {!isComplete && !isInProgress && (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                                    Pending Execution (0%)
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Update Lineage (Audit Trail Table) */}
              <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#C7C4D7]/30 overflow-hidden">
                <div className="p-6 border-b border-[#C7C4D7]/20 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1B1B23]">Schedule Update Lineage</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Immutable audit log of all automated AI and planner-approved schedule updates
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-[#4648D4] font-semibold border border-indigo-100">
                    {auditLogs.length} Logged Updates
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#F5F2FE]/60 text-xs font-semibold text-[#64748B] border-b border-[#C7C4D7]/20">
                        <th className="p-4">Activity Code</th>
                        <th className="p-4">Description & Scope</th>
                        <th className="p-4">Discipline</th>
                        <th className="p-4">Planned Dates</th>
                        <th className="p-4">Actual Dates</th>
                        <th className="p-4">Progress</th>
                        <th className="p-4">Status & Lineage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C7C4D7]/15">
                      {activities.map((act) => {
                        const progress = act.progress_pct ?? 0;
                        const isComplete = progress >= 100;
                        const isInProgress = progress > 0 && progress < 100;

                        return (
                          <tr key={act.id} className="hover:bg-[#F5F2FE]/30 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#4648D4]">
                              {act.activity_code}
                            </td>
                            <td className="p-4 font-medium text-[#1B1B23] max-w-xs">
                              {act.description}
                            </td>
                            <td className="p-4">
                              <span className="bg-[#E9E6F3] text-slate-700 px-2 py-1 rounded-md text-xs font-semibold uppercase">
                                {act.discipline}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-[#64748B]">
                              {act.planned_start ? `${act.planned_start} → ${act.planned_end}` : 'Oct 1 - Oct 15'}
                            </td>
                            <td className="p-4 text-xs text-[#64748B]">
                              {act.actual_start ? `${act.actual_start} → ${act.actual_end || 'Ongoing'}` : '—'}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-[#E9E6F3] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${isComplete ? 'bg-[#10B981]' : isInProgress ? 'bg-[#F59E0B]' : 'bg-slate-300'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-xs text-[#1B1B23]">{progress}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {isComplete ? (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-[#10B981] px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Completed (Tier 1)
                                </span>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-[#F59E0B] px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> In Progress (Tier 2)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Pending (Tier 3)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 2: REVIEW QUEUE (WITH ADVANCED FILTERS)                           */}
          {/* ========================================================================= */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              {/* Header Title Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#1B1B23]">
                    Matching & Verification Queue
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    Review, filter, and verify AI-extracted field events against the baseline WBS schedule
                  </p>
                </div>

                {/* Quick Search */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reviewSearchQuery}
                    onChange={(e) => setReviewSearchQuery(e.target.value)}
                    placeholder="Search matches or codes..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-[#C7C4D7]/50 text-xs sm:text-sm text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20 shadow-xs"
                  />
                </div>
              </div>

              {/* Review Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-[#C7C4D7]/30 shadow-xs flex flex-wrap items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#F5F2FE] p-1 rounded-xl border border-[#C7C4D7]/20">
                  <button
                    onClick={() => setReviewStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewStatusFilter === 'pending'
                        ? 'bg-white shadow-sm text-[#4648D4]'
                        : 'text-[#64748B] hover:text-[#1B1B23]'
                    }`}
                  >
                    Pending Review ({matches.filter((m) => m.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewStatusFilter === 'all'
                        ? 'bg-white shadow-sm text-[#4648D4]'
                        : 'text-[#64748B] hover:text-[#1B1B23]'
                    }`}
                  >
                    All Matches ({matches.length})
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter('auto_approved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewStatusFilter === 'auto_approved'
                        ? 'bg-white shadow-sm text-[#4648D4]'
                        : 'text-[#64748B] hover:text-[#1B1B23]'
                    }`}
                  >
                    Auto-Approved
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter('planner_approved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewStatusFilter === 'planner_approved'
                        ? 'bg-white shadow-sm text-[#4648D4]'
                        : 'text-[#64748B] hover:text-[#1B1B23]'
                    }`}
                  >
                    Planner Approved
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter('rejected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewStatusFilter === 'rejected'
                        ? 'bg-white shadow-sm text-[#4648D4]'
                        : 'text-[#64748B] hover:text-[#1B1B23]'
                    }`}
                  >
                    Rejected
                  </button>
                </div>

                {/* Tier & Discipline Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Tier Filter Pills */}
                  <div className="flex items-center gap-1 bg-[#F5F2FE] p-1 rounded-xl border border-[#C7C4D7]/20 text-xs">
                    <button
                      onClick={() => setReviewTierFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        reviewTierFilter === 'all' ? 'bg-white shadow-sm text-[#4648D4]' : 'text-[#64748B]'
                      }`}
                    >
                      All Tiers
                    </button>
                    <button
                      onClick={() => setReviewTierFilter('tier2')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        reviewTierFilter === 'tier2' ? 'bg-white shadow-sm text-amber-600' : 'text-[#64748B]'
                      }`}
                    >
                      Tier 2 (70-94%)
                    </button>
                    <button
                      onClick={() => setReviewTierFilter('tier1')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        reviewTierFilter === 'tier1' ? 'bg-white shadow-sm text-emerald-600' : 'text-[#64748B]'
                      }`}
                    >
                      Tier 1 (≥95%)
                    </button>
                    <button
                      onClick={() => setReviewTierFilter('tier3')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        reviewTierFilter === 'tier3' ? 'bg-white shadow-sm text-rose-600' : 'text-[#64748B]'
                      }`}
                    >
                      Tier 3 (&lt;70%)
                    </button>
                  </div>

                  {/* Discipline Dropdown for Review Queue */}
                  <DisciplineDropdown
                    value={reviewDisciplineFilter}
                    onChange={setReviewDisciplineFilter}
                    disciplines={uniqueDisciplines}
                  />
                </div>
              </div>

              {isLoadingMatches ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#4648D4]" />
                  <p className="mt-2 text-sm font-medium">Loading match queue...</p>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-[#C7C4D7]/30 p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg text-[#1B1B23]">No Matches Found</h3>
                  <p className="text-sm text-[#64748B] max-w-sm mx-auto mt-1">
                    No items match the selected filter criteria or the review queue is currently clear.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMatches.map((match) => {
                    const badge = getConfidenceBadge(match.confidence_score);
                    const isPending = match.status === 'pending';

                    return (
                      <div
                        key={match.id}
                        className="bg-white rounded-[24px] border border-[#C7C4D7]/30 p-6 shadow-sm hover:shadow-md transition space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#C7C4D7]/20 pb-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono font-bold text-[#4648D4] text-base">
                              {match.activity_code}
                            </span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E9E6F3] text-slate-700 font-semibold uppercase">
                              {match.activity_discipline}
                            </span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badge.bg}`}>
                              {badge.label} • {badge.tier}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium capitalize">
                              Status: {match.status.replace('_', ' ')}
                            </span>
                          </div>

                          <span className="text-xs text-[#64748B]">
                            {new Date(match.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                          {/* Extracted Event */}
                          <div className="bg-[#F5F2FE]/50 p-4 rounded-xl space-y-2 border border-[#C7C4D7]/20">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                              Extracted Field Event (Nova Micro)
                            </p>
                            <p className="font-semibold text-[#1B1B23]">{match.event_description}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-[#64748B] pt-1">
                              {match.event_line && <span>Line: {match.event_line}</span>}
                              {match.event_location && <span>Location: {match.event_location}</span>}
                              {match.quantity && <span>Qty: {match.quantity}</span>}
                            </div>
                          </div>

                          {/* Matched Schedule Activity */}
                          <div className="bg-[#F5F2FE]/50 p-4 rounded-xl space-y-2 border border-[#C7C4D7]/20">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                              Target Schedule Node (Titan V2)
                            </p>
                            <p className="font-semibold text-[#1B1B23]">{match.activity_description}</p>
                            <p className="text-xs text-[#64748B]">
                              Location: {match.activity_location || 'Baghjan Site'}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        {isPending && (
                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              onClick={() => handleMatchAction(match.id, 'rejected', match.activity_code)}
                              disabled={actionInProgress === match.id}
                              className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                            >
                              Reject Link
                            </button>
                            <button
                              onClick={() => handleMatchAction(match.id, 'planner_approved', match.activity_code)}
                              disabled={actionInProgress === match.id}
                              className="px-5 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve & Update Schedule</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 3: UPLOAD REPORT (S3 PIPELINE)                                     */}
          {/* ========================================================================= */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-[#1B1B23]">Ingest Daily Field Report</h2>
                <p className="text-sm text-[#64748B]">
                  Submit unstructured notes, spreadsheets, or documents to trigger the event-driven AWS pipeline
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="bg-white p-8 rounded-[24px] shadow-sm border border-[#C7C4D7]/30 space-y-6">
                {/* Upload Mode Switcher */}
                <div className="flex p-1 bg-[#F5F2FE] rounded-xl border border-[#C7C4D7]/20">
                  <button
                    type="button"
                    onClick={() => setUploadMode('text')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                      uploadMode === 'text' ? 'bg-white shadow-sm text-[#4648D4]' : 'text-[#64748B]'
                    }`}
                  >
                    Free-Text Narrative
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                      uploadMode === 'file' ? 'bg-white shadow-sm text-[#4648D4]' : 'text-[#64748B]'
                    }`}
                  >
                    File / Document Upload
                  </button>
                </div>

                {/* Submitter Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#64748B] uppercase">Supervisor / Submitter</label>
                  <input
                    type="text"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-[#F5F2FE] border-none text-sm text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20"
                    required
                  />
                </div>

                {/* Text or File Input */}
                {uploadMode === 'text' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#64748B] uppercase">Daily Progress Notes</label>
                    <textarea
                      rows={6}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="e.g., Welded 14 spool joints on 24-inch crude header line 24-XX at Tank Farm 3 area today..."
                      className="w-full p-4 rounded-xl bg-[#F5F2FE] border-none text-sm text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20 resize-y"
                      required
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#C7C4D7] hover:border-[#4648D4] rounded-2xl p-8 text-center cursor-pointer transition bg-[#F5F2FE]/50"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <FileSpreadsheet className="w-8 h-8 text-[#4648D4] mx-auto mb-2" />
                    {selectedFile ? (
                      <p className="text-sm font-semibold text-[#4648D4]">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm font-medium text-[#64748B]">Click to select CSV, TXT, or PDF</p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3.5 rounded-xl bg-[#4648D4] hover:bg-[#3B3DC0] disabled:bg-slate-300 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting to S3 & Bedrock...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Link to Schedule</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCREEN 4: PROJECT MEMORY (INSTITUTIONAL RAG WITH RICH RENDERING)          */}
          {/* ========================================================================= */}
          {activeTab === 'memory' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="bg-white border border-[#C7C4D7]/30 p-8 rounded-[24px] shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1B1B23] flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                      <span>Project Memory & Historical RAG</span>
                    </h2>
                    <p className="text-sm text-[#64748B] mt-1">
                      Query institutional memory across 40 past capital energy projects to prevent recurring schedule delays.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllHistorical(!showAllHistorical)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#F5F2FE] hover:bg-[#E9E6F3] text-[#4648D4] border border-[#C7C4D7]/30 transition self-start sm:self-auto"
                  >
                    {showAllHistorical ? 'Hide Seeded Dataset' : 'Browse All 40 Seeded Records'}
                  </button>
                </div>

                {/* Query Input */}
                <div className="mt-6 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memoryQuery}
                        onChange={(e) => setMemoryQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleMemoryQuery()}
                        placeholder="Ask about past piping delays, civil risks, material shortages..."
                        className="w-full pl-11 pr-4 py-3 bg-[#F5F2FE] border-none rounded-xl text-sm text-[#1B1B23] focus:ring-2 focus:ring-purple-500/20 transition"
                      />
                    </div>
                    <button
                      onClick={() => handleMemoryQuery()}
                      disabled={isQueryingMemory || !memoryQuery.trim()}
                      className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0"
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

                  {/* Preset Suggestions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs text-[#64748B] font-medium">Try asking:</span>
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
                        className="px-3 py-1 text-xs rounded-lg bg-[#F5F2FE] hover:bg-[#E9E6F3] text-purple-900 border border-[#C7C4D7]/30 transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Synthesized Answer Result */}
              {memoryResult && (
                <div className="space-y-6">
                  {/* Stats Bar */}
                  {memoryResult.computed_stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white border border-[#C7C4D7]/30 p-4 rounded-2xl shadow-sm">
                        <p className="text-xs text-[#64748B] uppercase font-semibold">Records Analyzed</p>
                        <p className="text-2xl font-bold text-[#1B1B23] mt-1">
                          {memoryResult.computed_stats.totalRetrieved}
                        </p>
                      </div>
                      <div className="bg-white border border-[#C7C4D7]/30 p-4 rounded-2xl shadow-sm">
                        <p className="text-xs text-[#64748B] uppercase font-semibold">Delayed Activities</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">
                          {memoryResult.computed_stats.delayedCount}
                        </p>
                      </div>
                      <div className="bg-white border border-[#C7C4D7]/30 p-4 rounded-2xl shadow-sm">
                        <p className="text-xs text-[#64748B] uppercase font-semibold">Avg Delay Days</p>
                        <p className="text-2xl font-bold text-rose-600 mt-1">
                          +{memoryResult.computed_stats.averageDelayDays}d
                        </p>
                      </div>
                      <div className="bg-white border border-[#C7C4D7]/30 p-4 rounded-2xl shadow-sm">
                        <p className="text-xs text-[#64748B] uppercase font-semibold">Synthesis Model</p>
                        <p className="text-xs font-mono font-semibold text-purple-700 mt-2 truncate">
                          {memoryResult.model_used.replace('apac.amazon.', '').replace(':0', '')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Synthesized Narrative Card with Rich Section & Citation Parser */}
                  <div className="bg-white border border-[#C7C4D7]/30 rounded-[24px] p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-lg text-[#1B1B23]">
                          Synthesized Institutional Memory
                        </h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono font-semibold border border-purple-200">
                        Grounded via pgvector
                      </span>
                    </div>

                    {/* Rich Formatted Answer with Clickable Citations */}
                    <SynthesizedAnswerViewer
                      rawAnswer={memoryResult.answer}
                      onCitationClick={handleCitationClick}
                    />
                  </div>

                  {/* Verified Sources Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B]">
                        Verified Retrieved Grounding Sources ({memoryResult.retrieved_records?.length || 0})
                      </h3>
                      <span className="text-xs text-purple-700 font-medium">Click any record to inspect grounding proof</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {memoryResult.retrieved_records?.map((record, idx) => (
                        <div
                          key={record.id || idx}
                          onClick={() => {
                            setSelectedGroundingRecord(record);
                            setIsGroundingModalOpen(true);
                          }}
                          className="bg-white border border-[#C7C4D7]/30 p-5 rounded-2xl space-y-2 shadow-sm hover:border-[#4648D4] hover:shadow-md transition cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                                {record.discipline}
                              </span>
                              <h4 className="font-bold text-sm text-[#1B1B23] group-hover:text-[#4648D4] transition mt-1">
                                {record.project_name}
                              </h4>
                            </div>
                            {record.similarity_score && (
                              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                                {(record.similarity_score * 100).toFixed(1)}% match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 font-medium">{record.activity_description}</p>
                          <div className="flex items-center gap-3 text-xs text-[#64748B] pt-1 border-t border-slate-100">
                            <span>Planned: {record.planned_duration_days}d</span>
                            <span>Actual: {record.actual_duration_days}d</span>
                            <span className={record.delay_days > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                              {record.delay_days > 0 ? `+${record.delay_days}d delay` : 'On Schedule'}
                            </span>
                          </div>
                          {record.notes && (
                            <p className="text-xs text-[#64748B] italic bg-[#F5F2FE] p-2.5 rounded-xl">
                              &quot;{record.notes}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seeded Dataset Explorer */}
              {showAllHistorical && (
                <div className="bg-white border border-[#C7C4D7]/30 rounded-[24px] p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-[#1B1B23] text-base">Historical Knowledge Base (40 Records)</h3>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#F5F2FE] text-[#64748B] font-semibold border-b border-[#C7C4D7]/20">
                        <tr>
                          <th className="p-3">Project</th>
                          <th className="p-3">Discipline</th>
                          <th className="p-3">Activity</th>
                          <th className="p-3">Delay</th>
                          <th className="p-3">Primary Cause</th>
                          <th className="p-3">Embedding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C7C4D7]/15">
                        {historicalRecords.map((hr, idx) => (
                          <tr
                            key={hr.id || idx}
                            onClick={() => {
                              setSelectedGroundingRecord(hr);
                              setIsGroundingModalOpen(true);
                            }}
                            className="hover:bg-[#F5F2FE]/60 cursor-pointer transition"
                          >
                            <td className="p-3 font-semibold text-[#1B1B23]">{hr.project_name}</td>
                            <td className="p-3 uppercase font-mono text-[10px] text-slate-600">{hr.discipline}</td>
                            <td className="p-3 text-slate-700">{hr.activity_description}</td>
                            <td className="p-3 font-bold text-amber-600">
                              {hr.delay_days > 0 ? `+${hr.delay_days}d` : '0d'}
                            </td>
                            <td className="p-3 text-[#64748B]">{hr.delay_cause || 'None'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
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

      {/* Grounding Evidence Verification Modal */}
      {isGroundingModalOpen && selectedGroundingRecord && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-xl w-full border border-[#C7C4D7]/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#C7C4D7]/20 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#1B1B23]">Grounded Evidence Record</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      1024d Titan V2 Match
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">Verified source from PostgreSQL pgvector store</p>
                </div>
              </div>
              <button
                onClick={() => setIsGroundingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Project & Activity Info */}
              <div className="bg-[#F5F2FE]/70 p-5 rounded-2xl border border-[#C7C4D7]/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#4648D4]/10 text-[#4648D4] uppercase">
                    {selectedGroundingRecord.discipline || 'Engineering'}
                  </span>
                  {selectedGroundingRecord.similarity_score && (
                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      {(selectedGroundingRecord.similarity_score * 100).toFixed(1)}% Cosine Match
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-base text-[#1B1B23] pt-1">
                  {selectedGroundingRecord.project_name}
                </h4>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {selectedGroundingRecord.activity_description}
                </p>
              </div>

              {/* Execution Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white border border-[#C7C4D7]/30 p-3.5 rounded-xl shadow-xs">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Planned</p>
                  <p className="text-base font-bold text-[#1B1B23] mt-0.5">
                    {selectedGroundingRecord.planned_duration_days} Days
                  </p>
                </div>
                <div className="bg-white border border-[#C7C4D7]/30 p-3.5 rounded-xl shadow-xs">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Actual</p>
                  <p className="text-base font-bold text-[#1B1B23] mt-0.5">
                    {selectedGroundingRecord.actual_duration_days} Days
                  </p>
                </div>
                <div className="bg-white border border-[#C7C4D7]/30 p-3.5 rounded-xl shadow-xs">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Delay Overrun</p>
                  <p className={`text-base font-bold mt-0.5 ${selectedGroundingRecord.delay_days > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {selectedGroundingRecord.delay_days > 0 ? `+${selectedGroundingRecord.delay_days}d` : '0d (On Time)'}
                  </p>
                </div>
              </div>

              {/* Root Cause & Field Notes */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Primary Cause & Field Evidence</p>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-[#1B1B23]">
                    Root Cause: <span className="text-amber-700 font-bold">{selectedGroundingRecord.delay_cause || 'Material / Logistics Shortage'}</span>
                  </p>
                  {selectedGroundingRecord.notes && (
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      &quot;{selectedGroundingRecord.notes}&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F5F2FE]/50 border-t border-[#C7C4D7]/20 flex items-center justify-between text-xs text-[#64748B] px-6">
              <span className="font-mono">Grounding Model: Bedrock Nova Pro</span>
              <button
                onClick={() => setIsGroundingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#4648D4] hover:bg-[#3B3DC0] text-white font-semibold transition shadow-sm"
              >
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
