import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiveAccessProvider } from './context/LiveAccessContext';
import { Navbar } from './components/Navbar';
import { ConsentModal } from './components/ConsentModal';
import { BlockchainExplorerModal } from './components/BlockchainExplorerModal';
import { LoginPage } from './pages/LoginPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { ShieldCheck, Heart, Lock, Activity } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [showBlockchainExplorer, setShowBlockchainExplorer] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-sky-500/20 mx-auto animate-bounce">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Initializing Health Locker Vault...</h2>
          <p className="text-xs text-slate-400">Verifying cryptographic session signatures</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-sky-500 selection:text-white font-sans text-slate-800">
      {/* Role-Based Dashboard View */}
      {user.role === 'patient' && (
        <ErrorBoundary fallbackTitle="Patient Portal Error">
          <PatientDashboard onOpenBlockchainExplorer={() => setShowBlockchainExplorer(true)} />
        </ErrorBoundary>
      )}
      {user.role === 'doctor' && (
        <ErrorBoundary fallbackTitle="Doctor Portal Error">
          <DoctorDashboard onOpenBlockchainExplorer={() => setShowBlockchainExplorer(true)} />
        </ErrorBoundary>
      )}
      {user.role === 'hospital' && (
        <ErrorBoundary fallbackTitle="Hospital Portal Error">
          <HospitalDashboard onOpenBlockchainExplorer={() => setShowBlockchainExplorer(true)} />
        </ErrorBoundary>
      )}

      {/* Global Consent Modal for Patient */}
      <ConsentModal />

      {/* Global Blockchain Explorer Modal */}
      {showBlockchainExplorer && (
        <BlockchainExplorerModal onClose={() => setShowBlockchainExplorer(false)} />
      )}
    </div>
  );
};

import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LiveAccessProvider>
          <MainLayout />
        </LiveAccessProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
