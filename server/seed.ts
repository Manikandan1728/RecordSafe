import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';
import { initBlockchain, recordBlockchainEvent } from './blockchain';

function makeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('🌱 Database already populated. Skipping initial seed.');
    return;
  }

  console.log('🌱 Seeding database with comprehensive hackathon demonstration data...');
  initBlockchain();

  const passwordHash = await bcrypt.hash('password123', 10);

  // ==========================================
  // USERS
  // ==========================================
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, specialization, license_id, organization_name, phone, dob, blood_group, avatar_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Patient 1 - Rahul Kumar (age 45, prediabetic indicators)
  insertUser.run(
    'usr-patient-rahul', 'Rahul Kumar', 'rahul@example.com', passwordHash,
    'patient', null, null, null, '+91 98765 43210', '1981-06-15', 'O+',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  // Patient 2 - Priya Mehra (age 32, thyroid / vitamin deficiency profile)
  insertUser.run(
    'usr-patient-priya', 'Priya Mehra', 'priya.patient@example.com', passwordHash,
    'patient', null, null, null, '+91 99887 11223', '1994-03-22', 'B+',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  // Patient 3 - Arun Verma (age 58, cardiac focus)
  insertUser.run(
    'usr-patient-arun', 'Arun Verma', 'arun.patient@example.com', passwordHash,
    'patient', null, null, null, '+91 98333 44556', '1968-11-02', 'A+',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  );

  // Doctor: Dentist
  insertUser.run(
    'usr-doc-arun', 'Dr. Arun Kumar', 'arun@example.com', passwordHash,
    'doctor', 'Dentist', 'DENT-REG-98214-DEL', null, '+91 98111 22334', '1982-03-21', 'A+',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
  );

  // Doctor: Cardiologist
  insertUser.run(
    'usr-doc-priya', 'Dr. Priya Sharma', 'priya@example.com', passwordHash,
    'doctor', 'Cardiologist', 'CARD-MCI-44109-MUM', null, '+91 98222 33445', '1985-11-09', 'B+',
    'https://images.unsplash.com/photo-1594824813593-18e382f6e788?w=150&auto=format&fit=crop&q=80'
  );

  // Doctor: General Physician
  insertUser.run(
    'usr-doc-ravi', 'Dr. Ravi Patel', 'ravi@example.com', passwordHash,
    'doctor', 'General Physician', 'GP-MCI-77201-BLR', null, '+91 97111 88990', '1979-07-14', 'AB+',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80'
  );

  // Hospital/Lab
  insertUser.run(
    'usr-hosp-citylab', 'City Diagnostic Lab', 'lab@example.com', passwordHash,
    'hospital', null, null, 'City Diagnostic & Imaging Laboratories Ltd.',
    '+91 11 4455 6677', null, null,
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80'
  );

  // ==========================================
  // DOCUMENTS — PATIENT 1: RAHUL KUMAR
  // ==========================================
  const insertDoc = db.prepare(`
    INSERT INTO medical_documents (
      id, patient_id, uploader_id, uploader_name, title, category, specialty,
      file_type, file_size, storage_key, file_hash, page_count, clinical_notes, pages_json, is_verified, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Doc R1: Blood Panel + HbA1c + Lipid Profile (comprehensive)
  const r1Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Complete Blood Count (CBC) & Hemogram', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Laboratory & Diagnostic Services • NABL Accredited • Report ID: CDL-2026-BL-04821' },
        { label: 'Patient', value: 'Rahul Kumar • ID: DEMO-PAT-001 • Age: 45 • Blood Group: O+' },
        { label: 'Report Date', value: '15 September 2026 • Collected: 07:45 AM (Fasting)' },
        { label: 'Hemoglobin', value: '14.2 g/dL  (Ref: 13.5 - 17.5 g/dL) — NORMAL' },
        { label: 'Total WBC Count', value: '7,100 cells/µL  (Ref: 4,000 - 11,000) — NORMAL' },
        { label: 'Platelet Count', value: '248,000 /µL  (Ref: 150,000 - 450,000) — NORMAL' },
        { label: 'RBC Count', value: '4.8 M/µL  (Ref: 4.5 - 5.5 M/µL) — NORMAL' },
        { label: 'ESR', value: '12 mm/hr  (Ref: 0 - 20 mm/hr) — NORMAL' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    },
    {
      pageNumber: 2, title: 'Glycemic Markers & HbA1c Assessment', type: 'lab',
      sections: [
        { label: 'Glycated Hemoglobin (HbA1c)', value: '6.4 %  (Ref: 4.0 - 5.6 %) — ⚠️ ABOVE REFERENCE RANGE' },
        { label: 'Fasting Blood Glucose', value: '112 mg/dL  (Ref: 70 - 100 mg/dL) — ⚠️ ABOVE REFERENCE RANGE' },
        { label: 'Post-Prandial Glucose (2hr)', value: '158 mg/dL  (Ref: < 140 mg/dL) — ⚠️ ABOVE REFERENCE RANGE' },
        { label: 'Fasting Insulin', value: '14.2 µIU/mL  (Ref: 2.6 - 24.9 µIU/mL) — NORMAL' },
        { label: 'Pathologist Remark', value: 'HbA1c level is above the optimal reference range listed on this report. Suggest lifestyle modifications and physician follow-up within 4-6 weeks.' },
        { label: 'DEMO DATA', value: 'Synthetic values for demonstration only' }
      ]
    },
    {
      pageNumber: 3, title: 'Lipid Profile & Cardiovascular Risk Panel', type: 'lab',
      sections: [
        { label: 'Total Cholesterol', value: '218 mg/dL  (Ref: < 200 mg/dL) — ⚠️ BORDERLINE HIGH' },
        { label: 'LDL Cholesterol', value: '142 mg/dL  (Ref: < 100 mg/dL) — ⚠️ ABOVE OPTIMAL' },
        { label: 'HDL Cholesterol', value: '42 mg/dL  (Ref: > 40 mg/dL) — BORDERLINE LOW' },
        { label: 'Triglycerides', value: '170 mg/dL  (Ref: < 150 mg/dL) — ⚠️ ABOVE REFERENCE RANGE' },
        { label: 'VLDL', value: '34 mg/dL  (Ref: < 30 mg/dL) — BORDERLINE' },
        { label: 'Total Cholesterol / HDL Ratio', value: '5.19  (Ref: < 4.5 desirable) — ⚠️ ABOVE OPTIMAL' },
        { label: 'DEMO DATA', value: 'Synthetic values for demonstration only' }
      ]
    },
    {
      pageNumber: 4, title: 'Micronutrient & Vitamin Panel', type: 'lab',
      sections: [
        { label: '25-Hydroxy Vitamin D', value: '18.2 ng/mL  (Ref: 30.0 - 100.0 ng/mL) — ⚠️ BELOW REFERENCE RANGE' },
        { label: 'Vitamin B12', value: '460 pg/mL  (Ref: 200 - 900 pg/mL) — NORMAL' },
        { label: 'Serum Ferritin', value: '125 ng/mL  (Ref: 30 - 400 ng/mL) — NORMAL' },
        { label: 'Serum Calcium', value: '9.1 mg/dL  (Ref: 8.5 - 10.5 mg/dL) — NORMAL' },
        { label: 'Pathologist Summary', value: 'Vitamin D below the listed reference range. Combined with borderline glycemic and lipid markers, lifestyle intervention is recommended. Discuss with treating physician.' },
        { label: 'Reporting Pathologist', value: 'Dr. Suman Gupta, MD (Pathology) • Reg: PATH-MCI-91023' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r1-blood', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Comprehensive Blood Panel with HbA1c & Lipid Profile',
    'Blood Reports', 'General Medicine', 'PDF', 3850000,
    'vault/patients/rahul/labs/cmp_hba1c_lipid_sep2026.pdf',
    makeHash('RAHUL-BLOOD-2026-09'), 4,
    'Quarterly comprehensive metabolic panel including HbA1c, fasting glucose, lipid profile and micronutrients. Fasting specimen collected.',
    r1Pages, 1, 1, '2026-09-15 08:45:00'
  );

  // Doc R2: Blood Pressure Record
  const r2Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Ambulatory Blood Pressure Monitoring Report', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Cardiology & Internal Medicine Division • Report ID: CDL-2026-BP-01192' },
        { label: 'Patient', value: 'Rahul Kumar • ID: DEMO-PAT-001 • Age: 45' },
        { label: 'Report Date', value: '18 September 2026' },
        { label: 'Average Daytime BP', value: '138/88 mmHg  (Ref: < 135/85 mmHg) — ⚠️ SLIGHTLY ELEVATED' },
        { label: 'Average Nighttime BP', value: '122/78 mmHg  (Ref: < 120/70 mmHg) — BORDERLINE' },
        { label: '24-Hour Average', value: '132/84 mmHg  (Ref: < 130/80 mmHg) — ⚠️ ABOVE REFERENCE' },
        { label: 'Heart Rate (avg)', value: '76 bpm  (Ref: 60-100 bpm) — NORMAL' },
        { label: 'Physician Notes', value: 'Mildly elevated daytime readings. Recommend lifestyle modifications: salt restriction, regular exercise, stress management. Recheck in 4 weeks.' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r2-bp', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    '24-Hour Ambulatory Blood Pressure Report',
    'Blood Reports', 'Cardiology', 'PDF', 1250000,
    'vault/patients/rahul/cardio/bp_ambulatory_sep2026.pdf',
    makeHash('RAHUL-BP-2026-09'), 1,
    'Ambulatory 24-hour blood pressure monitoring for routine cardiovascular wellness evaluation.',
    r2Pages, 1, 1, '2026-09-18 16:00:00'
  );

  // Doc R3: ECG
  const r3Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Standard 12-Lead Electrocardiogram', type: 'imaging',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Cardiology Department • Report ID: CDL-2026-ECG-00847' },
        { label: 'Patient', value: 'Rahul Kumar • ID: DEMO-PAT-001 • Age: 45' },
        { label: 'Report Date', value: '20 September 2026' },
        { label: 'Heart Rate', value: '74 bpm — Normal Sinus Rhythm' },
        { label: 'PR Interval', value: '164 ms  (Ref: 120 - 200 ms) — NORMAL' },
        { label: 'QRS Duration', value: '86 ms  (Ref: 80 - 120 ms) — NORMAL' },
        { label: 'QT/QTc', value: '388/420 ms  (Ref: < 440 ms) — NORMAL' },
        { label: 'Axis', value: 'Normal frontal axis (+48°)' },
        { label: 'DEMO DATA', value: 'Synthetic demonstration data' }
      ]
    },
    {
      pageNumber: 2, title: 'ECG Interpretation & Clinical Summary', type: 'summary',
      sections: [
        { label: 'ST-T Analysis', value: 'No ST elevation, depression, or T-wave inversions detected.' },
        { label: 'Rhythm', value: 'Regular sinus rhythm with no ectopic beats or arrhythmia.' },
        { label: 'Conclusion', value: 'Normal resting 12-lead ECG. No acute ischemic changes. Suitable as baseline record.' },
        { label: 'Reporting Cardiologist', value: 'Dr. Priya Sharma, MD, DM (Cardiology) • Reg: CARD-MCI-44109-MUM' },
        { label: 'Recommended', value: 'Annual ECG follow-up advised given borderline metabolic profile. Next suggested: September 2027.' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r3-ecg', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    '12-Lead Electrocardiogram (ECG) Report',
    'ECG', 'Cardiology', 'PDF', 2150000,
    'vault/patients/rahul/cardio/ecg_lead12_sep2026.pdf',
    makeHash('RAHUL-ECG-2026-09'), 2,
    'Resting 12-lead ECG recorded during annual wellness assessment.',
    r3Pages, 1, 1, '2026-09-20 14:30:00'
  );

  // Doc R4: Dental X-Ray
  const r4Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Full Mandibular & Maxillary Panoramic Radiograph (OPG)', type: 'imaging',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Dental Radiology Unit • Report ID: CDL-2026-DT-00413' },
        { label: 'Patient', value: 'Rahul Kumar • ID: DEMO-PAT-001 • Age: 45' },
        { label: 'Report Date', value: '24 September 2026' },
        { label: 'Modality', value: 'High-Resolution Digital Panoramic X-Ray (0.05 mSv)' },
        { label: 'Alveolar Bone Support', value: 'Generalized crestal height within 1.5mm of CEJ — NORMAL' },
        { label: 'Radiological Findings', value: 'Teeth #18, #19, #30, #31 fully erupted. Subtle interproximal enamel demineralization on mesial aspect of tooth #19.' },
        { label: 'DEMO DATA', value: 'Synthetic demonstration data' }
      ]
    },
    {
      pageNumber: 2, title: 'Periodontal Assessment & Plaque Index', type: 'chart',
      sections: [
        { label: 'Probing Depths', value: 'Sulcus depths 2-3mm anterior; localized 4mm at distobuccal of #19' },
        { label: 'Gingival Index', value: 'Mild marginal erythema. Bleeding on probing (BOP) at 8% of sites.' },
        { label: 'Restorative Status', value: 'Composite occlusal restoration on #30 intact with sound margins.' },
        { label: 'DEMO DATA', value: 'Synthetic demonstration data' }
      ]
    },
    {
      pageNumber: 3, title: 'Clinical Impression & Care Plan', type: 'summary',
      sections: [
        { label: 'Assessment', value: 'Localized mild marginal gingivitis and early Stage 1 enamel demineralization (#19).' },
        { label: 'Plan', value: '1. Ultrasonic scaling and polishing\n2. Topical high-fluoride remineralization varnish\n3. 6-month recall' },
        { label: 'Attending Radiologist', value: 'Dr. Neha Kapoor, BDS, MDS (Oral & Maxillofacial Radiology)' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r4-dental', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Dental Panoramic X-Ray & Periodontal Survey',
    'Dental Records', 'Dentistry', 'PDF', 4280000,
    'vault/patients/rahul/dental/opg_sep2026.pdf',
    makeHash('RAHUL-DENTAL-2026-09'), 3,
    'Full arch panoramic imaging and periodontal depth mapping for routine dental checkup.',
    r4Pages, 1, 1, '2026-09-24 10:15:00'
  );

  // Doc R5: Prescription
  const r5Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Medical Prescription — Dr. Ravi Patel', type: 'report',
      sections: [
        { label: 'HEALTHCARE CLINIC', value: 'Dr. Ravi Patel, MBBS, MD (Internal Medicine) • Reg: GP-MCI-77201-BLR' },
        { label: 'Patient', value: 'Rahul Kumar • Age: 45 • DEMO-PAT-001' },
        { label: 'Date', value: '22 September 2026' },
        { label: 'Diagnosis Noted', value: 'Prediabetes (based on HbA1c 6.4%), Borderline Dyslipidemia, Vitamin D Insufficiency' },
        { label: 'Rx 1', value: '💊 Metformin 500mg — Oral — Twice daily (Morning + Evening after meals) — 90 days' },
        { label: 'Rx 2', value: '💊 Atorvastatin 10mg — Oral — Once daily at bedtime — 90 days' },
        { label: 'Rx 3', value: '💊 Cholecalciferol (Vitamin D3) 60,000 IU — Oral — Once weekly x 8 weeks, then monthly maintenance' },
        { label: 'Lifestyle Advice', value: '• Balanced diet with low glycemic index foods\n• 30 min brisk walking daily\n• Reduce salt intake to < 5g/day\n• Reduce refined sugar & processed foods\n• Follow-up blood work in 6 weeks' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record. Do not use as actual prescription.' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r5-rx', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Medical Prescription — September 2026',
    'Prescriptions', 'General Medicine', 'PDF', 980000,
    'vault/patients/rahul/rx/prescription_sep2026.pdf',
    makeHash('RAHUL-RX-2026-09'), 1,
    'Prescription issued following review of blood panel results. Metformin, Atorvastatin, Vitamin D3.',
    r5Pages, 1, 1, '2026-09-22 11:00:00'
  );

  // Doc R6: General Health Checkup
  const r6Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Annual General Health Checkup Summary', type: 'report',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Executive Health Check Program • Report ID: CDL-2026-GHC-00291' },
        { label: 'Patient', value: 'Rahul Kumar • ID: DEMO-PAT-001 • Age: 45 • BMI: 27.2 (Overweight)' },
        { label: 'Date', value: '10 September 2026' },
        { label: 'Height / Weight', value: '5\'9" (175 cm) / 83.5 kg' },
        { label: 'Blood Pressure', value: '134/86 mmHg — Borderline elevated' },
        { label: 'Vision', value: '6/6 both eyes with correction. Near vision presbyopia noted.' },
        { label: 'Chest X-Ray', value: 'Clear lung fields. Normal cardiothoracic ratio.' },
        { label: 'Abdominal Ultrasound', value: 'Mild fatty liver (Grade I hepatic steatosis). No organomegaly.' },
        { label: 'Overall Assessment', value: 'Metabolic syndrome risk factors present. Recommend lifestyle modifications and medical follow-up.' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r6-checkup', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Annual General Health Checkup Summary',
    'Medical History', 'General Medicine', 'PDF', 2400000,
    'vault/patients/rahul/general/annual_checkup_sep2026.pdf',
    makeHash('RAHUL-CHECKUP-2026-09'), 1,
    'Executive annual health screening including clinical examination, imaging, and baseline laboratory workup.',
    r6Pages, 1, 1, '2026-09-10 09:00:00'
  );

  // Doc R7: Knee MRI (for orthopedic)
  const r7Pages = JSON.stringify([
    {
      pageNumber: 1, title: 'Right Knee MRI — T1/T2 Sequences', type: 'imaging',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Radiology Department • Report ID: CDL-2026-MR-00634' },
        { label: 'Patient', value: 'Rahul Kumar • DEMO-PAT-001 • Age: 45' },
        { label: 'Date', value: '08 September 2026' },
        { label: 'Indication', value: 'Mild medial joint line tenderness following sports activity' },
        { label: 'Ligaments', value: 'ACL/PCL: Intact fibers with normal signal intensity' },
        { label: 'Menisci', value: 'Grade 1 intrasubstance signal in medial meniscus posterior horn, no articular tear' },
        { label: 'Bone', value: 'No fracture, bone contusion, or joint effusion' },
        { label: 'Impression', value: 'Mild degenerative medial meniscal signal. Conservative treatment recommended.' },
        { label: 'DEMO DATA', value: 'Synthetic demonstration data' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-r7-mri', 'usr-patient-rahul', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Right Knee MRI Report',
    'Scans', 'Orthopedics', 'PDF', 8920000,
    'vault/patients/rahul/ortho/mri_knee_sep2026.pdf',
    makeHash('RAHUL-MRI-2026-09'), 1,
    'High resolution 3.0T MRI right knee for sports injury evaluation.',
    r7Pages, 1, 1, '2026-09-08 16:20:00'
  );

  // ==========================================
  // HEALTH INDICATORS — PATIENT 1: RAHUL
  // ==========================================
  const insertIndicator = db.prepare(`
    INSERT INTO health_indicators (
      id, patient_id, parameter, value, unit, reference_range, status,
      source_document_id, source_document_title, source_date, clinical_context
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertIndicator.run('hi-r1', 'usr-patient-rahul', 'Glycated Hemoglobin (HbA1c)', '6.4', '%', '4.0 - 5.6 %', 'attention', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Above the reference range listed on your report. This result may indicate borderline glycemic elevation. Discuss with your healthcare professional.');
  insertIndicator.run('hi-r2', 'usr-patient-rahul', 'Fasting Blood Glucose', '112', 'mg/dL', '70 - 100 mg/dL', 'attention', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Above the reference range listed on your report. Your fasting glucose is elevated compared to the standard range.');
  insertIndicator.run('hi-r3', 'usr-patient-rahul', '25-Hydroxy Vitamin D', '18.2', 'ng/mL', '30.0 - 100.0 ng/mL', 'attention', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Below the reference range listed on your report. Consider discussing dietary and lifestyle options with your healthcare professional.');
  insertIndicator.run('hi-r4', 'usr-patient-rahul', 'LDL Cholesterol', '142', 'mg/dL', '< 100 mg/dL', 'attention', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Above the optimal reference range. Your treating physician may discuss lipid management strategies.');
  insertIndicator.run('hi-r5', 'usr-patient-rahul', 'Triglycerides', '170', 'mg/dL', '< 150 mg/dL', 'attention', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Above the reference range on your report.');
  insertIndicator.run('hi-r6', 'usr-patient-rahul', 'Hemoglobin', '14.2', 'g/dL', '13.5 - 17.5 g/dL', 'normal', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Within the listed reference range.');
  insertIndicator.run('hi-r7', 'usr-patient-rahul', 'Blood Pressure (24hr avg)', '132/84', 'mmHg', '< 130/80 mmHg', 'attention', 'doc-r2-bp', '24-Hour Ambulatory Blood Pressure Report', '2026-09-18', 'Slightly above the reference threshold. Your report recommends lifestyle modifications.');
  insertIndicator.run('hi-r8', 'usr-patient-rahul', 'Heart Rate & Rhythm (ECG)', '74 bpm, Sinus', 'bpm', '60 - 100 bpm', 'normal', 'doc-r3-ecg', '12-Lead Electrocardiogram (ECG) Report', '2026-09-20', 'Normal sinus rhythm with intact cardiac conduction intervals.');
  insertIndicator.run('hi-r9', 'usr-patient-rahul', 'Vitamin B12', '460', 'pg/mL', '200 - 900 pg/mL', 'normal', 'doc-r1-blood', 'Comprehensive Blood Panel with HbA1c & Lipid Profile', '2026-09-15', 'Within the listed reference range.');
  insertIndicator.run('hi-r10', 'usr-patient-rahul', 'BMI', '27.2', 'kg/m²', '18.5 - 24.9 kg/m²', 'attention', 'doc-r6-checkup', 'Annual General Health Checkup Summary', '2026-09-10', 'Classified as overweight per the report BMI categories. Discuss weight management with your healthcare professional.');

  // ==========================================
  // MEDICATIONS — PATIENT 1: RAHUL
  // ==========================================
  const insertMed = db.prepare(`
    INSERT INTO medications (
      id, patient_id, name, dosage, frequency, schedule_times, duration_days,
      start_date, end_date, prescribed_by, source_document_id, notes, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMed.run('med-r1', 'usr-patient-rahul', 'Metformin', '500 mg', 'Twice daily', '08:00 AM,08:00 PM', 90, '2026-09-22', '2026-12-21', 'Dr. Ravi Patel', 'doc-r5-rx', 'Take after meals with a full glass of water', 1);
  insertMed.run('med-r2', 'usr-patient-rahul', 'Atorvastatin', '10 mg', 'Once daily', '10:00 PM', 90, '2026-09-22', '2026-12-21', 'Dr. Ravi Patel', 'doc-r5-rx', 'Take at bedtime', 1);
  insertMed.run('med-r3', 'usr-patient-rahul', 'Cholecalciferol (Vitamin D3)', '60,000 IU', 'Once weekly', '10:00 AM', 56, '2026-09-22', '2026-11-17', 'Dr. Ravi Patel', 'doc-r5-rx', 'Weekly sachet. Take with a fatty meal for better absorption.', 1);

  // ==========================================
  // MEDICATION LOGS — PATIENT 1: RAHUL
  // ==========================================
  const insertLog = db.prepare(`
    INSERT INTO medication_logs (id, medication_id, patient_id, scheduled_time, scheduled_date, action, action_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run('ml-1', 'med-r1', 'usr-patient-rahul', '08:00 AM', '2026-09-29', 'taken', '2026-09-29 08:12:00', 'Morning dose taken');
  insertLog.run('ml-2', 'med-r2', 'usr-patient-rahul', '10:00 PM', '2026-09-28', 'taken', '2026-09-28 22:05:00', 'Evening dose taken');
  insertLog.run('ml-3', 'med-r3', 'usr-patient-rahul', '10:00 AM', '2026-09-29', 'taken', '2026-09-29 10:30:00', 'Weekly sachet taken after breakfast');

  // ==========================================
  // REMINDERS — PATIENT 1: RAHUL (expanded)
  // ==========================================
  const insertReminder = db.prepare(`
    INSERT INTO reminders (id, patient_id, title, category, due_time, due_date, status, notes, source_document_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertReminder.run('rem-r1', 'usr-patient-rahul', 'Metformin 500mg — Evening Dose', 'medication', '08:00 PM', '2026-09-29', 'pending', 'Take after dinner with a full glass of water', 'doc-r5-rx');
  insertReminder.run('rem-r2', 'usr-patient-rahul', 'Atorvastatin 10mg — Bedtime', 'medication', '10:00 PM', '2026-09-29', 'pending', 'Take at bedtime', 'doc-r5-rx');
  insertReminder.run('rem-r3', 'usr-patient-rahul', 'Fasting Blood Glucose & HbA1c Re-check', 'test', '07:30 AM', '2026-10-12', 'pending', '10-12 hour fasting required. Scheduled 4-week follow-up blood work.', 'doc-r1-blood');
  insertReminder.run('rem-r4', 'usr-patient-rahul', 'Follow-up with Dr. Ravi Patel (General Physician)', 'consultation', '10:00 AM', '2026-10-15', 'pending', 'Review blood work results and medication efficacy. Bring updated blood panel.', 'doc-r5-rx');
  insertReminder.run('rem-r5', 'usr-patient-rahul', 'Dental Prophylaxis — Dr. Arun Kumar', 'consultation', '11:00 AM', '2026-10-28', 'pending', 'Scaling, polishing, and enamel remineralization review for tooth #19.', 'doc-r4-dental');
  insertReminder.run('rem-r6', 'usr-patient-rahul', 'Annual ECG Follow-up', 'test', '02:00 PM', '2026-12-20', 'pending', 'Baseline ECG comparison suggested by cardiologist. Annual cadence.', 'doc-r3-ecg');
  insertReminder.run('rem-r7', 'usr-patient-rahul', 'Blood Pressure Re-check', 'test', '09:00 AM', '2026-10-18', 'pending', '4-week follow-up BP measurement after lifestyle modifications.', 'doc-r2-bp');

  // ==========================================
  // DOCUMENTS — PATIENT 2: PRIYA MEHRA
  // ==========================================
  const p2Pages1 = JSON.stringify([
    {
      pageNumber: 1, title: 'Complete Blood Count (CBC)', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Laboratory & Diagnostic Services • Report ID: CDL-2026-BL-05102' },
        { label: 'Patient', value: 'Priya Mehra • ID: DEMO-PAT-002 • Age: 32 • Blood Group: B+' },
        { label: 'Report Date', value: '18 September 2026 • Collected: 08:00 AM (Fasting)' },
        { label: 'Hemoglobin', value: '11.2 g/dL  (Ref: 12.0 - 15.5 g/dL) — ⚠️ BELOW REFERENCE RANGE' },
        { label: 'Total WBC Count', value: '6,400 cells/µL  (Ref: 4,000 - 11,000) — NORMAL' },
        { label: 'Platelet Count', value: '285,000 /µL  (Ref: 150,000 - 450,000) — NORMAL' },
        { label: 'MCV', value: '74 fL  (Ref: 80 - 100 fL) — ⚠️ BELOW REFERENCE RANGE (microcytic)' },
        { label: 'Serum Iron', value: '38 µg/dL  (Ref: 60 - 170 µg/dL) — ⚠️ LOW' },
        { label: 'Serum Ferritin', value: '12 ng/mL  (Ref: 20 - 200 ng/mL) — ⚠️ LOW' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p2-cbc', 'usr-patient-priya', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Complete Blood Count (CBC) with Iron Studies',
    'Blood Reports', 'General Medicine', 'PDF', 1850000,
    'vault/patients/priya/labs/cbc_iron_sep2026.pdf',
    makeHash('PRIYA-CBC-2026-09'), 1,
    'CBC with peripheral smear and iron studies. Microcytic pattern observed.',
    p2Pages1, 1, 1, '2026-09-18 09:00:00'
  );

  // Priya: Thyroid
  const p2Pages2 = JSON.stringify([
    {
      pageNumber: 1, title: 'Thyroid Function Panel', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Endocrinology Lab • Report ID: CDL-2026-TH-00318' },
        { label: 'Patient', value: 'Priya Mehra • ID: DEMO-PAT-002 • Age: 32' },
        { label: 'Report Date', value: '18 September 2026' },
        { label: 'TSH', value: '6.8 mIU/L  (Ref: 0.4 - 4.0 mIU/L) — ⚠️ ABOVE REFERENCE RANGE' },
        { label: 'Free T4', value: '0.72 ng/dL  (Ref: 0.8 - 1.8 ng/dL) — ⚠️ BELOW REFERENCE RANGE' },
        { label: 'Free T3', value: '2.1 pg/mL  (Ref: 2.3 - 4.2 pg/mL) — ⚠️ BORDERLINE LOW' },
        { label: 'Anti-TPO Antibodies', value: '180 IU/mL  (Ref: < 35 IU/mL) — ⚠️ ELEVATED' },
        { label: 'Pathologist Remark', value: 'Thyroid function results are outside the listed reference ranges. Recommend endocrinologist consultation for clinical correlation.' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p2-thyroid', 'usr-patient-priya', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Thyroid Function Panel (TSH, T3, T4, Anti-TPO)',
    'Lab Reports', 'General Medicine', 'PDF', 1200000,
    'vault/patients/priya/labs/thyroid_sep2026.pdf',
    makeHash('PRIYA-THYROID-2026-09'), 1,
    'Complete thyroid function assessment with anti-thyroid antibody panel.',
    p2Pages2, 1, 1, '2026-09-18 09:30:00'
  );

  // Priya: Vitamin D
  const p2Pages3 = JSON.stringify([
    {
      pageNumber: 1, title: 'Vitamin & Mineral Assay', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Biochemistry Lab • Report ID: CDL-2026-VM-00421' },
        { label: 'Patient', value: 'Priya Mehra • ID: DEMO-PAT-002 • Age: 32' },
        { label: 'Report Date', value: '18 September 2026' },
        { label: '25-Hydroxy Vitamin D', value: '14.8 ng/mL  (Ref: 30.0 - 100.0 ng/mL) — ⚠️ DEFICIENT' },
        { label: 'Vitamin B12', value: '188 pg/mL  (Ref: 200 - 900 pg/mL) — ⚠️ BELOW REFERENCE RANGE' },
        { label: 'Serum Calcium', value: '8.4 mg/dL  (Ref: 8.5 - 10.5 mg/dL) — BORDERLINE LOW' },
        { label: 'Folic Acid', value: '5.2 ng/mL  (Ref: 3.0 - 17.0 ng/mL) — NORMAL' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p2-vitamins', 'usr-patient-priya', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Vitamin & Mineral Deficiency Panel',
    'Lab Reports', 'General Medicine', 'PDF', 1100000,
    'vault/patients/priya/labs/vitamins_sep2026.pdf',
    makeHash('PRIYA-VITAMINS-2026-09'), 1,
    'Comprehensive micronutrient and vitamin screening.',
    p2Pages3, 1, 1, '2026-09-18 10:00:00'
  );

  // Priya: Prescription
  const p2Pages4 = JSON.stringify([
    {
      pageNumber: 1, title: 'Medical Prescription — Dr. Ravi Patel', type: 'report',
      sections: [
        { label: 'Dr. Ravi Patel, MBBS, MD', value: 'Internal Medicine • Reg: GP-MCI-77201-BLR' },
        { label: 'Patient', value: 'Priya Mehra • Age: 32 • DEMO-PAT-002' },
        { label: 'Date', value: '20 September 2026' },
        { label: 'Rx 1', value: '💊 Levothyroxine 50 mcg — Once daily — Empty stomach, 30 min before breakfast — 90 days' },
        { label: 'Rx 2', value: '💊 Ferrous Ascorbate 100 mg — Once daily — After lunch — 60 days' },
        { label: 'Rx 3', value: '💊 Methylcobalamin (B12) 1500 mcg — Once daily — After breakfast — 60 days' },
        { label: 'Rx 4', value: '💊 Cholecalciferol 60,000 IU — Once weekly x 8 weeks' },
        { label: 'Follow-up', value: 'Repeat TSH and CBC after 6 weeks. Endocrinology referral if TSH remains elevated.' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p2-rx', 'usr-patient-priya', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Medical Prescription — Thyroid & Anemia Management',
    'Prescriptions', 'General Medicine', 'PDF', 900000,
    'vault/patients/priya/rx/prescription_sep2026.pdf',
    makeHash('PRIYA-RX-2026-09'), 1,
    'Prescription for hypothyroid management, iron supplementation, B12, and Vitamin D.',
    p2Pages4, 1, 1, '2026-09-20 14:00:00'
  );

  // Priya: Health Indicators
  insertIndicator.run('hi-p1', 'usr-patient-priya', 'Hemoglobin', '11.2', 'g/dL', '12.0 - 15.5 g/dL', 'attention', 'doc-p2-cbc', 'Complete Blood Count (CBC) with Iron Studies', '2026-09-18', 'Below the reference range on your report. This may suggest iron-deficiency anemia. Discuss with your physician.');
  insertIndicator.run('hi-p2', 'usr-patient-priya', 'Serum Ferritin', '12', 'ng/mL', '20 - 200 ng/mL', 'attention', 'doc-p2-cbc', 'Complete Blood Count (CBC) with Iron Studies', '2026-09-18', 'Below the reference range. Low ferritin may indicate depleted iron stores.');
  insertIndicator.run('hi-p3', 'usr-patient-priya', 'TSH (Thyroid)', '6.8', 'mIU/L', '0.4 - 4.0 mIU/L', 'attention', 'doc-p2-thyroid', 'Thyroid Function Panel (TSH, T3, T4, Anti-TPO)', '2026-09-18', 'Above the reference range on your report. Elevated TSH may indicate thyroid function changes. Discuss with your healthcare professional.');
  insertIndicator.run('hi-p4', 'usr-patient-priya', '25-Hydroxy Vitamin D', '14.8', 'ng/mL', '30.0 - 100.0 ng/mL', 'attention', 'doc-p2-vitamins', 'Vitamin & Mineral Deficiency Panel', '2026-09-18', 'Below the reference range. Vitamin D deficiency noted.');
  insertIndicator.run('hi-p5', 'usr-patient-priya', 'Vitamin B12', '188', 'pg/mL', '200 - 900 pg/mL', 'attention', 'doc-p2-vitamins', 'Vitamin & Mineral Deficiency Panel', '2026-09-18', 'Below the reference range. Discuss supplementation with your healthcare professional.');
  insertIndicator.run('hi-p6', 'usr-patient-priya', 'Platelet Count', '285,000', '/µL', '150,000 - 450,000', 'normal', 'doc-p2-cbc', 'Complete Blood Count (CBC) with Iron Studies', '2026-09-18', 'Within the listed reference range.');

  // Priya: Medications
  insertMed.run('med-p1', 'usr-patient-priya', 'Levothyroxine', '50 mcg', 'Once daily', '06:30 AM', 90, '2026-09-20', '2026-12-19', 'Dr. Ravi Patel', 'doc-p2-rx', 'Empty stomach, 30 min before breakfast', 1);
  insertMed.run('med-p2', 'usr-patient-priya', 'Ferrous Ascorbate', '100 mg', 'Once daily', '01:00 PM', 60, '2026-09-20', '2026-11-19', 'Dr. Ravi Patel', 'doc-p2-rx', 'Take after lunch. Avoid taking with tea/coffee.', 1);
  insertMed.run('med-p3', 'usr-patient-priya', 'Methylcobalamin (B12)', '1500 mcg', 'Once daily', '09:00 AM', 60, '2026-09-20', '2026-11-19', 'Dr. Ravi Patel', 'doc-p2-rx', 'After breakfast', 1);

  // Priya: Reminders
  insertReminder.run('rem-p1', 'usr-patient-priya', 'Levothyroxine 50 mcg — Morning', 'medication', '06:30 AM', '2026-09-29', 'pending', 'Empty stomach, 30 min before breakfast', 'doc-p2-rx');
  insertReminder.run('rem-p2', 'usr-patient-priya', 'Repeat TSH & CBC Panel', 'test', '08:00 AM', '2026-11-01', 'pending', '6-week follow-up labs after starting Levothyroxine', 'doc-p2-thyroid');
  insertReminder.run('rem-p3', 'usr-patient-priya', 'Follow-up with Dr. Ravi Patel', 'consultation', '10:00 AM', '2026-11-05', 'pending', 'Review thyroid and anemia markers after treatment', 'doc-p2-rx');

  // ==========================================
  // DOCUMENTS — PATIENT 3: ARUN VERMA
  // ==========================================
  const p3Pages1 = JSON.stringify([
    {
      pageNumber: 1, title: 'Fasting Blood Panel & Metabolic Screen', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Laboratory Services • Report ID: CDL-2026-BL-05398' },
        { label: 'Patient', value: 'Arun Verma • ID: DEMO-PAT-003 • Age: 58 • Blood Group: A+' },
        { label: 'Report Date', value: '12 September 2026' },
        { label: 'Hemoglobin', value: '13.1 g/dL  (Ref: 13.5 - 17.5 g/dL) — ⚠️ SLIGHTLY LOW' },
        { label: 'HbA1c', value: '7.8 %  (Ref: 4.0 - 5.6 %) — ⚠️ ABOVE REFERENCE RANGE' },
        { label: 'Fasting Glucose', value: '148 mg/dL  (Ref: 70 - 100 mg/dL) — ⚠️ ABOVE REFERENCE' },
        { label: 'Creatinine', value: '1.4 mg/dL  (Ref: 0.7 - 1.3 mg/dL) — ⚠️ BORDERLINE' },
        { label: 'Total Cholesterol', value: '242 mg/dL  (Ref: < 200 mg/dL) — ⚠️ HIGH' },
        { label: 'LDL Cholesterol', value: '168 mg/dL  (Ref: < 100 mg/dL) — ⚠️ HIGH' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p3-blood', 'usr-patient-arun', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Fasting Blood Panel & Metabolic Screen',
    'Blood Reports', 'General Medicine', 'PDF', 2100000,
    'vault/patients/arun/labs/blood_panel_sep2026.pdf',
    makeHash('ARUN-BLOOD-2026-09'), 1,
    'Comprehensive metabolic panel for existing diabetic management and cardiovascular risk assessment.',
    p3Pages1, 1, 1, '2026-09-12 07:30:00'
  );

  // Arun: ECG
  const p3Pages2 = JSON.stringify([
    {
      pageNumber: 1, title: '12-Lead Electrocardiogram (ECG)', type: 'imaging',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Cardiology Dept • Report ID: CDL-2026-ECG-00921' },
        { label: 'Patient', value: 'Arun Verma • DEMO-PAT-003 • Age: 58' },
        { label: 'Report Date', value: '14 September 2026' },
        { label: 'Heart Rate', value: '82 bpm — Sinus Rhythm' },
        { label: 'PR Interval', value: '178 ms  (Ref: 120 - 200 ms) — NORMAL' },
        { label: 'ST Changes', value: 'Mild non-specific ST-T changes in lateral leads. No acute ischemia.' },
        { label: 'Conclusion', value: 'Sinus rhythm. Non-specific ST-T changes. Correlate clinically. Recommend stress test if symptomatic.' },
        { label: 'Cardiologist', value: 'Dr. Priya Sharma, MD, DM (Cardiology)' },
        { label: 'DEMO DATA', value: 'Synthetic demonstration data' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p3-ecg', 'usr-patient-arun', 'usr-hosp-citylab', 'City Diagnostic Lab',
    '12-Lead ECG Report with Clinical Correlation',
    'ECG', 'Cardiology', 'PDF', 1800000,
    'vault/patients/arun/cardio/ecg_sep2026.pdf',
    makeHash('ARUN-ECG-2026-09'), 1,
    'Routine ECG for cardiovascular monitoring in context of existing metabolic conditions.',
    p3Pages2, 1, 1, '2026-09-14 15:00:00'
  );

  // Arun: Prescription
  const p3Pages3 = JSON.stringify([
    {
      pageNumber: 1, title: 'Medical Prescription — Dr. Priya Sharma', type: 'report',
      sections: [
        { label: 'Dr. Priya Sharma, MD, DM (Cardiology)', value: 'Reg: CARD-MCI-44109-MUM' },
        { label: 'Patient', value: 'Arun Verma • Age: 58 • DEMO-PAT-003' },
        { label: 'Date', value: '16 September 2026' },
        { label: 'Rx 1', value: '💊 Metformin 1000mg — Twice daily (Morning + Evening after meals) — 90 days' },
        { label: 'Rx 2', value: '💊 Rosuvastatin 20mg — Once daily at bedtime — 90 days' },
        { label: 'Rx 3', value: '💊 Telmisartan 40mg — Once daily morning — 90 days (for BP management)' },
        { label: 'Rx 4', value: '💊 Aspirin 75mg — Once daily after lunch — 90 days (cardioprotective)' },
        { label: 'Lifestyle', value: 'Strict diabetic diet. 30 min daily walk. Avoid smoking. Limit alcohol. Monthly BP monitoring.' },
        { label: 'Follow-up', value: 'HbA1c + Lipid + Renal function in 8 weeks. TMT/stress test if chest discomfort occurs.' },
        { label: 'DEMO DATA', value: 'This is synthetic demonstration data — Not a real medical record' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p3-rx', 'usr-patient-arun', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Medical Prescription — Diabetes & Cardiac Management',
    'Prescriptions', 'Cardiology', 'PDF', 950000,
    'vault/patients/arun/rx/prescription_sep2026.pdf',
    makeHash('ARUN-RX-2026-09'), 1,
    'Comprehensive medication plan for diabetes management, lipid control, and cardioprotection.',
    p3Pages3, 1, 1, '2026-09-16 16:00:00'
  );

  // Arun: BP Record
  const p3Pages4 = JSON.stringify([
    {
      pageNumber: 1, title: 'Blood Pressure Monitoring Record', type: 'lab',
      sections: [
        { label: 'CITY DIAGNOSTIC LAB', value: 'Cardiology Division • Report ID: CDL-2026-BP-01284' },
        { label: 'Patient', value: 'Arun Verma • DEMO-PAT-003 • Age: 58' },
        { label: 'Report Date', value: '19 September 2026' },
        { label: 'Morning Reading', value: '148/92 mmHg  — ⚠️ Stage 1 Hypertension range' },
        { label: 'Evening Reading', value: '142/88 mmHg  — ⚠️ Elevated' },
        { label: 'Average', value: '145/90 mmHg  (Ref: < 130/80 mmHg) — ⚠️ ABOVE TARGET' },
        { label: 'Note', value: 'BP readings remain above target despite lifestyle measures. Telmisartan 40mg initiated.' },
        { label: 'DEMO DATA', value: 'Synthetic demonstration data' }
      ]
    }
  ]);

  insertDoc.run(
    'doc-p3-bp', 'usr-patient-arun', 'usr-hosp-citylab', 'City Diagnostic Lab',
    'Blood Pressure Monitoring Record',
    'Blood Reports', 'Cardiology', 'PDF', 800000,
    'vault/patients/arun/cardio/bp_sep2026.pdf',
    makeHash('ARUN-BP-2026-09'), 1,
    'Serial blood pressure monitoring record for antihypertensive titration.',
    p3Pages4, 1, 1, '2026-09-19 18:00:00'
  );

  // Arun: Health Indicators
  insertIndicator.run('hi-a1', 'usr-patient-arun', 'HbA1c', '7.8', '%', '4.0 - 5.6 %', 'attention', 'doc-p3-blood', 'Fasting Blood Panel & Metabolic Screen', '2026-09-12', 'Above the reference range. Your report indicates elevated glycemic markers. Discuss management with your treating physician.');
  insertIndicator.run('hi-a2', 'usr-patient-arun', 'Fasting Blood Glucose', '148', 'mg/dL', '70 - 100 mg/dL', 'attention', 'doc-p3-blood', 'Fasting Blood Panel & Metabolic Screen', '2026-09-12', 'Above the reference range listed on your report.');
  insertIndicator.run('hi-a3', 'usr-patient-arun', 'LDL Cholesterol', '168', 'mg/dL', '< 100 mg/dL', 'attention', 'doc-p3-blood', 'Fasting Blood Panel & Metabolic Screen', '2026-09-12', 'Significantly above the optimal reference range.');
  insertIndicator.run('hi-a4', 'usr-patient-arun', 'Blood Pressure (avg)', '145/90', 'mmHg', '< 130/80 mmHg', 'attention', 'doc-p3-bp', 'Blood Pressure Monitoring Record', '2026-09-19', 'Above the target range. Antihypertensive medication has been initiated per your prescription.');
  insertIndicator.run('hi-a5', 'usr-patient-arun', 'Creatinine', '1.4', 'mg/dL', '0.7 - 1.3 mg/dL', 'attention', 'doc-p3-blood', 'Fasting Blood Panel & Metabolic Screen', '2026-09-12', 'Borderline above reference range. Renal function monitoring recommended.');
  insertIndicator.run('hi-a6', 'usr-patient-arun', 'ECG - ST Changes', 'Mild non-specific', '', 'Normal Baseline', 'attention', 'doc-p3-ecg', '12-Lead ECG Report with Clinical Correlation', '2026-09-14', 'Non-specific ST-T changes noted. No acute ischemia. Clinical correlation recommended.');

  // Arun: Medications
  insertMed.run('med-a1', 'usr-patient-arun', 'Metformin', '1000 mg', 'Twice daily', '08:00 AM,08:00 PM', 90, '2026-09-16', '2026-12-15', 'Dr. Priya Sharma', 'doc-p3-rx', 'Take after meals', 1);
  insertMed.run('med-a2', 'usr-patient-arun', 'Rosuvastatin', '20 mg', 'Once daily', '10:00 PM', 90, '2026-09-16', '2026-12-15', 'Dr. Priya Sharma', 'doc-p3-rx', 'Bedtime dose', 1);
  insertMed.run('med-a3', 'usr-patient-arun', 'Telmisartan', '40 mg', 'Once daily', '07:30 AM', 90, '2026-09-16', '2026-12-15', 'Dr. Priya Sharma', 'doc-p3-rx', 'Morning, before breakfast', 1);
  insertMed.run('med-a4', 'usr-patient-arun', 'Aspirin', '75 mg', 'Once daily', '01:00 PM', 90, '2026-09-16', '2026-12-15', 'Dr. Priya Sharma', 'doc-p3-rx', 'After lunch, cardioprotective', 1);

  // Arun: Reminders
  insertReminder.run('rem-a1', 'usr-patient-arun', 'Metformin 1000mg — Evening Dose', 'medication', '08:00 PM', '2026-09-29', 'pending', 'After dinner', 'doc-p3-rx');
  insertReminder.run('rem-a2', 'usr-patient-arun', 'HbA1c + Lipid + Renal Function Panel', 'test', '07:30 AM', '2026-11-10', 'pending', '8-week follow-up blood work as prescribed', 'doc-p3-blood');
  insertReminder.run('rem-a3', 'usr-patient-arun', 'Cardiology Follow-up — Dr. Priya Sharma', 'consultation', '11:00 AM', '2026-11-14', 'pending', 'Discuss lab results, BP trend, and ECG changes', 'doc-p3-ecg');
  insertReminder.run('rem-a4', 'usr-patient-arun', 'Monthly BP Check', 'test', '09:00 AM', '2026-10-19', 'pending', 'Monthly BP monitoring per cardiologist recommendation', 'doc-p3-bp');

  // Record blockchain events for key documents
  for (const docId of [
    'doc-r1-blood', 'doc-r2-bp', 'doc-r3-ecg', 'doc-r4-dental', 'doc-r5-rx', 'doc-r6-checkup', 'doc-r7-mri',
    'doc-p2-cbc', 'doc-p2-thyroid', 'doc-p2-vitamins', 'doc-p2-rx',
    'doc-p3-blood', 'doc-p3-ecg', 'doc-p3-rx', 'doc-p3-bp'
  ]) {
    const doc = db.prepare('SELECT * FROM medical_documents WHERE id = ?').get(docId) as any;
    if (doc) {
      recordBlockchainEvent({
        eventType: 'DOCUMENT_UPLOADED',
        actorId: doc.uploader_id,
        actorName: doc.uploader_name,
        actorRole: 'hospital',
        targetId: doc.patient_id,
        targetName: (db.prepare('SELECT name FROM users WHERE id = ?').get(doc.patient_id) as any)?.name || 'Patient',
        documentId: doc.id,
        documentTitle: doc.title,
        documentHash: doc.file_hash,
        details: { category: doc.category, specialty: doc.specialty }
      });
    }
  }

  console.log('✅ Comprehensive demo seed data loaded: 3 patients, 15 documents, 30+ health indicators, medications, reminders');
}
