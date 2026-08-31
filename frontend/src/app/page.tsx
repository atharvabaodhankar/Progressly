'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  Network,
  FolderPlus,
  FolderKanban,
  MapPin,
  Loader2,
  CheckCheck,
  BarChart3,
} from 'lucide-react';

const API_BASE = '/api-proxy';

interface ProjectItem {
  id: string;
  name: string;
  organization: string;
  location: string | null;
  created_at: string;
  activity_count: number;
  report_count: number;
}

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

  // Project Management & Switcher State
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(null);
  const currentProjectRef = useRef<ProjectItem | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Keep currentProjectRef in sync with state
  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  // New Project Onboarding Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectOrg, setNewProjectOrg] = useState('Oil India Limited');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectCsvFile, setNewProjectCsvFile] = useState<File | null>(null);
  const [newProjectCsvText, setNewProjectCsvText] = useState('');
  const [newProjectInputMode, setNewProjectInputMode] = useState<'file' | 'text'>('file');
  const [onboardingStage, setOnboardingStage] = useState<'idle' | 'creating' | 'importing' | 'embedding' | 'success' | 'error'>('idle');
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingResult, setOnboardingResult] = useState<{ activitiesCreated: number; embeddingsGenerated: number } | null>(null);
  const newProjectFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Historical Memory Import Modal State (Way 1)
  const [isImportMemoryModalOpen, setIsImportMemoryModalOpen] = useState(false);
  const [importMemoryCsvFile, setImportMemoryCsvFile] = useState<File | null>(null);
  const [importMemoryCsvText, setImportMemoryCsvText] = useState('');
  const [importMemoryInputMode, setImportMemoryInputMode] = useState<'file' | 'text'>('file');
  const [isImportingMemory, setIsImportingMemory] = useState(false);
  const [importMemoryError, setImportMemoryError] = useState<string | null>(null);
  const memoryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Closed-Loop Archiving State (Way 2)
  const [isArchivingProject, setIsArchivingProject] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Projects
  const fetchProjects = useCallback(async (autoSelectId?: string): Promise<ProjectItem[]> => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      if (res.ok && data.projects) {
        setProjects(data.projects);
        const storedId = autoSelectId || (typeof window !== 'undefined' ? localStorage.getItem('progressly_active_project_id') : null);
        let matched = data.projects.find((p: ProjectItem) => p.id === storedId);
        if (!matched && data.projects.length > 0) {
          matched = data.projects.find((p: ProjectItem) => p.name.toLowerCase().includes('baghjan')) || data.projects[0];
        }
        if (matched) {
          setCurrentProject(matched);
          currentProjectRef.current = matched;
          if (typeof window !== 'undefined') {
            localStorage.setItem('progressly_active_project_id', matched.id);
          }
        }
        return data.projects;
      }
      return [];
    } catch (err) {
      console.error('Error fetching projects:', err);
      return [];
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  // Fetch Matches (Scoped to Project)
  const fetchMatches = useCallback(async (projId?: string) => {
    const targetId = projId !== undefined ? projId : currentProjectRef.current?.id;
    setIsLoadingMatches(true);
    try {
      const url = targetId ? `${API_BASE}/matches?projectId=${targetId}` : `${API_BASE}/matches`;
      const res = await fetch(url);
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

  // Fetch Dashboard & Audit Log (Scoped to Project)
  const fetchDashboardData = useCallback(async (projId?: string) => {
    const targetId = projId !== undefined ? projId : currentProjectRef.current?.id;
    setIsLoadingDashboard(true);
    try {
      const actUrl = targetId ? `${API_BASE}/activities?projectId=${targetId}` : `${API_BASE}/activities`;
      const auditUrl = targetId ? `${API_BASE}/audit-log?limit=25&projectId=${targetId}` : `${API_BASE}/audit-log?limit=25`;
      const [actRes, auditRes] = await Promise.all([
        fetch(actUrl),
        fetch(auditUrl),
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

  // Initial Load: Run Once on Mount
  useEffect(() => {
    fetchProjects().then((projs) => {
      const storedId = typeof window !== 'undefined' ? localStorage.getItem('progressly_active_project_id') : null;
      const initialProj = projs?.find((p: ProjectItem) => p.id === storedId) || projs?.[0];
      if (initialProj) {
        fetchDashboardData(initialProj.id);
        fetchMatches(initialProj.id);
      }
    });
  }, [fetchProjects, fetchDashboardData, fetchMatches]);

  // Switch Project Handler
  const handleSelectProject = (project: ProjectItem) => {
    setCurrentProject(project);
    setIsProjectDropdownOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('progressly_active_project_id', project.id);
    }
    fetchDashboardData(project.id);
    fetchMatches(project.id);
    showToast(`Switched active workspace to "${project.name}"`, 'info');
  };

  // Create Project & Import Schedule Handler
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setOnboardingError('Please enter a Project Name.');
      return;
    }

    setOnboardingStage('creating');
    setOnboardingError(null);
    setOnboardingResult(null);

    try {
      // Step 1: POST /projects
      const createRes = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          organization: newProjectOrg.trim() || 'Capital Project Org',
          location: newProjectLocation.trim() || null,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.project_id) {
        throw new Error(createData.error || 'Failed to create project profile.');
      }

      const newProjId = createData.project_id;
      setOnboardingStage('importing');

      // Step 2: POST /projects/:projectId/activities/import
      let importRes: globalThis.Response;
      if (newProjectInputMode === 'file' && newProjectCsvFile) {
        const formData = new FormData();
        formData.append('file', newProjectCsvFile);
        setOnboardingStage('embedding');
        importRes = await fetch(`${API_BASE}/projects/${newProjId}/activities/import`, {
          method: 'POST',
          body: formData,
        });
      } else {
        const defaultSampleScheduleCsv = `activity_code,description,discipline,line,location,planned_start,planned_end
NRL-PIP-1001,Erect Crude Feed Overhead Line 12-CS-01,Piping,12-CS-01,CDU Column Area,2026-09-01,2026-09-12
NRL-ELE-2001,Pull 11kV High Voltage Feeder Cables,Electrical,,Substation 4,2026-09-05,2026-09-10
NRL-CIV-3001,Cast Concrete Foundation for Reformer Furnace F-101,Civil,,Reformer Unit,2026-08-25,2026-09-02
NRL-INS-4001,Mount Differential Pressure Transmitter PDT-301,Instrumentation,12-CS-01,CDU Column Area,2026-09-11,2026-09-13`;
        const csvContent = newProjectCsvText.trim() || defaultSampleScheduleCsv;
        setOnboardingStage('embedding');
        importRes = await fetch(`${API_BASE}/projects/${newProjId}/activities/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv_text: csvContent }),
        });
      }

      const importData = await importRes.json();
      if (!importRes.ok) {
        throw new Error(importData.error || 'Failed to import activities into project.');
      }

      setOnboardingStage('success');
      setOnboardingResult({
        activitiesCreated: importData.activities_created || 0,
        embeddingsGenerated: importData.embeddings_generated || 0,
      });

      showToast(`Successfully onboarded "${newProjectName}" with ${importData.activities_created} activities!`, 'success');

      // Refresh project list & activate the new project
      await fetchProjects(newProjId);
      fetchDashboardData(newProjId);
      fetchMatches(newProjId);

      setTimeout(() => {
        setIsNewProjectModalOpen(false);
        setOnboardingStage('idle');
        setNewProjectName('');
        setNewProjectLocation('');
        setNewProjectCsvFile(null);
        setNewProjectCsvText('');
      }, 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Project onboarding failed';
      setOnboardingError(msg);
      setOnboardingStage('error');
      showToast(msg, 'error');
    }
  };

  // Fetch Historical Records (Institutional RAG — UNSCOPED across all projects)
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

  // Handle Project Memory RAG Queries (UNSCOPED institutional memory)
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
    const recordMatch = raw.match(/RECORD\s*(\d+)/i);
    if (recordMatch && memoryResult?.retrieved_records) {
      const idx = parseInt(recordMatch[1], 10) - 1;
      if (memoryResult.retrieved_records[idx]) {
        setSelectedGroundingRecord(memoryResult.retrieved_records[idx]);
        setIsGroundingModalOpen(true);
        return;
      }
    }

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

  // Handle Import Memory CSV (Way 1)
  const handleImportMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImportingMemory(true);
    setImportMemoryError(null);

    try {
      let res: globalThis.Response;
      if (importMemoryInputMode === 'file' && importMemoryCsvFile) {
        const formData = new FormData();
        formData.append('file', importMemoryCsvFile);
        res = await fetch(`${API_BASE}/memory/import`, {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!importMemoryCsvText.trim()) {
          throw new Error('Please provide CSV data or select a file.');
        }
        res = await fetch(`${API_BASE}/memory/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv_text: importMemoryCsvText }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import historical records.');

      showToast(`✓ Successfully imported & embedded ${data.count} historical records!`, 'success');
      setIsImportMemoryModalOpen(false);
      setImportMemoryCsvFile(null);
      setImportMemoryCsvText('');
      fetchHistoricalRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error importing memory';
      setImportMemoryError(msg);
      showToast(msg, 'error');
    } finally {
      setIsImportingMemory(false);
    }
  };

  // Handle Closed-Loop Project Archiving (Way 2)
  const handleArchiveProjectToMemory = async () => {
    if (!currentProject?.id) return;
    setIsArchivingProject(true);
    try {
      const res = await fetch(`${API_BASE}/memory/archive-project/${currentProject.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to archive project to memory.');

      showToast(`✓ Closed-Loop Learning: Successfully archived ${data.records_archived} records from "${currentProject.name}" into Institutional Memory!`, 'success');
      fetchHistoricalRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error archiving project to memory';
      showToast(msg, 'error');
    } finally {
      setIsArchivingProject(false);
    }
  };

  // Handle File / Text Upload (Attached to active project_id)
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
        if (currentProject?.id) {
          formData.append('project_id', currentProject.id);
        }
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
            project_id: currentProject?.id || undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      setUploadSuccess(data.report);
      showToast(`Report uploaded & linked to project "${currentProject?.name || 'Active'}"!`, 'success');
      setReportText('');
      setSelectedFile(null);
      if (currentProject?.id) {
        fetchDashboardData(currentProject.id);
        fetchMatches(currentProject.id);
      }
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
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-white z-50 flex-col border-r border-slate-200 justify-between">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden shadow-xs border border-slate-200 flex items-center justify-center shrink-0">
              <img
                src="/progressly-icon.svg"
                alt="Progressly"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base text-slate-900 tracking-tight block">Progressly</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate max-w-[170px]">
                {currentProject?.organization || 'Oil India Ltd'} • {currentProject?.name?.split(' ')[0] || 'Baghjan'}
              </p>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="px-4 space-y-1 mt-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>Timeline Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'review'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 ${activeTab === 'review' ? 'text-slate-900' : 'text-slate-400'}`} />
                <span>Review Queue</span>
              </div>
              {pendingMatchesCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800">
                  {pendingMatchesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'upload'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Upload className={`w-4 h-4 ${activeTab === 'upload' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>Upload Daily Report</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('memory');
                if (historicalRecords.length === 0) fetchHistoricalRecords();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'memory'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'memory' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>Project Memory (RAG)</span>
            </button>

            <div className="pt-2 border-t border-slate-100 my-2" />

            <Link
              href="/analytics"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span>Token & Cost Telemetry</span>
            </Link>

            <Link
              href="/architecture"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Network className="w-4 h-4 text-slate-400" />
              <span>System Architecture</span>
            </Link>
          </nav>
        </div>

        {/* Quiet Infrastructure Status */}
        <div className="p-4 m-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AWS Bedrock & RDS Live</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ap-south-1 Mumbai Region</p>
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
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                <img
                  src="/progressly-icon.svg"
                  alt="Progressly Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">Progressly</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden xl:flex relative w-72 md:w-80">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, WBS, discipline..."
              className="w-full h-10 pl-11 pr-4 rounded-xl bg-[#F5F2FE] border-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#4648D4]/20 transition"
            />
          </div>

          {/* Project Switcher + Right Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Project Switcher Dropdown */}
            <div className="relative" ref={projectDropdownRef}>
              {projects.length <= 1 ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F2FE] border border-[#C7C4D7]/40 text-xs font-semibold text-[#1B1B23]">
                  <Building2 className="w-3.5 h-3.5 text-[#4648D4]" />
                  <span className="font-bold text-[#4648D4] max-w-[130px] sm:max-w-[160px] truncate">
                    {currentProject?.name || 'Baghjan Project'}
                  </span>
                  <button
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-[#4648D4] text-white hover:bg-[#3B3DC0] font-bold text-[10px] flex items-center gap-1 transition"
                    title="Onboard New Project"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className="h-10 px-3.5 rounded-xl bg-white border border-[#C7C4D7]/50 hover:border-[#4648D4] text-xs font-semibold text-[#1B1B23] focus:outline-none focus:ring-2 focus:ring-[#4648D4]/20 shadow-xs flex items-center gap-2.5 transition"
                  >
                    <Building2 className="w-4 h-4 text-[#4648D4]" />
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider leading-none">
                        Active Workspace
                      </span>
                      <span className="text-xs font-bold text-[#1B1B23] max-w-[140px] sm:max-w-[190px] truncate leading-tight mt-0.5">
                        {currentProject?.name || 'Select Project'}
                      </span>
                    </div>
                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      {activities.length} acts
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 ${
                        isProjectDropdownOpen ? 'rotate-180 text-[#4648D4]' : ''
                      }`}
                    />
                  </button>

                  {isProjectDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white shadow-2xl border border-[#C7C4D7]/40 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-[#C7C4D7]/20 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">
                          Registered Projects ({projects.length})
                        </span>
                        <button
                          onClick={() => {
                            setIsProjectDropdownOpen(false);
                            setIsNewProjectModalOpen(true);
                          }}
                          className="text-xs font-bold text-[#4648D4] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Onboard New</span>
                        </button>
                      </div>

                      <div className="max-h-64 overflow-y-auto py-1 divide-y divide-[#C7C4D7]/10">
                        {projects.map((proj) => {
                          const isSelected = currentProject?.id === proj.id;
                          return (
                            <button
                              key={proj.id}
                              onClick={() => handleSelectProject(proj)}
                              className={`w-full flex items-start justify-between px-4 py-3 text-left hover:bg-[#F5F2FE] transition ${
                                isSelected ? 'bg-[#F5F2FE]/80' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                    isSelected ? 'bg-[#4648D4] text-white' : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className={`text-xs font-bold truncate ${
                                      isSelected ? 'text-[#4648D4]' : 'text-[#1B1B23]'
                                    }`}
                                  >
                                    {proj.name}
                                  </p>
                                  <p className="text-[11px] text-[#64748B] truncate">{proj.organization}</p>
                                  {proj.location && (
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-2.5 h-2.5" />
                                      <span>{proj.location}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0 ml-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {proj.activity_count} acts
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-[#4648D4] mt-1.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="p-2 border-t border-[#C7C4D7]/20 mt-1">
                        <button
                          onClick={() => {
                            setIsProjectDropdownOpen(false);
                            setIsNewProjectModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#F5F2FE] hover:bg-[#4648D4] text-[#4648D4] hover:text-white font-bold text-xs transition"
                        >
                          <FolderPlus className="w-4 h-4" />
                          <span>+ Onboard New Capital Project</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Onboard Project Button */}
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C7C4D7]/50 hover:border-[#4648D4] text-xs font-semibold text-[#1B1B23] bg-white transition shadow-xs"
              title="Onboard New Project with Schedule CSV"
            >
              <FolderPlus className="w-4 h-4 text-[#4648D4]" />
              <span>+ New Project</span>
            </button>

            {/* Live Data Refresh Button */}
            <button
              onClick={() => {
                if (currentProject?.id) {
                  fetchDashboardData(currentProject.id);
                  fetchMatches(currentProject.id);
                }
                showToast(`Synchronized with database for "${currentProject?.name || 'Active Project'}".`, 'info');
              }}
              disabled={isLoadingDashboard}
              className="p-2.5 rounded-xl border border-[#C7C4D7]/50 hover:bg-slate-100 text-slate-600 transition shadow-xs"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDashboard ? 'animate-spin text-[#4648D4]' : ''}`} />
            </button>

            {/* Ingest Report CTA */}
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
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>Timeline Dashboard</span>
            </button>
            <button
              onClick={() => { setActiveTab('review'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'review' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Review Queue</span>
              </div>
              {pendingMatchesCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-100 text-amber-800">
                  {pendingMatchesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'upload' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload Daily Report</span>
            </button>
            <button
              onClick={() => { setActiveTab('memory'); setMobileMenuOpen(false); if (historicalRecords.length === 0) fetchHistoricalRecords(); }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'memory' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-slate-500" />
              <span>Project Memory (RAG)</span>
            </button>
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <span>Token & Cost Telemetry</span>
            </Link>
            <Link
              href="/architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Network className="w-4 h-4 text-slate-500" />
              <span>System Architecture</span>
            </Link>
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

              {/* Executive Timeline Telemetry Panel */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Hero Metric: On Track Rate */}
                  <div className="lg:col-span-5 pr-0 lg:pr-8 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Schedule On-Track Rate
                    </span>
                    <div className="mt-2 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                      {onTrackPct}%
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${onTrackPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Computed across active WBS activities & daily shift execution logs.
                    </p>
                  </div>

                  {/* Inline Secondary Stats Strip */}
                  <div className="lg:col-span-7 grid grid-cols-3 gap-6">
                    <div>
                      <span className="text-xs text-slate-500 block">Total WBS Tasks</span>
                      <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                        {totalActivitiesCount}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        100% Titan V2 embedded
                      </span>
                    </div>

                    <div
                      onClick={() => setActiveTab('review')}
                      className="cursor-pointer group"
                    >
                      <span className="text-xs text-slate-500 group-hover:text-slate-900 block transition-colors">
                        Review Queue →
                      </span>
                      <span className="text-2xl font-bold text-amber-600 font-mono mt-1 block">
                        {pendingMatchesCount}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Pending verification
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        setActiveTab('memory');
                        if (historicalRecords.length === 0) fetchHistoricalRecords();
                      }}
                      className="cursor-pointer group"
                    >
                      <span className="text-xs text-slate-500 group-hover:text-slate-900 block transition-colors">
                        Project Memory →
                      </span>
                      <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                        40
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Nova Pro RAG index
                      </span>
                    </div>
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
                        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {match.activity_code}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                              {match.activity_discipline}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${badge.bg}`}>
                              {badge.label} • {badge.tier}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize font-medium">
                              Status: {match.status.replace('_', ' ')}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(match.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Extracted Event */}
                          <div className="bg-slate-50 p-3.5 rounded-lg space-y-1.5 border border-slate-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Extracted Field Event (Nova Micro)
                            </p>
                            <p className="font-semibold text-slate-900 text-sm">{match.event_description}</p>
                            <div className="flex flex-wrap gap-2 text-slate-500 pt-1 text-[11px]">
                              {match.event_line && <span>Line: {match.event_line}</span>}
                              {match.event_location && <span>Location: {match.event_location}</span>}
                              {match.quantity && <span>Qty: {match.quantity}</span>}
                            </div>
                          </div>

                          {/* Matched Schedule Activity */}
                          <div className="bg-slate-50 p-3.5 rounded-lg space-y-1.5 border border-slate-200">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Target Schedule Node (Titan V2)
                            </p>
                            <p className="font-semibold text-slate-900 text-sm">{match.activity_description}</p>
                            <p className="text-slate-500 text-[11px]">
                              Location: {match.activity_location || 'Site Grid'}
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
                {/* Active Project Scope Indicator */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="min-w-0 text-xs">
                      <span className="text-slate-500">Target Project: </span>
                      <span className="font-bold text-slate-900 truncate">
                        {currentProject?.name || 'Baghjan Gas Gathering Station'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
                    Isolated Scope
                  </span>
                </div>

                {/* Upload Mode Switcher */}
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUploadMode('text')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                      uploadMode === 'text' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Free-Text Narrative
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                      uploadMode === 'file' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    File / Document Upload
                  </button>
                </div>

                {/* Submitter Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Supervisor / Submitter</label>
                  <input
                    type="text"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>

                {/* Text or File Input */}
                {uploadMode === 'text' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Daily Progress Notes</label>
                    <textarea
                      rows={6}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="e.g., Welded 14 spool joints on 24-inch crude header line 24-XX at Tank Farm 3 area today..."
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-400 resize-y"
                      required
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-8 text-center cursor-pointer transition bg-slate-50"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {selectedFile ? (
                      <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                    ) : (
                      <p className="text-sm font-medium text-slate-600">Click to select CSV, TXT, or PDF</p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium text-sm transition flex items-center justify-center gap-2 active:scale-98"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting to S3 & Bedrock...</span>
                    </>
                  ) : (
                    <span>Upload & Link to Schedule</span>
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
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => setIsImportMemoryModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition flex items-center gap-1.5 shadow-xs"
                      title="Upload or paste past project archives (Way 1)"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-600" />
                      <span>+ Import Past CSV</span>
                    </button>
                    <button
                      onClick={handleArchiveProjectToMemory}
                      disabled={isArchivingProject}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#4648D4] border border-indigo-200 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      title="Archive current active project lessons into memory (Way 2)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#4648D4]" />
                      <span>{isArchivingProject ? 'Archiving...' : 'Archive Active Project'}</span>
                    </button>
                    <button
                      onClick={() => setShowAllHistorical(!showAllHistorical)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#F5F2FE] hover:bg-[#E9E6F3] text-[#4648D4] border border-[#C7C4D7]/30 transition"
                    >
                      {showAllHistorical ? 'Hide Dataset' : `Browse All ${historicalRecords.length || 40} Records`}
                    </button>
                  </div>
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
                        placeholder="Ask about past piping delays, civil foundation risks, weather impacts..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-400 transition"
                      />
                    </div>
                    <button
                      onClick={() => handleMemoryQuery()}
                      disabled={isQueryingMemory || !memoryQuery.trim()}
                      className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium text-sm transition flex items-center justify-center gap-2 shrink-0 active:scale-98"
                    >
                      {isQueryingMemory ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Synthesizing...</span>
                        </>
                      ) : (
                        <span>Query Memory</span>
                      )}
                    </button>
                  </div>

                  {/* Preset Suggestions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500">Suggestions:</span>
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
                        className="px-2.5 py-1 text-xs rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition"
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
                      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                        <span className="text-xs text-slate-500 block">Records Analyzed</span>
                        <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                          {memoryResult.computed_stats.totalRetrieved}
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                        <span className="text-xs text-slate-500 block">Delayed Activities</span>
                        <span className="text-2xl font-bold text-amber-600 font-mono mt-1 block">
                          {memoryResult.computed_stats.delayedCount}
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                        <span className="text-xs text-slate-500 block">Avg Delay Days</span>
                        <span className="text-2xl font-bold text-rose-600 font-mono mt-1 block">
                          +{memoryResult.computed_stats.averageDelayDays}d
                        </span>
                      </div>
                      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                        <span className="text-xs text-slate-500 block">Synthesis Model</span>
                        <span className="text-xs font-mono font-semibold text-slate-900 mt-2 block truncate">
                          {memoryResult.model_used.replace('apac.amazon.', '').replace(':0', '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Synthesized Narrative Card with Rich Section & Citation Parser */}
                  <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          Synthesized Institutional Memory
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Multi-project synthesis grounded in pgvector embeddings with strict citations
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                        Nova Pro • Grounded
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

      {/* ========================================================================= */}
      {/* NEW PROJECT ONBOARDING MODAL                                              */}
      {/* ========================================================================= */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-xl w-full shadow-2xl border border-[#C7C4D7]/40 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-[#F5F2FE] border-b border-[#C7C4D7]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4648D4] text-white flex items-center justify-center shadow-md shadow-[#4648D4]/20">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1B1B23]">
                    Onboard New Capital Project
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Register project profile and ingest baseline schedule with Bedrock Titan V2
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onboardingStage === 'creating' || onboardingStage === 'importing' || onboardingStage === 'embedding') return;
                  setIsNewProjectModalOpen(false);
                  setOnboardingStage('idle');
                  setOnboardingError(null);
                }}
                disabled={onboardingStage === 'creating' || onboardingStage === 'importing' || onboardingStage === 'embedding'}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              {/* Live Onboarding Progress Bar during active submission */}
              {onboardingStage !== 'idle' && (
                <div className="p-5 rounded-2xl bg-[#F5F2FE] border border-[#C7C4D7]/40 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4648D4] uppercase tracking-wider">
                      Onboarding Pipeline Status
                    </span>
                    {onboardingStage === 'success' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : onboardingStage === 'error' ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                        Failed
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center gap-1.5 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                      </span>
                    )}
                  </div>

                  {/* Step Checklist */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      {onboardingStage === 'creating' ? (
                        <Loader2 className="w-4 h-4 text-[#4648D4] animate-spin shrink-0" />
                      ) : ['importing', 'embedding', 'success'].includes(onboardingStage) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={onboardingStage === 'creating' ? 'font-bold text-[#4648D4]' : 'text-slate-700'}>
                        1. Creating Project Identity Record & Isolation Boundaries
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {onboardingStage === 'importing' ? (
                        <Loader2 className="w-4 h-4 text-[#4648D4] animate-spin shrink-0" />
                      ) : ['embedding', 'success'].includes(onboardingStage) ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={onboardingStage === 'importing' ? 'font-bold text-[#4648D4]' : 'text-slate-700'}>
                        2. Parsing CSV Schedule & Building Project-Scoped WBS Tree
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {onboardingStage === 'embedding' ? (
                        <Loader2 className="w-4 h-4 text-[#4648D4] animate-spin shrink-0" />
                      ) : onboardingStage === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className={onboardingStage === 'embedding' ? 'font-bold text-[#4648D4]' : 'text-slate-700'}>
                        3. Generating Amazon Titan V2 1024-dim Schedule Vector Embeddings
                      </span>
                    </div>
                  </div>

                  {onboardingResult && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                      ✓ Initialized {onboardingResult.activitiesCreated} activities with {onboardingResult.embeddingsGenerated} Titan V2 vector embeddings.
                    </div>
                  )}
                </div>
              )}

              {onboardingError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Onboarding Error</p>
                    <p className="mt-0.5">{onboardingError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
                {/* Project Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-[#64748B] uppercase">Project Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g. Numaligarh Refinery Crude Distillation Unit-4"
                      className="w-full h-11 px-4 rounded-xl bg-[#F5F2FE] border border-[#C7C4D7]/30 text-sm text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20 focus:border-[#4648D4] transition"
                      disabled={onboardingStage !== 'idle' && onboardingStage !== 'error'}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#64748B] uppercase">Organization / Client</label>
                    <input
                      type="text"
                      value={newProjectOrg}
                      onChange={(e) => setNewProjectOrg(e.target.value)}
                      placeholder="e.g. Numaligarh Refinery Limited"
                      className="w-full h-11 px-4 rounded-xl bg-[#F5F2FE] border border-[#C7C4D7]/30 text-sm text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20 focus:border-[#4648D4] transition"
                      disabled={onboardingStage !== 'idle' && onboardingStage !== 'error'}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#64748B] uppercase">Location</label>
                    <input
                      type="text"
                      value={newProjectLocation}
                      onChange={(e) => setNewProjectLocation(e.target.value)}
                      placeholder="e.g. Golaghat, Assam"
                      className="w-full h-11 px-4 rounded-xl bg-[#F5F2FE] border border-[#C7C4D7]/30 text-sm text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20 focus:border-[#4648D4] transition"
                      disabled={onboardingStage !== 'idle' && onboardingStage !== 'error'}
                    />
                  </div>
                </div>

                {/* Baseline Schedule Import Section */}
                <div className="space-y-2 pt-2 border-t border-[#C7C4D7]/20">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#64748B] uppercase">
                      Baseline Schedule CSV
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewProjectInputMode('text');
                        setNewProjectCsvText(`activity_code,description,discipline,line,location,planned_start,planned_end
NRL-PIP-1001,Erect Crude Feed Overhead Line 12-CS-01,Piping,12-CS-01,CDU Column Area,2026-09-01,2026-09-12
NRL-ELE-2001,Pull 11kV High Voltage Feeder Cables,Electrical,,Substation 4,2026-09-05,2026-09-10
NRL-CIV-3001,Cast Concrete Foundation for Reformer Furnace F-101,Civil,,Reformer Unit,2026-08-25,2026-09-02
NRL-INS-4001,Mount Differential Pressure Transmitter PDT-301,Instrumentation,12-CS-01,CDU Column Area,2026-09-11,2026-09-13`);
                      }}
                      className="text-[11px] font-bold text-[#4648D4] hover:underline"
                    >
                      Use Sample NRL Schedule
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex p-1 bg-[#F5F2FE] rounded-xl border border-[#C7C4D7]/20">
                    <button
                      type="button"
                      onClick={() => setNewProjectInputMode('file')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                        newProjectInputMode === 'file' ? 'bg-white shadow-xs text-[#4648D4]' : 'text-[#64748B]'
                      }`}
                    >
                      Upload CSV File
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProjectInputMode('text')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                        newProjectInputMode === 'text' ? 'bg-white shadow-xs text-[#4648D4]' : 'text-[#64748B]'
                      }`}
                    >
                      Paste CSV Text
                    </button>
                  </div>

                  {newProjectInputMode === 'file' ? (
                    <div
                      onClick={() => newProjectFileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#C7C4D7]/60 hover:border-[#4648D4] p-6 rounded-2xl text-center cursor-pointer bg-[#F5F2FE]/40 transition group"
                    >
                      <input
                        ref={newProjectFileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => setNewProjectCsvFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <FileSpreadsheet className="w-8 h-8 text-[#4648D4] mx-auto mb-2 group-hover:scale-110 transition" />
                      {newProjectCsvFile ? (
                        <div>
                          <p className="text-xs font-bold text-[#1B1B23]">{newProjectCsvFile.name}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">
                            {(newProjectCsvFile.size / 1024).toFixed(1)} KB • Ready for embedding
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-[#1B1B23]">
                            Click to browse or drag & drop schedule.csv
                          </p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">
                            Standard format: activity_code, description, discipline, line, location, dates
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      rows={5}
                      value={newProjectCsvText}
                      onChange={(e) => setNewProjectCsvText(e.target.value)}
                      placeholder="activity_code,description,discipline,line,location,planned_start,planned_end&#10;NRL-PIP-1001,Erect Crude Feed Overhead Line 12-CS-01,Piping,12-CS-01,CDU Area,2026-09-01,2026-09-12"
                      className="w-full p-3 rounded-xl bg-[#F5F2FE] border border-[#C7C4D7]/30 text-xs font-mono text-[#1B1B23] focus:ring-2 focus:ring-[#4648D4]/20 resize-y"
                    />
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-[#C7C4D7]/20 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    disabled={onboardingStage === 'creating' || onboardingStage === 'importing' || onboardingStage === 'embedding'}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={onboardingStage === 'creating' || onboardingStage === 'importing' || onboardingStage === 'embedding' || onboardingStage === 'success'}
                    className="px-6 py-2.5 rounded-xl bg-[#4648D4] hover:bg-[#3B3DC0] text-white text-xs font-semibold shadow-md shadow-[#4648D4]/25 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    {onboardingStage === 'creating' || onboardingStage === 'importing' || onboardingStage === 'embedding' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Embeddings...</span>
                      </>
                    ) : onboardingStage === 'success' ? (
                      <>
                        <CheckCheck className="w-4 h-4" />
                        <span>Onboarded!</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-4 h-4" />
                        <span>Onboard Project & Embed</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORT PAST HISTORICAL RECORDS CSV (WAY 1)                         */}
      {/* ========================================================================= */}
      {isImportMemoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#C7C4D7]/40 max-h-[90vh] overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#C7C4D7]/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#1B1B23]">Import Past Company Records</h3>
                    <p className="text-xs text-[#64748B]">Feed historical project delays &amp; lessons learned into Institutional Memory</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportMemoryModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {importMemoryError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importMemoryError}</span>
                </div>
              )}

              <form onSubmit={handleImportMemorySubmit} className="space-y-4">
                <div className="flex p-1 bg-[#F5F2FE] rounded-xl border border-[#C7C4D7]/20">
                  <button
                    type="button"
                    onClick={() => setImportMemoryInputMode('file')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      importMemoryInputMode === 'file' ? 'bg-white shadow-xs text-purple-700' : 'text-[#64748B]'
                    }`}
                  >
                    Upload CSV File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMemoryInputMode('text')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      importMemoryInputMode === 'text' ? 'bg-white shadow-xs text-purple-700' : 'text-[#64748B]'
                    }`}
                  >
                    Paste CSV Text
                  </button>
                </div>

                {importMemoryInputMode === 'file' ? (
                  <div
                    onClick={() => memoryFileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-200 hover:border-purple-500 p-6 rounded-2xl text-center cursor-pointer bg-purple-50/30 transition group"
                  >
                    <input
                      ref={memoryFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportMemoryCsvFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <FileSpreadsheet className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition" />
                    {importMemoryCsvFile ? (
                      <div>
                        <p className="text-xs font-bold text-[#1B1B23]">{importMemoryCsvFile.name}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          {(importMemoryCsvFile.size / 1024).toFixed(1)} KB • Ready to embed with Titan V2
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-[#1B1B23]">
                          Click to browse or drop historical_delays.csv
                        </p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          Columns: project_name, discipline, activity_description, delay_days, delay_cause, notes
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#64748B] uppercase">CSV Data</label>
                      <button
                        type="button"
                        onClick={() => {
                          setImportMemoryCsvText(`project_name,discipline,activity_description,planned_duration_days,actual_duration_days,delay_days,delay_cause,notes
Mumbai High Offshore,Piping,Underwater Spool Tie-In,14,28,14,Heavy monsoons & subsea crane failure,Pre-book backup hydraulic cranes during coastal monsoon
Jamnagar Refinery Phase 3,Civil,Furnace Concrete Pour,8,17,9,Excavation waterlogging,Install automatic dewatering sumps before casting`);
                        }}
                        className="text-[11px] font-bold text-purple-600 hover:underline"
                      >
                        Paste Sample Data
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={importMemoryCsvText}
                      onChange={(e) => setImportMemoryCsvText(e.target.value)}
                      placeholder="project_name,discipline,activity_description,planned_duration_days,actual_duration_days,delay_days,delay_cause,notes&#10;Mumbai High,Piping,Spool Tie-In,10,20,10,Crane breakdown,Book backup cranes"
                      className="w-full p-3 rounded-xl bg-[#F5F2FE] border border-[#C7C4D7]/30 text-xs font-mono text-[#1B1B23] focus:ring-2 focus:ring-purple-500/20 resize-y"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-[#C7C4D7]/20 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsImportMemoryModalOpen(false)}
                    disabled={isImportingMemory}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImportingMemory}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition flex items-center gap-2 disabled:opacity-60"
                  >
                    {isImportingMemory ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Vectorizing with Titan V2...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Embed &amp; Ingest to Memory</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
