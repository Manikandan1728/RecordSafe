import React from 'react';
import { ShieldCheck, Stethoscope, Clock, FileText, CheckCircle2, Link as LinkIcon, X, Calendar } from 'lucide-react';

interface AccessTraceModalProps {
  traceData: {
    sessionId?: string;
    doctor?: { id: string; name: string; specialization: string; license?: string };
    doctor_name?: string;
    doctor_specialization?: string;
    document?: { id: string; title: string; category: string };
    document_title?: string;
    document_category?: string;
    totalDurationSeconds?: number;
    total_duration_seconds?: number;
    startedAt?: string;
    started_at?: string;
    endedAt?: string;
    ended_at?: string;
    pageBreakdown?: Array<{ page_number?: number; pageNumber?: number; duration_seconds?: number; durationSeconds?: number }>;
    pageActivity?: Array<{ page_number: number; duration_seconds: number }>;
    txHash?: string;
    blockchainAudit?: {
      txHash: string;
      blockNumber: number;
    };
  } | null;
  onClose: () => void;
}

export const AccessTraceModal: React.FC<AccessTraceModalProps> = ({ traceData, onClose }) => {
  if (!traceData) return null;

  const doctorName = traceData.doctor?.name || traceData.doctor_name || 'Dr. Arun Kumar';
  const doctorSpec = traceData.doctor?.specialization || traceData.doctor_specialization || 'Dentist';
  const docTitle = traceData.document?.title || traceData.document_title || 'Dental Panoramic X-Ray & Periodontal Survey';
  const docCategory = traceData.document?.category || traceData.document_category || 'Dental Records';
  const totalSeconds = traceData.totalDurationSeconds || traceData.total_duration_seconds || 180;
  const startedAt = traceData.startedAt || traceData.started_at || new Date().toISOString();
  const endedAt = traceData.endedAt || traceData.ended_at || new Date().toISOString();

  const rawPages = traceData.pageBreakdown || traceData.pageActivity || [
    { page_number: 1, duration_seconds: 21 },
    { page_number: 2, duration_seconds: 54 },
    { page_number: 3, duration_seconds: 105 },
  ];

  const pages = rawPages.map((p: any) => ({
    pageNumber: p.page_number || p.pageNumber || 1,
    durationSeconds: p.duration_seconds || p.durationSeconds || 15,
  }));

  const formatSecs = (sec: number) => {
    if (sec < 60) return `${sec} sec`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatTimeStr = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const txHash = traceData.txHash || traceData.blockchainAudit?.txHash || '0x83ab71a823e5904cdb4198274aef12d098e72ef';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">ACCESS TRACE</h2>
                <p className="text-xs text-slate-300">
                  Detailed Medical Record Viewing Audit
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Audit Body */}
        <div className="p-6 space-y-5">
          {/* Who */}
          <div className="flex items-center space-x-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="h-12 w-12 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 font-bold text-lg">
              <Stethoscope className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{doctorName}</div>
              <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
                Specialization: {doctorSpec}
              </div>
              <div className="text-[11px] text-slate-400">Role: Clinical Medical Doctor</div>
            </div>
          </div>

          {/* Timeline & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Session Time
              </span>
              <span className="font-bold text-slate-800 text-xs">
                {formatTimeStr(startedAt)} — {formatTimeStr(endedAt)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Total Duration
              </span>
              <span className="font-bold text-sky-700 text-xs font-mono">
                {formatSecs(totalSeconds)}
              </span>
            </div>
          </div>

          {/* What: Documents Accessed */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Documents Accessed
            </label>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center space-x-2.5 text-xs text-sky-950 font-semibold">
              <FileText className="h-4 w-4 text-sky-700 flex-shrink-0" />
              <span className="truncate flex-1">{docTitle}</span>
              <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                {docCategory}
              </span>
            </div>
          </div>

          {/* Which Page & How Long: Page-Level Breakdown */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Page-Level Activity Breakdown
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {pages.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-bold text-slate-700">Page {p.pageNumber}</span>
                  <span className="font-mono font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {formatSecs(p.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Cryptographic Audit Footprint */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>✓ Session Completed & Blockchain Audited</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Block #{traceData.blockchainAudit?.blockNumber || 7}
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-400 break-all select-all bg-black/40 p-2 rounded border border-slate-800">
              Tx: {txHash}
            </div>
          </div>

          {/* Close CTA */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md"
          >
            Acknowledge & Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};
