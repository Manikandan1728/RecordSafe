import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, MedicalDocument } from '../types';
import { api } from '../services/api';
import {
  Building2,
  UploadCloud,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Search,
  Check,
  AlertCircle,
  Link as LinkIcon,
  RefreshCw,
  Plus,
  Eye,
  Clock,
  RotateCcw,
  Users,
  History
} from 'lucide-react';
import { DashboardLayout, NavItem } from '../components/DashboardLayout';
import confetti from 'canvas-confetti';

interface HospitalDashboardProps {
  onOpenBlockchainExplorer?: () => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({ onOpenBlockchainExplorer }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'patients' | 'audit'>('upload');
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Blood Reports');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    docId: string;
    fileHash: string;
    txHash: string;
    blockNumber: number;
    patientName?: string;
    title?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Blood Reports',
    'Dental Records',
    'X-Rays',
    'Scans',
    'ECG',
    'Prescriptions',
    'Discharge Summaries',
    'Lab Reports',
    'Medical History',
    'Other'
  ];

  const specialties = [
    'Dentistry',
    'Cardiology',
    'Orthopedics',
    'General Medicine',
    'Neurology',
    'Dermatology',
    'Radiology',
    'Pathology'
  ];

  const fetchPatients = async () => {
    try {
      const res = await api.getHospitalPatients();
      setPatients(res.patients || []);
      if (res.patients && res.patients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(res.patients[0].id);
      }
    } catch (e) {
      console.warn('Failed to load patients via hospital endpoint, fallback to demo accounts', e);
      try {
        const demoRes = await api.getDemoAccounts();
        const pats = (demoRes.users || []).filter((u: any) => u.role === 'patient');
        setPatients(pats);
        if (pats.length > 0 && !selectedPatientId) {
          setSelectedPatientId(pats[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients', err);
      }
    }
  };

  const fetchUploads = async () => {
    try {
      const res = await api.getHospitalUploads();
      setRecentUploads(res.uploads || []);
    } catch (e) {
      console.warn('Failed to load hospital uploads', e);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchUploads();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select a target patient.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const targetPatient = patients.find(p => p.id === selectedPatientId);

    try {
      const formData = new FormData();
      formData.append('patient_id', selectedPatientId);
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('specialty', specialty);
      formData.append('clinical_notes', clinicalNotes.trim());
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await api.uploadDocument(formData);
      setUploadResult({
        docId: res.documentId,
        fileHash: res.fileHash,
        txHash: res.txHash,
        blockNumber: res.blockNumber,
        patientName: targetPatient?.name || 'Selected Patient',
        title: title.trim()
      });

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Reset form fields
      setTitle('');
      setClinicalNotes('');
      setSelectedFile(null);
      fetchUploads();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please check file format and connection.');
    } finally {
      setUploading(false);
    }
  };

  const navItems: NavItem[] = [
    {
      id: 'upload',
      label: 'Upload Medical Report',
      icon: UploadCloud,
      highlight: true,
    },
    {
      id: 'history',
      label: 'Issued Records',
      icon: History,
      badge: recentUploads.length > 0 ? recentUploads.length : null,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'patients',
      label: 'Patient Directory',
      icon: Users,
      badge: patients.length > 0 ? patients.length : null,
    },
    {
      id: 'audit',
      label: 'Blockchain Ledger',
      icon: ShieldCheck,
    },
  ];

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab as any);
        if (tab === 'upload') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
      navItems={navItems}
      onOpenBlockchainExplorer={onOpenBlockchainExplorer}
      headerTitle="Diagnostic Center Portal"
      headerSubtitle="Medical Report Issuance & Cryptographic Ledger Anchoring"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* ======================================================== */}
        {/* 1. HOSPITAL / LAB HEADER                                 */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-600/20 flex-shrink-0">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {user?.organization_name || user?.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                  Diagnostic Center
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Accredited Clinical Record Issuer • Direct Patient Vault Registration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:self-auto">
            <button
              onClick={() => {
                fetchPatients();
                fetchUploads();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm transition-all"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>SHA-256 Ledger Anchoring: Active</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. MAIN 12-COLUMN UPLOAD & ISSUED RECORDS GRID           */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column (7 cols): Upload Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Upload New Medical Report
                  </h2>
                  <p className="text-xs text-slate-500">
                    Directly attach verified diagnostic files to a patient's Personal Health Locker
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center justify-between animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                    <span>❌ {error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="px-2.5 py-1 rounded bg-rose-200 text-rose-900 text-[11px] font-bold hover:bg-rose-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {uploadResult && (
                <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2 animate-fade-in">
                  <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <span>✓ Report Uploaded & Encrypted Successfully for {uploadResult.patientName}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2">
                    <div>
                      <span className="text-emerald-700 font-bold block">Document:</span>
                      <span className="font-semibold text-slate-800">{uploadResult.title}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-bold block">Integrity Hash:</span>
                      <span className="font-mono">{uploadResult.fileHash ? String(uploadResult.fileHash).substring(0, 18) : '...'}...</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-bold block">Blockchain Ledger:</span>
                      <span className="font-mono font-bold text-emerald-800">Block #{uploadResult.blockNumber || 1}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-bold block">Tx Hash:</span>
                      <span className="font-mono">{uploadResult.txHash ? String(uploadResult.txHash).substring(0, 18) : '...'}...</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-5">
                {/* Target Patient */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Target Patient
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email}) — ID: {p.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Title */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Dental Panoramic X-Ray / Complete Blood Count"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Category & Specialty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Report Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Clinical Specialty
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {specialties.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File Drag & Drop */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Diagnostic File (PDF / PNG / JPG)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-6 text-center bg-slate-50 transition-colors">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <div className="text-xs text-slate-600 font-semibold">
                      {selectedFile ? (
                        <span className="text-purple-700 font-bold">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      ) : (
                        <span>Click to browse or drag medical file here</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supports High-Resolution Digital Scans & Reports (Max 25MB)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="file-upload-input"
                    />
                    <label
                      htmlFor="file-upload-input"
                      className="mt-3 inline-block px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 shadow-sm"
                    >
                      {selectedFile ? 'Change File' : 'Browse Files'}
                    </label>
                  </div>
                </div>

                {/* Clinical Assessment Notes */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Clinical Notes / Findings
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Include diagnostic impression, radiologist remarks, or laboratory comments..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>{uploading ? 'Encrypting & Anchoring to Ledger...' : 'Upload Securely to Health Locker'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column (5 cols): Issued Documents History */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-purple-600" /> Issued Diagnostic Records
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recent records uploaded by this facility
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {recentUploads.length} Issued
                </span>
              </div>

              {recentUploads.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No diagnostic documents uploaded by this account yet.
                </div>
              ) : (
                <div className="space-y-3 mt-4 max-h-[540px] overflow-y-auto no-scrollbar">
                  {recentUploads.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{doc.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 flex-shrink-0">
                          {doc.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Patient: <span className="font-semibold text-slate-800">{doc.patient_name || doc.patient_id}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
                        <span>SHA: {doc.file_hash ? String(doc.file_hash).substring(0, 12) : '...'}...</span>
                        <span>{doc.created_at ? String(doc.created_at).substring(0, 10) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

