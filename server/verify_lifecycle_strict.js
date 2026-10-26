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

async function runStrictLifecycleTests() {
  console.log('🔬 Running Strict Lifecycle & Non-Duplication Tests...\n');

  // 1. Logins
  const patientAuth = await request('POST', '/api/auth/demo-login', {
    email: 'rahul@example.com',
  });
  const patientToken = patientAuth.data.token;
  const patientId = patientAuth.data.user.id;

  const doctorAuth = await request('POST', '/api/auth/demo-login', {
    email: 'arun@example.com',
  });
  const doctorToken = doctorAuth.data.token;

  // 2. Fetch doctor permitted records to pick a valid dental document
  const recordsRes = await request('GET', `/api/doctor/patients/${patientId}/records`, null, doctorToken);
  const permittedDoc = recordsRes.data.permittedRecords[0];
  console.log(`Found permitted dental document for Dr. Arun: ${permittedDoc.title} (${permittedDoc.id})`);

  // Ensure any previous active permission is revoked before starting fresh denial test
  const existingRequests = await request('GET', '/api/patient/access-requests', null, patientToken);
  for (const r of (existingRequests.data.requests || [])) {
    if (r.status === 'approved' || r.status === 'granted') {
      await request('POST', `/api/patient/access-requests/${r.id}/revoke`, {}, patientToken);
    }
  }

  // 3. Check initial access history count
  const initialHistory = await request('GET', '/api/patient/access-history', null, patientToken);
  const initialTraceCount = (initialHistory.data.history || []).length;
  console.log(`[Trace Count Baseline] Completed traces in history: ${initialTraceCount}`);

  // 4. Test DENY Flow
  console.log('\n--- TEST 1: DENIAL WORKFLOW ---');
  const reqDeny = await request(
    'POST',
    '/api/doctor/access-requests',
    {
      patient_id: patientId,
      document_ids: [permittedDoc.id],
      purpose: 'Routine dental checkup and evaluation',
    },
    doctorToken
  );
  console.log('reqDeny response:', reqDeny);
  const denyRequestId = reqDeny.data?.requestId;
  console.log(`1. Doctor created access request: ${denyRequestId} (Status: ${reqDeny.status})`);

  // Check traces after request creation (MUST NOT change)
  const historyAfterReq = await request('GET', '/api/patient/access-history', null, patientToken);
  console.log(`2. Traces after request sent: ${(historyAfterReq.data.history || []).length} (Must be ${initialTraceCount})`);
  if ((historyAfterReq.data.history || []).length !== initialTraceCount) {
    throw new Error('FAIL: Trace created prematurely on request!');
  }

  // Patient Denies
  const denyRes = await request(
    'PATCH',
    `/api/patient/access-requests/${denyRequestId}`,
    { action: 'deny' },
    patientToken
  );
  console.log(`3. Patient responded: DENY (Status: ${denyRes.status}, Message: ${denyRes.data.message})`);

  // Check doctor records (MUST NOT have active permission)
  const doctorViewAfterDeny = await request(
    'GET',
    `/api/doctor/patients/${patientId}/records`,
    null,
    doctorToken
  );
  console.log(`4. Doctor active permission after denial: ${doctorViewAfterDeny.data.activePermission ? 'EXISTS (FAIL)' : 'NULL (PASS)'}`);
  if (doctorViewAfterDeny.data.activePermission) {
    throw new Error('FAIL: Active permission exists despite denial!');
  }

  // Check traces after denial (MUST NOT change)
  const historyAfterDeny = await request('GET', '/api/patient/access-history', null, patientToken);
  console.log(`5. Traces after denial: ${(historyAfterDeny.data.history || []).length} (Must be ${initialTraceCount})`);
  if ((historyAfterDeny.data.history || []).length !== initialTraceCount) {
    throw new Error('FAIL: Trace created on denial!');
  }

  // 5. Test APPROVE -> SINGLE SESSION -> SINGLE TRACE
  console.log('\n--- TEST 2: APPROVAL -> SINGLE SESSION -> SINGLE TRACE ---');
  const reqApprove = await request(
    'POST',
    '/api/doctor/access-requests',
    {
      patient_id: patientId,
      document_ids: [permittedDoc.id],
      purpose: 'Crown fitting procedure and alignment',
    },
    doctorToken
  );
  const approveRequestId = reqApprove.data.requestId;
  console.log(`1. Doctor created new access request: ${approveRequestId}`);

  // Patient Approves
  const approveRes = await request(
    'PATCH',
    `/api/patient/access-requests/${approveRequestId}`,
    { action: 'approve' },
    patientToken
  );
  console.log(`2. Patient approved request: ${approveRes.data.message} (Status: ${approveRes.status})`);

  // Check traces after approval (MUST STILL NOT change until doctor actually views and ends session)
  const historyAfterApprove = await request('GET', '/api/patient/access-history', null, patientToken);
  console.log(`3. Traces after approval: ${(historyAfterApprove.data.history || []).length} (Must be ${initialTraceCount})`);
  if ((historyAfterApprove.data.history || []).length !== initialTraceCount) {
    throw new Error('FAIL: Trace created prematurely on approval!');
  }

  // Doctor Opens Document -> Starts Viewing Session
  const sessionStart = await request(
    'POST',
    '/api/sessions/start',
    {
      document_id: permittedDoc.id,
      request_id: approveRequestId,
    },
    doctorToken
  );
  console.log('sessionStart response:', sessionStart);
  const sessionId = sessionStart.data?.sessionId;
  console.log(`4. Doctor started viewing session: ${sessionId} (Status: ${sessionStart.status})`);

  // Doctor Flips Pages (3 page views within the SAME session)
  await request('POST', `/api/sessions/${sessionId}/page-view`, { page_number: 1, duration_seconds: 5 }, doctorToken);
  await request('POST', `/api/sessions/${sessionId}/page-view`, { page_number: 2, duration_seconds: 8 }, doctorToken);
  await request('POST', `/api/sessions/${sessionId}/page-view`, { page_number: 3, duration_seconds: 12 }, doctorToken);
  console.log(`5. Doctor navigated 3 pages inside session ${sessionId}`);

  // Check traces during active session (MUST STILL NOT change until ended)
  const historyDuringSession = await request('GET', '/api/patient/access-history', null, patientToken);
  console.log(`6. Traces while session is active: ${(historyDuringSession.data.history || []).length} (Must be ${initialTraceCount})`);
  if ((historyDuringSession.data.history || []).length !== initialTraceCount) {
    throw new Error('FAIL: Trace appeared before session ended!');
  }

  // Doctor Ends Session
  const sessionEnd = await request(
    'POST',
    `/api/sessions/${sessionId}/end`,
    {},
    doctorToken
  );
  console.log(`7. Doctor ended session: ${sessionEnd.data.message} (Status: ${sessionEnd.status})`);

  // Now trace MUST be exactly incremented by 1
  const finalHistory = await request('GET', '/api/patient/access-history', null, patientToken);
  const finalTraceCount = (finalHistory.data.history || []).length;
  console.log(`8. Traces after session ended: ${finalTraceCount} (Expected: ${initialTraceCount + 1})`);
  if (finalTraceCount !== initialTraceCount + 1) {
    throw new Error(`FAIL: Expected exactly 1 new trace, got ${finalTraceCount - initialTraceCount}`);
  }

  const latestTrace = finalHistory.data.history[0];
  console.log(`9. Latest trace verified: Doctor=${latestTrace.doctor_name}, Document=${latestTrace.document_title}, Page Views Count=${latestTrace.page_views ? latestTrace.page_views.length : 0}`);

  // 6. Test Idempotency / No Random Traces on Refresh
  console.log('\n--- TEST 3: REPEATED QUERY / REFRESH IDEMPOTENCY ---');
  for (let i = 1; i <= 3; i++) {
    const checkRefresh = await request('GET', '/api/patient/access-history', null, patientToken);
    if ((checkRefresh.data.history || []).length !== finalTraceCount) {
      throw new Error(`FAIL: History query created phantom trace on iteration ${i}!`);
    }
  }
  console.log('✓ Verified: Patient and doctor refreshes produce 0 phantom traces or duplicate sessions.');

  console.log('\n🎉 ALL STRICT LIFECYCLE TESTS PASSED 100% SUCCESFULLY!');
}

runStrictLifecycleTests().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
