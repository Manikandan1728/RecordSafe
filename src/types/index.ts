export type UserRole = 'patient' | 'doctor' | 'hospital';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialization?: string | null;
  license_id?: string | null;
  organization_name?: string | null;
  phone?: string | null;
  dob?: string | null;
  blood_group?: string | null;
  avatar_url?: string;
  created_at?: string;
}

export interface DocumentSection {
  label: string;
  value: string;
}

export interface DocumentPage {
  pageNumber: number;
  title: string;
  type: 'imaging' | 'chart' | 'lab' | 'summary' | 'report';
  sections: DocumentSection[];
}

export interface MedicalDocument {
  id: string;
  patient_id: string;
  uploader_id: string;
  uploader_name: string;
  title: string;
  category: string;
  specialty: string;
  file_type: string;
  file_size: number;
  storage_key: string;
  file_hash: string;
  page_count: number;
  clinical_notes?: string | null;
  pages?: DocumentPage[];
  pages_json?: string;
  is_verified: number;
  created_at: string;
  isIntegrityVerified?: boolean;
}

export interface AccessRequest {
  id: string;
  doctor_id: string;
  patient_id: string;
  doctor_name: string;
  doctor_specialization: string;
  doctor_avatar?: string;
  license_id?: string;
  document_ids_json: string;
  requestedDocuments?: MedicalDocument[];
  purpose: string;
  duration_minutes?: number;
  status: 'pending' | 'approved' | 'granted' | 'denied' | 'revoked';
  requested_at: string;
  responded_at?: string;
}

export interface AccessPermission {
  id: string;
  request_id: string;
  patient_id: string;
  doctor_id: string;
  document_ids_json: string;
  granted_at: string;
  revoked_at?: string;
  status: 'active' | 'revoked';
}

export interface PageActivity {
  page_number: number;
  duration_seconds: number;
  opened_at?: string;
  closed_at?: string;
}

export interface ViewingSession {
  id: string;
  request_id?: string;
  doctor_id: string;
  patient_id: string;
  document_id: string;
  doctor_name: string;
  doctor_specialization: string;
  doctor_avatar?: string;
  document_title: string;
  document_category: string;
  document_specialty: string;
  file_hash?: string;
  status: 'active' | 'ended';
  current_page: number;
  page_count?: number;
  started_at: string;
  ended_at?: string;
  total_duration_seconds: number;
  elapsedSeconds?: number;
  pageActivity?: PageActivity[];
  blockchainAudit?: {
    txHash: string;
    blockNumber: number;
    blockHash?: string;
    timestamp?: string;
    isVerified: boolean;
  };
}

export interface BlockchainTransaction {
  id: string;
  block_number: number;
  event_type: string;
  tx_hash: string;
  block_hash: string;
  previous_block_hash: string;
  document_hash?: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  target_id?: string;
  target_name?: string;
  payload: Record<string, any>;
  timestamp: string;
  is_verified: number;
}

export interface Reminder {
  id: string;
  patient_id: string;
  title: string;
  category: 'medication' | 'test' | 'consultation' | 'general';
  due_time: string;
  due_date: string;
  status: 'pending' | 'completed';
  notes?: string;
  created_at?: string;
}

export interface AISummary {
  documentId: string;
  documentTitle: string;
  category: string;
  overview: string;
  keyFindings: Array<{
    parameter: string;
    value: string;
    referenceRange: string;
    status: 'normal' | 'attention_needed' | 'critical_review';
    clinicalContext: string;
  }>;
  preventiveSuggestions: {
    nutrition: string;
    activity: string;
    followUp: string;
  };
  disclaimer: string;
  generatedAt: string;
}
