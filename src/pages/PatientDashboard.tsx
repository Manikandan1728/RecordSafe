import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveAccess } from '../context/LiveAccessContext';
import { MedicalDocument, AccessRequest, ViewingSession, Reminder } from '../types';
import { api } from '../services/api';
import { LiveAccessBanner } from '../components/LiveAccessBanner';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { AccessTraceModal } from '../components/AccessTraceModal';
import { AIReportModal } from '../components/AIReportModal';
import { HealthAssistant } from '../components/HealthAssistant';
import { DashboardLayout, NavItem } from '../components/DashboardLayout';
import {
  FileText,
  ShieldCheck,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Search,
  Filter,
  Plus,
  Eye,
  Calendar,
  Pill,
  Lock,
  Stethoscope,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Check,
  ChevronRight
} from 'lucide-react';

interface PatientDashboardProps {
  onOpenBlockchainExplorer: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onOpenBlockchainExplorer }) => {
  const { user } = useAuth();
  const {
    liveSession,
    pendingRequests,
    completedSessionTrace,
    setCompletedSessionTrace,
    setActiveConsentModalRequest,
    refreshRequests,
    revokeSession,
    respondToRequest,
    lastDocumentUpdateTime,
  } = useLiveAccess();

  const [activeTab, setActiveTab] = useState<'locker' | 'consent' | 'history' | 'reminders' | 'assistant'>('locker');
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [viewingDoc, setViewingDoc] = useState<MedicalDocument | null>(null);
  const [aiAnalysisDoc, setAiAnalysisDoc] = useState<MedicalDocument | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<any | null>(null);

  // History & Reminders
  const [accessHistory, setAccessHistory] = useState<ViewingSession[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddReminderModal, setShowAddReminderModal] = useState<boolean>(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderCat, setNewReminderCat] = useState<'medication' | 'test' | 'consultation' | 'general'>('medication');
  const [newReminderTime, setNewReminderTime] = useState('08:00 PM');
  const [newReminderDate, setNewReminderDate] = useState('2026-10-15');

  const categories = [
    'All',
    'Blood Reports',
    'Dental Records',
    'ECG',
    'Scans',
    'X-Rays',
    'Prescriptions',
    'Lab Reports',
    'Medical History'
  ];

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getMyDocuments({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery || undefined,
      });
      setDocuments(res.documents || []);
    } catch (e) {
      console.warn('Failed to load documents', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.getAccessHistory();
      setAccessHistory(res.sessions || []);
    } catch (e) {
      console.warn('Failed to load access history', e);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await api.getReminders();
      setReminders(res.reminders || []);
    } catch (e) {
      console.warn('Failed to load reminders', e);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchHistory();
    fetchReminders();
  }, [selectedCategory, searchQuery, lastDocumentUpdateTime]);

  const handleToggleReminder = async (id: string) => {
    try {
      await api.toggleReminder(id);
      fetchReminders();
    } catch (e) {
      console.error('Failed to toggle reminder', e);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await api.deleteReminder(id);
      fetchReminders();
    } catch (e) {
      console.error('Failed to delete reminder', e);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createReminder({
        title: newReminderTitle,
        category: newReminderCat,
        due_time: newReminderTime,
        due_date: newReminderDate,
      });
      setShowAddReminderModal(false);
      setNewReminderTitle('');
      fetchReminders();
    } catch (e) {
      console.error('Failed to create reminder', e);
    }
  };

  const navItems: NavItem[] = [
    {
      id: 'locker',
      label: 'Health Records',
      icon: FileText,
      badge: documents.length > 0 ? documents.length : null,
    },
    {
      id: 'consent',
      label: 'Doctor Consent',
      icon: Lock,
      badge: pendingRequests.length > 0 ? pendingRequests.length : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'history',
      label: 'Live & Access Trace',
      icon: Activity,
      badge: liveSession ? 'LIVE' : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'assistant',
      label: 'AI Health Assistant',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: Pill,
      badge: reminders.length > 0 ? reminders.length : null,
    },
  ];

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      navItems={navItems}
      onOpenBlockchainExplorer={onOpenBlockchainExplorer}
      headerTitle="Patient Health Vault"
      headerSubtitle="Encrypted Personal Health Records & Consent Management"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* ======================================================== */}
        {/* 1. WELCOME HEADER (DYNAMIC & CLEAN TYPOGRAPHY)          */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Good morning, {user?.name}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Patient
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Personal Health Locker</span>
              <span className="text-slate-300">•</span>
              <span>Blood Group: <strong className="text-slate-700 font-bold">{user?.blood_group || 'O+'}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Patient ID: <strong className="font-mono text-slate-700">{user?.id}</strong></span>
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:self-auto">
            <button
              onClick={() => {
                fetchDocuments();
                fetchHistory();
                fetchReminders();
                refreshRequests();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm transition-all"
              title="Refresh locker"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Encrypted Vault Active</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SIGNATURE FEATURE: LIVE ACCESS TRANSPARENCY BANNER    */}
        {/* ======================================================== */}
        <LiveAccessBanner />

        {/* ======================================================== */}
        {/* 3. PROMINENT PENDING ACCESS REQUESTS SECTION             */}
        {/* ======================================================== */}
        {pendingRequests.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md shadow-amber-500/5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200">
              <div className="flex items-center space-x-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                  <span>Access Requests Requiring Your Consent</span>
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-sm">
                🔔 {pendingRequests.length} Pending
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4 mt-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-300 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold flex-shrink-0">
                        <Stethoscope className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 text-sm">{req.doctor_name}</span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase border border-amber-200">
                          {req.doctor_specialization}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700">Requesting: </span>
                      <span className="text-xs text-sky-800 font-semibold">
                        {req.requestedDocuments && req.requestedDocuments.length > 0
                          ? req.requestedDocuments.map(d => `${d.title} (${d.category})`).join(', ')
                          : 'Specialty-Authorized Clinical Records'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Purpose: </span>
                      "{req.purpose}"
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center space-x-3">
                      <span>Duration: <strong className="text-slate-800 font-bold">{req.duration_minutes}m</strong></span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">Cryptographically Encrypted Request</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:self-end lg:self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => respondToRequest(req.id, 'deny')}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5"
                    >
                      <XCircle className="h-4 w-4 text-rose-500" />
                      <span>Deny</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToRequest(req.id, 'grant', req.duration_minutes || 30)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      <span>Allow ({req.duration_minutes}m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConsentModalRequest(req)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                      title="Customize duration or permissions"
                    >
                      Review →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. 4-COLUMN RESPONSIVE DESKTOP STATUS CARDS             */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Health Records */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Health Records</span>
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{documents.length}</div>
              <div className="mt-1 text-xs text-slate-500">Verified medical files</div>
            </div>
          </div>

          {/* Card 2: Consent Requests */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Consent Requests</span>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{pendingRequests.length}</div>
              <div className="mt-1 text-xs text-slate-500">Awaiting your approval</div>
            </div>
          </div>

          {/* Card 3: Live Transparency */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Live Transparency</span>
              <div className={`p-2.5 rounded-xl border ${liveSession ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {liveSession ? '1 Active' : 'Idle'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {liveSession ? 'Doctor viewing now' : 'No doctor active'}
              </div>
            </div>
          </div>

          {/* Card 4: Integrity Audit */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Integrity Audit</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">100%</div>
              <div className="mt-1 text-xs text-slate-500">SHA-256 Ledger Verified</div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. MAIN NAVIGATION TABS (DESKTOP & TABLET ADAPTIVE)      */}
        {/* ======================================================== */}
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveTab('locker')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'locker'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>My Medical Records ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consent')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'consent'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Doctor Consent & Permissions</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Access Trace & Audit ({accessHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'reminders'
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Pill className="h-4 w-4" />
            <span>Health Reminders ({reminders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'assistant'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm shadow-violet-200'
                : 'text-violet-700 hover:bg-violet-50 border border-violet-200/80'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Health Assistant</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 6. TAB CONTENT: 1. HEALTH RECORDS (DESKTOP GRID/ROWS)    */}
        {/* ======================================================== */}
        {activeTab === 'locker' && (
          <div className="space-y-6">
            {/* Category Filter Pills & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full md:w-auto py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80 flex-shrink-0">
                <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search records or findings..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                />
              </div>
            </div>

            {/* Document Cards Grid */}
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading your medical documents...</div>
            ) : documents.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No medical records found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No documents match the selected filter. Reports uploaded by diagnostic labs or hospitals will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Tag & Status */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {doc.category}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      </div>

                      {/* Title & Specialty */}
                      <div className="mt-3.5">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Specialty: <span className="font-semibold text-slate-700">{doc.specialty}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Uploaded by {doc.uploader_name || 'Medical Provider'} • {doc.created_at ? String(doc.created_at).substring(0, 10) : 'Recent'}
                        </p>
                      </div>

                      {/* SHA-256 Hash badge */}
                      <div className="mt-3 p-2 bg-slate-50 rounded-xl text-[10px] font-mono text-slate-500 flex items-center justify-between border border-slate-100">
                        <span className="truncate max-w-[200px]">SHA-256: {doc.file_hash ? String(doc.file_hash).substring(0, 14) : 'SHA256-VERIFIED'}...</span>
                        <span className="text-emerald-600 font-bold flex-shrink-0">100% Intact</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-sky-700 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Report</span>
                      </button>
                      <button
                        onClick={() => setAiAnalysisDoc(doc)}
                        className="py-2.5 px-3.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                        title="AI Report Explainer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                        <span>AI Insights</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. TAB CONTENT: 2. DOCTOR CONSENT & PERMISSIONS          */}
        {/* ======================================================== */}
        {activeTab === 'consent' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" /> Incoming Doctor Access Requests
                </h3>
                <span className="text-xs font-bold text-slate-500">{pendingRequests.length} Pending</span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No pending requests. Doctors requesting records relevant to their specialty will appear here.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{req.doctor_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold uppercase">
                            {req.doctor_specialization}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Clinical Purpose:</span> {req.purpose}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Requested Duration: <span className="font-bold text-slate-700">{req.duration_minutes} minutes</span>
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveConsentModalRequest(req)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex-shrink-0"
                      >
                        Review & Allow Access →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. TAB CONTENT: 3. ACCESS TRACE & AUDIT HISTORY          */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" /> Historical Viewing Sessions & Page Activity
              </h3>
              <button
                onClick={onOpenBlockchainExplorer}
                className="text-xs text-sky-700 font-bold hover:underline flex items-center gap-1"
              >
                <LinkIcon className="h-3.5 w-3.5" /> View Full Blockchain Ledger →
              </button>
            </div>

            {accessHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No historical viewing sessions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">Doctor & Specialty</th>
                      <th className="py-3 px-4 font-bold">Document Viewed</th>
                      <th className="py-3 px-4 font-bold">Session Date & Time</th>
                      <th className="py-3 px-4 font-bold">Duration</th>
                      <th className="py-3 px-4 font-bold">Blockchain Status</th>
                      <th className="py-3 px-4 font-bold text-right">Audit Trace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accessHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {s.doctor_name}
                          <span className="block text-[10px] font-normal text-sky-700">
                            {s.doctor_specialization}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {s.document_title}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {s.document_category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {s.started_at}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                          {Math.max(1, Math.round(s.total_duration_seconds / 60))}m {s.total_duration_seconds % 60}s
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" /> Audited
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedTrace(s)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] transition-colors"
                          >
                            View Trace →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 9. TAB CONTENT: 4. HEALTH REMINDERS                      */}
        {/* ======================================================== */}
        {activeTab === 'reminders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Pill className="h-4 w-4 text-teal-600" /> Patient Health & Medication Reminders
              </h3>
              <button
                onClick={() => setShowAddReminderModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Reminder</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {reminders.map((rem) => {
                const isCompleted = rem.status === 'completed';
                return (
                  <div
                    key={rem.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCompleted
                        ? 'bg-slate-50/80 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 shadow-sm hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => handleToggleReminder(rem.id)}
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-sky-500'
                        }`}
                      >
                        {isCompleted && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {rem.category}
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <h4 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {rem.title}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 font-mono">
                        <span>⏰ {rem.due_time}</span>
                        <span>•</span>
                        <span>📅 {rem.due_date}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete reminder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 10. TAB CONTENT: 5. AI HEALTH ASSISTANT                  */}
        {/* ======================================================== */}
        {activeTab === 'assistant' && (
          <div>
            <HealthAssistant
              onViewDocument={(docId) => {
                const doc = documents.find(d => d.id === docId);
                if (doc) setViewingDoc(doc);
              }}
            />
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Health Reminder</h3>
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  placeholder="e.g. Metformin 500mg - Post Dinner"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newReminderCat}
                    onChange={(e) => setNewReminderCat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="medication">Medication</option>
                    <option value="test">Diagnostic Test</option>
                    <option value="consultation">Consultation</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Time</label>
                  <input
                    type="text"
                    required
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    placeholder="08:00 PM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          document={viewingDoc}
          isDoctorMode={false}
          onClose={() => setViewingDoc(null)}
          onOpenAIAnalysis={(doc) => {
            setViewingDoc(null);
            setAiAnalysisDoc(doc);
          }}
        />
      )}

      {/* AI Health Summary Modal */}
      {aiAnalysisDoc && (
        <AIReportModal
          document={aiAnalysisDoc}
          onClose={() => setAiAnalysisDoc(null)}
        />
      )}

      {/* Access Trace Modal (from history or live session end) */}
      {(selectedTrace || completedSessionTrace) && (
        <AccessTraceModal
          traceData={selectedTrace || completedSessionTrace}
          onClose={() => {
            setSelectedTrace(null);
            setCompletedSessionTrace(null);
          }}
        />
      )}
    </DashboardLayout>
  );
};

