import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wsClient } from '../services/websocket';
import { api } from '../services/api';
import { AccessRequest, ViewingSession } from '../types';

interface LiveAccessContextType {
  liveSession: {
    sessionId: string;
    doctor: { id: string; name: string; specialization: string; avatar?: string };
    document: { id: string; title: string; category: string; pageCount: number };
    currentPage: number;
    startedAt: string;
    elapsedSeconds: number;
    txHash?: string;
  } | null;
  pendingRequests: AccessRequest[];
  completedSessionTrace: any | null;
  setCompletedSessionTrace: (trace: any | null) => void;
  activeConsentModalRequest: AccessRequest | null;
  setActiveConsentModalRequest: (req: AccessRequest | null) => void;
  notifications: Array<{ id: string; title: string; message: string; type: 'info' | 'live' | 'success' | 'alert'; timestamp: string }>;
  dismissNotification: (id: string) => void;
  refreshRequests: () => Promise<void>;
  revokeSession: (requestId: string) => Promise<void>;
  respondToRequest: (requestId: string, action: 'grant' | 'approve' | 'deny', durationMinutes?: number) => Promise<void>;
  lastDocumentUpdateTime: number;
}

const LiveAccessContext = createContext<LiveAccessContextType | undefined>(undefined);

export const LiveAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [liveSession, setLiveSession] = useState<any | null>(null);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [completedSessionTrace, setCompletedSessionTrace] = useState<any | null>(null);
  const [activeConsentModalRequest, setActiveConsentModalRequest] = useState<AccessRequest | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastDocumentUpdateTime, setLastDocumentUpdateTime] = useState<number>(Date.now());

  const addNotification = (title: string, message: string, type: 'info' | 'live' | 'success' | 'alert' = 'info') => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [{ id, title, message, type, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const refreshRequests = useCallback(async () => {
    if (user?.role !== 'patient') return;
    try {
      const res = await api.getAccessRequests();
      const pending = (res.requests || []).filter((r: AccessRequest) => r.status === 'pending');
      setPendingRequests(pending);
    } catch (e) {
      console.warn('Failed to refresh access requests', e);
    }
  }, [user?.role]);

  const checkLiveAccess = useCallback(async () => {
    if (user?.role !== 'patient') {
      setLiveSession(null);
      return;
    }

    try {
      const res = await api.getLiveAccess();
      if (res.activeSession) {
        const s = res.activeSession;
        setLiveSession({
          sessionId: s.id,
          doctor: {
            id: s.doctor_id,
            name: s.doctor_name,
            specialization: s.doctor_specialization,
            avatar: s.doctor_avatar,
          },
          document: {
            id: s.document_id,
            title: s.document_title,
            category: s.document_category,
            pageCount: s.page_count || 3,
          },
          currentPage: s.current_page || 1,
          startedAt: s.started_at,
          elapsedSeconds: s.elapsedSeconds || 0,
        });
      } else {
        setLiveSession(null);
      }
    } catch (e) {
      console.warn('Failed to check live access', e);
    }
  }, [user?.role]);

  // Initial load & periodic polling fallback (every 2.5s for patient)
  useEffect(() => {
    if (user?.role === 'patient') {
      refreshRequests();
      checkLiveAccess();

      const pollInterval = setInterval(() => {
        refreshRequests();
        checkLiveAccess();
      }, 2500);

      return () => clearInterval(pollInterval);
    } else {
      setLiveSession(null);
      setPendingRequests([]);
    }
  }, [user, refreshRequests, checkLiveAccess]);

  // Live timer tick when a doctor is viewing
  useEffect(() => {
    if (!liveSession) return;
    const interval = setInterval(() => {
      setLiveSession((prev: any) => {
        if (!prev) return null;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [liveSession?.sessionId]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const unsubStarted = wsClient.on('LIVE_ACCESS_STARTED', (data: any) => {
      setLiveSession({
        sessionId: data.sessionId,
        doctor: data.doctor,
        document: data.document,
        currentPage: data.currentPage,
        startedAt: data.startedAt,
        elapsedSeconds: 0,
        txHash: data.txHash,
      });
      addNotification(
        '🔴 LIVE ACCESS ACTIVE',
        `${data.doctor.name} (${data.doctor.specialization}) opened "${data.document.title}"`,
        'live'
      );
    });

    const unsubPageChanged = wsClient.on('LIVE_ACCESS_PAGE_CHANGED', (data: any) => {
      setLiveSession((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          currentPage: data.currentPage,
          document: {
            ...prev.document,
            ...data.document,
          },
        };
      });
      addNotification(
        '📄 Page Changed',
        `${data.doctor?.name || 'Doctor'} navigated to Page ${data.currentPage}`,
        'info'
      );
    });

    const unsubTick = wsClient.on('LIVE_ACCESS_TICK', (data: any) => {
      setLiveSession((prev: any) => {
        if (!prev || prev.sessionId !== data.sessionId) return prev;
        return { ...prev, currentPage: data.currentPage, elapsedSeconds: data.elapsedSeconds };
      });
    });

    const unsubEnded = wsClient.on('LIVE_ACCESS_ENDED', (data: any) => {
      setLiveSession(null);
      setCompletedSessionTrace(data);
      addNotification(
        'Session Completed',
        `Doctor viewing session completed. Detailed Access Trace generated.`,
        'success'
      );
    });

    const handleNewRequest = (data: any) => {
      refreshRequests();
      addNotification(
        '🔐 New Access Request',
        `${data.doctor?.name || 'Doctor'} (${data.doctor?.specialization || 'Specialist'}) requested access to your medical records.`,
        'alert'
      );
    };

    const unsubRequestReceived = wsClient.on('ACCESS_REQUEST_RECEIVED', handleNewRequest);
    const unsubRequestCreated = wsClient.on('ACCESS_REQUEST_CREATED', handleNewRequest);

    const unsubNewDoc = wsClient.on('NEW_DOCUMENT_UPLOADED', (data: any) => {
      setLastDocumentUpdateTime(Date.now());
      addNotification(
        '📑 New Medical Record Added',
        `"${data.title}" was uploaded by ${data.uploader}. Integrity verified.`,
        'success'
      );
    });

    return () => {
      unsubStarted();
      unsubPageChanged();
      unsubTick();
      unsubEnded();
      unsubRequestReceived();
      unsubRequestCreated();
      unsubNewDoc();
    };
  }, [user, refreshRequests]);

  const respondToRequest = async (requestId: string, action: 'grant' | 'approve' | 'deny') => {
    try {
      await api.respondToAccessRequest(requestId, action);
      await refreshRequests();
      if (action === 'grant' || action === 'approve') {
        addNotification('✓ Access Authorized', 'Doctor permission granted for clinical consultation.', 'success');
      } else {
        addNotification('Access Denied', 'Doctor request was rejected.', 'info');
      }
    } catch (e: any) {
      console.error('Failed to respond to request', e);
      alert(e.message || 'Failed to update access request');
    }
  };

  const revokeSession = async (requestId: string) => {
    try {
      await api.revokeAccessRequest(requestId);
      setLiveSession(null);
      refreshRequests();
      addNotification('Access Revoked', 'Doctor permission immediately terminated.', 'alert');
    } catch (e) {
      console.error('Failed to revoke access', e);
    }
  };

  return (
    <LiveAccessContext.Provider
      value={{
        liveSession,
        pendingRequests,
        completedSessionTrace,
        setCompletedSessionTrace,
        activeConsentModalRequest,
        setActiveConsentModalRequest,
        notifications,
        dismissNotification,
        refreshRequests,
        revokeSession,
        respondToRequest,
        lastDocumentUpdateTime,
      }}
    >
      {children}
    </LiveAccessContext.Provider>
  );
};

export const useLiveAccess = () => {
  const ctx = useContext(LiveAccessContext);
  if (!ctx) throw new Error('useLiveAccess must be used within LiveAccessProvider');
  return ctx;
};
