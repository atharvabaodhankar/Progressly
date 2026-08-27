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
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function BridgeIQApp() {
  const [activeTab, setActiveTab] = useState<'upload' | 'review' | 'audit'>('review');

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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
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

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Counts
  const pendingCount = matches.filter((m) => m.status === 'pending').length;
  const manualCount = matches.filter((m) => m.status === 'manual_resolution').length;

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
          resolved_by: 'Planner User (Lead Engineer)',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} match`);
      }

      // Optimistic update: Remove from pending list
      setMatches((prev) => prev.filter((m) => m.id !== matchId));

      const actionText = action === 'planner_approved' ? 'approved' : 'rejected';
      showToast(`Match for activity ${activityCode} was ${actionText}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update match';
      showToast(msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Helpers for Confidence Tiers
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
              <p className="text-xs text-slate-400">Intelligent Schedule-Linking & Verification</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Report</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'review'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Queue</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-xs font-semibold bg-amber-400 text-slate-950 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
                          {/* Confidence Score Pill */}
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
      </main>
    </div>
  );
}
