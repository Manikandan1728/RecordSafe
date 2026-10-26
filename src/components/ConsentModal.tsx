import React, { useState } from 'react';
import { useLiveAccess } from '../context/LiveAccessContext';
import { api } from '../services/api';
import { ShieldAlert, CheckCircle2, XCircle, Stethoscope, Lock, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ConsentModal: React.FC = () => {
  const { activeConsentModalRequest, setActiveConsentModalRequest, refreshRequests } = useLiveAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!activeConsentModalRequest) return null;

  const req = activeConsentModalRequest;

  const handleRespond = async (action: 'approve' | 'deny') => {
    setIsSubmitting(true);
    try {
      await api.respondToAccessRequest(req.id, action);
      if (action === 'approve') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        setActionSuccess('✓ Access Authorized for Clinical Consultation');
      } else {
        setActionSuccess('Access Request Denied');
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setActionSuccess(null);
        setActiveConsentModalRequest(null);
        refreshRequests();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to process consent response');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <Lock className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">🔐 Clinical Record Access Request</h2>
              <p className="text-xs text-sky-200 mt-0.5">
                Explicit Patient Authorization Required
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Doctor Info Card */}
          <div className="flex items-center space-x-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="h-12 w-12 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 font-bold text-lg">
              <Stethoscope className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">{req.doctor_name}</div>
              <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
                Specialization: {req.doctor_specialization}
              </div>
              {req.license_id && (
                <div className="text-[11px] text-slate-400">License ID: {req.license_id}</div>
              )}
            </div>
          </div>

          {/* Requested Documents */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Requested Records:
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {req.requestedDocuments && req.requestedDocuments.length > 0 ? (
                req.requestedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 text-xs text-sky-950 font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-semibold flex-1">{doc.title}</span>
                    <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                      {doc.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 text-xs text-sky-950 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Specialty Authorized Medical Records</span>
                </div>
              )}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Clinical Purpose:
            </label>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
              "{req.purpose}"
            </div>
          </div>

          {/* Trust notice */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-start space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Patient Privacy Protected:</span> If approved, access remains active for this consultation. All viewing activity is cryptographically tracked in real time. You may revoke access at any time from your dashboard.
            </div>
          </div>

          {/* Action Success Alert */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-sky-600 text-white font-bold text-center text-xs animate-bounce">
              {actionSuccess}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleRespond('deny')}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <XCircle className="h-4 w-4" />
              <span>Deny Access</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleRespond('approve')}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Allow Access</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
