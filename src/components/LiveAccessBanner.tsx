import React from 'react';
import { useLiveAccess } from '../context/LiveAccessContext';
import { Activity, ShieldOff, Clock, FileText, Stethoscope, Link as LinkIcon, Eye } from 'lucide-react';

export const LiveAccessBanner: React.FC = () => {
  const { liveSession, revokeSession } = useLiveAccess();

  if (!liveSession) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPage = liveSession.currentPage || 1;
  const pageCount = liveSession.document.pageCount || 3;
  const progressPercent = Math.min(100, Math.round((currentPage / pageCount) * 100));

  return (
    <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-slate-900 rounded-2xl shadow-xl border border-rose-400/40 text-white overflow-hidden p-5 md:p-6 mb-8 relative animate-pulse-slow">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Doctor & Live Status */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="flex h-3 w-3 relative mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="text-xs font-black tracking-widest uppercase bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-400/30 text-rose-200">
              🔴 LIVE ACCESS
            </span>
            <span className="text-[11px] font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-400/30 text-emerald-300">
              Access: Authorized
            </span>
            <span className="text-[11px] font-bold bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-400/30 text-sky-300">
              Viewing: Active
            </span>
          </div>

          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold text-lg">
              <Stethoscope className="h-6 w-6 text-rose-200" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">
                {liveSession.doctor.name}
              </h3>
              <p className="text-xs font-semibold text-rose-200 tracking-wide uppercase">
                Specialization: {liveSession.doctor.specialization}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Real-Time Page Indicator */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 md:px-6 flex flex-col justify-center min-w-[280px]">
          <div className="text-[11px] font-bold text-rose-200 uppercase tracking-wider flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-rose-300" /> Currently Viewing
            </span>
            <span className="text-white font-mono font-bold">
              Page {currentPage} of {pageCount}
            </span>
          </div>

          <div className="text-sm font-bold text-white truncate max-w-[240px]">
            {liveSession.document.title}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-black/30 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-rose-200 mt-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Live Duration:
            </span>
            <span className="font-mono font-bold text-white text-xs bg-rose-950/70 px-2 py-0.5 rounded border border-rose-500/40">
              {formatDuration(liveSession.elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Right: Security & Immediate Revoke Button */}
        <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-2.5">
          <div className="text-[11px] text-rose-200 flex items-center space-x-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-rose-300" />
            <span>Cryptographic Audit Logging: Active</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to immediately revoke access for this doctor?')) {
                revokeSession(liveSession.sessionId);
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-extrabold shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95"
          >
            <ShieldOff className="h-4 w-4" />
            <span>Emergency Revoke Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
