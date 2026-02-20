export const PARAMETERS = {
  hba1c:            { label: 'HbA1c',             unit: '%',     normal: [4, 5.7],   color: '#f97316', description: 'Glycated Hemoglobin',  higherIsBetter: false },
  glucose:          { label: 'Fasting Glucose',    unit: 'mg/dL', normal: [70, 100],  color: '#eab308', description: 'Blood Sugar',          higherIsBetter: false },
  triglycerides:    { label: 'Triglycerides',      unit: 'mg/dL', normal: [0, 150],   color: '#ec4899', description: 'Blood Fats',           higherIsBetter: false },
  hdl:              { label: 'HDL Cholesterol',    unit: 'mg/dL', normal: [40, 200],  color: '#22c55e', description: 'Good Cholesterol',     higherIsBetter: true  },
  ldl:              { label: 'LDL Cholesterol',    unit: 'mg/dL', normal: [0, 100],   color: '#ef4444', description: 'Bad Cholesterol',      higherIsBetter: false },
  total_cholesterol:{ label: 'Total Cholesterol',  unit: 'mg/dL', normal: [0, 200],   color: '#a855f7', description: 'Total Cholesterol',    higherIsBetter: false },
  hemoglobin:       { label: 'Hemoglobin',         unit: 'g/dL',  normal: [12, 17.5], color: '#06b6d4', description: 'Oxygen Carrier',       higherIsBetter: true  },
  creatinine:       { label: 'Creatinine',         unit: 'mg/dL', normal: [0.6, 1.2], color: '#f59e0b', description: 'Kidney Function',      higherIsBetter: false },
  tsh:              { label: 'TSH',                unit: 'mIU/L', normal: [0.4, 4.0], color: '#8b5cf6', description: 'Thyroid Function',     higherIsBetter: false },
  vitamin_d:        { label: 'Vitamin D',          unit: 'ng/mL', normal: [30, 100],  color: '#fbbf24', description: 'Sunshine Vitamin',     higherIsBetter: true  },
  wbc:              { label: 'WBC',                unit: 'K/μL',  normal: [4.5, 11],  color: '#38bdf8', description: 'White Blood Cells',    higherIsBetter: false },
  platelets:        { label: 'Platelets',          unit: 'K/μL',  normal: [150, 400], color: '#fb923c', description: 'Clotting Cells',       higherIsBetter: false },
  uric_acid:        { label: 'Uric Acid',          unit: 'mg/dL', normal: [2.4, 6.0], color: '#e879f9', description: 'Gout Marker',          higherIsBetter: false },
  alt:              { label: 'ALT',                unit: 'U/L',   normal: [7, 40],    color: '#4ade80', description: 'Liver Enzyme',         higherIsBetter: false },
  ast:              { label: 'AST',                unit: 'U/L',   normal: [10, 40],   color: '#34d399', description: 'Liver Enzyme',         higherIsBetter: false },
} as const

export type ParamKey = keyof typeof PARAMETERS

export function getStatus(param: ParamKey, value: number | null | undefined): 'normal' | 'warning' | 'high' | 'none' {
  if (value == null) return 'none'
  const p = PARAMETERS[param]
  const [nMin, nMax] = p.normal
  if (p.higherIsBetter) {
    if (value >= nMin) return 'normal'
    if (value >= nMin * 0.75) return 'warning'
    return 'high'
  }
  if (value >= nMin && value <= nMax) return 'normal'
  const excess = value / nMax
  if (excess <= 1.3) return 'warning'
  return 'high'
}

export const STATUS_COLORS = { normal: '#22c55e', warning: '#f59e0b', high: '#ef4444', none: '#334155' }
export const STATUS_LABELS = { normal: 'Normal', warning: 'Borderline', high: 'Abnormal', none: '—' }

export type Report = {
  id: string
  report_date: string
  source: string
  filename?: string
  [key: string]: any
}
