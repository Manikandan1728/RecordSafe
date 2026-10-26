import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Stethoscope,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Settings,
  Server
} from 'lucide-react';
import { getApiBaseUrl, setCustomApiUrl } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login, demoLogin, register, demoAccounts, loadDemoAccounts } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'hospital'>('patient');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('Dentist');
  const [licenseId, setLicenseId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register({
          name,
          email,
          password,
          role: selectedRole,
          specialization: selectedRole === 'doctor' ? specialization : undefined,
          license_id: selectedRole === 'doctor' ? licenseId : undefined,
          organization_name: selectedRole === 'hospital' ? orgName : undefined,
        });
      } else {
        await login(email, password, selectedRole);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    patient: {
      title: 'Patient Portal',
      subtitle: 'Own your health data, approve doctor access & watch live transparency.',
      icon: Lock,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 border-emerald-500 text-emerald-950',
    },
    doctor: {
      title: 'Doctor Portal',
      subtitle: 'Specialty-based clinical record access with patient consent.',
      icon: Stethoscope,
      color: 'text-sky-600',
      activeBg: 'bg-sky-50 border-sky-500 text-sky-950',
    },
    hospital: {
      title: 'Hospital / Lab Portal',
      subtitle: 'Upload medical reports, diagnostic scans & lab panels securely.',
      icon: Building2,
      color: 'text-purple-600',
      activeBg: 'bg-purple-50 border-purple-500 text-purple-950',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white shadow-xl shadow-sky-500/20 mb-4">
          <ShieldCheck className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
          Personal Health Locker
        </h1>
        <p className="mt-1 text-sm font-semibold text-sky-700">
          Your Health. Your Data. Your Control.
        </p>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
          Cryptographically audited, specialty-controlled medical record infrastructure.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl sm:px-10 border border-slate-200">
          {/* 1-Click Quick Demo Switcher Strip */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-900 text-white shadow-md">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Hackathon 1-Click Quick Demo Login</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Instant one-click access to test all roles and live features:
            </p>
            {demoAccounts && demoAccounts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => demoLogin(acc.email)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-sky-700 border border-slate-700 hover:border-sky-500 text-left transition-all group text-xs"
                  >
                    <div className="font-bold text-white group-hover:text-white truncate">
                      {(acc.name || 'User').split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 group-hover:text-sky-200 capitalize truncate">
                      {acc.role === 'doctor' ? (acc.specialization || 'Doctor') : acc.role}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 text-xs text-slate-400 border border-slate-700">
                <span>Demo accounts loading or unavailable.</span>
                <button
                  type="button"
                  onClick={loadDemoAccounts}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[10px] font-bold transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Role Selector Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Your Role:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['patient', 'doctor', 'hospital'] as const).map((role) => {
                const config = roleDescriptions[role];
                const Icon = config.icon;
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? config.activeBg + ' shadow-sm ring-2 ring-sky-500 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${config.color}`} />
                    <span className="text-xs font-bold capitalize">{role}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
              {roleDescriptions[selectedRole].subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={selectedRole === 'doctor' ? 'Dr. Sarah Jenkins' : 'John Doe'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            {isRegisterMode && selectedRole === 'doctor' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Medical Specialization
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="Dentist">Dentist</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Orthopedic">Orthopedic</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Neurologist">Neurologist</option>
                    <option value="Dermatologist">Dermatologist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    License ID
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value)}
                    placeholder="MCI-98421"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            {isRegisterMode && selectedRole === 'hospital' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Organization / Diagnostic Center Name
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Metro Diagnostic Laboratories"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  selectedRole === 'patient'
                    ? 'rahul@example.com'
                    : selectedRole === 'doctor'
                    ? 'arun@example.com'
                    : 'lab@example.com'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{isRegisterMode ? 'Create Secure Account' : `Sign In as ${selectedRole}`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isRegisterMode ? (
              <span>
                Already registered?{' '}
                <button
                  onClick={() => setIsRegisterMode(false)}
                  className="font-bold text-sky-600 hover:underline"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New to Health Locker?{' '}
                <button
                  onClick={() => setIsRegisterMode(true)}
                  className="font-bold text-sky-600 hover:underline"
                >
                  Register New {selectedRole}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Server Connection Status & Config for Android / Physical Devices */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowServerConfig(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-[11px] font-semibold text-slate-700 transition-colors"
          >
            <Server className="h-3 w-3 text-sky-600" />
            <span>Backend: {serverUrl}</span>
            <Settings className="h-3 w-3 text-slate-500 ml-1" />
          </button>
        </div>

        {/* Security & Trust Footer */}
        <div className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center space-x-4">
          <span className="flex items-center gap-1">
            <Lock className="h-3.5 w-3.5 text-slate-400" /> End-to-End Consent
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> SHA-256 Ledger
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" /> Zero Raw PHI
          </span>
        </div>
      </div>

      {/* Server Config Modal */}
      {showServerConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Configure Backend API URL</h3>
              </div>
              <button
                onClick={() => setShowServerConfig(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              When running on an Android phone or emulator, set the IP of your development computer (e.g. <code>http://10.186.59.77:5000/api</code> or <code>http://10.0.2.2:5000/api</code>).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">API Base URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://10.186.59.77:5000/api"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setServerUrl('http://10.186.59.77:5000/api')}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-left font-mono"
              >
                📱 Wi-Fi: 10.186.59.77
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://10.0.2.2:5000/api')}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-left font-mono"
              >
                🤖 Emulator: 10.0.2.2
              </button>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomApiUrl('');
                  const resetUrl = getApiBaseUrl();
                  setServerUrl(resetUrl);
                  setShowServerConfig(false);
                  window.location.reload();
                }}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomApiUrl(serverUrl);
                  setShowServerConfig(false);
                  window.location.reload();
                }}
                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
