import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveAccess } from '../context/LiveAccessContext';
import {
  ShieldCheck,
  Activity,
  Bell,
  LogOut,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
  X,
  Stethoscope,
  Building2,
  Lock,
  LucideIcon,
  UserCheck
} from 'lucide-react';
import { MobileBottomNav } from './MobileBottomNav';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeColor?: string;
  highlight?: boolean;
}

interface DashboardLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  navItems: NavItem[];
  onOpenBlockchainExplorer?: () => void;
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeTab,
  onTabChange,
  navItems,
  onOpenBlockchainExplorer,
  children,
  headerTitle,
  headerSubtitle,
}) => {
  const { user, logout, demoAccounts, demoLogin } = useAuth();
  const { liveSession, pendingRequests, notifications, dismissNotification, setActiveConsentModalRequest } = useLiveAccess();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  if (!user) return null;

  const roleColors = {
    patient: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    doctor: 'bg-sky-50 text-sky-700 border-sky-200',
    hospital: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const roleLabels = {
    patient: 'Patient Portal',
    doctor: `Dr. (${user.specialization || 'Clinical'})`,
    hospital: 'Diagnostic Center',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800 selection:bg-sky-500 selection:text-white">
      {/* ======================================================== */}
      {/* 1. DESKTOP LEFT SIDEBAR (>= 1024px)                     */}
      {/* ======================================================== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 bg-white border-r border-slate-200 sticky top-0 h-screen z-30 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-base font-sans truncate">
                Health Locker
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 flex-shrink-0">
                v1.0
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 truncate">
              Your Health. Your Control.
            </p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Navigation Group */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              {roleLabels[user.role]} Menu
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'audit' && onOpenBlockchainExplorer) {
                        onOpenBlockchainExplorer();
                      } else {
                        onTabChange(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                        : item.highlight
                        ? 'text-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-teal-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex-shrink-0 ${
                          isActive
                            ? 'bg-white text-sky-700'
                            : item.badgeColor || 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick System Actions */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Security & Audit
            </div>
            <button
              onClick={onOpenBlockchainExplorer}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <LinkIcon className="h-4 w-4 text-sky-600 flex-shrink-0" />
                <span>Blockchain Ledger</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                100% Intact
              </span>
            </button>
          </div>

          {/* Quick Demo Switcher Strip for Presentation */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 pb-2 text-[10px] font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Quick Switch Role
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((acc) => {
                const isCurrent = user.email === acc.email;
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      if (!isCurrent) demoLogin(acc.email);
                    }}
                    className={`p-2 rounded-lg text-left text-[11px] transition-all truncate ${
                      isCurrent
                        ? 'bg-sky-50 border border-sky-300 text-sky-900 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600'
                    }`}
                    title={acc.name || 'Demo User'}
                  >
                    <div className="truncate font-semibold">{(acc.name || 'User').split(' ')[0]}</div>
                    <div className="text-[9px] text-slate-400 capitalize truncate">
                      {acc.role === 'doctor' ? (acc.specialization || 'Doctor') : acc.role}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer / Profile Card */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <img
              src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`}
              alt={user.name || 'User'}
              className="h-8 w-8 rounded-full border border-slate-300 object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">{user.name || 'Healthcare User'}</div>
              <div className="text-[10px] text-slate-500 capitalize truncate">{roleLabels[user.role] || user.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA + TOP HEADER                       */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Title / Context / Mobile Logo */}
              <div className="flex items-center space-x-3">
                {/* Mobile Brand Logo */}
                <div className="lg:hidden flex items-center space-x-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 tracking-tight text-sm">
                      Health Locker
                    </span>
                    <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                      Your Health. Your Control.
                    </p>
                  </div>
                </div>

                {/* Desktop Contextual Heading */}
                <div className="hidden lg:block">
                  <div className="text-sm font-bold text-slate-900 tracking-tight">
                    {headerTitle || 'Personal Health Locker'}
                  </div>
                  {headerSubtitle && (
                    <p className="text-xs text-slate-500">{headerSubtitle}</p>
                  )}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                {/* Live Access Status Pill for Patient */}
                {user.role === 'patient' && liveSession && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                    <span className="text-[11px] font-extrabold tracking-wide flex items-center gap-1">
                      <Activity className="h-3 w-3" /> LIVE ACTIVE
                    </span>
                  </div>
                )}

                {/* Blockchain Explorer Trigger (Tablet / Desktop) */}
                <button
                  onClick={onOpenBlockchainExplorer}
                  className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-sky-700 hover:bg-slate-100 transition-colors border border-slate-200"
                  title="Inspect Immutable Audit Ledger"
                >
                  <LinkIcon className="h-3.5 w-3.5 text-sky-600" />
                  <span>Ledger</span>
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
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    {(pendingRequests.length > 0 || notifications.length > 0) && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                    )}
                  </button>

                  {showNotifMenu && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Live Notifications & Consent
                        </span>
                        <button
                          onClick={() => setShowNotifMenu(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs p-1"
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
                                className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex flex-col justify-between cursor-pointer hover:bg-amber-100 transition-colors"
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

                        {/* Standard Notifications */}
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-start justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">{n.title}</p>
                              <p className="text-slate-600 text-[11px] mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block font-mono">{n.timestamp}</span>
                            </div>
                            <button
                              onClick={() => dismissNotification(n.id)}
                              className="text-slate-400 hover:text-slate-600 ml-2 p-0.5"
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

                {/* 1-Click Demo Switcher Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDemoMenu(!showDemoMenu)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
                    title="Switch Roles for Demo"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span className="hidden sm:inline">Demo Switcher</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>

                  {showDemoMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-fade-in">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Role Switcher (Hackathon)
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
                              className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
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

                {/* Mobile / Header Avatar & Logout */}
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

        {/* Main Viewport Content */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>

        {/* Modern Trust Healthcare Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <span className="font-extrabold text-slate-900">Personal Health Locker</span>
              <span className="text-slate-300">|</span>
              <span className="text-sky-700 font-semibold text-[11px]">Your Health. Your Data. Your Control.</span>
            </div>

            <div className="flex items-center space-x-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-slate-400" /> End-to-End Consent
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-slate-400" /> Real-time Transparency
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-slate-400" /> SHA-256 Ledger
              </span>
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation (< lg) */}
        <div className="lg:hidden">
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            onOpenBlockchain={onOpenBlockchainExplorer}
          />
        </div>
      </div>
    </div>
  );
};
