import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveAccess } from '../context/LiveAccessContext';
import {
  FileText,
  Lock,
  Sparkles,
  Pill,
  ShieldCheck,
  Users,
  Eye,
  Clock,
  UploadCloud,
  History,
  Activity,
  CheckCircle2,
  LucideIcon
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeColor?: string;
  highlight?: boolean;
}

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenBlockchain?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenBlockchain,
}) => {
  const { user } = useAuth();
  const { pendingRequests, liveSession } = useLiveAccess();

  if (!user) return null;

  // Tab configurations for each of the 3 roles
  const patientTabs: TabItem[] = [
    {
      id: 'locker',
      label: 'Records',
      icon: FileText,
      badge: null,
    },
    {
      id: 'consent',
      label: 'Requests',
      icon: Lock,
      badge: pendingRequests.length > 0 ? pendingRequests.length : null,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'assistant',
      label: 'AI Insights',
      icon: Sparkles,
      badge: null,
      highlight: true,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: Pill,
      badge: null,
    },
    {
      id: 'history',
      label: 'Audit & Trace',
      icon: ShieldCheck,
      badge: liveSession ? 'LIVE' : null,
      badgeColor: 'bg-rose-500 animate-pulse',
    },
  ];

  const doctorTabs: TabItem[] = [
    {
      id: 'patients',
      label: 'Patients',
      icon: Users,
      badge: null,
    },
    {
      id: 'records',
      label: 'Records',
      icon: FileText,
      badge: null,
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: Lock,
      badge: null,
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      badge: null,
    },
    {
      id: 'audit',
      label: 'Ledger',
      icon: ShieldCheck,
      badge: null,
    },
  ];

  const hospitalTabs: TabItem[] = [
    {
      id: 'upload',
      label: 'Upload',
      icon: UploadCloud,
      badge: null,
      highlight: true,
    },
    {
      id: 'history',
      label: 'Uploads',
      icon: History,
      badge: null,
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: Users,
      badge: null,
    },
    {
      id: 'audit',
      label: 'Ledger',
      icon: ShieldCheck,
      badge: null,
    },
  ];

  const currentTabs =
    user.role === 'patient'
      ? patientTabs
      : user.role === 'doctor'
      ? doctorTabs
      : hospitalTabs;

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl safe-area-bottom pb-safe"
    >
      <div className="max-w-md mx-auto px-2 py-1 flex items-center justify-around">
        {currentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => {
                if (tab.id === 'audit' && onOpenBlockchain) {
                  onOpenBlockchain();
                } else {
                  onTabChange(tab.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center py-2 px-2.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-sky-600 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              } ${tab.highlight && !isActive ? 'text-teal-600' : ''}`}
            >
              <div className="relative">
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-sky-50 shadow-sm shadow-sky-500/10'
                      : tab.highlight
                      ? 'bg-teal-50'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-sky-600 stroke-[2.5]' : ''}`} />
                </div>

                {/* Badge if present */}
                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-1.5 px-1.5 py-0.2 min-w-[16px] h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-sm ${
                      tab.badgeColor || 'bg-sky-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>

              {/* Active Indicator bar */}
              {isActive && (
                <span className="absolute bottom-0.5 w-6 h-0.5 bg-sky-600 rounded-full animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
