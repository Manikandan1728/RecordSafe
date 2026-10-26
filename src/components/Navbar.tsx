import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveAccess } from '../context/LiveAccessContext';
import {
  ShieldCheck,
  Activity,
  Bell,
  LogOut,
  UserCheck,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
  X,
  Stethoscope,
  Building2,
  Lock
} from 'lucide-react';

interface NavbarProps {
  onOpenBlockchainExplorer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBlockchainExplorer }) => {
  const { user, logout, demoAccounts, demoLogin } = useAuth();
  const { liveSession, pendingRequests, notifications, dismissNotification, setActiveConsentModalRequest } = useLiveAccess();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  if (!user) return null;

  const roleColors = {
    patient: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    doctor: 'bg-blue-50 text-blue-700 border-blue-200',
    hospital: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const roleLabels = {
    patient: 'Patient Portal',
    doctor: `Dr. (${user.specialization || 'Clinical'})`,
    hospital: 'Diagnostic Center',
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg font-sans">
                  Personal Health Locker
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800">
                  v1.0 MVP
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Your Health. Your Data. Your Control.
              </p>
            </div>
          </div>

          {/* Center / Right controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Live Access Status Pill for Patient */}
            {user.role === 'patient' && liveSession && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 animate-pulse">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-ping" />
                <span className="text-xs font-bold tracking-wide flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" /> LIVE ACCESS ACTIVE
                </span>
              </div>
            )}

            {/* Blockchain Explorer Trigger */}
            <button
              onClick={onOpenBlockchainExplorer}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-sky-700 hover:bg-slate-100 transition-colors border border-slate-200"
              title="Inspect Immutable Audit Ledger"
            >
              <LinkIcon className="h-3.5 w-3.5 text-sky-600" />
              <span>Blockchain Audit</span>
            </button>

            {/* Role Badge */}
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${roleColors[user.role]}`}>
              {user.role === 'patient' && <Lock className="h-3 w-3" />}
              {user.role === 'doctor' && <Stethoscope className="h-3 w-3" />}
              {user.role === 'hospital' && <Building2 className="h-3 w-3" />}
              <span>{roleLabels[user.role]}</span>
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {(pendingRequests.length > 0 || notifications.length > 0) && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Live Notifications & Consent
                    </span>
                    <button
                      onClick={() => setShowNotifMenu(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                    {/* Pending Consent Requests */}
                    {pendingRequests.length > 0 && user.role === 'patient' && (
                      <div className="space-y-2">
                        {pendingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex flex-col justify-between cursor-pointer hover:bg-amber-100 transition-colors"
                            onClick={() => {
                              setActiveConsentModalRequest(req);
                              setShowNotifMenu(false);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900">
                                🔐 Access Request from {req.doctor_name}
                              </span>
                              <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                                {req.duration_minutes}m
                              </span>
                            </div>
                            <p className="text-amber-700 mt-1">
                              Specialty: {req.doctor_specialization} • Purpose: {req.purpose}
                            </p>
                            <span className="text-[11px] font-bold text-sky-700 mt-2 hover:underline">
                              Review & Respond →
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Standard Toast Notifications */}
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs flex items-start justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.timestamp}</span>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-slate-400 hover:text-slate-600 ml-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {pendingRequests.length === 0 && notifications.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No new notifications.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick 1-Click Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-all"
                title="Switch Roles for Hackathon Demo"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Demo Switcher</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Role Switcher (Hackathon)
                  </div>
                  <div className="mt-1 space-y-1">
                    {demoAccounts.map((acc) => {
                      const isCurrent = user.email === acc.email;
                      return (
                        <button
                          key={acc.id}
                          onClick={async () => {
                            setShowDemoMenu(false);
                            if (!isCurrent) {
                              await demoLogin(acc.email);
                            }
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            isCurrent
                              ? 'bg-sky-50 text-sky-900 font-bold border border-sky-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{acc.name}</div>
                            <div className="text-[10px] text-slate-500 capitalize">
                              {acc.role === 'doctor'
                                ? `Doctor (${acc.specialization})`
                                : acc.role === 'hospital'
                                ? 'Diagnostic Lab'
                                : 'Patient (Record Owner)'}
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded font-bold">
                              ACTIVE
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                alt={user.name}
                className="h-8 w-8 rounded-full border border-slate-300 object-cover"
              />
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
