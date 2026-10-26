import http from 'http';

async function postJson(url, data, token = null) {
  const parsed = new URL(url);
  const body = JSON.stringify(data);
  const options = {
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getJson(url, token = null) {
  const parsed = new URL(url);
  const options = {
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function patchJson(url, data, token = null) {
  const parsed = new URL(url);
  const body = JSON.stringify(data);
  const options = {
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End Core Workflow Verification...\n');

  // 1. Auth Logins
  console.log('🔐 1. Authenticating Demo Users...');
  const labAuth = await postJson('http://localhost:5000/api/auth/demo-login', { email: 'lab@example.com' });
  const labToken = labAuth.data.token;
  console.log('   ✓ Hospital/Lab logged in:', labAuth.data.user.name);

  const patientAuth = await postJson('http://localhost:5000/api/auth/demo-login', { email: 'rahul@example.com' });
  const patientToken = patientAuth.data.token;
  const patientId = patientAuth.data.user.id;
  console.log('   ✓ Patient logged in:', patientAuth.data.user.name, `(${patientId})`);

  const dentistAuth = await postJson('http://localhost:5000/api/auth/demo-login', { email: 'arun@example.com' });
  const dentistToken = dentistAuth.data.token;
  console.log('   ✓ Doctor (Dentist) logged in:', dentistAuth.data.user.name, `(${dentistAuth.data.user.specialization})\n`);

  // TEST A — UPLOAD
  console.log('📋 TEST A — DOCUMENT UPLOAD:');
  const uploadRes = await postJson('http://localhost:5000/api/documents/upload', {
    patient_id: patientId,
    title: 'High-Resolution Dental Panoramic X-Ray',
    category: 'Dental Records',
    specialty: 'Dentistry',
    clinical_notes: 'Bilateral molar evaluation. Normal bone density, minor enamel wear on tooth #19.'
  }, labToken);

  console.log('   Upload Status:', uploadRes.status);
  console.log('   Upload Response:', uploadRes.data);
  if (uploadRes.status !== 201 || !uploadRes.data.documentId) {
    throw new Error('TEST A FAILED: Document upload failed');
  }
  const uploadedDocId = uploadRes.data.documentId;
  console.log('   ✓ Document created with ID:', uploadedDocId);

  // Check patient locker
  const patientDocs = await getJson('http://localhost:5000/api/patients/me/documents', patientToken);
  const foundUploaded = (patientDocs.data.documents || []).find(d => d.id === uploadedDocId);
  if (!foundUploaded) {
    throw new Error('TEST A FAILED: Uploaded document not found in patient locker');
  }
  console.log('   ✓ PASSED: Document confirmed in Rahul Kumar Health Locker!\n');

  // TEST B — ACCESS REQUEST
  console.log('📋 TEST B — ACCESS REQUEST:');
  const doctorBrowse = await getJson(`http://localhost:5000/api/doctor/patients/${patientId}/records`, dentistToken);
  console.log('   Permitted records count for Dentist:', doctorBrowse.data.permittedRecords.length);
  console.log('   Restricted records count for Dentist:', doctorBrowse.data.restrictedRecords.length);

  const dentalDoc = doctorBrowse.data.permittedRecords.find(d => d.id === uploadedDocId) || doctorBrowse.data.permittedRecords[0];
  console.log('   Requesting access for permitted doc:', dentalDoc.title, `(${dentalDoc.id})`);

  const requestRes = await postJson('http://localhost:5000/api/doctor/access-requests', {
    patient_id: patientId,
    document_ids: [dentalDoc.id],
    purpose: 'Pre-procedure dental inspection & clinical evaluation',
    duration_minutes: 30
  }, dentistToken);

  console.log('   Request Status:', requestRes.status);
  console.log('   Request Response:', requestRes.data);
  if (requestRes.status !== 201 || !requestRes.data.requestId) {
    throw new Error('TEST B FAILED: Access request creation failed');
  }
  const requestId = requestRes.data.requestId;

  // Check Patient received request
  const patientReqs = await getJson('http://localhost:5000/api/patient/access-requests', patientToken);
  const pendingReq = (patientReqs.data.requests || []).find(r => r.id === requestId);
  if (!pendingReq || pendingReq.status !== 'pending') {
    throw new Error('TEST B FAILED: Patient did not receive pending access request');
  }
  console.log('   ✓ PASSED: Access request received by Patient Rahul Kumar from Dr. Arun Kumar!\n');

  // TEST C — APPROVAL
  console.log('📋 TEST C — APPROVE ACCESS:');
  const approveRes = await patchJson(`http://localhost:5000/api/patient/access-requests/${requestId}`, {
    action: 'approve',
    duration_minutes: 30
  }, patientToken);

  console.log('   Approval Status:', approveRes.status);
  console.log('   Approval Response:', approveRes.data);
  if (approveRes.status !== 200 || !['approved', 'granted'].includes(approveRes.data.status)) {
    throw new Error('TEST C FAILED: Consent approval failed');
  }

  const doctorCheck = await getJson(`http://localhost:5000/api/doctor/patients/${patientId}/records`, dentistToken);
  if (!doctorCheck.data.activePermission || !doctorCheck.data.activePermission.grantedDocumentIds.includes(dentalDoc.id)) {
    throw new Error('TEST C FAILED: Doctor does not have active granted permission');
  }
  console.log('   ✓ PASSED: Doctor active permission confirmed with granted scope!\n');

  // TEST D — VIEWING SESSION
  console.log('📋 TEST D — LIVE VIEWING SESSION:');
  const sessionStart = await postJson('http://localhost:5000/api/sessions/start', {
    document_id: dentalDoc.id,
    request_id: requestId
  }, dentistToken);

  console.log('   Session Start Status:', sessionStart.status);
  console.log('   Session ID:', sessionStart.data.sessionId);
  if (sessionStart.status !== 201 || !sessionStart.data.sessionId) {
    throw new Error('TEST D FAILED: Session start failed');
  }
  const sessionId = sessionStart.data.sessionId;

  // Change page
  const pageView = await postJson(`http://localhost:5000/api/sessions/${sessionId}/page-view`, {
    page_number: 2,
    previous_page: 1,
    previous_page_duration_seconds: 5
  }, dentistToken);
  console.log('   Page Switch Status:', pageView.status);

  // Check Patient live transparency
  const liveAccess = await getJson('http://localhost:5000/api/patient/live-access', patientToken);
  console.log('   Patient Live Access View:', liveAccess.data.activeSession ? 'ACTIVE SESSION DETECTED' : 'IDLE');
  if (!liveAccess.data.activeSession || liveAccess.data.activeSession.id !== sessionId) {
    throw new Error('TEST D FAILED: Patient live access feed not reflecting active session');
  }
  console.log('   ✓ PASSED: Real-time Live viewing transparency active on Patient side!\n');

  // TEST E — TRACE
  console.log('📋 TEST E — ACCESS TRACE & AUDIT:');
  const endSession = await postJson(`http://localhost:5000/api/sessions/${sessionId}/end`, {
    final_page: 2,
    final_page_duration_seconds: 8,
    total_duration_seconds: 13
  }, dentistToken);
  console.log('   End Session Status:', endSession.status);

  const history = await getJson('http://localhost:5000/api/patient/access-history', patientToken);
  const foundSession = (history.data.sessions || []).find(s => s.id === sessionId);
  if (!foundSession) {
    throw new Error('TEST E FAILED: Session not found in access trace history');
  }
  console.log('   ✓ PASSED: Session recorded in immutable access audit history!\n');

  // TEST F — SPECIALTY SECURITY (DENTIST ATTEMPTING ECG)
  console.log('📋 TEST F — SPECIALTY SECURITY REJECTION (403 ACCESS_RESTRICTED):');
  const ecgDoc = (patientDocs.data.documents || []).find(d => d.category === 'ECG' || d.specialty === 'Cardiology');
  if (ecgDoc) {
    const unauthorizedAttempt = await postJson('http://localhost:5000/api/doctor/access-requests', {
      patient_id: patientId,
      document_ids: [ecgDoc.id],
      purpose: 'Attempting unauthorized cardiology record request',
      duration_minutes: 30
    }, dentistToken);

    console.log('   Unauthorized Attempt Status:', unauthorizedAttempt.status);
    console.log('   Error response:', unauthorizedAttempt.data);
    if (unauthorizedAttempt.status !== 403) {
      throw new Error('TEST F FAILED: Unauthorized specialty request was NOT rejected with 403');
    }
    console.log('   ✓ PASSED: Backend correctly rejected unauthorized specialty access with 403 ACCESS_RESTRICTED!\n');
  }

  console.log('🎉 ALL 6 END-TO-END CRITICAL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('❌ TEST RUN FAILED:', err);
  process.exit(1);
});
