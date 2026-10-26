import React, { useState, useEffect } from 'react';
import { MedicalDocument, AISummary } from '../types';
import { api } from '../services/api';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Salad,
  Activity,
  Calendar,
  ShieldAlert,
  X,
  FileText,
  Loader2
} from 'lucide-react';

interface AIReportModalProps {
  document: MedicalDocument;
  onClose: () => void;
}

export const AIReportModal: React.FC<AIReportModalProps> = ({ document, onClose }) => {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.analyzeDocumentWithAI(document.id)
      .then((res) => {
        if (isMounted) {
          setSummary(res.summary);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to generate AI clinical summary');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [document.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-sky-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-teal-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">AI Health Assistant</h2>
                <p className="text-xs text-teal-200">
                  Automated Clinical Report Explainer & Preventive Wellness Insights
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Parsing clinical findings & reference thresholds...
              </p>
              <p className="text-xs text-slate-400">
                Cross-referencing laboratory standards and diagnostic markers
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {error}
            </div>
          ) : summary ? (
            <>
              {/* Report Overview Card */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-teal-900 uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-teal-700" />
                  <span>Report Evaluated: {document.title}</span>
                </div>
                <p className="text-xs text-teal-950 leading-relaxed font-medium">
                  {summary.overview}
                </p>
              </div>

              {/* Key Clinical Findings */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Key Diagnostic Parameters & Reference Ranges
                </h3>
                <div className="space-y-2.5">
                  {summary.keyFindings.map((finding, idx) => {
                    const isAlert = finding.status !== 'normal';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border text-xs transition-all ${
                          isAlert
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {isAlert ? (
                              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            )}
                            <span className="font-bold text-slate-900">{finding.parameter}</span>
                          </div>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isAlert
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {finding.value}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Standard Reference: {finding.referenceRange}</span>
                        </div>
                        <div className="mt-1.5 text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-200/60">
                          {finding.clinicalContext}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General Preventive Suggestions */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  General Preventive Wellness Suggestions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Nutrition */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-emerald-900 mb-1.5">
                      <Salad className="h-4 w-4 text-emerald-600" />
                      <span>🥗 Nutrition</span>
                    </div>
                    <p className="text-emerald-950 text-[11px] leading-relaxed">
                      {summary.preventiveSuggestions.nutrition}
                    </p>
                  </div>

                  {/* Activity */}
                  <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-sky-900 mb-1.5">
                      <Activity className="h-4 w-4 text-sky-600" />
                      <span>🏃 Activity</span>
                    </div>
                    <p className="text-sky-950 text-[11px] leading-relaxed">
                      {summary.preventiveSuggestions.activity}
                    </p>
                  </div>

                  {/* Follow Up */}
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-purple-900 mb-1.5">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span>📅 Clinical Follow-up</span>
                    </div>
                    <p className="text-purple-950 text-[11px] leading-relaxed">
                      {summary.preventiveSuggestions.followUp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mandatory Non-Diagnostic Medical Disclaimer */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300 text-[11px] text-slate-600 flex items-start space-x-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  {summary.disclaimer}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Close Assistant
          </button>
        </div>
      </div>
    </div>
  );
};
