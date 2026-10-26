import http from 'http';

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

async function runComprehensiveQAAudit() {
  const auditResults = {
    auth: {},
    patient: {},
    doctor: {},
    hospital: {},
    security: {},
    blockchain: {},
    ai_wellness: {},
    idempotency: {},
  };

  console.log('====================================================');
  console.log('🚀 PERSONAL HEALTH LOCKER — COMPREHENSIVE QA AUDIT');
  console.log('====================================================\n');

  // --- SECTION 1: AUTHENTICATION AUDIT ---
  console.log('--- 1. AUTHENTICATION & ROLE ISOLATION ---');
  const patientAuth = await request('POST', '/api/auth/demo-login', { email: 'rahul@example.com' });
  const doctorAuth = await request('POST', '/api/auth/demo-login', { email: 'arun@example.com' });
  const hospitalAuth = await request('POST', '/api/auth/demo-login', { email: 'lab@example.com' });
  const invalidAuth = await request('POST', '/api/auth/login', { email: 'fake@example.com', password: 'wrong' });

  auditResults.auth.patientLogin = patientAuth.status === 200 && patientAuth.data.user.role === 'patient';
  auditResults.auth.doctorLogin = doctorAuth.status === 200 && doctorAuth.data.user.role === 'doctor';
  auditResults.auth.hospitalLogin = hospitalAuth.status === 200 && hospitalAuth.data.user.role === 'hospital';
  auditResults.auth.invalidRejected = invalidAuth.status === 401;

  console.log(`✓ Patient Auth (${patientAuth.data.user?.name}): ${auditResults.auth.patientLogin ? 'PASS' : 'FAIL'}`);
  console.log(`✓ Doctor Auth (${doctorAuth.data.user?.name} - ${doctorAuth.data.user?.specialization}): ${auditResults.auth.doctorLogin ? 'PASS' : 'FAIL'}`);
  console.log(`✓ Hospital Auth (${hospitalAuth.data.user?.name}): ${auditResults.auth.hospitalLogin ? 'PASS' : 'FAIL'}`);
  console.log(`✓ Bad Credentials 401: ${auditResults.auth.invalidRejected ? 'PASS' : 'FAIL'}\n`);

  const pToken = patientAuth.data.token;
  const dToken = doctorAuth.data.token;
  const hToken = hospitalAuth.data.token;
  const patientId = patientAuth.data.user.id;

  // --- SECTION 2: SECURITY & RBAC ENFORCEMENT AUDIT ---
  console.log('--- 2. SECURITY MATRIX & SPECIALTY ENFORCEMENT ---');
  // Test A: Unauthenticated access
  const unauthTest = await request('GET', '/api/patients/me/documents');
  auditResults.security.unauthBlocked = unauthTest.status === 401;
  console.log(`• Unauthenticated Request -> 401: ${unauthTest.status} (${auditResults.security.unauthBlocked ? 'PASS' : 'FAIL'})`);

  // Test B: Patient attempting Doctor-only API
  const patientToDoctorApi = await request('GET', '/api/doctor/patients', null, pToken);
  auditResults.security.patientDoctorApiBlocked = patientToDoctorApi.status === 403;
  console.log(`• Patient calling /api/doctor/patients -> 403: ${patientToDoctorApi.status} (${auditResults.security.patientDoctorApiBlocked ? 'PASS' : 'FAIL'})`);

  // Test C: Doctor attempting Patient Vault direct API
  const doctorToPatientVault = await request('GET', '/api/patients/me/documents', null, dToken);
  auditResults.security.doctorPatientVaultBlocked = doctorToPatientVault.status === 403;
  console.log(`• Doctor calling /api/patients/me/documents -> 403: ${doctorToPatientVault.status} (${auditResults.security.doctorPatientVaultBlocked ? 'PASS' : 'FAIL'})`);

  // Test D: Hospital attempting Doctor API
  const hospitalToDoctorApi = await request('POST', '/api/doctor/access-requests', { patient_id: patientId }, hToken);
  auditResults.security.hospitalDoctorApiBlocked = hospitalToDoctorApi.status === 403;
  console.log(`• Hospital calling /api/doctor/access-requests -> 403: ${hospitalToDoctorApi.status} (${auditResults.security.hospitalDoctorApiBlocked ? 'PASS' : 'FAIL'})`);

  // Test E: Specialty-based restriction (Dentist requesting Cardiology ECG document)
  const dentistEcgAttempt = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientId,
    document_ids: ['doc-r3-ecg'],
    purpose: 'Unauthorized ECG inspection',
  }, dToken);
  auditResults.security.dentistEcgBlocked = dentistEcgAttempt.status === 403 && dentistEcgAttempt.data?.error === 'ACCESS_RESTRICTED';
  console.log(`• Dentist requesting ECG record -> 403 ACCESS_RESTRICTED: ${dentistEcgAttempt.status} (${auditResults.security.dentistEcgBlocked ? 'PASS' : 'FAIL'})`);

  // Test F: Doctor opening unapproved document -> 403 CONSENT_REQUIRED
  const unapprovedViewAttempt = await request('POST', '/api/sessions/start', { document_id: 'doc-r7-mri' }, dToken);
  auditResults.security.unapprovedViewBlocked = unapprovedViewAttempt.status === 403;
  console.log(`• Doctor opening unapproved document -> 403: ${unapprovedViewAttempt.status} (${auditResults.security.unapprovedViewBlocked ? 'PASS' : 'FAIL'})\n`);

  // --- SECTION 3: HOSPITAL / LAB UPLOAD AUDIT ---
  console.log('--- 3. HOSPITAL / LAB PERSISTENCE & INTEGRITY ---');
  const uploadDoc = await request('POST', '/api/documents/upload', {
    patient_id: patientId,
    title: 'Comprehensive Salivary DNA & Microbiome Assay',
    category: 'Dental Records',
    specialty: 'Dentistry',
    clinical_notes: 'Advanced periodontal DNA biomarker analysis. High pathogen resistance score.',
  }, hToken);

  const docId = uploadDoc.data?.documentId;
  auditResults.hospital.uploadSuccess = uploadDoc.status === 201 && !!docId && !!uploadDoc.data?.fileHash;
  console.log(`• Upload Document Status: ${uploadDoc.status} | ID: ${docId} | SHA-256: ${uploadDoc.data?.fileHash?.substring(0, 16)}...`);

  // Verify patient sees uploaded document
  const patientDocs = await request('GET', '/api/patients/me/documents', null, pToken);
  const foundInLocker = (patientDocs.data?.documents || []).find((d) => d.id === docId);
  auditResults.hospital.lockerPersistence = !!foundInLocker && foundInLocker.is_verified === 1;
  console.log(`• Document persisted in Patient Locker: ${auditResults.hospital.lockerPersistence ? 'PASS' : 'FAIL'}`);

  // Verify hospital upload history audit endpoint
  const hospitalUploads = await request('GET', '/api/hospital/uploads', null, hToken);
  const foundInHospitalHistory = (hospitalUploads.data?.uploads || []).some((u) => u.id === docId);
  auditResults.hospital.historyAudit = foundInHospitalHistory;
  console.log(`• Document listed in Hospital Audit History: ${foundInHospitalHistory ? 'PASS' : 'FAIL'}\n`);

  // --- SECTION 4: PATIENT CONSENT & REVOCATION LIFECYCLE ---
  console.log('--- 4. ACCESS LIFECYCLE: REQUEST -> APPROVE -> REVOKE ---');
  // Doctor creates request
  const requestRes = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientId,
    document_ids: [docId],
    purpose: 'Periodontal consultation & restorative treatment plan',
  }, dToken);
  const reqId = requestRes.data?.requestId;
  auditResults.doctor.requestCreated = requestRes.status === 201 && !!reqId;
  console.log(`• Access Request Created: ${reqId} (Status: ${requestRes.status})`);

  // Patient Approves
  const approveRes = await request('PATCH', `/api/patient/access-requests/${reqId}`, { action: 'approve' }, pToken);
  auditResults.patient.approveSuccess = approveRes.status === 200;
  console.log(`• Patient Approved Access: Status ${approveRes.status}`);

  // Doctor starts viewing session
  const sessionStart = await request('POST', '/api/sessions/start', { document_id: docId, request_id: reqId }, dToken);
  const sessionId = sessionStart.data?.sessionId;
  auditResults.doctor.sessionStarted = sessionStart.status === 201 && !!sessionId;
  console.log(`• Doctor Session Started: ${sessionId}`);

  // Patient checks live viewing transparency
  const liveAccess = await request('GET', '/api/patient/live-access', null, pToken);
  auditResults.patient.liveTransparency = liveAccess.data?.activeSession?.id === sessionId;
  console.log(`• Patient Live Viewing Detection: ${auditResults.patient.liveTransparency ? 'ACTIVE (PASS)' : 'INACTIVE (FAIL)'}`);

  // Patient REVOKES access immediately
  const revokeRes = await request('POST', `/api/patient/access-requests/${reqId}/revoke`, {}, pToken);
  auditResults.patient.revokeSuccess = revokeRes.status === 200;
  console.log(`• Patient Revoked Access: Status ${revokeRes.status}`);

  // Doctor attempts to start another session or view -> MUST BE REJECTED 403
  const postRevokeAttempt = await request('POST', '/api/sessions/start', { document_id: docId }, dToken);
  auditResults.security.postRevokeBlocked = postRevokeAttempt.status === 403;
  console.log(`• Doctor Post-Revocation Access Attempt -> 403: ${postRevokeAttempt.status} (${auditResults.security.postRevokeBlocked ? 'PASS' : 'FAIL'})\n`);

  // --- SECTION 5: ACCESS TRACE & NON-DUPLICATION AUDIT ---
  console.log('--- 5. ACCESS TRACE & AUDIT GUARANTEES ---');
  // Fresh flow for completed session trace
  const req2 = await request('POST', '/api/doctor/access-requests', {
    patient_id: patientId,
    document_ids: [docId],
    purpose: 'Post-operative inspection',
  }, dToken);
  await request('PATCH', `/api/patient/access-requests/${req2.data.requestId}`, { action: 'approve' }, pToken);

  const initialTraceCount = (await request('GET', '/api/patient/access-history', null, pToken)).data?.sessions?.length || 0;
  const ses2 = await request('POST', '/api/sessions/start', { document_id: docId, request_id: req2.data.requestId }, dToken);
  const ses2Id = ses2.data.sessionId;

  // Page turns inside session
  await request('POST', `/api/sessions/${ses2Id}/page-view`, { page_number: 1, duration_seconds: 4 }, dToken);
  await request('POST', `/api/sessions/${ses2Id}/page-view`, { page_number: 2, duration_seconds: 6 }, dToken);

  const traceCountDuringActive = (await request('GET', '/api/patient/access-history', null, pToken)).data?.sessions?.length || 0;
  auditResults.idempotency.noTraceDuringActive = traceCountDuringActive === initialTraceCount;

  // End session
  await request('POST', `/api/sessions/${ses2Id}/end`, { total_duration_seconds: 10 }, dToken);
  const traceCountAfterEnd = (await request('GET', '/api/patient/access-history', null, pToken)).data?.sessions?.length || 0;
  auditResults.idempotency.singleTraceCreated = traceCountAfterEnd === initialTraceCount + 1;

  console.log(`• Traces before session: ${initialTraceCount}`);
  console.log(`• Traces during active session: ${traceCountDuringActive} (Must equal before: ${auditResults.idempotency.noTraceDuringActive ? 'PASS' : 'FAIL'})`);
  console.log(`• Traces after session ended: ${traceCountAfterEnd} (Must increment by 1: ${auditResults.idempotency.singleTraceCreated ? 'PASS' : 'FAIL'})\n`);

  // --- SECTION 6: BLOCKCHAIN AUDIT ---
  console.log('--- 6. BLOCKCHAIN LEDGER & CRYPTOGRAPHIC INTEGRITY ---');
  const bcVerify = await request('GET', '/api/blockchain/verify', null, pToken);
  const bcTxs = await request('GET', '/api/blockchain/transactions?limit=10', null, pToken);
  auditResults.blockchain.isValid = bcVerify.data?.isValid === true;
  auditResults.blockchain.totalBlocks = bcVerify.data?.totalBlocks || 0;
  auditResults.blockchain.recentTxCount = bcTxs.data?.transactions?.length || 0;

  console.log(`• Blockchain Cryptographic Chain Integrity: ${bcVerify.data?.isValid ? 'VERIFIED (PASS)' : 'FAILED'}`);
  console.log(`• Total Blockchain Blocks: ${bcVerify.data?.totalBlocks} | Tampered Blocks: ${bcVerify.data?.tamperedBlocks?.length || 0}`);
  console.log(`• Recent Recorded Audit Events: ${bcTxs.data?.transactions?.map((t) => t.event_type).join(', ')}\n`);

  // --- SECTION 7: AI HEALTH ASSISTANT & REMINDERS AUDIT ---
  console.log('--- 7. AI HEALTH ASSISTANT & REMINDERS ---');
  // AI report analysis
  const aiReport = await request('POST', `/api/ai/analyze-document/${docId}`, null, pToken);
  auditResults.ai_wellness.reportAnalysis = aiReport.status === 200 && !!aiReport.data?.summary;
  console.log(`• AI Document Analysis Status: ${aiReport.status} (Key Findings Present: ${!!aiReport.data?.summary})`);

  // Reminders CRUD
  const remindersList = await request('GET', '/api/reminders', null, pToken);
  const newReminder = await request('POST', '/api/reminders', {
    title: 'Dental Scaling Follow-up',
    category: 'consultation',
    due_date: '2026-10-15',
    due_time: '10:30 AM',
    notes: 'Follow-up appointment with Dr. Arun',
  }, pToken);
  console.log('newReminder response:', newReminder);
  const remId = newReminder.data?.reminder?.id;
  if (remId) {
    await request('PATCH', `/api/reminders/${remId}/toggle`, {}, pToken);
    await request('DELETE', `/api/reminders/${remId}`, null, pToken);
  }
  auditResults.ai_wellness.remindersWorking = remindersList.status === 200 && newReminder.status === 201;
  console.log(`• Reminders System: ${auditResults.ai_wellness.remindersWorking ? 'PASS' : 'FAIL'}`);

  // Medications
  const medsList = await request('GET', '/api/medications', null, pToken);
  auditResults.ai_wellness.medicationsWorking = medsList.status === 200 && Array.isArray(medsList.data?.medications);
  console.log(`• Medications Tracking: ${auditResults.ai_wellness.medicationsWorking ? 'PASS' : 'FAIL'}\n`);

  console.log('====================================================');
  console.log('📊 AUDIT SUMMARY COMPLETED SUCCESSFULLY');
  console.log('====================================================');
  return auditResults;
}

runComprehensiveQAAudit().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
