import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data', 'health_locker.db');
const db = new Database(dbPath);

console.log('Migrating database schema...');

db.pragma('foreign_keys = OFF');

// Add permission_id column to viewing_sessions if not present
const viewingSessionsCols = db.prepare('PRAGMA table_info(viewing_sessions)').all() as any[];
const hasPermissionId = viewingSessionsCols.some(c => c.name === 'permission_id');
if (!hasPermissionId) {
  console.log('Adding permission_id to viewing_sessions...');
  db.exec('ALTER TABLE viewing_sessions ADD COLUMN permission_id TEXT;');
}

console.log('✅ Schema migration completed successfully.');
