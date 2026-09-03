import { PASTELS } from '@/constants/app'
import { createId } from '@/utils/id'

export function colorForIndex(index) {
  return PASTELS[index % PASTELS.length]
}

export function getDifficultyLevel(topicIndex) {
  return Math.min(
    6,
    1 + Math.floor(Math.max(0, Number(topicIndex) || 0) / 10),
  )
}

export function getDifficultyLabel(level) {
  const labels = [
    'Beginner',
    'Basic',
    'Intermediate',
    'Advanced',
    'Challenging',
    'Expert',
  ]

  const index = Math.max(0, Math.min(5, Number(level) - 1))

  return labels[index] || 'Advanced'
}

export function ensureTopicIds(topics) {
  if (!Array.isArray(topics)) {
    return []
  }

  return topics.map((topic, index) => ({
    ...topic,
    id: topic.id || createId(),
    difficulty:
      Number(topic.difficulty) || getDifficultyLevel(index),
    subs: Array.isArray(topic.subs) ? [...topic.subs] : [],
  }))
}
