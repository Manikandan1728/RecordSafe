import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../services/api';
import { wsClient } from '../services/websocket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  demoAccounts: User[];
  loadDemoAccounts: () => Promise<void>;
  login: (email: string, password: string, expectedRole?: string) => Promise<void>;
  demoLogin: (email: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState<User[]>([]);

  const loadDemoAccounts = async () => {
    try {
      const res = await api.getDemoAccounts();
      if (Array.isArray(res?.users)) {
        setDemoAccounts(res.users);
      } else {
        setDemoAccounts([]);
      }
    } catch (e) {
      console.warn('Failed to load demo accounts', e);
      setDemoAccounts([]);
    }
  };

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      wsClient.connect();
    } catch (err) {
      clearAuthToken();
      setUser(null);
      wsClient.disconnect();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemoAccounts();
    refreshUser();
  }, []);

  const login = async (email: string, password: string, expectedRole?: string) => {
    const res = await api.login({ email, password, expectedRole });
    setAuthToken(res.token);
    setUser(res.user);
    wsClient.connect();
  };

  const demoLogin = async (email: string) => {
    const res = await api.demoLogin(email);
    setAuthToken(res.token);
    setUser(res.user);
    wsClient.connect();
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    setAuthToken(res.token);
    setUser(res.user);
    wsClient.connect();
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    wsClient.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, loading, demoAccounts, loadDemoAccounts, login, demoLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
