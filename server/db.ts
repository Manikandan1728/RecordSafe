import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'health_locker.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'hospital')),
      specialization TEXT,
      license_id TEXT,
      organization_name TEXT,
      phone TEXT,
      dob TEXT,
      blood_group TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medical_documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      uploader_name TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      specialty TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_key TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 1,
      clinical_notes TEXT,
      pages_json TEXT,
      is_verified INTEGER DEFAULT 1,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      document_ids_json TEXT NOT NULL,
      purpose TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'granted', 'denied', 'revoked')),
      requested_at TEXT DEFAULT (datetime('now')),
      responded_at TEXT,
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS access_permissions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      document_ids_json TEXT NOT NULL,
      granted_at TEXT DEFAULT (datetime('now')),
      revoked_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'revoked')),
      FOREIGN KEY (request_id) REFERENCES access_requests(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS viewing_sessions (
      id TEXT PRIMARY KEY,
      permission_id TEXT,
      request_id TEXT,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'ended')),
      current_page INTEGER DEFAULT 1,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      total_duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (permission_id) REFERENCES access_permissions(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (document_id) REFERENCES medical_documents(id)
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES viewing_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blockchain_transactions (
      id TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      tx_hash TEXT NOT NULL UNIQUE,
      block_hash TEXT NOT NULL,
      previous_block_hash TEXT NOT NULL,
      document_hash TEXT,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      target_id TEXT,
      target_name TEXT,
      payload_json TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_verified INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('medication', 'test', 'consultation', 'general')),
      due_time TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'skipped', 'snoozed')),
      notes TEXT,
      source_document_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      schedule_times TEXT NOT NULL,
      duration_days INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      prescribed_by TEXT,
      source_document_id TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('taken', 'skipped', 'snoozed')),
      action_at TEXT DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (medication_id) REFERENCES medications(id),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS health_indicators (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      parameter TEXT NOT NULL,
      value TEXT NOT NULL,
      unit TEXT,
      reference_range TEXT,
      status TEXT NOT NULL CHECK(status IN ('normal', 'attention', 'urgent')),
      source_document_id TEXT NOT NULL,
      source_document_title TEXT NOT NULL,
      source_date TEXT NOT NULL,
      clinical_context TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (source_document_id) REFERENCES medical_documents(id)
    );
  `);

  console.log('✅ SQLite Database schema initialized successfully');
}
