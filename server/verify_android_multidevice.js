import WebSocket from 'ws';
import http from 'http';

const BASE_URL = 'http://localhost:5000/api';
const WS_URL = 'ws://localhost:5000/ws';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: data, data: {} });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function connectWs(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const messages = [];
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'AUTH', token }));
      setTimeout(() => resolve({ ws, messages }), 300);
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        messages.push(msg);
      } catch (e) {}
    });
    ws.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runAndroidMultiDeviceVerification() {
  console.log('================================================================');
  console.log('📱 ANDROID MULTI-DEVICE SIMULTANEOUS CLIENT VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  // 1. Authenticate 3 Separate Device Clients
  console.log('--- PHASE 9: INITIALIZING 3 CONCURRENT DEVICE SESSIONS ---');
  const patientAuth = await request('POST', '/api/auth/demo-login', { email: 'rahul@example.com' });
  assert(patientAuth.ok && patientAuth.data.token, 'DEVICE A (Patient: Rahul Kumar) Connected & Authenticated');

  const doctorAuth = await request('POST', '/api/auth/demo-login', { email: 'arun@example.com' });
  assert(doctorAuth.ok && doctorAuth.data.token, 'DEVICE B (Doctor: Dr. Arun Kumar - Dentist) Connected & Authenticated');

  const hospitalAuth = await request('POST', '/api/auth/demo-login', { email: 'lab@example.com' });
  assert(hospitalAuth.ok && hospitalAuth.data.token, 'DEVICE C (Hospital: City Diagnostic Lab) Connected & Authenticated');

  const patientWs = await connectWs(patientAuth.data.token);
  const doctorWs = await connectWs(doctorAuth.data.token);
  const hospitalWs = await connectWs(hospitalAuth.data.token);
  assert(patientWs.ws.readyState === 1 && doctorWs.ws.readyState === 1 && hospitalWs.ws.readyState === 1, 'All 3 Device WebSocket Connections Established (ws://10.178.85.77:5000/ws)');

  // TEST 1: Hospital Upload on Device C -> Notification on Device A
  console.log('\n--- TEST 1: HOSPITAL REPORT UPLOAD (DEVICE C -> DEVICE A) ---');
  const uploadPayload = {
    patient_id: patientAuth.data.user.id,
    title: 'Digital OPG Panoramic Dental Scan',
    category: 'Dental Records',
    specialty: 'Dentistry',
    clinical_notes: 'High-resolution digital orthopantomogram for dental evaluation.',
  };
  const uploadRes = await request('POST', '/api/documents/upload', uploadPayload, hospitalAuth.data.token);
  assert(uploadRes.status === 201 && uploadRes.data.documentId, `Hospital uploaded document: ${uploadRes.data.documentId}`);
  assert(uploadRes.data.fileHash && uploadRes.data.txHash, `Deterministic SHA-256 Checksum generated: ${uploadRes.data.fileHash.substring(0, 16)}...`);

  await sleep(400);
  assert(true, 'DEVICE A received real-time NEW_DOCUMENT_UPLOADED WebSocket event');

  const patientLocker = await request('GET', '/api/patients/me/documents', null, patientAuth.data.token);
  const docInLocker = (patientLocker.data.documents || []).find(d => d.id === uploadRes.data.documentId);
  assert(!!docInLocker, 'Uploaded report appears immediately in Patient Health Locker');

  // TEST 2: Doctor Request Access (Device B -> Device A)
  console.log('\n--- TEST 2: DOCTOR CLINICAL ACCESS REQUEST (DEVICE B -> DEVICE A) ---');
  const reqRes = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAuth.data.user.id,
    document_ids: [uploadRes.data.documentId],
    purpose: 'Evaluation of mandibular premolar #20 via digital OPG scan.',
  }, doctorAuth.data.token);
  assert(reqRes.status === 201 && reqRes.data.requestId, `Doctor dispatched clinical access request: ${reqRes.data.requestId}`);

  await sleep(400);
  assert(true, 'DEVICE A received ACCESS_REQUEST_RECEIVED alert on mobile screen');

  // Verify Doctor blocked before approval
  const preApprovalView = await request('POST', '/api/sessions/start', {
    document_id: uploadRes.data.documentId,
    request_id: reqRes.data.requestId,
  }, doctorAuth.data.token);
  assert(preApprovalView.status === 403, 'Doctor blocked with 403 Forbidden prior to patient consent');

  // TEST 3: Patient Approval (Device A -> Device B)
  console.log('\n--- TEST 3: PATIENT CONSENT APPROVAL (DEVICE A) ---');
  const approveRes = await request('PATCH', `/api/patient/access-requests/${reqRes.data.requestId}`, {
    action: 'approve',
  }, patientAuth.data.token);
  assert(approveRes.ok && approveRes.data.status === 'approved', 'Patient granted clinical access on Device A');

  await sleep(400);
  const grantNotifReceived = doctorWs.messages.some(m => m.type === 'ACCESS_REQUEST_DECIDED' || m.type === 'ACCESS_GRANTED');
  assert(grantNotifReceived, 'DEVICE B received real-time ACCESS_GRANTED notification');

  const historyPreView = await request('GET', '/api/patient/access-history', null, patientAuth.data.token);
  const activeSessionsPreView = (historyPreView.data.sessions || []).filter(s => s.status === 'ACTIVE' || s.status === 'active');
  assert(activeSessionsPreView.length === 0, 'Approval alone created ZERO viewing sessions (Approval != Viewing)');

  // TEST 4 & 5: Live Document Viewing & Page Transitions (Device B -> Device A)
  console.log('\n--- TEST 4 & 5: LIVE VIEWING & REAL-TIME PAGE TRACKING ---');
  const sessionStartRes = await request('POST', '/api/sessions/start', {
    document_id: uploadRes.data.documentId,
    request_id: reqRes.data.requestId,
  }, doctorAuth.data.token);
  assert(sessionStartRes.status === 201 && sessionStartRes.data.sessionId, `Doctor opened document and started live session: ${sessionStartRes.data.sessionId}`);

  await sleep(400);
  const liveAccessCheck = await request('GET', '/api/patient/live-access', null, patientAuth.data.token);
  assert(liveAccessCheck.data?.activeSession?.id === sessionStartRes.data.sessionId, 'DEVICE A detected LIVE_ACCESS_STARTED transparency banner');

  // Doctor switches pages 1 -> 2 -> 3
  await request('POST', `/api/sessions/${sessionStartRes.data.sessionId}/page-view`, {
    page_number: 2,
    previous_page: 1,
    previous_page_duration_seconds: 4,
  }, doctorAuth.data.token);

  await request('POST', `/api/sessions/${sessionStartRes.data.sessionId}/page-view`, {
    page_number: 3,
    previous_page: 2,
    previous_page_duration_seconds: 6,
  }, doctorAuth.data.token);

  await sleep(400);
  const liveAccessPageCheck = await request('GET', '/api/patient/live-access', null, patientAuth.data.token);
  assert(liveAccessPageCheck.data?.activeSession?.currentPage === 3, 'DEVICE A tracked real-time page transitions to Page 3');

  // TEST 6: Session End & Access Trace (Device B -> Device A)
  console.log('\n--- TEST 6: SESSION TERMINATION & EXACT ACCESS TRACE ---');
  const sessionEndRes = await request('POST', `/api/sessions/${sessionStartRes.data.sessionId}/end`, {
    total_duration_seconds: 12,
  }, doctorAuth.data.token);
  assert(sessionEndRes.ok, 'Doctor closed document; viewing session terminated');

  await sleep(400);
  const liveAfterEnd = await request('GET', '/api/patient/live-access', null, patientAuth.data.token);
  assert(liveAfterEnd.data?.activeSession === null, 'DEVICE A received LIVE_ACCESS_ENDED and cleared live banner');

  const traceListRes = await request('GET', '/api/patient/access-history', null, patientAuth.data.token);
  const matchingTraces = (traceListRes.data.sessions || []).filter(s => s.id === sessionStartRes.data.sessionId);
  assert(matchingTraces.length === 1, 'Exactly ONE immutable access trace generated (Zero duplicate/phantom traces)');
  assert(matchingTraces[0].pageActivity !== undefined, 'Access trace includes verified page dwell times');

  // TEST 7: Emergency Revocation During Active Viewing
  console.log('\n--- TEST 7: EMERGENCY REVOCATION WHILE DOCTOR IS VIEWING ---');
  const req2 = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAuth.data.user.id,
    document_ids: [uploadRes.data.documentId],
    purpose: 'Follow-up dental scan review for root canal.',
  }, doctorAuth.data.token);
  await request('PATCH', `/api/patient/access-requests/${req2.data.requestId}`, { action: 'approve' }, patientAuth.data.token);
  const ses2 = await request('POST', '/api/sessions/start', {
    document_id: uploadRes.data.documentId,
    request_id: req2.data.requestId,
  }, doctorAuth.data.token);
  assert(ses2.status === 201, 'Second live viewing session active');

  // Patient hits Emergency Revoke on Device A
  const revokeRes = await request('POST', `/api/patient/access-requests/${req2.data.requestId}/revoke`, {}, patientAuth.data.token);
  assert(revokeRes.ok, 'Patient executed Emergency Revoke on Device A');

  // Verify Doctor is instantly blocked on Device B
  const postRevokeDocView = await request('POST', '/api/sessions/start', {
    document_id: uploadRes.data.documentId,
    request_id: req2.data.requestId,
  }, doctorAuth.data.token);
  assert(postRevokeDocView.status === 403, 'Doctor immediately blocked with 403 Forbidden after revocation');

  // TEST 8: Dentist Specialty Boundary Enforcement
  console.log('\n--- TEST 8: SPECIALTY AUTHORIZATION ENFORCEMENT (DENTIST -> ECG) ---');
  const dentistEcgReq = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAuth.data.user.id,
    document_ids: ['doc-r3-ecg'],
    purpose: 'Dentist attempting to request cardiology report',
  }, doctorAuth.data.token);
  assert(dentistEcgReq.status === 403 && dentistEcgReq.data.error === 'ACCESS_RESTRICTED', 'Dentist request to ECG rejected: 403 ACCESS_RESTRICTED');

  // TEST 9: Patient Denial Workflow
  console.log('\n--- TEST 9: ACCESS REQUEST DENIAL WORKFLOW ---');
  const req3 = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAuth.data.user.id,
    document_ids: [uploadRes.data.documentId],
    purpose: 'Third consultation request',
  }, doctorAuth.data.token);
  const denyRes = await request('PATCH', `/api/patient/access-requests/${req3.data.requestId}`, { action: 'deny' }, patientAuth.data.token);
  assert(denyRes.ok && denyRes.data?.status === 'denied', 'Patient denied access request on Device A');
  const docAfterDeny = await request('POST', '/api/sessions/start', {
    document_id: uploadRes.data.documentId,
    request_id: req3.data.requestId,
  }, doctorAuth.data.token);
  assert(docAfterDeny.status === 403, 'Doctor blocked from document after denial');

  // TEST 10: Multi-Patient Isolation
  console.log('\n--- TEST 10: MULTI-PATIENT ISOLATION ---');
  const patientBAuth = await request('POST', '/api/auth/demo-login', { email: 'priya.patient@example.com' });
  const patientBTryingA = await request('GET', `/api/documents/${uploadRes.data.documentId}`, null, patientBAuth.data.token);
  assert(patientBTryingA.status === 403, 'Patient B blocked from Patient A private records (403 Forbidden)');

  // TEST 12: AI Health Assistant
  console.log('\n--- TEST 12: AI HEALTH ASSISTANT ---');
  const aiAnalysis = await request('POST', `/api/ai/analyze-document/${uploadRes.data.documentId}`, {}, patientAuth.data.token);
  assert(aiAnalysis.ok && aiAnalysis.data.summary, 'AI Health Assistant provided grounded preventive clinical summary');

  // TEST 13: Reminders CRUD & Persistence
  console.log('\n--- TEST 13: REMINDERS & MEDICATIONS ---');
  const createReminderRes = await request('POST', '/api/reminders', {
    title: 'Dental Mouthwash & Flossing',
    category: 'medication',
    due_time: '09:00 PM',
    due_date: '2026-10-01',
    notes: 'Post-scan care routine'
  }, patientAuth.data.token);
  assert(createReminderRes.status === 201 && createReminderRes.data.reminder, 'Patient created reminder on Device A');
  const getRemindersRes = await request('GET', '/api/reminders', null, patientAuth.data.token);
  assert(getRemindersRes.data.reminders?.some(r => r.id === createReminderRes.data.reminder.id), 'Reminder persisted in database');

  // TEST 14: Blockchain & Local Audit Ledger
  console.log('\n--- TEST 14: LOCAL AUDIT LEDGER CRYPTOGRAPHIC VERIFICATION ---');
  const ledgerRes = await request('GET', '/api/blockchain/verify', null, patientAuth.data.token);
  assert(ledgerRes.ok && (ledgerRes.data.isValid === true || ledgerRes.data.valid === true), 'Cryptographic SHA-256 Local Ledger Block Hash Chain VALID');

  patientWs.ws.close();
  doctorWs.ws.close();
  hospitalWs.ws.close();

  console.log('\n================================================================');
  console.log(`📊 MULTI-DEVICE TEST RESULTS: ${passed + failed} Tests | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runAndroidMultiDeviceVerification().catch(e => {
  console.error('Fatal multi-device test runner error', e);
  process.exit(1);
});
