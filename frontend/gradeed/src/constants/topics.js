import { PASTELS } from '@/constants/app'
import { MERGED_TOPIC_GROUPS } from '@/constants/app'
import { createId } from '@/utils/id'
import {
  isSameText,
  normalizeForComparison,
} from '@/utils/text'
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
export const MASTER_TOPICS = [
  {
    title: 'Addition and Subtraction of Whole Numbers',
    subs: [
      'Addition of whole numbers',
      'Subtraction of whole numbers',
      'Mixed addition and subtraction',
      'Approximation to the nearest 10, 100, ...',
      'Obtaining approximate answers',
      'Using calculators',
    ],
  },

  {
    title: 'Multiplication and Division of Whole Numbers',
    subs: [
      'Multiplication by 10, 100, ...',
      'Long multiplication',
      'Using a calculator for long multiplication',
      'Short division',
      'Long division',
      'Mixed operations of +, −, ×, ÷',
      'Using brackets',
      'Number patterns',
    ],
  },

  // Paste all remaining MASTER_TOPICS objects here.
]
function mergeMasterTopics(masterTopics) {
  const consumedIndexes = new Set()
  const mergedTopics = []

  for (const group of MERGED_TOPIC_GROUPS) {
    const sourceTopics = group.sourceTitles
      .map((sourceTitle) =>
        masterTopics.find((topic) =>
          isSameText(topic.title, sourceTitle),
        ),
      )
      .filter(Boolean)

    const subtopics = []

    for (const sourceTopic of sourceTopics) {
      for (const subtopic of sourceTopic.subs || []) {
        const duplicate = subtopics.some(
          (existingSubtopic) =>
            normalizeForComparison(existingSubtopic) ===
            normalizeForComparison(subtopic),
        )

        if (!duplicate) {
          subtopics.push(subtopic)
        }
      }
    }

    mergedTopics.push({
      id: createId(),
      title: group.title,
      difficulty: Number(sourceTopics[0]?.difficulty) || 1,
      subs: subtopics,
    })

    for (const sourceTitle of group.sourceTitles) {
      const sourceIndex = masterTopics.findIndex((topic) =>
        isSameText(topic.title, sourceTitle),
      )

      if (sourceIndex >= 0) {
        consumedIndexes.add(sourceIndex)
      }
    }
  }

  masterTopics.forEach((topic, index) => {
    if (consumedIndexes.has(index)) {
      return
    }

    mergedTopics.push({
      ...topic,
      id: topic.id || createId(),
      subs: Array.isArray(topic.subs) ? [...topic.subs] : [],
    })
  })

  return mergedTopics
}
export const MASTER_TOPICS_MERGED =
  mergeMasterTopics(MASTER_TOPICS)

