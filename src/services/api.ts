import { Capacitor } from '@capacitor/core';

export const DEFAULT_LAN_API_URL = 'http://10.186.59.77:5000/api';

export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
      return true;
    }
  } catch (e) {
    // fallback
  }

  if (typeof (window as any)?.Capacitor !== 'undefined') return true;
  if (window.location.protocol === 'capacitor:') return true;

  // In Android WebView with androidScheme: 'http' or 'https', origin is http://localhost or https://localhost with NO port
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasNoPort = !window.location.port || window.location.port === '' || window.location.port === '80' || window.location.port === '443';
  if (isLocalHost && hasNoPort && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    return true;
  }

  return false;
}

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem('hl_custom_api_url');
  if (custom && custom.trim()) {
    let clean = custom.trim().replace(/\/+$/, '');
    // Ensure that if a full URL like http://10.186.59.77:5000 is given, it ends with /api
    if (clean.startsWith('http') && !clean.endsWith('/api')) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  // If in Capacitor / Native Android container, ALWAYS use the LAN backend URL
  if (isNativeAndroid()) {
    return DEFAULT_LAN_API_URL;
  }

  // Web browser development/production fallback
  // If running in browser at localhost:5173, Vite proxy handles /api
  return '/api';
}

export function getWsBaseUrl(): string {
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith('http')) {
    const wsProto = apiBase.startsWith('https') ? 'wss:' : 'ws:';
    const host = apiBase.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '');
    return `${wsProto}//${host}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

export function setCustomApiUrl(url: string) {
  if (url && url.trim()) {
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.startsWith('http') && !clean.endsWith('/api')) {
      clean = `${clean}/api`;
    }
    localStorage.setItem('hl_custom_api_url', clean);
  } else {
    localStorage.removeItem('hl_custom_api_url');
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('hl_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('hl_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('hl_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let base = getApiBaseUrl().trim().replace(/\/+$/, '');
  if (base.startsWith('http') && !base.endsWith('/api')) {
    base = `${base}/api`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const finalUrl = `${base}${cleanEndpoint}`;

  console.log(`[API Request] ${options.method || 'GET'} ${finalUrl}`);

  let response: Response;
  try {
    response = await fetch(finalUrl, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    console.error(`[API Network Error] Failed to fetch ${finalUrl}:`, netErr);
    throw new Error(`Unable to connect to backend server at ${finalUrl}. Please verify the laptop Wi-Fi IP and server status.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  const text = typeof rawText === 'string' ? rawText : '';

  console.log(`[API Response] Status: ${response.status} | Content-Type: ${contentType} | URL: ${finalUrl} | Body Preview: ${text.length > 0 ? text.substring(0, 120) : '(empty)'}`);

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    console.error(`[API Parse Error] Received non-JSON response from ${finalUrl}: status=${response.status}, contentType=${contentType}, preview=${text.length > 0 ? text.substring(0, 200) : '(empty)'}`);
    const error = new Error(`Server at ${finalUrl} returned unexpected response (${response.status} ${response.statusText}): ${text.length > 0 ? text.substring(0, 100) : '(empty)'}`);
    (error as any).status = response.status;
    (error as any).rawText = text;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data.message || data.error || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth
  getDemoAccounts: () => request<{ users: any[] }>('/auth/demo-accounts'),
  demoLogin: (email: string) => request<{ token: string; user: any }>('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  login: (data: any) => request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  register: (data: any) => request<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMe: () => request<{ user: any }>('/auth/me'),

  // Patient Locker & Documents
  getMyDocuments: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    return request<{ documents: any[] }>(`/patients/me/documents?${query.toString()}`);
  },
  getDocument: (id: string) => request<{ document: any }>(`/documents/${id}`),
  getDocumentToken: (id: string) => request<{ viewToken: string; expiresInSeconds: number; streamUrl: string }>(`/documents/${id}/token`),
  streamDocument: (id: string, token: string) => request<any>(`/documents/${id}/stream?token=${token}`),
  uploadDocument: (formData: FormData) => request<any>('/documents/upload', {
    method: 'POST',
    body: formData,
  }),

  // Hospital & Doctor Patient Directory & Requests
  getHospitalPatients: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ patients: any[] }>(`/hospital/patients${query}`);
  },
  getHospitalUploads: () => request<{ uploads: any[] }>('/hospital/uploads'),
  getDoctorPatients: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ patients: any[] }>(`/doctor/patients${query}`);
  },
  getPatientRecordsForDoctor: (patientId: string) => request<{
    patient: any;
    doctorSpecialization: string;
    permittedRecords: any[];
    restrictedRecords: any[];
    activePermission: any;
  }>(`/doctor/patients/${patientId}/records`),
  createAccessRequest: (data: { patient_id: string; document_ids: string[]; purpose: string; duration_minutes?: number }) =>
    request<any>('/doctor/access-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Patient Consent Workflow
  getAccessRequests: () => request<{ requests: any[] }>('/patient/access-requests'),
  respondToAccessRequest: (requestId: string, action: 'grant' | 'approve' | 'deny') =>
    request<any>(`/patient/access-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
  revokeAccessRequest: (requestId: string) =>
    request<any>(`/patient/access-requests/${requestId}/revoke`, {
      method: 'POST',
    }),

  // Live Viewing Sessions
  startViewingSession: (data: { document_id: string; request_id?: string }) =>
    request<{ sessionId: string; document: any; txHash: string }>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  changePageView: (sessionId: string, data: { page_number: number; previous_page?: number; previous_page_duration_seconds?: number }) =>
    request<any>(`/sessions/${sessionId}/page-view`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  sendHeartbeat: (sessionId: string, elapsedSeconds: number) =>
    request<any>(`/sessions/${sessionId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ elapsed_seconds: elapsedSeconds }),
    }),
  endViewingSession: (sessionId: string, data: { final_page?: number; final_page_duration_seconds?: number; total_duration_seconds?: number }) =>
    request<any>(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Access Trace & Audit
  getAccessHistory: () => request<{ sessions: any[] }>('/patient/access-history'),
  getLiveAccess: () => request<{ activeSession: any }>('/patient/live-access'),

  // Blockchain Ledger
  getBlockchainTransactions: (params?: { limit?: number; eventType?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.eventType) query.append('eventType', params.eventType);
    return request<{ transactions: any[] }>(`/blockchain/transactions?${query.toString()}`);
  },
  verifyBlockchain: () => request<{ isValid: boolean; totalBlocks: number; tamperedBlocks: number[]; verifiedAt: string }>('/blockchain/verify'),

  // AI Assistant
  analyzeDocumentWithAI: (docId: string) => request<{ summary: any }>(`/ai/analyze-document/${docId}`, {
    method: 'POST',
  }),

  // Reminders
  getReminders: () => request<{ reminders: any[] }>('/reminders'),
  createReminder: (data: any) => request<{ reminder: any }>('/reminders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  toggleReminder: (id: string) => request<any>(`/reminders/${id}/toggle`, {
    method: 'PATCH',
  }),
  deleteReminder: (id: string) => request<any>(`/reminders/${id}`, {
    method: 'DELETE',
  }),

  // Medications
  getMedications: () => request<{ medications: any[] }>('/medications'),
  getAllMedications: () => request<{ medications: any[] }>('/medications/all'),
  logMedicationAction: (medId: string, data: { action: 'taken' | 'skipped' | 'snoozed'; scheduled_time?: string; scheduled_date?: string; notes?: string }) =>
    request<{ log: any }>(`/medications/${medId}/log`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMedicationLogs: (medId: string) => request<{ logs: any[] }>(`/medications/${medId}/logs`),

  // Health Indicators
  getHealthIndicators: () => request<{ indicators: any[] }>('/health-indicators'),

  // AI Health Summary (patient-level)
  getHealthSummary: () => request<{ summary: any }>('/ai/health-summary'),

  // Health Timeline
  getHealthTimeline: () => request<{ timeline: any[] }>('/health-timeline'),
};
