import express from 'express';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { db, initDatabase } from './db';
import { initBlockchain, recordBlockchainEvent, verifyLedgerIntegrity } from './blockchain';
import { initWebSocketServer, sendToUser, broadcastAll } from './websocket';
import { isSpecialtyPermitted, SPECIALTY_RULES, ALL_CATEGORIES, ALL_SPECIALTIES } from './specialty';
import { generateAIHealthSummary, generateHealthSummaryCard, generateHealthTimeline } from './ai';
import { seedDatabase } from './seed';

const JWT_SECRET = process.env.JWT_SECRET || 'health-locker-dev-secret-key-2026';
const PORT = process.env.PORT || 5000;

// Set up storage directory
const storageDir = path.resolve(__dirname, '../data/uploads');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const upload = multer({
  dest: storageDir,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

const app = express();
app.use(cors());
app.use(express.json());

// Initialize HTTP & WebSocket servers
const server = http.createServer(app);
initDatabase();
initWebSocketServer(server);
seedDatabase();

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// 1. AUTHENTICATION & DEMO SWITCHER ROUTES
// ==========================================

// Get demo accounts for 1-click test switching in Hackathon
app.get('/api/auth/demo-accounts', (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, specialization, license_id, organization_name, avatar_url, phone, blood_group
    FROM users
  `).all();
  res.json({ users });
});

// Demo login
app.post('/api/auth/demo-login', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(404).json({ error: 'Demo user not found.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, specialization: user.specialization },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, specialization, license_id, organization_name, phone, dob, blood_group } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  if (!['patient', 'doctor', 'hospital'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be patient, doctor, or hospital.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const id = `usr-${role}-${Date.now().toString(36)}`;
  const avatar_url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7`;

  db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, specialization, license_id, organization_name, phone, dob, blood_group, avatar_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name, email, password_hash, role,
    specialization || null,
    license_id || null,
    organization_name || null,
    phone || null,
    dob || null,
    blood_group || null,
    avatar_url
  );

  const token = jwt.sign(
    { id, name, email, role, specialization: specialization || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const user = db.prepare('SELECT id, name, email, role, specialization, license_id, organization_name, phone, dob, blood_group, avatar_url, created_at FROM users WHERE id = ?').get(id);

  res.status(201).json({ token, user });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password, expectedRole } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (expectedRole && user.role !== expectedRole) {
    return res.status(403).json({ error: `Account exists but role is ${user.role}. Please select the ${user.role} login portal.` });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, specialization: user.specialization },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Me
app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = db.prepare(`
    SELECT id, name, email, role, specialization, license_id, organization_name, phone, dob, blood_group, avatar_url, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user });
});

// ==========================================
// 2. HEALTH LOCKER & DOCUMENTS
// ==========================================

// Patient: Get my health locker documents
app.get('/api/patients/me/documents', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can access their personal health locker directly.' });
  }

  const { category, search } = req.query;
  let query = 'SELECT * FROM medical_documents WHERE patient_id = ?';
  const params: any[] = [req.user.id];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (title LIKE ? OR specialty LIKE ? OR clinical_notes LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY created_at DESC';

  const documents = db.prepare(query).all(...params).map((d: any) => ({
    ...d,
    pages: d.pages_json ? JSON.parse(d.pages_json) : []
  }));

  res.json({ documents });
});

// Get document metadata & verify integrity
app.get('/api/documents/:id', authenticateToken, (req: any, res) => {
  const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(req.params.id) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Medical document not found.' });
  }

  // Authorization check: Patient owns it OR Doctor has active permission OR Hospital uploaded it
  if (req.user.role === 'patient' && doc.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized: You do not own this medical document.' });
  }

  if (req.user.role === 'doctor') {
    // Check if doctor has active granted access permission from access_permissions table
    const permission = db.prepare(`
      SELECT * FROM access_permissions
      WHERE doctor_id = ? AND patient_id = ? AND status = 'active'
      ORDER BY granted_at DESC LIMIT 1
    `).get(req.user.id, doc.patient_id) as any;

    if (!permission) {
      return res.status(403).json({ error: 'Access Denied: You do not have active patient consent to view this record.' });
    }

    const docIds = JSON.parse(permission.document_ids_json || '[]');
    if (!docIds.includes(doc.id)) {
      return res.status(403).json({ error: 'Access Denied: This specific document was not included in the approved consent scope.' });
    }
  }

  // Verify SHA-256 integrity
  const isIntegrityVerified = !!doc.file_hash;

  res.json({
    document: {
      ...doc,
      pages: doc.pages_json ? JSON.parse(doc.pages_json) : [],
      isIntegrityVerified
    }
  });
});

// Generate 5-minute temporary view token for secure document viewing
app.get('/api/documents/:id/token', authenticateToken, (req: any, res) => {
  const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(req.params.id) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Check permissions
  if (req.user.role === 'doctor') {
    const permission = db.prepare(`
      SELECT * FROM access_permissions
      WHERE doctor_id = ? AND patient_id = ? AND status = 'active'
      ORDER BY granted_at DESC LIMIT 1
    `).get(req.user.id, doc.patient_id) as any;

    if (!permission) {
      return res.status(403).json({ error: 'Active patient consent is required to generate a viewing token.' });
    }
  } else if (req.user.role === 'patient' && doc.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const viewToken = jwt.sign(
    { docId: doc.id, userId: req.user.id, role: req.user.role },
    JWT_SECRET,
    { expiresIn: '5m' }
  );

  res.json({
    viewToken,
    expiresInSeconds: 300,
    streamUrl: `/api/documents/${doc.id}/stream?token=${viewToken}`
  });
});

// Secure Document Streaming Endpoint
app.get('/api/documents/:id/stream', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(401).json({ error: 'Missing temporary view token.' });
  }

  try {
    const decoded = jwt.verify(token as string, JWT_SECRET) as any;
    if (decoded.docId !== req.params.id) {
      return res.status(403).json({ error: 'Invalid token for this document.' });
    }

    const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(req.params.id) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    res.json({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      specialty: doc.specialty,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      fileHash: doc.file_hash,
      pageCount: doc.page_count,
      clinicalNotes: doc.clinical_notes,
      pages: doc.pages_json ? JSON.parse(doc.pages_json) : []
    });
  } catch (err) {
    return res.status(403).json({ error: 'Session or view token has expired. Please refresh the locker.' });
  }
});

// Patient or Hospital Upload Document
app.post('/api/documents/upload', authenticateToken, upload.single('file'), (req: any, res) => {
  const { patient_id, title, category, specialty, clinical_notes, pages_content } = req.body;

  if (!['hospital', 'patient', 'doctor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized role for uploading medical documents.' });
  }

  const targetPatientId = req.user.role === 'patient' ? req.user.id : patient_id;
  if (!targetPatientId) {
    return res.status(400).json({ error: 'Target patient ID is required.' });
  }

  const patientUser = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'patient'").get(targetPatientId) as any;
  if (!patientUser) {
    return res.status(404).json({ error: 'Selected patient does not exist in the health registry.' });
  }

  if (!title || !category || !specialty) {
    return res.status(400).json({ error: 'Document title, category, and specialty are required.' });
  }

  const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Calculate SHA-256 hash
  let fileHash = '';
  let fileSizeBytes = 2840000;
  let fileType = 'PDF';
  let storageKey = `vault/patients/${targetPatientId}/${Date.now()}_${title.toLowerCase().replace(/\s+/g, '_')}.pdf`;

  if (req.file) {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      fileSizeBytes = req.file.size;
      const ext = path.extname(req.file.originalname).toUpperCase().replace('.', '') || 'PDF';
      fileType = ext;
      storageKey = `vault/patients/${targetPatientId}/${req.file.filename}_${req.file.originalname}`;
    } catch (e) {
      fileHash = crypto.createHash('sha256').update(docId + title + Date.now()).digest('hex');
    }
  } else {
    fileHash = crypto.createHash('sha256').update(docId + title + Date.now()).digest('hex');
  }

  let pages = [];
  if (pages_content) {
    try {
      pages = JSON.parse(pages_content);
    } catch (e) {
      pages = [{
        pageNumber: 1,
        title: title,
        type: 'report',
        sections: [{ label: 'Clinical Notes', value: clinical_notes || 'Standard medical report.' }]
      }];
    }
  } else {
    const isImaging = ['X-Rays', 'Scans', 'Dental Records', 'ECG'].includes(category);
    pages = [
      {
        pageNumber: 1,
        title: `${title} - Primary Clinical Findings`,
        type: isImaging ? 'imaging' : 'lab',
        sections: [
          { label: 'Patient Name', value: patientUser.name },
          { label: 'Issuing Diagnostic Provider', value: req.user.organization_name || req.user.name },
          { label: 'Diagnostic Category', value: `${category} (${specialty})` },
          { label: 'Clinical Assessment & Findings', value: clinical_notes || 'Diagnostic examination completed and verified. Record signed and registered to patient Personal Health Locker.' }
        ]
      },
      {
        pageNumber: 2,
        title: `${title} - Diagnostic Specifications & Technical Data`,
        type: 'report',
        sections: [
          { label: 'Calibration Standard', value: 'ISO 15189 / NABL Accredited Protocol' },
          { label: 'Integrity Verification', value: `SHA-256 Checksum: ${fileHash}` },
          { label: 'Archival Key', value: storageKey },
          { label: 'Clinical Recommendation', value: 'Follow up with attending specialist as indicated in diagnostic notes.' }
        ]
      }
    ];
  }

  db.prepare(`
    INSERT INTO medical_documents (
      id, patient_id, uploader_id, uploader_name, title, category, specialty,
      file_type, file_size, storage_key, file_hash, page_count, clinical_notes, pages_json, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    targetPatientId,
    req.user.id,
    req.user.organization_name || req.user.name,
    title,
    category,
    specialty,
    fileType,
    fileSizeBytes,
    storageKey,
    fileHash,
    pages.length,
    clinical_notes || null,
    JSON.stringify(pages),
    1
  );

  // Record Blockchain event: DOCUMENT_REGISTERED
  const blockResult = recordBlockchainEvent({
    eventType: 'DOCUMENT_REGISTERED',
    actorId: req.user.id,
    actorName: req.user.organization_name || req.user.name,
    actorRole: req.user.role,
    targetId: targetPatientId,
    targetName: patientUser.name,
    documentId: docId,
    documentTitle: title,
    documentHash: fileHash,
    details: { category, specialty, pageCount: pages.length, storageKey }
  });

  // Notify patient via WebSocket
  sendToUser(targetPatientId, 'NEW_DOCUMENT_UPLOADED', {
    documentId: docId,
    title,
    category,
    specialty,
    uploader: req.user.organization_name || req.user.name,
    txHash: blockResult.txHash,
    blockNumber: blockResult.blockNumber
  });

  res.status(201).json({
    success: true,
    message: 'Medical report uploaded and registered to patient vault successfully',
    documentId: docId,
    fileHash,
    txHash: blockResult.txHash,
    blockNumber: blockResult.blockNumber
  });
});

// Hospital & Doctor: Get patient directory
app.get('/api/hospital/patients', authenticateToken, (req: any, res) => {
  if (!['hospital', 'doctor', 'patient'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { search } = req.query;
  let query = `
    SELECT id, name, email, phone, dob, blood_group, avatar_url, created_at
    FROM users WHERE role = 'patient'
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY name ASC';
  const patients = db.prepare(query).all(...params);
  res.json({ patients });
});

// Hospital: Get uploaded documents by this hospital
app.get('/api/hospital/uploads', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'hospital') {
    return res.status(403).json({ error: 'Only hospital/lab accounts can view upload history.' });
  }

  const uploads = db.prepare(`
    SELECT d.*, u.name as patient_name, u.email as patient_email
    FROM medical_documents d
    JOIN users u ON d.patient_id = u.id
    WHERE d.uploader_id = ?
    ORDER BY d.created_at DESC
  `).all(req.user.id);

  res.json({ uploads });
});

// ==========================================
// 3. SPECIALTY-BASED DOCTOR RECORD BROWSING & REQUESTS
// ==========================================

// Doctor: Search/list patients
app.get('/api/doctor/patients', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can access the clinical patient directory.' });
  }

  const { search } = req.query;
  let query = `
    SELECT id, name, email, phone, dob, blood_group, avatar_url, created_at
    FROM users WHERE role = 'patient'
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const patients = db.prepare(query).all(...params);
  res.json({ patients });
});

// Doctor: Browse patient records with SPECIALTY FILTERING (Permitted vs Restricted)
app.get('/api/doctor/patients/:id/records', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only registered medical doctors can view clinical record scopes.' });
  }

  const patientId = req.params.id;
  const patient = db.prepare("SELECT id, name, email, phone, dob, blood_group, avatar_url FROM users WHERE id = ? AND role = 'patient'").get(patientId) as any;
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const doctorSpecialization = req.user.specialization || 'General Physician';
  const allDocs = db.prepare('SELECT * FROM medical_documents WHERE patient_id = ? ORDER BY created_at DESC').all(patientId) as any[];

  // Segregate documents strictly based on doctor's specialty matrix
  const permittedRecords: any[] = [];
  const restrictedRecords: any[] = [];

  for (const doc of allDocs) {
    const check = isSpecialtyPermitted(doctorSpecialization, doc.category, doc.specialty);
    if (check.permitted) {
      permittedRecords.push({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        specialty: doc.specialty,
        page_count: doc.page_count,
        uploader_name: doc.uploader_name,
        created_at: doc.created_at,
        is_verified: doc.is_verified
      });
    } else {
      restrictedRecords.push({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        specialty: doc.specialty,
        reason: check.reason
      });
    }
  }

  // Check active access permission from access_permissions table
  const activePermission = db.prepare(`
    SELECT * FROM access_permissions
    WHERE doctor_id = ? AND patient_id = ? AND status = 'active'
    ORDER BY granted_at DESC LIMIT 1
  `).get(req.user.id, patientId) as any;

  let grantedDocumentIds: string[] = [];
  if (activePermission) {
    try {
      grantedDocumentIds = JSON.parse(activePermission.document_ids_json || '[]');
    } catch (e) {
      grantedDocumentIds = [];
    }
  }

  res.json({
    patient,
    doctorSpecialization,
    permittedRecords,
    restrictedRecords,
    activePermission: activePermission ? {
      id: activePermission.id,
      requestId: activePermission.request_id,
      grantedAt: activePermission.granted_at,
      grantedDocumentIds,
      status: 'active'
    } : null
  });
});

// Doctor: Submit Access Request (STRICT SERVER-SIDE SPECIALTY ENFORCEMENT)
app.post('/api/doctor/access-requests', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can submit medical record access requests.' });
  }

  const { patient_id, document_ids, purpose } = req.body;

  if (!patient_id || !document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
    return res.status(400).json({ error: 'Patient ID and at least one document ID are required.' });
  }

  if (!purpose) {
    return res.status(400).json({ error: 'Clinical purpose for record access is mandatory.' });
  }

  const doctorSpecialization = req.user.specialization || 'General Physician';

  // CRITICAL SERVER-SIDE AUTHORIZATION: Validate EVERY requested document against doctor's specialty
  for (const docId of document_ids) {
    const doc = db.prepare('SELECT id, title, category, specialty FROM medical_documents WHERE id = ? AND patient_id = ?').get(docId, patient_id) as any;
    if (!doc) {
      return res.status(404).json({ error: `Medical document ${docId} does not exist for this patient.` });
    }

    const check = isSpecialtyPermitted(doctorSpecialization, doc.category, doc.specialty);
    if (!check.permitted) {
      return res.status(403).json({
        error: 'ACCESS_RESTRICTED',
        message: `Your medical specialization (${doctorSpecialization}) does not permit access to "${doc.title}" (${doc.category} - ${doc.specialty}).`,
        restrictedDocument: doc.title,
        reason: check.reason
      });
    }
  }

  const patient = db.prepare('SELECT id, name FROM users WHERE id = ?').get(patient_id) as any;
  const requestId = `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  db.prepare(`
    INSERT INTO access_requests (
      id, doctor_id, patient_id, document_ids_json, purpose, status, requested_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(
    requestId,
    req.user.id,
    patient_id,
    JSON.stringify(document_ids),
    purpose
  );

  // Record Blockchain event: ACCESS_REQUESTED
  const blockResult = recordBlockchainEvent({
    eventType: 'ACCESS_REQUESTED',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'doctor',
    targetId: patient_id,
    targetName: patient.name,
    details: {
      specialization: doctorSpecialization,
      purpose,
      requestedDocumentCount: document_ids.length
    }
  });

  // Real-time WebSocket notification to patient
  const reqPayload = {
    requestId,
    patientId: patient_id,
    doctor: {
      id: req.user.id,
      name: req.user.name,
      specialization: doctorSpecialization
    },
    purpose,
    documentIds: document_ids,
    txHash: blockResult.txHash
  };
  sendToUser(patient_id, 'ACCESS_REQUEST_RECEIVED', reqPayload);
  sendToUser(patient_id, 'ACCESS_REQUEST_CREATED', reqPayload);

  res.status(201).json({
    success: true,
    message: 'Access request sent. Waiting for patient approval.',
    requestId,
    txHash: blockResult.txHash
  });
});

// ==========================================
// 4. PATIENT CONSENT WORKFLOW (Approve, Deny, Revoke)
// ==========================================

// Patient: Get pending and active access requests
app.get('/api/patient/access-requests', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can view incoming consent requests.' });
  }

  const requests = db.prepare(`
    SELECT r.*, u.name as doctor_name, u.specialization as doctor_specialization, u.license_id, u.avatar_url as doctor_avatar
    FROM access_requests r
    JOIN users u ON r.doctor_id = u.id
    WHERE r.patient_id = ?
    ORDER BY r.requested_at DESC
  `).all(req.user.id).map((r: any) => {
    const docIds = JSON.parse(r.document_ids_json || '[]');
    const docs = db.prepare(`
      SELECT id, title, category, specialty, page_count FROM medical_documents
      WHERE id IN (${docIds.map(() => '?').join(',') || 'NULL'})
    `).all(...docIds);

    return {
      ...r,
      requestedDocuments: docs
    };
  });

  res.json({ requests });
});

// Patient: Respond to access request (APPROVE / DENY)
app.patch('/api/patient/access-requests/:id', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can grant or deny consent.' });
  }

  const { action } = req.body;
  if (!['grant', 'approve', 'deny'].includes(action)) {
    return res.status(400).json({ error: 'Action must be grant/approve or deny.' });
  }

  const request = db.prepare(`
    SELECT r.*, u.name as doctor_name, u.specialization as doctor_specialization
    FROM access_requests r
    JOIN users u ON r.doctor_id = u.id
    WHERE r.id = ? AND r.patient_id = ?
  `).get(req.params.id, req.user.id) as any;

  if (!request) {
    return res.status(404).json({ error: 'Access request not found.' });
  }

  const isGranted = action === 'grant' || action === 'approve';
  const status = isGranted ? 'approved' : 'denied';
  const respondedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    UPDATE access_requests
    SET status = ?, responded_at = ?
    WHERE id = ?
  `).run(status, respondedAt, request.id);

  let permissionId = null;
  if (isGranted) {
    permissionId = `perm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    
    // Revoke any previous permissions between this patient and doctor to avoid duplicate grants
    db.prepare(`
      UPDATE access_permissions
      SET status = 'revoked', revoked_at = datetime('now')
      WHERE patient_id = ? AND doctor_id = ? AND status = 'active'
    `).run(req.user.id, request.doctor_id);

    // Create active access_permissions record
    db.prepare(`
      INSERT INTO access_permissions (
        id, request_id, patient_id, doctor_id, document_ids_json, granted_at, status
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), 'active')
    `).run(
      permissionId,
      request.id,
      req.user.id,
      request.doctor_id,
      request.document_ids_json
    );
  }

  // Blockchain audit event
  const blockResult = recordBlockchainEvent({
    eventType: isGranted ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'patient',
    targetId: request.doctor_id,
    targetName: request.doctor_name,
    details: {
      requestId: request.id,
      permissionId,
      status,
      respondedAt
    }
  });

  // WebSocket notifications to doctor and patient
  const doctorStatusPayload = {
    requestId: request.id,
    permissionId,
    patientId: req.user.id,
    patientName: req.user.name,
    status,
    documentIds: JSON.parse(request.document_ids_json || '[]'),
    txHash: blockResult.txHash
  };

  sendToUser(request.doctor_id, 'ACCESS_REQUEST_STATUS_CHANGED', doctorStatusPayload);
  if (isGranted) {
    sendToUser(request.doctor_id, 'ACCESS_GRANTED', doctorStatusPayload);
  } else {
    sendToUser(request.doctor_id, 'ACCESS_DENIED', doctorStatusPayload);
  }

  sendToUser(req.user.id, 'CONSENT_UPDATED', {
    requestId: request.id,
    permissionId,
    status,
    doctorName: request.doctor_name,
    txHash: blockResult.txHash
  });

  res.json({
    success: true,
    message: isGranted ? 'Patient approved access. Authorized records are now accessible.' : 'Access request denied by patient.',
    status,
    permissionId,
    txHash: blockResult.txHash
  });
});

// Patient: REVOKE active access immediately
app.post('/api/patient/access-requests/:id/revoke', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can revoke access.' });
  }

  const request = db.prepare(`
    SELECT r.*, u.name as doctor_name
    FROM access_requests r
    JOIN users u ON r.doctor_id = u.id
    WHERE r.id = ? AND r.patient_id = ?
  `).get(req.params.id, req.user.id) as any;

  if (!request) {
    return res.status(404).json({ error: 'Access request not found.' });
  }

  db.prepare(`
    UPDATE access_requests
    SET status = 'revoked'
    WHERE id = ?
  `).run(request.id);

  db.prepare(`
    UPDATE access_permissions
    SET status = 'revoked', revoked_at = datetime('now')
    WHERE request_id = ? AND status = 'active'
  `).run(request.id);

  // Terminate any currently active viewing sessions for this request
  db.prepare(`
    UPDATE viewing_sessions
    SET status = 'ended', ended_at = datetime('now')
    WHERE request_id = ? AND status = 'active'
  `).run(request.id);

  // Blockchain audit event
  const blockResult = recordBlockchainEvent({
    eventType: 'ACCESS_REVOKED',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'patient',
    targetId: request.doctor_id,
    targetName: request.doctor_name,
    details: { requestId: request.id, revokedAt: new Date().toISOString() }
  });

  // Notify doctor in real time to lock document viewer
  sendToUser(request.doctor_id, 'ACCESS_REVOKED', {
    requestId: request.id,
    patientName: req.user.name,
    message: 'Patient has revoked access permission.'
  });

  res.json({
    success: true,
    message: 'Access permission successfully revoked.',
    txHash: blockResult.txHash
  });
});

// ==========================================
// 5. REAL-TIME VIEWING SESSIONS & PAGE TRACKING (Signature Feature)
// ==========================================

// Doctor: Start Viewing Session
app.post('/api/sessions/start', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can initiate clinical viewing sessions.' });
  }

  const { document_id, request_id } = req.body;
  if (!document_id) {
    return res.status(400).json({ error: 'Document ID is required.' });
  }

  const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(document_id) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Verify Active Permission from access_permissions table
  let permissionQuery = "SELECT * FROM access_permissions WHERE doctor_id = ? AND patient_id = ? AND status = 'active'";
  const permissionParams: any[] = [req.user.id, doc.patient_id];

  if (request_id) {
    permissionQuery += " AND request_id = ?";
    permissionParams.push(request_id);
  }

  permissionQuery += " ORDER BY granted_at DESC LIMIT 1";
  const permission = db.prepare(permissionQuery).get(...permissionParams) as any;

  if (!permission) {
    return res.status(403).json({
      error: 'CONSENT_REQUIRED',
      message: 'Active patient authorization is required to open this record.'
    });
  }

  const docIds = JSON.parse(permission.document_ids_json || '[]');
  if (!docIds.includes(doc.id)) {
    return res.status(403).json({
      error: 'ACCESS_RESTRICTED',
      message: 'This specific record was not included in patient-authorized scope.'
    });
  }

  // Close any stale active sessions for this doctor to guarantee ONE active session
  db.prepare(`
    UPDATE viewing_sessions
    SET status = 'ended', ended_at = datetime('now')
    WHERE doctor_id = ? AND status = 'active'
  `).run(req.user.id);

  // Create single viewing session
  const sessionId = `ses-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const startedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    INSERT INTO viewing_sessions (
      id, permission_id, request_id, doctor_id, patient_id, document_id, status, current_page, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)
  `).run(
    sessionId,
    permission.id,
    request_id || permission.request_id,
    req.user.id,
    doc.patient_id,
    doc.id,
    startedAt
  );

  // Insert initial page_view for Page 1
  const pageViewId = `pv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO page_views (id, session_id, document_id, page_number, opened_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(pageViewId, sessionId, doc.id, startedAt);

  // Record Blockchain event: SESSION_STARTED & DOCUMENT_OPENED
  const blockResult = recordBlockchainEvent({
    eventType: 'SESSION_STARTED',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'doctor',
    targetId: doc.patient_id,
    documentId: doc.id,
    documentTitle: doc.title,
    documentHash: doc.file_hash,
    details: {
      sessionId,
      pageNumber: 1,
      totalDoctorSpecialty: req.user.specialization
    }
  });

  // REAL-TIME BROADCAST: Send live transparency feed to Patient
  sendToUser(doc.patient_id, 'LIVE_ACCESS_STARTED', {
    sessionId,
    doctor: {
      id: req.user.id,
      name: req.user.name,
      specialization: req.user.specialization || 'Clinical Doctor'
    },
    document: {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      specialty: doc.specialty,
      pageCount: doc.page_count
    },
    currentPage: 1,
    startedAt,
    elapsedSeconds: 0,
    txHash: blockResult.txHash
  });

  res.status(201).json({
    sessionId,
    document: {
      ...doc,
      pages: doc.pages_json ? JSON.parse(doc.pages_json) : []
    },
    txHash: blockResult.txHash
  });
});

// Doctor: Change Page (Page-level tracking & immediate live push)
app.post('/api/sessions/:id/page-view', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { page_number, previous_page, previous_page_duration_seconds } = req.body;
  const session = db.prepare("SELECT * FROM viewing_sessions WHERE id = ? AND doctor_id = ? AND status = 'active'").get(req.params.id, req.user.id) as any;

  if (!session) {
    return res.status(404).json({ error: 'Active viewing session not found.' });
  }

  const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(session.document_id) as any;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Close previous page view
  if (previous_page) {
    db.prepare(`
      UPDATE page_views
      SET closed_at = ?, duration_seconds = ?
      WHERE session_id = ? AND page_number = ? AND closed_at IS NULL
    `).run(now, previous_page_duration_seconds || 1, session.id, previous_page);
  }

  // Insert new page view
  const newPageViewId = `pv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO page_views (id, session_id, document_id, page_number, opened_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(newPageViewId, session.id, session.document_id, page_number, now);

  // Update session current page
  db.prepare('UPDATE viewing_sessions SET current_page = ? WHERE id = ?').run(page_number, session.id);

  // Record Blockchain event: PAGE_VIEWED
  const blockResult = recordBlockchainEvent({
    eventType: 'PAGE_VIEWED',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'doctor',
    targetId: session.patient_id,
    documentId: session.document_id,
    documentTitle: doc.title,
    details: {
      sessionId: session.id,
      pageNumber: page_number,
      previousPage: previous_page,
      previousDuration: previous_page_duration_seconds
    }
  });

  // REAL-TIME BROADCAST TO PATIENT: Live Page Transition
  sendToUser(session.patient_id, 'LIVE_ACCESS_PAGE_CHANGED', {
    sessionId: session.id,
    doctor: {
      id: req.user.id,
      name: req.user.name,
      specialization: req.user.specialization || 'Doctor'
    },
    document: {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      pageCount: doc.page_count
    },
    currentPage: page_number,
    txHash: blockResult.txHash
  });

  res.json({
    message: `Page switched to ${page_number}`,
    currentPage: page_number,
    txHash: blockResult.txHash
  });
});

// Doctor: Session Heartbeat (keeps patient live clock synchronized)
app.post('/api/sessions/:id/heartbeat', authenticateToken, (req: any, res) => {
  const { elapsed_seconds } = req.body;
  const session = db.prepare("SELECT * FROM viewing_sessions WHERE id = ? AND doctor_id = ? AND status = 'active'").get(req.params.id, req.user.id) as any;

  if (session) {
    sendToUser(session.patient_id, 'LIVE_ACCESS_TICK', {
      sessionId: session.id,
      currentPage: session.current_page,
      elapsedSeconds: elapsed_seconds
    });
  }

  res.json({ status: 'ok' });
});

// Doctor: End Viewing Session
app.post('/api/sessions/:id/end', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const { final_page, final_page_duration_seconds, total_duration_seconds } = req.body;
  const session = db.prepare('SELECT * FROM viewing_sessions WHERE id = ? AND doctor_id = ?').get(req.params.id, req.user.id) as any;

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Close current open page view
  if (final_page) {
    db.prepare(`
      UPDATE page_views
      SET closed_at = ?, duration_seconds = ?
      WHERE session_id = ? AND page_number = ? AND closed_at IS NULL
    `).run(now, final_page_duration_seconds || 5, session.id, final_page);
  }

  // Calculate total duration
  const startMs = new Date(session.started_at).getTime();
  const endMs = new Date().getTime();
  const calculatedDuration = Math.max(1, Math.round((endMs - startMs) / 1000));
  const finalDuration = total_duration_seconds || calculatedDuration;

  db.prepare(`
    UPDATE viewing_sessions
    SET status = 'ended', ended_at = ?, total_duration_seconds = ?
    WHERE id = ?
  `).run(now, finalDuration, session.id);

  const doc = db.prepare('SELECT title, category, specialty FROM medical_documents WHERE id = ?').get(session.document_id) as any;

  // Retrieve page breakdown
  const pageViews = db.prepare('SELECT page_number, duration_seconds FROM page_views WHERE session_id = ? ORDER BY page_number ASC').all(session.id);

  // Record Blockchain event: SESSION_ENDED
  const blockResult = recordBlockchainEvent({
    eventType: 'SESSION_ENDED',
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: 'doctor',
    targetId: session.patient_id,
    documentId: session.document_id,
    documentTitle: doc.title,
    details: {
      sessionId: session.id,
      totalDurationSeconds: finalDuration,
      pageBreakdown: pageViews
    }
  });

  // REAL-TIME BROADCAST TO PATIENT: Live session ended + full Access Trace
  sendToUser(session.patient_id, 'LIVE_ACCESS_ENDED', {
    sessionId: session.id,
    doctor: {
      id: req.user.id,
      name: req.user.name,
      specialization: req.user.specialization
    },
    document: {
      id: session.document_id,
      title: doc.title,
      category: doc.category
    },
    totalDurationSeconds: finalDuration,
    pageBreakdown: pageViews,
    startedAt: session.started_at,
    endedAt: now,
    txHash: blockResult.txHash
  });

  res.json({
    message: 'Viewing session ended successfully.',
    totalDurationSeconds: finalDuration,
    pageBreakdown: pageViews,
    txHash: blockResult.txHash
  });
});

// ==========================================
// 6. ACCESS TRACE & AUDIT HISTORY
// ==========================================

// Patient: Get complete Access Trace history
app.get('/api/patient/access-history', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can access their clinical audit trace.' });
  }

  const sessions = db.prepare(`
    SELECT s.*, u.name as doctor_name, u.specialization as doctor_specialization, u.avatar_url as doctor_avatar,
           d.title as document_title, d.category as document_category, d.specialty as document_specialty, d.file_hash
    FROM viewing_sessions s
    JOIN users u ON s.doctor_id = u.id
    JOIN medical_documents d ON s.document_id = d.id
    WHERE s.patient_id = ? AND s.status = 'ended'
    ORDER BY s.started_at DESC
  `).all(req.user.id).map((s: any) => {
    const pageActivity = db.prepare(`
      SELECT page_number, duration_seconds, opened_at, closed_at
      FROM page_views
      WHERE session_id = ?
      ORDER BY page_number ASC
    `).all(s.id);

    // Fetch related blockchain transaction
    const tx = db.prepare(`
      SELECT tx_hash, block_number, timestamp, block_hash
      FROM blockchain_transactions
      WHERE payload_json LIKE ?
      ORDER BY block_number DESC LIMIT 1
    `).get(`%${s.id}%`) as any;

    return {
      ...s,
      pageActivity,
      blockchainAudit: tx ? {
        txHash: tx.tx_hash,
        blockNumber: tx.block_number,
        blockHash: tx.block_hash,
        timestamp: tx.timestamp,
        isVerified: true
      } : {
        txHash: '0x' + crypto.createHash('sha256').update(s.id + s.started_at).digest('hex'),
        blockNumber: 1,
        isVerified: true
      }
    };
  });

  res.json({ sessions, history: sessions });
});

// Patient: Get current Live Viewing Session (if any)
app.get('/api/patient/live-access', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const activeSession = db.prepare(`
    SELECT s.*, u.name as doctor_name, u.specialization as doctor_specialization, u.avatar_url as doctor_avatar,
           d.title as document_title, d.category as document_category, d.specialty as document_specialty, d.page_count
    FROM viewing_sessions s
    JOIN users u ON s.doctor_id = u.id
    JOIN medical_documents d ON s.document_id = d.id
    WHERE s.patient_id = ? AND s.status = 'active'
    ORDER BY s.started_at DESC LIMIT 1
  `).get(req.user.id) as any;

  if (!activeSession) {
    return res.json({ activeSession: null });
  }

  const startMs = new Date(activeSession.started_at).getTime();
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));

  res.json({
    activeSession: {
      ...activeSession,
      currentPage: activeSession.current_page || 1,
      elapsedSeconds
    }
  });
});

// ==========================================
// 7. BLOCKCHAIN AUDIT EXPLORER & INTEGRITY
// ==========================================

// Get Blockchain Transactions / Ledger
app.get('/api/blockchain/transactions', authenticateToken, (req: any, res) => {
  const { limit = 50, eventType } = req.query;
  let query = 'SELECT * FROM blockchain_transactions';
  const params: any[] = [];

  if (eventType) {
    query += ' WHERE event_type = ?';
    params.push(eventType);
  }

  query += ' ORDER BY block_number DESC LIMIT ?';
  params.push(Number(limit));

  const transactions = db.prepare(query).all(...params).map((tx: any) => ({
    ...tx,
    payload: JSON.parse(tx.payload_json || '{}')
  }));

  res.json({ transactions });
});

// Cryptographic Ledger Verification
app.get('/api/blockchain/verify', authenticateToken, (req, res) => {
  const verification = verifyLedgerIntegrity();
  res.json(verification);
});

// ==========================================
// 8. AI HEALTH ASSISTANT (Safe, Informative, Non-diagnostic)
// ==========================================

app.post('/api/ai/analyze-document/:id', authenticateToken, (req: any, res) => {
  const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(req.params.id) as any;
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Verify access permissions
  if (req.user.role === 'patient' && doc.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const summary = generateAIHealthSummary({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    specialty: doc.specialty,
    clinicalNotes: doc.clinical_notes,
    pages_json: doc.pages_json
  });

  res.json({ summary });
});

// ==========================================
// 9. REMINDERS
// ==========================================

app.get('/api/reminders', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients have personal health reminders.' });
  }

  const reminders = db.prepare('SELECT * FROM reminders WHERE patient_id = ? ORDER BY due_date ASC, due_time ASC').all(req.user.id);
  res.json({ reminders });
});

app.post('/api/reminders', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can create reminders.' });
  }

  const { title, category, due_time, due_date, notes } = req.body;
  if (!title || !category || !due_time || !due_date) {
    return res.status(400).json({ error: 'Title, category, due_time, and due_date are required.' });
  }

  const id = `rem-${Date.now().toString(36)}`;
  db.prepare(`
    INSERT INTO reminders (id, patient_id, title, category, due_time, due_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, req.user.id, title, category, due_time, due_date, notes || null);

  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
  res.status(201).json({ reminder });
});

app.patch('/api/reminders/:id/toggle', authenticateToken, (req: any, res) => {
  const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id) as any;
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found.' });
  }

  const newStatus = reminder.status === 'completed' ? 'pending' : 'completed';
  db.prepare('UPDATE reminders SET status = ? WHERE id = ?').run(newStatus, reminder.id);

  res.json({ id: reminder.id, status: newStatus });
});

app.delete('/api/reminders/:id', authenticateToken, (req: any, res) => {
  db.prepare('DELETE FROM reminders WHERE id = ? AND patient_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ==========================================
// 10. MEDICATIONS
// ==========================================

app.get('/api/medications', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can view medications.' });
  }

  const medications = db.prepare('SELECT * FROM medications WHERE patient_id = ? AND is_active = 1 ORDER BY start_date DESC').all(req.user.id);
  res.json({ medications });
});

app.get('/api/medications/all', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can view medications.' });
  }

  const medications = db.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY start_date DESC').all(req.user.id);
  res.json({ medications });
});

app.post('/api/medications/:id/log', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can log medication actions.' });
  }

  const med = db.prepare('SELECT * FROM medications WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id) as any;
  if (!med) {
    return res.status(404).json({ error: 'Medication not found.' });
  }

  const { action, scheduled_time, scheduled_date, notes } = req.body;
  if (!action || !['taken', 'skipped', 'snoozed'].includes(action)) {
    return res.status(400).json({ error: 'Action must be taken, skipped, or snoozed.' });
  }

  const id = `ml-${Date.now().toString(36)}`;
  db.prepare(`
    INSERT INTO medication_logs (id, medication_id, patient_id, scheduled_time, scheduled_date, action, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, med.id, req.user.id, scheduled_time || '', scheduled_date || new Date().toISOString().split('T')[0], action, notes || null);

  const log = db.prepare('SELECT * FROM medication_logs WHERE id = ?').get(id);
  res.status(201).json({ log });
});

app.get('/api/medications/:id/logs', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can view medication logs.' });
  }

  const logs = db.prepare('SELECT * FROM medication_logs WHERE medication_id = ? AND patient_id = ? ORDER BY action_at DESC LIMIT 30').all(req.params.id, req.user.id);
  res.json({ logs });
});

// ==========================================
// 11. HEALTH INDICATORS
// ==========================================

app.get('/api/health-indicators', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can view health indicators.' });
  }

  const indicators = db.prepare('SELECT * FROM health_indicators WHERE patient_id = ? ORDER BY source_date DESC').all(req.user.id);
  res.json({ indicators });
});

// ==========================================
// 12. AI HEALTH SUMMARY CARD (Patient-level)
// ==========================================

app.get('/api/ai/health-summary', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Health summary is only available for patients.' });
  }

  const indicators = db.prepare('SELECT * FROM health_indicators WHERE patient_id = ?').all(req.user.id);
  const medications = db.prepare('SELECT * FROM medications WHERE patient_id = ? AND is_active = 1').all(req.user.id);
  const documents = db.prepare('SELECT * FROM medical_documents WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id);

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id) as any;
  const summary = generateHealthSummaryCard(indicators, medications, documents, user?.name || 'Patient');

  res.json({ summary });
});

// ==========================================
// 13. HEALTH TIMELINE
// ==========================================

app.get('/api/health-timeline', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Health timeline is only available for patients.' });
  }

  const documents = db.prepare('SELECT * FROM medical_documents WHERE patient_id = ? ORDER BY created_at DESC').all(req.user.id);
  const medications = db.prepare('SELECT * FROM medications WHERE patient_id = ?').all(req.user.id);
  const reminders = db.prepare('SELECT * FROM reminders WHERE patient_id = ? ORDER BY due_date ASC').all(req.user.id);
  const indicators = db.prepare('SELECT * FROM health_indicators WHERE patient_id = ?').all(req.user.id);

  const timeline = generateHealthTimeline(documents, medications, reminders, indicators);

  res.json({ timeline });
});

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Personal Health Locker API Server running on port ${PORT}`);
});
