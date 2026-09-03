import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
} from '@/constants/app'

export function findStoredDataset() {
  const currentData = localStorage.getItem(STORAGE_KEY)

  if (currentData) {
    return {
      key: STORAGE_KEY,
      raw: currentData,
      legacy: false,
    }
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key)

    if (raw) {
      return {
        key,
        raw,
        legacy: true,
      }
    }
  }

  return null
}

export function loadStoredDataset() {
  const stored = findStoredDataset()

  if (!stored) {
    return null
  }

  try {
    const dataset = JSON.parse(stored.raw)

    if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) {
      throw new Error('Invalid MathApp data')
    }

    return {
      ...stored,
      dataset,
    }
  } catch (error) {
    console.error('Could not read MathApp data', error)
    return null
  }
}

export function saveStoredDataset(dataset) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(dataset),
    )

    return true
  } catch (error) {
    console.error('Could not save MathApp data', error)
    return false
  }
}

export function removeStoredDataset() {
  localStorage.removeItem(STORAGE_KEY)
}
