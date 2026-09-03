import { MASTER_TOPIC_ALIASES } from '@/constants/app'

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeForComparison(value) {
  return normalizeText(value).toLowerCase()
}

export function canonicalTopicTitle(title) {
  const normalized = normalizeForComparison(title)

  return MASTER_TOPIC_ALIASES[normalized] || normalizeText(title)
}

export function isSameText(first, second) {
  return normalizeForComparison(first) === normalizeForComparison(second)
}

export function containsText(value, query) {
  return normalizeForComparison(value).includes(
    normalizeForComparison(query),
  )
}

export function validateTopicName(value) {
  const name = normalizeText(value)

  if (!name) {
    return {
      valid: false,
      message: 'Topic name cannot be empty.',
    }
  }

  if (name.length > 120) {
    return {
      valid: false,
      message: 'Topic name is too long. Maximum length is 120 characters.',
    }
  }

  return {
    valid: true,
    value: name,
  }
}

export function validateSubtopicName(value) {
  const name = normalizeText(value)

  if (!name) {
    return {
      valid: false,
      message: 'Subtopic name cannot be empty.',
    }
  }

  if (name.length > 160) {
    return {
      valid: false,
      message: 'Subtopic name is too long. Maximum length is 160 characters.',
    }
  }

  return {
    valid: true,
    value: name,
  }
}
