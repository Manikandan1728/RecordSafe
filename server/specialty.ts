export interface SpecialtyRule {
  specialization: string;
  allowedCategories: string[];
  allowedSpecialties: string[];
  description: string;
}

export const SPECIALTY_RULES: Record<string, SpecialtyRule> = {
  'Dentist': {
    specialization: 'Dentist',
    allowedCategories: ['Dental Records', 'Dental X-Ray', 'Dental Prescription', 'Dental Treatment History', 'Oral Health Report'],
    allowedSpecialties: ['Dentistry', 'Dental', 'Oral Surgery', 'Orthodontics'],
    description: 'Permitted to access dental diagnostics, oral X-rays, dental prescriptions, and dental history only.',
  },
  'Cardiologist': {
    specialization: 'Cardiologist',
    allowedCategories: ['Cardiology', 'ECG', 'Blood Reports', 'Echo', 'Lipid Panel', 'Cardiology Report', 'Discharge Summaries', 'Lab Reports'],
    allowedSpecialties: ['Cardiology', 'Cardiovascular', 'Internal Medicine'],
    description: 'Permitted to access ECGs, cardiovascular reports, metabolic/lipid blood panels, and cardiac discharge summaries.',
  },
  'Orthopedic': {
    specialization: 'Orthopedic',
    allowedCategories: ['X-Rays', 'Scans', 'Orthopedic Report', 'MRI Spine', 'Bone Density', 'Physical Therapy'],
    allowedSpecialties: ['Orthopedics', 'Orthopedic Surgery', 'Radiology - Skeletal'],
    description: 'Permitted to access skeletal X-rays, bone density scans, orthopedic MRIs, and physical therapy reports.',
  },
  'General Physician': {
    specialization: 'General Physician',
    allowedCategories: ['Blood Reports', 'Prescriptions', 'Lab Reports', 'Medical History', 'Discharge Summaries', 'General'],
    allowedSpecialties: ['General Medicine', 'Internal Medicine', 'Family Medicine'],
    description: 'Permitted to access primary blood reports, prescriptions, routine lab tests, general medical history, and discharge notes.',
  },
  'Neurologist': {
    specialization: 'Neurologist',
    allowedCategories: ['Scans', 'MRI', 'CT Brain', 'Neurology Report', 'EEG'],
    allowedSpecialties: ['Neurology', 'Neurosurgery', 'Neuro-Radiology'],
    description: 'Permitted to access neuro-imaging, EEGs, and neurological diagnostic evaluations.',
  },
  'Dermatologist': {
    specialization: 'Dermatologist',
    allowedCategories: ['Dermatology', 'Skin Biopsy', 'Dermal Prescription', 'Lab Reports'],
    allowedSpecialties: ['Dermatology', 'Cutaneous Medicine'],
    description: 'Permitted to access skin biopsies, dermatological prescriptions, and related cutaneous test reports.',
  },
};

export const ALL_CATEGORIES = [
  'Blood Reports',
  'Dental Records',
  'X-Rays',
  'Scans',
  'ECG',
  'Prescriptions',
  'Discharge Summaries',
  'Lab Reports',
  'Medical History',
  'Other'
];

export const ALL_SPECIALTIES = [
  'Dentistry',
  'Cardiology',
  'Orthopedics',
  'General Medicine',
  'Neurology',
  'Dermatology',
  'Radiology',
  'Pathology'
];

/**
 * Validates whether a doctor with a specific specialization is permitted to request/view a document.
 */
export function isSpecialtyPermitted(
  doctorSpecialization?: string | null,
  documentCategory?: string,
  documentSpecialty?: string
): { permitted: boolean; reason?: string } {
  if (!doctorSpecialization) {
    return { permitted: false, reason: 'Doctor specialization is missing or unspecified.' };
  }

  const cleanDocSpec = doctorSpecialization.trim();
  const rule = SPECIALTY_RULES[cleanDocSpec];

  if (!rule) {
    // If not in standard list, perform normalized substring search
    const matchingKey = Object.keys(SPECIALTY_RULES).find(k => 
      cleanDocSpec.toLowerCase().includes(k.toLowerCase()) || 
      k.toLowerCase().includes(cleanDocSpec.toLowerCase())
    );
    if (matchingKey) {
      return checkRule(SPECIALTY_RULES[matchingKey], documentCategory, documentSpecialty);
    }
    return { 
      permitted: false, 
      reason: `Specialization "${cleanDocSpec}" is not recognized in the clinical access matrix.` 
    };
  }

  return checkRule(rule, documentCategory, documentSpecialty);
}

function checkRule(
  rule: SpecialtyRule,
  category?: string,
  specialty?: string
): { permitted: boolean; reason?: string } {
  const normCat = (category || '').toLowerCase().trim();
  const normSpec = (specialty || '').toLowerCase().trim();

  const categoryMatch = rule.allowedCategories.some(c => 
    normCat.includes(c.toLowerCase()) || c.toLowerCase().includes(normCat)
  );

  const specialtyMatch = rule.allowedSpecialties.some(s => 
    normSpec.includes(s.toLowerCase()) || s.toLowerCase().includes(normSpec)
  );

  if (categoryMatch || specialtyMatch) {
    return { permitted: true };
  }

  return {
    permitted: false,
    reason: `Access Restricted: Your medical specialization (${rule.specialization}) does not permit access to "${category}" (${specialty}) records. Allowed areas: ${rule.allowedCategories.join(', ')}.`
  };
}
