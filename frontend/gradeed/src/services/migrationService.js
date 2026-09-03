import {
  ALL_TOPICS_COMPLETED,
  DATA_SCHEMA_VERSION,
} from '@/constants/app'

import { MASTER_TOPICS_MERGED } from '@/constants/topics'
import { ensureTopicIds } from '@/utils/topic'
import { normalizeForComparison } from '@/utils/text'

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function isNumericKey(key) {
  return /^\d+$/.test(String(key))
}

function normalizeOldTopics(topics) {
  if (!Array.isArray(topics)) {
    return []
  }

  return topics.map((topic) => {
    if (typeof topic === 'string') {
      return {
        title: topic,
        subs: [],
      }
    }

    return {
      ...topic,
      title: String(topic?.title ?? ''),
      subs: Array.isArray(topic?.subs) ? [...topic.subs] : [],
    }
  })
}

function findMergedTopicTitle(oldTitle) {
  const normalized = normalizeForComparison(oldTitle)

  const groups = [
    {
      title: 'Whole Numbers',
      sources: [
        'Addition and Subtraction of Whole Numbers',
        'Multiplication and Division of Whole Numbers',
      ],
    },
    {
      title: 'Fractions',
      sources: [
        'Fractions: Addition and Subtraction',
        'Fractions: Multiplication and Division',
      ],
    },
    {
      title: 'Decimals',
      sources: [
        'Introduction to Decimals',
        'Multiplication and Division of Decimals',
      ],
    },
  ]

  const group = groups.find((item) =>
    item.sources.some(
      (source) =>
        normalizeForComparison(source) === normalized,
    ),
  )

  return group?.title || oldTitle
}

function findMatchingMasterTopicIndex(oldTitle, masterTopics) {
  const targetTitle = normalizeForComparison(
    findMergedTopicTitle(oldTitle),
  )

  return masterTopics.findIndex(
    (topic) =>
      normalizeForComparison(topic.title) === targetTitle,
  )
}

/**
 * Converts very old datasets to the merged master-topic structure.
 * This is required for schema versions before 31.
 */
export function migrateDatasetToMaster(dataset) {
  const oldTopics = normalizeOldTopics(dataset?.topics)

  const masterTopics = ensureTopicIds(
    MASTER_TOPICS_MERGED.map((topic) => ({
      ...topic,
      subs: [...(topic.subs || [])],
    })),
  )

  const students = Array.isArray(dataset?.students)
    ? dataset.students
    : []

  const oldProgress = isObject(dataset?.progress)
    ? dataset.progress
    : {}

  const oldSubProgress = isObject(dataset?.subProgressBool)
    ? dataset.subProgressBool
    : {}

  const oldTimeSpent = isObject(dataset?.timeSpent)
    ? dataset.timeSpent
    : {}

  const oldStartedAt = isObject(dataset?.startedAt)
    ? dataset.startedAt
    : {}

  const oldCompletedAt = isObject(dataset?.completedAt)
    ? dataset.completedAt
    : {}

  const oldTestScores = isObject(dataset?.testScores)
    ? dataset.testScores
    : {}

  const progress = {}
  const startedAt = {}
  const timeSpent = {}
  const completedAt = {}
  const subProgressBool = {}
  const testScores = {}

  for (const student of students) {
    const studentId = student?.id

    if (!studentId) {
      continue
    }

    const studentSubProgress = {}
    let highestCompletedTopicIndex = -1

    for (
      let masterIndex = 0;
      masterIndex < masterTopics.length;
      masterIndex += 1
    ) {
      const masterTopic = masterTopics[masterIndex]
      const masterSubtopics = masterTopic.subs || []

      const result = Array.from(
        { length: masterSubtopics.length },
        () => false,
      )

      let hasProgress = false
      let totalMinutes = 0
      let latestCompletionTimestamp = null

      for (
        let oldIndex = 0;
        oldIndex < oldTopics.length;
        oldIndex += 1
      ) {
        const oldTopic = oldTopics[oldIndex]

        const matchingIndex = findMatchingMasterTopicIndex(
          oldTopic.title,
          masterTopics,
        )

        if (matchingIndex !== masterIndex) {
          continue
        }

        const oldStudentTopicProgress =
          oldSubProgress?.[studentId]?.[oldIndex]

        const oldSubtopicChecks = Array.isArray(
          oldStudentTopicProgress,
        )
          ? oldStudentTopicProgress
          : []

        for (
          let subIndex = 0;
          subIndex < masterSubtopics.length;
          subIndex += 1
        ) {
          const oldSubtopicIndex = oldTopic.subs.findIndex(
            (oldSubtopic) =>
              normalizeForComparison(oldSubtopic) ===
              normalizeForComparison(masterSubtopics[subIndex]),
          )

          if (
            oldSubtopicIndex >= 0 &&
            Boolean(oldSubtopicChecks[oldSubtopicIndex])
          ) {
            result[subIndex] = true
            hasProgress = true
          }
        }

        const oldCurrentIndex = Number(
          oldProgress[studentId] ?? 0,
        )

        if (
          oldIndex < oldCurrentIndex &&
          (!oldSubtopicChecks.length ||
            oldSubtopicChecks.every(Boolean))
        ) {
          for (
            let subIndex = 0;
            subIndex < masterSubtopics.length;
            subIndex += 1
          ) {
            const oldSubtopicIndex = oldTopic.subs.findIndex(
              (oldSubtopic) =>
                normalizeForComparison(oldSubtopic) ===
                normalizeForComparison(
                  masterSubtopics[subIndex],
                ),
            )

            if (
              oldSubtopicIndex >= 0 ||
              oldTopic.subs.length === 0
            ) {
              result[subIndex] = true
            }
          }

          hasProgress = true
        }

        totalMinutes += Number(
          oldTimeSpent?.[studentId]?.[oldIndex] || 0,
        )

        const completionTimestamp = Number(
          oldCompletedAt?.[studentId]?.[oldIndex] || 0,
        )

        if (
          completionTimestamp &&
          (!latestCompletionTimestamp ||
            completionTimestamp > latestCompletionTimestamp)
        ) {
          latestCompletionTimestamp = completionTimestamp
        }

        const oldTestKey = oldTopic.id || `topic-${oldIndex}`

        const tests = Array.isArray(
          oldTestScores?.[studentId]?.[oldTestKey],
        )
          ? oldTestScores[studentId][oldTestKey]
          : []

        if (tests.length) {
          if (!testScores[studentId]) {
            testScores[studentId] = {}
          }

          const targetTopicId = masterTopic.id

          testScores[studentId][targetTopicId] = [
            ...(testScores[studentId][targetTopicId] || []),
            ...tests,
          ]
        }
      }

      const matchingOldTopicCompleted = oldTopics.some(
        (oldTopic, oldIndex) =>
          findMatchingMasterTopicIndex(
            oldTopic.title,
            masterTopics,
          ) === masterIndex &&
          oldIndex < Number(oldProgress[studentId] ?? 0),
      )

      const topicComplete = result.length
        ? result.every(Boolean)
        : matchingOldTopicCompleted

      if (hasProgress || result.length) {
        studentSubProgress[masterTopic.id] = result
      }

      if (topicComplete) {
        highestCompletedTopicIndex = masterIndex

        studentSubProgress[masterTopic.id] = Array.from(
          { length: masterSubtopics.length },
          () => true,
        )
      }

      if (totalMinutes > 0) {
        if (!timeSpent[studentId]) {
          timeSpent[studentId] = {}
        }

        timeSpent[studentId][masterTopic.id] = totalMinutes
      }

      if (latestCompletionTimestamp) {
        if (!completedAt[studentId]) {
          completedAt[studentId] = {}
        }

        completedAt[studentId][masterTopic.id] =
          latestCompletionTimestamp
      }
    }

    const nextTopicIndex = highestCompletedTopicIndex + 1

    progress[studentId] =
      nextTopicIndex >= masterTopics.length
        ? ALL_TOPICS_COMPLETED
        : masterTopics[Math.max(0, nextTopicIndex)]?.id ||
        ALL_TOPICS_COMPLETED

    if (Object.keys(studentSubProgress).length) {
      subProgressBool[studentId] = studentSubProgress
    }

    if (oldStartedAt[studentId] !== undefined) {
      startedAt[studentId] = oldStartedAt[studentId]
    }
  }

  return {
    ...dataset,
    schemaVersion: DATA_SCHEMA_VERSION,
    topics: masterTopics,
    students,
    progress,
    startedAt,
    timeSpent,
    lastActivity: isObject(dataset?.lastActivity)
      ? dataset.lastActivity
      : {},
    completedAt,
    subProgressBool,
    testScores,
    overallPointBase: isObject(dataset?.overallPointBase)
      ? dataset.overallPointBase
      : {},
    studentNotes: isObject(dataset?.studentNotes)
      ? dataset.studentNotes
      : {},
  }
}

/**
 * Converts numeric topic keys into stable topic IDs.
 */
function remapTopicRecord(source, topics) {
  const output = {}

  for (const [studentId, record] of Object.entries(
    source || {},
  )) {
    if (!isObject(record)) {
      continue
    }

    const studentRecord = {}

    for (const [key, value] of Object.entries(record)) {
      const topicId = isNumericKey(key)
        ? topics[Number(key)]?.id
        : key

      const topicExists = topics.some(
        (topic) => topic.id === topicId,
      )

      if (topicId && topicExists) {
        studentRecord[topicId] = value
      }
    }

    if (Object.keys(studentRecord).length) {
      output[studentId] = studentRecord
    }
  }

  return output
}

/**
 * Converts progress values and topic-keyed records to IDs.
 */
export function migrateToTopicIds(dataset) {
  const topics = ensureTopicIds(
    dataset?.topics || MASTER_TOPICS_MERGED,
  )

  const migratedProgress = {}

  for (const [studentId, value] of Object.entries(
    dataset?.progress || {},
  )) {
    if (value === ALL_TOPICS_COMPLETED) {
      migratedProgress[studentId] = ALL_TOPICS_COMPLETED
      continue
    }

    const numericValue = Number(value)

    if (
      value !== '' &&
      Number.isInteger(numericValue) &&
      String(value).trim() !== ''
    ) {
      migratedProgress[studentId] =
        numericValue >= topics.length
          ? ALL_TOPICS_COMPLETED
          : topics[numericValue]?.id ||
          ALL_TOPICS_COMPLETED

      continue
    }

    if (topics.some((topic) => topic.id === value)) {
      migratedProgress[studentId] = value
    } else {
      migratedProgress[studentId] =
        topics[0]?.id || ALL_TOPICS_COMPLETED
    }
  }

  return {
    ...dataset,
    schemaVersion: DATA_SCHEMA_VERSION,
    topics,
    progress: migratedProgress,
    subProgressBool: remapTopicRecord(
      dataset?.subProgressBool,
      topics,
    ),
    completedAt: remapTopicRecord(
      dataset?.completedAt,
      topics,
    ),
    timeSpent: remapTopicRecord(
      dataset?.timeSpent,
      topics,
    ),
    testScores: remapTopicRecord(
      dataset?.testScores,
      topics,
    ),
  }
}

/**
 * Repairs subtopic arrays so their sizes match their topics.
 */
export function normalizeSubProgressToTopicIds(
  source,
  topics,
) {
  const output = {}

  for (const [studentId, record] of Object.entries(
    source || {},
  )) {
    if (!isObject(record)) {
      continue
    }

    const studentRecord = {}

    for (const [key, value] of Object.entries(record)) {
      const topicId = isNumericKey(key)
        ? topics[Number(key)]?.id
        : key

      const topic = topics.find(
        (item) => item.id === topicId,
      )

      if (!topic || !Array.isArray(value)) {
        continue
      }

      const requiredLength = topic.subs?.length || 0

      const normalizedProgress = Array.from(
        { length: requiredLength },
        (_, index) => Boolean(value[index]),
      )

      if (!studentRecord[topicId]) {
        studentRecord[topicId] = normalizedProgress
      } else {
        studentRecord[topicId] = Array.from(
          { length: requiredLength },
          (_, index) =>
            Boolean(
              studentRecord[topicId][index] ||
              normalizedProgress[index],
            ),
        )
      }
    }

    if (Object.keys(studentRecord).length) {
      output[studentId] = studentRecord
    }
  }

  return output
}

export function normalizeDatasetForCurrentSchema(dataset) {
  const topics = ensureTopicIds(
    dataset?.topics || MASTER_TOPICS_MERGED,
  )

  return {
    ...dataset,
    schemaVersion: DATA_SCHEMA_VERSION,
    topics,
    students: Array.isArray(dataset?.students)
      ? dataset.students
      : [],
    progress: isObject(dataset?.progress)
      ? dataset.progress
      : {},
    startedAt: isObject(dataset?.startedAt)
      ? dataset.startedAt
      : {},
    timeSpent: isObject(dataset?.timeSpent)
      ? dataset.timeSpent
      : {},
    lastActivity: isObject(dataset?.lastActivity)
      ? dataset.lastActivity
      : {},
    completedAt: isObject(dataset?.completedAt)
      ? dataset.completedAt
      : {},
    testScores: isObject(dataset?.testScores)
      ? dataset.testScores
      : {},
    overallPointBase: isObject(dataset?.overallPointBase)
      ? dataset.overallPointBase
      : {},
    studentNotes: isObject(dataset?.studentNotes)
      ? dataset.studentNotes
      : {},
    subProgressBool: normalizeSubProgressToTopicIds(
      dataset?.subProgressBool,
      topics,
    ),
  }
}

/**
 * Main migration entry point.
 */
export function migrateDataset(dataset) {
  const oldSchemaVersion = Number(dataset?.schemaVersion) || 0

  const masterMigrated =
    oldSchemaVersion < 31
      ? migrateDatasetToMaster(dataset)
      : dataset

  const idMigrated = migrateToTopicIds(masterMigrated)

  return normalizeDatasetForCurrentSchema(idMigrated)
}
