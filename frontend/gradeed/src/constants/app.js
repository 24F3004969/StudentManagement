export const APP_VERSION = 'v100'
export const DATA_SCHEMA_VERSION = 34

export const STORAGE_KEY = 'math-topic-progress-tracker:v100'

export const LEGACY_STORAGE_KEYS = [
  'math-topic-progress-tracker:v23',
  'math-topic-progress-tracker:v22',
  'math-topic-progress-tracker:v21',
]

export const ALL_TOPICS_COMPLETED = '__ALL_COMPLETED__'

export const STALE_DAYS = 14

export const MASTER_TOPIC_ALIASES = {
  areas: 'Area',
  'ratio and proportion': 'Ratio',
  'sine and cosine of an angle': 'Trigonometry',
  averages: 'Statistics',
  'volumes: constant cross-section': 'Volume',
  'inverse and square matrices': 'Matrices',
}

export const MERGED_TOPIC_GROUPS = [
  {
    title: 'Whole Numbers',
    sourceTitles: [
      'Addition and Subtraction of Whole Numbers',
      'Multiplication and Division of Whole Numbers',
    ],
  },
  {
    title: 'Fractions',
    sourceTitles: [
      'Fractions: Addition and Subtraction',
      'Fractions: Multiplication and Division',
    ],
  },
  {
    title: 'Decimals',
    sourceTitles: [
      'Introduction to Decimals',
      'Multiplication and Division of Decimals',
    ],
  },
]

export const PASTELS = [
  ['#e0f2fe', '#075985'],
  ['#fef3c7', '#92400e'],
  ['#ede9fe', '#5b21b6'],
  ['#dcfce7', '#166534'],
  ['#ffe4e6', '#9f1239'],
  ['#f3e8ff', '#6b21a8'],
  ['#e0e7ff', '#3730a3'],
  ['#ffedd5', '#9a3412'],
  ['#cffafe', '#164e63'],
  ['#d1fae5', '#065f46'],
  ['#fae8ff', '#6b21a8'],
  ['#fde68a', '#854d0e'],
  ['#fecaca', '#7f1d1d'],
  ['#e9d5ff', '#4c1d95'],
  ['#bae6fd', '#075985'],
  ['#bbf7d0', '#14532d'],
  ['#ffe4e1', '#8b1d1d'],
  ['#fef9c3', '#713f12'],
  ['#e2e8f0', '#334155'],
  ['#f1f5f9', '#0f172a'],
]
