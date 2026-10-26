import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Heart,
  Activity,
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Utensils,
  Dumbbell,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
  Info,
  Check,
  SkipForward,
  Timer,
  ArrowRight
} from 'lucide-react';

interface HealthAssistantProps {
  onViewDocument?: (docId: string) => void;
}

export const HealthAssistant: React.FC<HealthAssistantProps> = ({ onViewDocument }) => {
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'medications' | 'nutrition' | 'timeline'>('overview');
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [medActionLoading, setMedActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, medsRes, timelineRes, indicatorsRes] = await Promise.all([
        api.getHealthSummary(),
        api.getMedications(),
        api.getHealthTimeline(),
        api.getHealthIndicators()
      ]);
      setHealthSummary(summaryRes.summary);
      setMedications(medsRes.medications);
      setTimeline(timelineRes.timeline);
      setIndicators(indicatorsRes.indicators);
    } catch (err) {
      console.error('Failed to load health assistant data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMedAction = async (medId: string, action: 'taken' | 'skipped' | 'snoozed') => {
    setMedActionLoading(medId);
    try {
      await api.logMedicationAction(medId, {
        action,
        scheduled_date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (err) {
      console.error('Failed to log medication action:', err);
    } finally {
      setMedActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-500 animate-spin" />
          <Sparkles size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Analyzing your health data...</p>
        <span className="text-xs text-slate-400">Generating personalized insights from your medical records</span>
      </div>
    );
  }

  if (!healthSummary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Sparkles size={48} className="text-slate-300" />
        <h3 className="text-lg font-bold text-slate-600">Health Assistant</h3>
        <p className="text-sm text-slate-400 max-w-xs">Upload medical records to receive personalized health insights</p>
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    healthy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={16} /> },
    some_attention: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Info size={16} /> },
    needs_review: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertTriangle size={16} /> }
  };

  const statusStyle = statusConfig[healthSummary.overallStatus] || statusConfig.some_attention;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <Activity size={16} /> },
    { id: 'medications' as const, label: 'Medications', icon: <Pill size={16} /> },
    { id: 'nutrition' as const, label: 'Wellness', icon: <Utensils size={16} /> },
    { id: 'timeline' as const, label: 'Timeline', icon: <Clock size={16} /> }
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-violet-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">AI Health Assistant</h2>
            <p className="text-xs text-white/70">Personalized insights from your medical records</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
          {statusStyle.icon}
          {healthSummary.statusLabel}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeSection === tab.id
                ? 'bg-white text-violet-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
            onClick={() => setActiveSection(tab.id)}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeSection === 'overview' && (
          <OverviewSection
            summary={healthSummary}
            indicators={indicators}
            medications={medications}
            onViewDocument={onViewDocument}
          />
        )}
        {activeSection === 'medications' && (
          <MedicationsSection
            medications={medications}
            expandedMed={expandedMed}
            setExpandedMed={setExpandedMed}
            onMedAction={handleMedAction}
            medActionLoading={medActionLoading}
          />
        )}
        {activeSection === 'nutrition' && (
          <WellnessSection summary={healthSummary} />
        )}
        {activeSection === 'timeline' && (
          <TimelineSection timeline={timeline} onViewDocument={onViewDocument} />
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <Shield size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <span className="text-[10px] text-slate-400 leading-relaxed">{healthSummary.disclaimer}</span>
      </div>
    </div>
  );
};

// ==========================================
// OVERVIEW SECTION
// ==========================================
const OverviewSection: React.FC<{
  summary: any;
  indicators: any[];
  medications: any[];
  onViewDocument?: (docId: string) => void;
}> = ({ summary, indicators, medications }) => {
  const attentionIndicators = indicators.filter(i => i.status === 'attention' || i.status === 'urgent');
  const normalIndicators = indicators.filter(i => i.status === 'normal');

  const scoreColor = summary.wellnessScore >= 80 ? '#10b981' : summary.wellnessScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">
      {/* Wellness Score Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Ring */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(summary.wellnessScore / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-800">{summary.wellnessScore}</span>
              <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base font-extrabold text-slate-800">{summary.statusLabel}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{summary.statusDescription}</p>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-slate-600 font-medium">{summary.normalCount} normal</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-slate-600 font-medium">{summary.attentionCount} flagged</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <FileText size={14} className="text-slate-400" />
                <span className="text-slate-600 font-medium">{summary.totalIndicators} tracked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown bars */}
        {summary.wellnessBreakdown && summary.wellnessBreakdown.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
            {summary.wellnessBreakdown.map((cat: any) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span>{cat.icon}</span>
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      cat.score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                      cat.score >= 50 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>{cat.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{cat.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      cat.score >= 80 ? 'bg-emerald-500' :
                      cat.score >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attention Items */}
      {summary.topConcerns && summary.topConcerns.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <AlertTriangle size={16} className="text-amber-500" />
            Values Outside Reference Range
          </h3>
          <div className="space-y-2">
            {summary.topConcerns.map((concern: any, idx: number) => (
              <div className="p-4 rounded-xl bg-white border border-amber-100 shadow-sm hover:shadow-md transition-shadow" key={idx}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800">{concern.parameter}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold whitespace-nowrap">
                    {concern.value} {concern.unit}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">Reference: {concern.referenceRange}</div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{concern.suggestion}</p>
                {concern.sourceDocumentTitle && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                    <FileText size={10} />
                    <span>{concern.sourceDocumentTitle}</span>
                    <span>•</span>
                    <span>{new Date(concern.sourceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal Values */}
      {normalIndicators.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Within Reference Range ({normalIndicators.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {normalIndicators.map((ind, idx) => (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs" key={idx}>
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="font-medium text-slate-700">{ind.parameter}</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 font-bold">{ind.value} {ind.unit || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Medications Quick View */}
      {medications.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Pill size={16} className="text-violet-500" />
            Active Medications ({medications.length})
          </h3>
          <div className="grid gap-2">
            {medications.map(med => (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-violet-200 transition-colors" key={med.id}>
                <span className="text-lg">💊</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{med.name} <span className="text-slate-400 font-normal">{med.dosage}</span></div>
                  <div className="text-[11px] text-slate-400">{med.frequency} • {med.schedule_times}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MEDICATIONS SECTION
// ==========================================
const MedicationsSection: React.FC<{
  medications: any[];
  expandedMed: string | null;
  setExpandedMed: (id: string | null) => void;
  onMedAction: (medId: string, action: 'taken' | 'skipped' | 'snoozed') => void;
  medActionLoading: string | null;
}> = ({ medications, expandedMed, setExpandedMed, onMedAction, medActionLoading }) => {
  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Pill size={48} className="text-slate-200" />
        <h3 className="text-base font-bold text-slate-600">No Active Medications</h3>
        <p className="text-sm text-slate-400 max-w-xs">Your Health Locker doesn't have any active prescriptions on file.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
        <Pill size={20} className="text-violet-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-violet-800">Medication Tracker</h3>
          <p className="text-xs text-violet-600 mt-0.5">Track your daily medication schedule. Tap a medication to log it as taken, skipped, or snoozed.</p>
        </div>
      </div>

      <div className="space-y-2">
        {medications.map(med => {
          const isExpanded = expandedMed === med.id;
          const isLoading = medActionLoading === med.id;
          const schedules = (med.schedule_times || '').split(',');
          const startDate = new Date(med.start_date);
          const endDate = med.end_date ? new Date(med.end_date) : null;
          const now = new Date();
          const totalDays = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : med.duration_days || 90;
          const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

          return (
            <div className={`rounded-xl bg-white border transition-all duration-200 ${isExpanded ? 'border-violet-200 shadow-md' : 'border-slate-200 shadow-sm'}`} key={med.id}>
              <button
                className="w-full flex items-center gap-3 p-4 text-left"
                onClick={() => setExpandedMed(isExpanded ? null : med.id)}
              >
                <span className="text-xl flex-shrink-0">💊</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800">{med.name}</div>
                  <div className="text-xs text-slate-500">{med.dosage} • {med.frequency}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {schedules.map((time: string, i: number) => (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600" key={i}>
                        <Clock size={10} /> {time.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3 animate-fade-in">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-500">Course Progress</span>
                      <span className="text-xs font-bold text-violet-600">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">Started: {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      {endDate && <span className="text-[10px] text-slate-400">Ends: {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </div>

                  {med.prescribed_by && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Prescribed by</span>
                      <span className="font-medium text-slate-700">{med.prescribed_by}</span>
                    </div>
                  )}

                  {med.notes && (
                    <div className="p-2.5 rounded-lg bg-slate-50 text-xs text-slate-600 leading-relaxed">
                      <span className="font-medium text-slate-500">Instructions:</span> {med.notes}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      onClick={(e) => { e.stopPropagation(); onMedAction(med.id, 'taken'); }}
                      disabled={isLoading}
                    >
                      <Check size={14} /> Taken
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors disabled:opacity-50"
                      onClick={(e) => { e.stopPropagation(); onMedAction(med.id, 'skipped'); }}
                      disabled={isLoading}
                    >
                      <SkipForward size={14} /> Skip
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors disabled:opacity-50 border border-amber-200"
                      onClick={(e) => { e.stopPropagation(); onMedAction(med.id, 'snoozed'); }}
                      disabled={isLoading}
                    >
                      <Timer size={14} /> Snooze
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <span className="text-[10px] text-slate-400 leading-relaxed">Always take medications exactly as prescribed by your doctor. Do not modify dosages without consulting your physician.</span>
      </div>
    </div>
  );
};

// ==========================================
// WELLNESS SECTION
// ==========================================
const WellnessSection: React.FC<{ summary: any }> = ({ summary }) => {
  return (
    <div className="space-y-6">
      {/* Nutrition */}
      {summary.nutritionGuidance && summary.nutritionGuidance.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Utensils size={16} className="text-orange-500" />
              Nutrition Suggestions
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Based on the values in your uploaded reports</p>
          </div>
          <div className="grid gap-2">
            {summary.nutritionGuidance.map((item: any, idx: number) => (
              <div className={`flex items-start gap-3 p-4 rounded-xl bg-white border shadow-sm transition-shadow hover:shadow-md ${
                item.priority === 'high' ? 'border-orange-200' : 'border-slate-200'
              }`} key={idx}>
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                    {item.priority === 'high' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200">PRIORITY</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {summary.activityGuidance && summary.activityGuidance.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Dumbbell size={16} className="text-blue-500" />
              Activity Suggestions
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">General wellness recommendations</p>
          </div>
          <div className="grid gap-2">
            {summary.activityGuidance.map((item: any, idx: number) => (
              <div className={`flex items-start gap-3 p-4 rounded-xl bg-white border shadow-sm transition-shadow hover:shadow-md ${
                item.priority === 'high' ? 'border-blue-200' : 'border-slate-200'
              }`} key={idx}>
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                    {item.priority === 'high' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200">PRIORITY</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lifestyle Notes */}
      {summary.lifestyleNotes && summary.lifestyleNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Heart size={16} className="text-pink-500" />
            Lifestyle Notes
          </h3>
          <div className="space-y-1.5">
            {summary.lifestyleNotes.map((note: string, idx: number) => (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-slate-100" key={idx}>
                <ArrowRight size={14} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-slate-600 leading-relaxed">{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <Shield size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <span className="text-[10px] text-slate-400 leading-relaxed">
          These are general wellness suggestions based on values from your uploaded reports. They are not medical prescriptions. Always follow your doctor's specific advice.
        </span>
      </div>
    </div>
  );
};

// ==========================================
// TIMELINE SECTION
// ==========================================
const TimelineSection: React.FC<{
  timeline: any[];
  onViewDocument?: (docId: string) => void;
}> = ({ timeline, onViewDocument }) => {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? timeline :
    timeline.filter(e => e.type === filter);

  const typeFilters = [
    { id: 'all', label: 'All' },
    { id: 'document', label: 'Documents' },
    { id: 'medication_started', label: 'Medications' },
    { id: 'lab_result', label: 'Lab Alerts' },
    { id: 'reminder', label: 'Reminders' }
  ];

  const typeColors: Record<string, string> = {
    document: 'bg-indigo-500',
    medication_started: 'bg-violet-500',
    lab_result: 'bg-amber-500',
    reminder: 'bg-cyan-500',
    insight: 'bg-emerald-500'
  };

  const typeBadgeColors: Record<string, string> = {
    document: 'bg-indigo-50 text-indigo-700',
    medication_started: 'bg-violet-50 text-violet-700',
    lab_result: 'bg-amber-50 text-amber-700',
    reminder: 'bg-cyan-50 text-cyan-700',
    insight: 'bg-emerald-50 text-emerald-700'
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {typeFilters.map(f => (
          <button
            key={f.id}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f.id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {filtered.slice(0, 30).map((event, idx) => {
          const date = new Date(event.date);
          const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const dotColor = typeColors[event.type] || 'bg-slate-400';
          const badgeColor = typeBadgeColors[event.type] || 'bg-slate-50 text-slate-600';

          return (
            <div className="flex gap-3" key={event.id || idx}>
              {/* Line */}
              <div className="flex flex-col items-center w-5 flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${dotColor} ring-4 ring-white shadow-sm mt-4`} />
                {idx < filtered.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 min-h-[16px]" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="p-3 rounded-xl bg-white border border-slate-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">{dateStr}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeColor}`}>
                      {event.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">{event.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-700 leading-snug">{event.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{event.description}</p>
                    </div>
                  </div>
                  {event.documentId && onViewDocument && (
                    <button
                      className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-500 transition-colors"
                      onClick={() => onViewDocument(event.documentId)}
                    >
                      <FileText size={10} /> View Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <Clock size={32} className="text-slate-200" />
          <p className="text-sm text-slate-400">No events match this filter</p>
        </div>
      )}
    </div>
  );
};
