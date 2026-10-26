import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, MedicalDocument } from '../types';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { AccessTraceModal } from '../components/AccessTraceModal';
import { DashboardLayout, NavItem } from '../components/DashboardLayout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  Stethoscope,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Eye,
  Send,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Users,
  History,
  Check,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface DoctorDashboardProps {
  onOpenBlockchainExplorer?: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onOpenBlockchainExplorer }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'patients' | 'records' | 'requests' | 'history' | 'audit'>('patients');
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [patientRecords, setPatientRecords] = useState<{
    permittedRecords: any[];
    restrictedRecords: any[];
    activePermission: any;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // Request Access Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('Clinical evaluation & consultation.');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Active Viewer
  const [activeViewingDoc, setActiveViewingDoc] = useState<MedicalDocument | null>(null);
  const [lastTraceData, setLastTraceData] = useState<any | null>(null);

  // Ref to always track latest selectedPatient without stale closure issues
  const selectedPatientRef = useRef<User | null>(selectedPatient);
  useEffect(() => {
    selectedPatientRef.current = selectedPatient;
  }, [selectedPatient]);

  const fetchPatients = async () => {
    setLoading(true);
    setPatientsError(null);
    try {
      const res = await api.getDoctorPatients(searchQuery);
      const fetchedPatients = Array.isArray(res?.patients) ? res.patients : [];
      setPatients(fetchedPatients);
      
      // Preserve currently selected patient if still valid, or select first available
      setSelectedPatient((prev) => {
        if (prev) {
          const matched = fetchedPatients.find((p) => p.id === prev.id);
          return matched || prev;
        }
        return fetchedPatients.length > 0 ? fetchedPatients[0] : null;
      });
    } catch (e: any) {
      console.warn('[DoctorDashboard] Failed to load patients', e);
      setPatientsError(e?.message || 'Unable to connect to patient directory. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientRecords = useCallback(async (patientId: string) => {
    if (!patientId) {
      return;
    }
    setRecordsLoading(true);
    setRecordsError(null);

    console.log('[PERMISSION REFRESH]', {
      request: `GET /api/doctor/patients/${patientId}/records`,
      patientId,
    });

    try {
      const res = await api.getPatientRecordsForDoctor(patientId);
      
      console.log('[PERMISSION REFRESH]', {
        'response status': 200,
        'response keys': Object.keys(res || {}),
      });

      const safePermitted = Array.isArray(res?.permittedRecords) ? res.permittedRecords : [];
      const safeRestricted = Array.isArray(res?.restrictedRecords) ? res.restrictedRecords : [];
      const safeActivePermission = res?.activePermission || null;

      console.log('[DOCUMENT REFRESH]', {
        patientId,
        'response status': 200,
        'response keys': Object.keys(res || {}),
        'document count': safePermitted.length,
      });

      setPatientRecords({
        permittedRecords: safePermitted,
        restrictedRecords: safeRestricted,
        activePermission: safeActivePermission,
      });

      // If active permission is confirmed, auto-close any open request modal
      if (safeActivePermission) {
        setShowRequestModal(false);
      }

      // Pre-select permitted records
      setSelectedDocIds(safePermitted.map((r: any) => r.id).filter(Boolean));

      console.log('[DOCTOR STATE AFTER APPROVAL]', {
        selectedPatient: patientId,
        'permission state': safeActivePermission ? 'approved' : 'none',
        'documents state': `${safePermitted.length} permitted, ${safeRestricted.length} restricted`,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      console.error('[DOCUMENT REFRESH ERROR]', e);
      setRecordsError(e?.message || 'Unable to load permitted records');
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

  useEffect(() => {
    const currentId = selectedPatient?.id;
    if (currentId) {
      fetchPatientRecords(currentId);

      // Polling fallback to keep status fresh
      const pollInterval = setInterval(() => {
        const activeId = selectedPatientRef.current?.id;
        if (activeId) {
          fetchPatientRecords(activeId);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    } else {
      setPatientRecords(null);
    }
  }, [selectedPatient?.id, user?.specialization, fetchPatientRecords]);

  // WebSocket listeners for instant approval notification
  useEffect(() => {
    const handleStatusChange = async (eventType: string, data: any) => {
      console.log('[APPROVAL EVENT RECEIVED]', {
        'event type': eventType,
        requestId: data?.requestId || data?.id || 'N/A',
        patientId: data?.patientId || 'N/A',
        doctorId: user?.id || data?.doctorId || 'N/A',
      });

      try {
        const currentPatient = selectedPatientRef.current;
        if (!currentPatient) {
          console.warn('[DoctorDashboard] Approval event received but no patient is selected.');
          return;
        }

        // Validate payload before refreshing
        if (data && data.patientId && data.patientId !== currentPatient.id) {
          console.log(`[DoctorDashboard] Event patientId (${data.patientId}) differs from selectedPatient (${currentPatient.id}). Preserving state.`);
          return;
        }

        await fetchPatientRecords(currentPatient.id);
      } catch (err) {
        console.error('[APPROVAL EVENT HANDLER EXCEPTION]', err);
        setRecordsError(err instanceof Error ? err.message : 'Failed to refresh records after approval');
      }
    };

    const unsubGranted = wsClient.on('ACCESS_GRANTED', (data) => {
      handleStatusChange('ACCESS_GRANTED', data);
    });

    const unsubStatusChanged = wsClient.on('ACCESS_REQUEST_STATUS_CHANGED', (data) => {
      handleStatusChange('ACCESS_REQUEST_STATUS_CHANGED', data);
    });

    const unsubRevoked = wsClient.on('ACCESS_REVOKED', (data) => {
      handleStatusChange('ACCESS_REVOKED', data);
    });

    const unsubNewDoc = wsClient.on('NEW_DOCUMENT_UPLOADED', (data) => {
      const activeId = selectedPatientRef.current?.id;
      if (activeId) fetchPatientRecords(activeId);
    });

    return () => {
      unsubGranted();
      unsubStatusChanged();
      unsubRevoked();
      unsubNewDoc();
    };
  }, [fetchPatientRecords, user?.id]);

  const handleSendAccessRequest = async (docIdsToRequest: string[] = selectedDocIds) => {
    if (!selectedPatient) return;
    setSubmittingRequest(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      console.log(`[DoctorDashboard:HTTP] Creating access request for patient ${selectedPatient.id}, docs:`, docIdsToRequest);
      await api.createAccessRequest({
        patient_id: selectedPatient.id,
        document_ids: docIdsToRequest,
        purpose,
      });

      setRequestSuccess('✓ Access request sent. Waiting for patient approval. The medical record will remain inaccessible until the patient grants permission.');
      setTimeout(() => {
        setShowRequestModal(false);
        const activeId = selectedPatientRef.current?.id;
        if (activeId) {
          fetchPatientRecords(activeId);
        }
      }, 2500);
    } catch (err: any) {
      console.warn('[DoctorDashboard:HTTP] Access request creation failed:', err);
      setRequestError(err.message || 'Access request rejected by security policy.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Test Attempting Unauthorized Access (Demonstrating Hackathon Spec Step 9)
  const handleAttemptUnauthorizedAccess = async (restrictedDoc: any) => {
    if (!selectedPatient) return;
    try {
      await api.createAccessRequest({
        patient_id: selectedPatient.id,
        document_ids: [restrictedDoc.id],
        purpose: 'Attempting unauthorized specialty record access',
        duration_minutes: 30,
      });
    } catch (err: any) {
      alert(`🔒 SERVER-SIDE AUTHORIZATION REJECTED (403 ACCESS_RESTRICTED):\n\n${err.message || 'Your medical specialization does not permit access to this record category.'}`);
    }
  };

  const handleOpenDocument = async (docId: string) => {
    console.log(`[DoctorDashboard:HTTP] Opening document ID: ${docId}`);
    try {
      const res = await api.getDocument(docId);
      if (res?.document) {
        console.log(`[DoctorDashboard:HTTP] Document loaded successfully: "${res.document.title}"`);
        setActiveViewingDoc(res.document);
      } else {
        alert('Document details could not be loaded.');
      }
    } catch (err: any) {
      console.warn(`[DoctorDashboard:HTTP] Failed to open document ${docId}:`, err);
      alert(err.message || 'Unable to open document');
    }
  };

  // Helper function to safely format timestamp
  const formatTime = (timeStr: any) => {
    if (!timeStr) return '';
    const str = String(timeStr);
    if (str.length >= 16) {
      return str.substring(11, 16);
    }
    return str;
  };

  const navItems: NavItem[] = [
    {
      id: 'patients',
      label: 'Patient Directory',
      icon: Users,
      badge: patients?.length > 0 ? patients.length : null,
    },
    {
      id: 'records',
      label: 'Clinical Records',
      icon: FileText,
      badge: patientRecords?.permittedRecords?.length || null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'requests',
      label: 'Access Requests',
      icon: Lock,
    },
    {
      id: 'history',
      label: 'Viewing History',
      icon: History,
    },
    {
      id: 'audit',
      label: 'Blockchain Ledger',
      icon: ShieldCheck,
    },
  ];

  console.log('[DoctorDashboard:Render] Rendering state:', {
    selectedPatientId: selectedPatient?.id,
    recordsLoading,
    hasRecords: Boolean(patientRecords),
    permittedCount: patientRecords?.permittedRecords?.length || 0,
    hasActivePermission: Boolean(patientRecords?.activePermission),
    showRequestModal,
    activeViewingDocId: activeViewingDoc?.id
  });

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      navItems={navItems}
      onOpenBlockchainExplorer={onOpenBlockchainExplorer}
      headerTitle={`Clinical Portal • ${user?.specialization || 'General Medicine'}`}
      headerSubtitle="Specialty-Governed Patient Record Access"
    >
      <ErrorBoundary inline fallbackTitle="Doctor Portal View Exception" onReset={() => { fetchPatients(); if (selectedPatient) fetchPatientRecords(selectedPatient.id); }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          {/* ======================================================== */}
          {/* 1. DOCTOR WELCOME & SPECIALIZATION HEADER                */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-600/20 flex-shrink-0">
                <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {user?.name || 'Dr. Practitioner'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800 border border-sky-200 uppercase">
                    {user?.specialization || 'Clinical Doctor'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  License ID: <span className="font-mono text-slate-700 font-bold">{user?.license_id || 'MCI-REG-88219'}</span> • Clinical Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:self-auto">
              <button
                onClick={() => {
                  fetchPatients();
                  if (selectedPatient?.id) fetchPatientRecords(selectedPatient.id);
                }}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm transition-all"
                title="Refresh clinical directory"
              >
                <RefreshCw className={`h-4 w-4 ${loading || recordsLoading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
              <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Lock className="h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline">Specialty Access Enforcement: Active</span>
                <span className="sm:hidden">Specialty Enforced</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. 12-COLUMN CLINICAL DASHBOARD GRID                     */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column (4 cols): Patient Directory */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Patient Directory
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {patients?.length || 0} Registered
                  </span>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patient by name..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                  />
                </div>

                {/* Patient Error Alert if any */}
                {patientsError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      <span>Failed to load patients</span>
                    </div>
                    <p className="text-[11px] text-rose-700">{patientsError}</p>
                    <button
                      onClick={fetchPatients}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Patients List / Skeletons */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar">
                  {loading && patients.length === 0 ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 animate-pulse flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-28 bg-slate-200 rounded" />
                            <div className="h-2.5 w-20 bg-slate-200 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 space-y-2">
                      <Users className="h-8 w-8 mx-auto text-slate-300" />
                      <p>{searchQuery ? 'No patients match your search.' : 'No patients registered in the directory yet.'}</p>
                    </div>
                  ) : (
                    patients.map((p) => {
                      const isSelected = selectedPatient?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPatient(p)}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                            isSelected
                              ? 'bg-sky-50/90 border-sky-400 shadow-sm ring-1 ring-sky-400'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50'
                          }`}
                        >
                          <img
                            src={p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name || 'Patient')}`}
                            alt={p.name || 'Patient'}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.name || 'Unnamed Patient'}</div>
                            <div className="text-[11px] text-slate-500">Blood Group: <strong className="text-slate-700">{p.blood_group || 'O+'}</strong></div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{p.email || p.id}</div>
                          </div>
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-sky-600 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (8 cols): Clinical Record Scopes for Selected Patient */}
            <div className="lg:col-span-8 space-y-6">
              {selectedPatient ? (
                <>
                  {/* Selected Patient Banner */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-extrabold text-slate-900">{selectedPatient.name}</h2>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          DOB: {selectedPatient.dob || '1994-06-15'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Patient ID: <span className="font-mono text-slate-700 font-bold">{selectedPatient.id}</span> • Blood: <strong className="text-slate-700">{selectedPatient.blood_group || 'O+'}</strong>
                      </p>
                    </div>

                    {patientRecords?.activePermission ? (
                      <div className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          Consent Active {patientRecords.activePermission?.expiresAt
                            ? `(Expires: ${formatTime(patientRecords.activePermission.expiresAt)})`
                            : patientRecords.activePermission?.grantedAt
                            ? `(Granted: ${formatTime(patientRecords.activePermission.grantedAt)})`
                            : ''}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowRequestModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex items-center space-x-1.5 flex-shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Request Specialty Access</span>
                      </button>
                    )}
                  </div>

                  {/* Records Error Alert if any */}
                  {recordsError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                        <div>
                          <span className="font-bold block">Unable to load permitted records</span>
                          <span className="text-[11px] text-rose-700">{recordsError}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => fetchPatientRecords(selectedPatient.id)}
                        className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-colors flex-shrink-0 shadow-sm"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* 1. Permitted Medical Records (Allowed for Doctor's Specialization) */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Unlock className="h-4 w-4 text-emerald-600" /> Permitted Records for {user?.specialization || 'Clinical Doctor'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Authorized by clinical matrix for your specialty
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {patientRecords?.permittedRecords?.length || 0} Permitted
                      </span>
                    </div>

                    {recordsLoading && !patientRecords ? (
                      <div className="space-y-3 py-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse space-y-2">
                            <div className="h-3.5 w-48 bg-slate-200 rounded" />
                            <div className="h-2.5 w-32 bg-slate-200 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (!patientRecords?.permittedRecords || patientRecords.permittedRecords.length === 0) ? (
                      <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                        <FolderOpen className="h-8 w-8 mx-auto text-slate-300" />
                        <p>No records available</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(patientRecords?.permittedRecords || []).map((doc: any) => {
                          const grantedDocIds = Array.isArray(patientRecords?.activePermission?.grantedDocumentIds)
                            ? patientRecords.activePermission.grantedDocumentIds
                            : [];
                          const isAuthorizedNow = grantedDocIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900 text-xs truncate">{doc.title}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 flex-shrink-0">
                                    {doc.category}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  Specialty: <span className="font-semibold text-slate-700">{doc.specialty}</span> • Pages: {doc.page_count || 1} • Uploaded by {doc.uploader_name || 'Healthcare Network'}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {isAuthorizedNow ? (
                                  <button
                                    onClick={() => handleOpenDocument(doc.id)}
                                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Open Document Viewer</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedDocIds([doc.id]);
                                      setShowRequestModal(true);
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Request Consent</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Restricted Medical Records (Outside Doctor's Specialization) */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Lock className="h-4 w-4 text-rose-500" /> Restricted Records (Outside {user?.specialization || 'Clinical Specialty'})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Confidential patient records locked by backend specialty authorization matrix
                        </p>
                      </div>
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        {patientRecords?.restrictedRecords?.length || 0} Locked
                      </span>
                    </div>

                    {(!patientRecords?.restrictedRecords || patientRecords.restrictedRecords.length === 0) ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No restricted records for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(patientRecords?.restrictedRecords || []).map((doc: any) => (
                          <div
                            key={doc.id}
                            className="p-4 rounded-xl bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-600 flex items-center gap-1.5 truncate">
                                  <Lock className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" /> {doc.title}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 flex-shrink-0">
                                  {doc.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-rose-600 font-medium">
                                🔒 {doc.reason || `Specialty Restricted: ${user?.specialization} cannot access ${doc.category} records.`}
                              </p>
                            </div>

                            <button
                              onClick={() => handleAttemptUnauthorizedAccess(doc)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all flex-shrink-0"
                              title="Test backend 403 authorization rejection"
                            >
                              Test 403 Rejection
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
                  <Stethoscope className="h-12 w-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-700">Select a Patient</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Choose a patient from the directory on the left to review permissible medical documents and request access.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ErrorBoundary>

      {/* Request Access Modal */}
      {showRequestModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-lg">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Request Clinical Record Access
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Patient consent is required before accessing records for {selectedPatient.name}.
            </p>

            {requestError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                {requestError}
              </div>
            )}

            {requestSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                {requestSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Permitted Documents to Request:
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(patientRecords?.permittedRecords || []).map((doc: any) => (
                    <label
                      key={doc.id}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocIds([...selectedDocIds, doc.id]);
                          } else {
                            setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                          }
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-semibold text-slate-800">{doc.title}</span>
                      <span className="text-[10px] text-sky-700 font-bold ml-auto">
                        ({doc.category})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinical Purpose:
                </label>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Clinical consultation & diagnostic evaluation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                Patient approval is required before any record can be viewed. The medical record will remain inaccessible until the patient grants permission.
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingRequest || selectedDocIds.length === 0}
                  onClick={() => handleSendAccessRequest()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  {submittingRequest ? 'Sending Request...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Document Viewer Modal (Real-time Broadcast Active) */}
      {activeViewingDoc && (
        <DocumentViewerModal
          document={activeViewingDoc}
          isDoctorMode={true}
          requestId={patientRecords?.activePermission?.requestId || patientRecords?.activePermission?.request_id || patientRecords?.activePermission?.id}
          onClose={() => setActiveViewingDoc(null)}
          onSessionEnded={(trace) => {
            setLastTraceData(trace);
          }}
        />
      )}

      {/* Session Completed Trace Modal */}
      {lastTraceData && (
        <AccessTraceModal
          traceData={lastTraceData}
          onClose={() => setLastTraceData(null)}
        />
      )}
    </DashboardLayout>
  );
};
