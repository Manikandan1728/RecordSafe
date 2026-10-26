import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

const dbPath = path.resolve(process.cwd(), 'data', 'health_locker.db');
const db = new Database(dbPath);

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
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, text: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runMasterCrossRoleVerification() {
  console.log('================================================================');
  console.log('🛡️ MASTER CROSS-ROLE INTEGRATION & SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assertTest(name, condition, details = '') {
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
      return true;
    } else {
      failedTests++;
      console.error(`  ✗ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
      return false;
    }
  }

  // --- 0. AUTHENTICATE ALL THREE ROLES + MULTI-PATIENTS ---
  console.log('--- 0. AUTHENTICATING MULTI-ROLE ACTORS ---');
  const patientAAuth = await request('POST', '/api/auth/demo-login', { email: 'rahul@example.com' });
  const patientBAuth = await request('POST', '/api/auth/demo-login', { email: 'priya.patient@example.com' });
  const doctorAuth = await request('POST', '/api/auth/demo-login', { email: 'arun@example.com' });
  const hospitalAuth = await request('POST', '/api/auth/demo-login', { email: 'lab@example.com' });

  const pAToken = patientAAuth.data.token;
  const pBToken = patientBAuth.data.token;
  const dToken = doctorAuth.data.token;
  const hToken = hospitalAuth.data.token;

  const patientAId = patientAAuth.data.user.id;
  const patientBId = patientBAuth.data.user.id;

  assertTest('Patient A Auth (Rahul Kumar)', patientAAuth.status === 200 && patientAAuth.data.user.role === 'patient');
  assertTest('Patient B Auth (Priya Mehra)', patientBAuth.status === 200 && patientBAuth.data.user.role === 'patient');
  assertTest('Doctor Auth (Dr. Arun Kumar - Dentist)', doctorAuth.status === 200 && doctorAuth.data.user.role === 'doctor');
  assertTest('Hospital Auth (City Diagnostic Lab)', hospitalAuth.status === 200 && hospitalAuth.data.user.role === 'hospital');

  // --- 1. ROLE BOUNDARY TESTING ---
  console.log('\n--- 1. ROLE BOUNDARY & DOMAIN SEGREGATION ---');
  const pToDocApi = await request('GET', '/api/doctor/patients', null, pAToken);
  const pToHospApi = await request('GET', '/api/hospital/uploads', null, pAToken);
  const dToPatientVault = await request('GET', '/api/patients/me/documents', null, dToken);
  const dToHospUpload = await request('GET', '/api/hospital/uploads', null, dToken);
  const hToDocReq = await request('POST', '/api/doctor/access-requests', { patient_id: patientAId }, hToken);
  const hToPatientLocker = await request('GET', '/api/patients/me/documents', null, hToken);

  assertTest('Patient calling Doctor API -> 403', pToDocApi.status === 403);
  assertTest('Patient calling Hospital API -> 403', pToHospApi.status === 403);
  assertTest('Doctor calling Patient direct vault API -> 403', dToPatientVault.status === 403);
  assertTest('Doctor calling Hospital upload audit -> 403', dToHospUpload.status === 403);
  assertTest('Hospital calling Doctor access request API -> 403', hToDocReq.status === 403);
  assertTest('Hospital calling Patient personal locker -> 403', hToPatientLocker.status === 403);

  // --- 2. PATIENT ISOLATION (CROSS-TENANT SECURITY) ---
  console.log('\n--- 2. PATIENT ISOLATION & PRIVACY BOUNDARIES ---');
  const patientADocs = await request('GET', '/api/patients/me/documents', null, pAToken);
  const docA = patientADocs.data.documents[0];

  const pBDirectDocAccess = await request('GET', `/api/documents/${docA.id}`, null, pBToken);
  const pBHistoryCheck = await request('GET', '/api/patient/access-history', null, pBToken);
  const pBSeesATraces = (pBHistoryCheck.data?.sessions || []).some((s) => s.patient_id === patientAId);
  const pBReminders = await request('GET', '/api/reminders', null, pBToken);
  const pBSeesAReminders = (pBReminders.data?.reminders || []).some((r) => r.patient_id === patientAId);

  assertTest('Patient B directly querying Patient A document -> 403', pBDirectDocAccess.status === 403);
  assertTest('Patient B history query isolates Patient A traces', !pBSeesATraces);
  assertTest('Patient B reminders query isolates Patient A reminders', !pBSeesAReminders);

  // --- 3. SPECIALIZATION BOUNDARY ENFORCEMENT ---
  console.log('\n--- 3. SPECIALTY RBAC & HARD ENFORCEMENT ---');
  const dentistEcgAttempt = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAId,
    document_ids: ['doc-r3-ecg'], // 12-Lead ECG Report (Cardiology)
    purpose: 'Specialty bypass test',
  }, dToken);
  assertTest('Dentist requesting ECG document -> 403 ACCESS_RESTRICTED', dentistEcgAttempt.status === 403 && dentistEcgAttempt.data?.error === 'ACCESS_RESTRICTED');

  const dentistCardioDocStart = await request('POST', '/api/sessions/start', { document_id: 'doc-r3-ecg' }, dToken);
  assertTest('Dentist opening unapproved ECG document -> 403', dentistCardioDocStart.status === 403);

  // --- 4. COMPLETE APPROVAL LIFECYCLE ---
  console.log('\n--- 4. COMPLETE APPROVAL LIFECYCLE ---');
  // Get permitted dental document
  const dentistBrowse = await request('GET', `/api/doctor/patients/${patientAId}/records`, null, dToken);
  const dentalDoc = dentistBrowse.data.permittedRecords[0];

  // Clean prior permissions
  const existingReqs = await request('GET', '/api/patient/access-requests', null, pAToken);
  for (const r of (existingReqs.data?.requests || [])) {
    if (r.status === 'approved' || r.status === 'granted') {
      await request('POST', `/api/patient/access-requests/${r.id}/revoke`, {}, pAToken);
    }
  }

  // Step 1: Doctor requests
  const step1Req = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAId,
    document_ids: [dentalDoc.id],
    purpose: 'End-to-end integration lifecycle test',
  }, dToken);
  const reqId = step1Req.data?.requestId;
  assertTest('Doctor request created in PENDING state', step1Req.status === 201 && !!reqId);

  // Doctor cannot view document yet
  const viewBeforeApprove = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: reqId }, dToken);
  assertTest('Doctor blocked from viewing prior to approval -> 403', viewBeforeApprove.status === 403);

  // Step 2: Patient approves
  const step2Approve = await request('PATCH', `/api/patient/access-requests/${reqId}`, { action: 'approve' }, pAToken);
  assertTest('Patient approves request -> APPROVED status', step2Approve.status === 200);

  // Step 3: Doctor opens document -> session starts
  const step3Session = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: reqId }, dToken);
  const sessionId = step3Session.data?.sessionId;
  assertTest('Viewing session created on actual document open', step3Session.status === 201 && !!sessionId);

  // Step 4: Patient live view detection
  const step4Live = await request('GET', '/api/patient/live-access', null, pAToken);
  assertTest('Patient detects active live viewing session', step4Live.data?.activeSession?.id === sessionId);

  // Step 5: Page navigation Page 1 -> 2 -> 3
  await request('POST', `/api/sessions/${sessionId}/page-view`, { page_number: 2, previous_page: 1, previous_page_duration_seconds: 4 }, dToken);
  await request('POST', `/api/sessions/${sessionId}/page-view`, { page_number: 3, previous_page: 2, previous_page_duration_seconds: 6 }, dToken);
  const step5Live = await request('GET', '/api/patient/live-access', null, pAToken);
  assertTest('Live viewing reflects current Page 3', step5Live.data?.activeSession?.currentPage === 3);

  // Step 6: Doctor ends session
  const tracesBeforeEnd = (await request('GET', '/api/patient/access-history', null, pAToken)).data?.sessions?.length || 0;
  const step6End = await request('POST', `/api/sessions/${sessionId}/end`, { total_duration_seconds: 12 }, dToken);
  assertTest('Doctor successfully ends viewing session', step6End.status === 200);

  const tracesAfterEnd = (await request('GET', '/api/patient/access-history', null, pAToken)).data?.sessions || [];
  assertTest('Exactly ONE final trace generated on session end', tracesAfterEnd.length === tracesBeforeEnd + 1);

  const liveAfterEnd = await request('GET', '/api/patient/live-access', null, pAToken);
  assertTest('Live viewing banner cleared after session ends', liveAfterEnd.data?.activeSession === null);

  // --- 5. DENIAL LIFECYCLE ---
  console.log('\n--- 5. DENIAL LIFECYCLE ---');
  const denyReq = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAId,
    document_ids: [dentalDoc.id],
    purpose: 'Denial verification test',
  }, dToken);
  const denyReqId = denyReq.data?.requestId;

  const patientDenyAction = await request('PATCH', `/api/patient/access-requests/${denyReqId}`, { action: 'deny' }, pAToken);
  assertTest('Patient denies access request -> DENIED status', patientDenyAction.status === 200 && patientDenyAction.data?.status === 'denied');

  const docOpenAfterDenial = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: denyReqId }, dToken);
  assertTest('Doctor blocked from document after denial -> 403', docOpenAfterDenial.status === 403);

  // --- 6. REVOCATION LIFECYCLE ---
  console.log('\n--- 6. REVOCATION LIFECYCLE (WHILE VIEWING) ---');
  const revokeReq = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientAId,
    document_ids: [dentalDoc.id],
    purpose: 'Revocation in-flight test',
  }, dToken);
  await request('PATCH', `/api/patient/access-requests/${revokeReq.data.requestId}`, { action: 'approve' }, pAToken);

  const inFlightSession = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: revokeReq.data.requestId }, dToken);
  assertTest('Doctor active viewing session established for revocation test', inFlightSession.status === 201);

  // Patient revokes access mid-view
  const revokeAction = await request('POST', `/api/patient/access-requests/${revokeReq.data.requestId}/revoke`, {}, pAToken);
  assertTest('Patient executes emergency access revocation', revokeAction.status === 200);

  // Doctor attempts to reopen or start new session -> MUST BE 403
  const postRevokeOpen = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id }, dToken);
  assertTest('Doctor immediately blocked after revocation -> 403 ACCESS_RESTRICTED', postRevokeOpen.status === 403);

  const liveAfterRevoke = await request('GET', '/api/patient/live-access', null, pAToken);
  assertTest('Live viewing banner cleared upon revocation', liveAfterRevoke.data?.activeSession === null);

  // --- 7. DOCUMENT ID & PAYLOAD TAMPERING ---
  console.log('\n--- 7. DOCUMENT ID & CROSS-PATIENT TAMPERING ---');
  const tamperCrossDoc = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientBId,
    document_ids: [dentalDoc.id], // Belongs to Patient A, not Patient B
    purpose: 'Tampering cross-patient document ID',
  }, dToken);
  assertTest('Backend rejects cross-patient document ID tampering -> 404/403', tamperCrossDoc.status === 404 || tamperCrossDoc.status === 403);

  const tamperDirectView = await request('GET', `/api/documents/${dentalDoc.id}`, null, pBToken);
  assertTest('Direct document URL tampering by unauthorized patient -> 403', tamperDirectView.status === 403);

  // --- 8. DUPLICATE SESSION & NO PHANTOM TRACE AUDIT ---
  console.log('\n--- 8. IDEMPOTENCY & ZERO PHANTOM TRACES ---');
  const traceBaseline = (await request('GET', '/api/patient/access-history', null, pAToken)).data?.sessions?.length || 0;
  for (let i = 1; i <= 5; i++) {
    await request('GET', '/api/patient/access-history', null, pAToken);
    await request('GET', '/api/patient/live-access', null, pAToken);
    await request('GET', '/api/patients/me/documents', null, pAToken);
  }
  const traceAfterPolls = (await request('GET', '/api/patient/access-history', null, pAToken)).data?.sessions?.length || 0;
  assertTest('Zero phantom traces generated across 15 repeated queries/refreshes', traceBaseline === traceAfterPolls);

  // --- 9. BLOCKCHAIN / LOCAL LEDGER CONSISTENCY ---
  console.log('\n--- 9. BLOCKCHAIN & LOCAL AUDIT LEDGER CONSISTENCY ---');
  const ledgerVerify = await request('GET', '/api/blockchain/verify', null, pAToken);
  assertTest('Cryptographic SHA-256 block ledger integrity valid', ledgerVerify.data?.isValid === true);

  const txs = (await request('GET', '/api/blockchain/transactions?limit=100', null, pAToken)).data?.transactions || [];
  const eventTypes = txs.map((t) => t.event_type);

  assertTest('Ledger contains DOCUMENT_REGISTERED', eventTypes.includes('DOCUMENT_REGISTERED') || eventTypes.includes('DOCUMENT_UPLOADED'));
  assertTest('Ledger contains ACCESS_REQUESTED', eventTypes.includes('ACCESS_REQUESTED'));
  assertTest('Ledger contains ACCESS_GRANTED', eventTypes.includes('ACCESS_GRANTED'));
  assertTest('Ledger contains ACCESS_DENIED', eventTypes.includes('ACCESS_DENIED'));
  assertTest('Ledger contains ACCESS_REVOKED', eventTypes.includes('ACCESS_REVOKED'));
  assertTest('Ledger contains SESSION_STARTED', eventTypes.includes('SESSION_STARTED'));
  assertTest('Ledger contains PAGE_VIEWED', eventTypes.includes('PAGE_VIEWED'));
  assertTest('Ledger contains SESSION_ENDED', eventTypes.includes('SESSION_ENDED'));

  // --- 10. 18-POINT NEGATIVE SECURITY TEST MATRIX ---
  console.log('\n--- 10. 18-POINT EXPLICIT NEGATIVE SECURITY MATRIX ---');
  // 1. Dentist -> ECG
  const neg1 = await request('POST', '/api/doctor/access-requests', { patient_id: patientAId, document_ids: ['doc-r3-ecg'], purpose: 'Test' }, dToken);
  assertTest('Neg 1: Dentist -> ECG (403)', neg1.status === 403);

  // 2. Dentist -> Cardiology record
  const neg2 = await request('POST', '/api/sessions/start', { document_id: 'doc-r3-ecg' }, dToken);
  assertTest('Neg 2: Dentist -> Cardiology doc open (403)', neg2.status === 403);

  // 3. Doctor -> Unapproved document
  const neg3 = await request('POST', '/api/sessions/start', { document_id: 'doc-r7-mri' }, dToken);
  assertTest('Neg 3: Doctor -> Unapproved document (403)', neg3.status === 403);

  // 4. Doctor -> Denied document
  const neg4 = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: denyReqId }, dToken);
  assertTest('Neg 4: Doctor -> Denied document (403)', neg4.status === 403);

  // 5. Doctor -> Revoked document
  const neg5 = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: revokeReq.data.requestId }, dToken);
  assertTest('Neg 5: Doctor -> Revoked document (403)', neg5.status === 403);

  // 6. Doctor -> Another patient's unapproved doc
  const patientBDocs = await request('GET', '/api/patients/me/documents', null, pBToken);
  const docB = patientBDocs.data?.documents[0];
  const neg6 = await request('POST', '/api/sessions/start', { document_id: docB.id }, dToken);
  assertTest('Neg 6: Doctor -> Another patient document without consent (403)', neg6.status === 403);

  // 7. Patient A -> Patient B document
  const neg7 = await request('GET', `/api/documents/${docB.id}`, null, pAToken);
  assertTest('Neg 7: Patient A -> Patient B document (403)', neg7.status === 403);

  // 8. Patient A -> Patient B notification
  const neg8 = await request('GET', '/api/patient/live-access', null, pAToken);
  assertTest('Neg 8: Patient A live access isolated from Patient B', neg8.status === 200 && neg8.data?.activeSession === null);

  // 9. Hospital/Lab -> Doctor-only API
  const neg9 = await request('GET', '/api/doctor/patients', null, hToken);
  assertTest('Neg 9: Hospital -> Doctor patient search API (403)', neg9.status === 403);

  // 10. Doctor -> Patient consent mutation without permission
  const neg10 = await request('PATCH', `/api/patient/access-requests/${reqId}`, { action: 'approve' }, dToken);
  assertTest('Neg 10: Doctor mutating patient consent (403)', neg10.status === 403);

  // 11. Unauthenticated -> Protected API
  const neg11 = await request('GET', '/api/patients/me/documents');
  assertTest('Neg 11: Unauthenticated request -> 401', neg11.status === 401);

  // 12. Modified Document ID
  const neg12 = await request('GET', '/api/documents/doc-invalid-nonexistent-999', null, pAToken);
  assertTest('Neg 12: Modified invalid document ID -> 404', neg12.status === 404);

  // 13. Modified Patient ID in Doctor Request
  const neg13 = await request('POST', '/api/doctor/access-requests', { patient_id: 'usr-fake-999', document_ids: [dentalDoc.id], purpose: 'Test' }, dToken);
  assertTest('Neg 13: Modified invalid patient ID -> 404/400', neg13.status === 404 || neg13.status === 400);

  // 14. Modified Authorization ID in session start
  const neg14 = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id, request_id: 'req-fake-999' }, dToken);
  assertTest('Neg 14: Modified authorization ID -> 403', neg14.status === 403);

  // 15. Replayed Access Request (Duplicate check)
  const neg15 = await request('POST', '/api/doctor/access-requests', { patient_id: patientAId, document_ids: [dentalDoc.id], purpose: 'Duplicate replay' }, dToken);
  assertTest('Neg 15: Safe handling of repeated access requests', neg15.status === 201 || neg15.status === 200);

  // 16. Replayed Session Start without active permission
  const neg16 = await request('POST', '/api/sessions/start', { document_id: dentalDoc.id }, dToken);
  assertTest('Neg 16: Replayed session start on closed permission -> 403', neg16.status === 403);

  // 17. Replayed Page-View on terminated session
  const neg17 = await request('POST', `/api/sessions/${sessionId}/page-view`, { page_number: 4 }, dToken);
  assertTest('Neg 17: Page-view on terminated session -> 404/403', neg17.status === 404 || neg17.status === 403);

  // 18. Replayed Session-End on already ended session
  const neg18 = await request('POST', `/api/sessions/${sessionId}/end`, {}, dToken);
  assertTest('Neg 18: Safe handling of replayed session end', neg18.status === 200 || neg18.status === 404);

  console.log('\n================================================================');
  console.log(`📊 MASTER AUDIT TOTAL: ${passedTests + failedTests} Tests | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('================================================================');

  return { passedTests, failedTests };
}

runMasterCrossRoleVerification().catch((e) => {
  console.error('Master integration verification error:', e);
  process.exit(1);
});
