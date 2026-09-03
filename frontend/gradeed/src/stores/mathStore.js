import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createId } from '@/utils/id'
import {
  normalizeForComparison,
  normalizeText,
} from '@/utils/text'

import {
  ALL_TOPICS_COMPLETED,
  DATA_SCHEMA_VERSION,
} from '@/constants/app'

import {
  MASTER_TOPICS_MERGED,
} from '@/constants/topics'

import {
  loadStoredDataset,
  saveStoredDataset,
} from '@/services/storageService'

import { ensureTopicIds } from '@/utils/topic'

export const useMathStore = defineStore('math', () => {
  const initialized = ref(false)
  const loading = ref(false)
  const loadError = ref(null)
  const saveError = ref(null)

  const topics = ref([])
  const students = ref([])

  const progress = ref({})
  const startedAt = ref({})
  const timeSpent = ref({})
  const lastActivity = ref({})
  const completedAt = ref({})
  const subProgressBool = ref({})
  const testScores = ref({})
  const overallPointBase = ref({})
  const studentNotes = ref({})

  let saveTimer = null

  const studentCount = computed(() => students.value.length)
  const topicCount = computed(() => topics.value.length)

  const completedStudents = computed(() => {
    return students.value.filter(
      (student) =>
        progress.value[student.id] === ALL_TOPICS_COMPLETED,
    )
  })

  function createEmptyDataset() {
    return {
      schemaVersion: DATA_SCHEMA_VERSION,
      topics: ensureTopicIds(MASTER_TOPICS_MERGED),
      students: [],
      progress: {},
      startedAt: {},
      timeSpent: {},
      lastActivity: {},
      completedAt: {},
      subProgressBool: {},
      testScores: {},
      overallPointBase: {},
      studentNotes: {},
    }
  }
  function findTopicIndex(topicId) {
    return topics.value.findIndex((topic) => topic.id === topicId)
  }

  function getTopicById(topicId) {
    return topics.value.find((topic) => topic.id === topicId) || null
  }

  function getStudentById(studentId) {
    return (
      students.value.find((student) => student.id === studentId) ||
      null
    )
  }

  function addTopic(title) {
    const normalizedTitle = normalizeText(title)

    if (!normalizedTitle) {
      throw new Error('Topic name is required.')
    }

    if (normalizedTitle.length > 120) {
      throw new Error(
        'Topic name cannot exceed 120 characters.',
      )
    }

    const duplicate = topics.value.some(
      (topic) =>
        normalizeForComparison(topic.title) ===
        normalizeForComparison(normalizedTitle),
    )

    if (duplicate) {
      throw new Error('This topic already exists.')
    }

    const topic = {
      id: createId(),
      title: normalizedTitle,
      difficulty: Math.min(
        6,
        1 + Math.floor(topics.value.length / 10),
      ),
      subs: [],
    }

    topics.value = [...topics.value, topic]
    scheduleSave()

    return topic
  }

  function updateTopic(topicId, title) {
    const normalizedTitle = normalizeText(title)

    if (!normalizedTitle) {
      throw new Error('Topic name is required.')
    }

    if (normalizedTitle.length > 120) {
      throw new Error(
        'Topic name cannot exceed 120 characters.',
      )
    }

    const duplicate = topics.value.some(
      (topic) =>
        topic.id !== topicId &&
        normalizeForComparison(topic.title) ===
        normalizeForComparison(normalizedTitle),
    )

    if (duplicate) {
      throw new Error('This topic already exists.')
    }

    const topicIndex = findTopicIndex(topicId)

    if (topicIndex < 0) {
      throw new Error('Topic was not found.')
    }

    topics.value = topics.value.map((topic) =>
      topic.id === topicId
        ? {
          ...topic,
          title: normalizedTitle,
        }
        : topic,
    )

    scheduleSave()
  }

  function deleteTopic(topicId) {
    if (topics.value.length <= 1) {
      throw new Error('At least one topic is required.')
    }

    const topicIndex = findTopicIndex(topicId)

    if (topicIndex < 0) {
      throw new Error('Topic was not found.')
    }

    const remainingTopics = topics.value.filter(
      (topic) => topic.id !== topicId,
    )

    const replacementTopic =
      remainingTopics[topicIndex] ||
      remainingTopics[topicIndex - 1] ||
      null

    const nextProgress = { ...progress.value }

    for (const [studentId, currentTopicId] of Object.entries(
      nextProgress,
    )) {
      if (currentTopicId === topicId) {
        nextProgress[studentId] =
          replacementTopic?.id || ALL_TOPICS_COMPLETED
      }
    }

    function removeTopicRecord(source) {
      const output = {}

      for (const [studentId, topicRecords] of Object.entries(
        source || {},
      )) {
        const records = { ...(topicRecords || {}) }

        delete records[topicId]

        if (Object.keys(records).length) {
          output[studentId] = records
        }
      }

      return output
    }

    topics.value = remainingTopics
    progress.value = nextProgress

    subProgressBool.value = removeTopicRecord(
      subProgressBool.value,
    )

    completedAt.value = removeTopicRecord(completedAt.value)
    timeSpent.value = removeTopicRecord(timeSpent.value)
    testScores.value = removeTopicRecord(testScores.value)

    scheduleSave()
  }

  function moveTopic(topicId, newPosition) {
    const oldIndex = findTopicIndex(topicId)
    const targetIndex = Number(newPosition) - 1

    if (oldIndex < 0) {
      throw new Error('Topic was not found.')
    }

    if (
      !Number.isInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= topics.value.length
    ) {
      throw new Error(
        `Topic position must be between 1 and ${topics.value.length}.`,
      )
    }

    if (oldIndex === targetIndex) {
      return
    }

    const reorderedTopics = [...topics.value]
    const [movedTopic] = reorderedTopics.splice(oldIndex, 1)

    reorderedTopics.splice(targetIndex, 0, movedTopic)
    topics.value = reorderedTopics

    scheduleSave()
  }

  function addSubtopic(topicId, name) {
    const normalizedName = normalizeText(name)

    if (!normalizedName) {
      throw new Error('Subtopic name is required.')
    }

    if (normalizedName.length > 160) {
      throw new Error(
        'Subtopic name cannot exceed 160 characters.',
      )
    }

    const topic = getTopicById(topicId)

    if (!topic) {
      throw new Error('Topic was not found.')
    }

    const duplicate = topic.subs.some(
      (subtopic) =>
        normalizeForComparison(subtopic) ===
        normalizeForComparison(normalizedName),
    )

    if (duplicate) {
      throw new Error(
        'This subtopic already exists in this topic.',
      )
    }

    const newSubtopics = [...topic.subs, normalizedName]

    topics.value = topics.value.map((item) =>
      item.id === topicId
        ? {
          ...item,
          subs: newSubtopics,
        }
        : item,
    )

    const nextSubProgress = {
      ...subProgressBool.value,
    }

    for (const student of students.value) {
      const studentProgress = {
        ...(nextSubProgress[student.id] || {}),
      }

      const existing = Array.isArray(studentProgress[topicId])
        ? studentProgress[topicId]
        : []

      studentProgress[topicId] = Array.from(
        { length: newSubtopics.length },
        (_, index) => Boolean(existing[index]),
      )

      nextSubProgress[student.id] = studentProgress
    }

    subProgressBool.value = nextSubProgress
    scheduleSave()
  }

  function updateSubtopic(topicId, subtopicIndex, name) {
    const normalizedName = normalizeText(name)

    if (!normalizedName) {
      throw new Error('Subtopic name is required.')
    }

    if (normalizedName.length > 160) {
      throw new Error(
        'Subtopic name cannot exceed 160 characters.',
      )
    }

    const topic = getTopicById(topicId)

    if (!topic) {
      throw new Error('Topic was not found.')
    }

    if (
      subtopicIndex < 0 ||
      subtopicIndex >= topic.subs.length
    ) {
      throw new Error('Subtopic was not found.')
    }

    const duplicate = topic.subs.some(
      (subtopic, index) =>
        index !== subtopicIndex &&
        normalizeForComparison(subtopic) ===
        normalizeForComparison(normalizedName),
    )

    if (duplicate) {
      throw new Error(
        'This subtopic already exists in this topic.',
      )
    }

    const newSubtopics = [...topic.subs]
    newSubtopics[subtopicIndex] = normalizedName

    topics.value = topics.value.map((item) =>
      item.id === topicId
        ? {
          ...item,
          subs: newSubtopics,
        }
        : item,
    )

    scheduleSave()
  }

  function deleteSubtopic(topicId, subtopicIndex) {
    const topic = getTopicById(topicId)

    if (!topic) {
      throw new Error('Topic was not found.')
    }

    if (
      subtopicIndex < 0 ||
      subtopicIndex >= topic.subs.length
    ) {
      throw new Error('Subtopic was not found.')
    }

    const newSubtopics = [...topic.subs]
    newSubtopics.splice(subtopicIndex, 1)

    topics.value = topics.value.map((item) =>
      item.id === topicId
        ? {
          ...item,
          subs: newSubtopics,
        }
        : item,
    )

    const nextSubProgress = {
      ...subProgressBool.value,
    }

    for (const [studentId, studentRecord] of Object.entries(
      nextSubProgress,
    )) {
      const record = { ...studentRecord }

      if (Array.isArray(record[topicId])) {
        const checks = [...record[topicId]]
        checks.splice(subtopicIndex, 1)
        record[topicId] = checks
      }

      nextSubProgress[studentId] = record
    }

    subProgressBool.value = nextSubProgress
    scheduleSave()
  }

  function addStudent(name, edNo = '') {
    const normalizedName = normalizeText(name)
    const normalizedEdNo = normalizeText(edNo)

    if (!normalizedName) {
      throw new Error('Student name is required.')
    }

    if (normalizedName.length > 60) {
      throw new Error(
        'Student name cannot exceed 60 characters.',
      )
    }

    if (normalizedEdNo.length > 30) {
      throw new Error(
        'ED number cannot exceed 30 characters.',
      )
    }

    const duplicateName = students.value.some(
      (student) =>
        normalizeForComparison(student.name) ===
        normalizeForComparison(normalizedName),
    )

    if (duplicateName) {
      throw new Error('This student name already exists.')
    }

    const duplicateEdNo =
      normalizedEdNo &&
      students.value.some(
        (student) =>
          normalizeForComparison(student.edNo) ===
          normalizeForComparison(normalizedEdNo),
      )

    if (duplicateEdNo) {
      throw new Error(
        'This ED number belongs to another student.',
      )
    }

    const student = {
      id: createId(),
      name: normalizedName,
      edNo: normalizedEdNo,
    }

    const firstTopic = topics.value[0]
    const now = Date.now()

    students.value = [student, ...students.value]

    progress.value = {
      ...progress.value,
      [student.id]:
        firstTopic?.id || ALL_TOPICS_COMPLETED,
    }

    startedAt.value = {
      ...startedAt.value,
      [student.id]: now,
    }

    lastActivity.value = {
      ...lastActivity.value,
      [student.id]: now,
    }

    if (firstTopic) {
      subProgressBool.value = {
        ...subProgressBool.value,
        [student.id]: {
          [firstTopic.id]: Array.from(
            { length: firstTopic.subs.length },
            () => false,
          ),
        },
      }
    }

    scheduleSave()

    return student
  }

  function updateStudent(studentId, name, edNo = '') {
    const normalizedName = normalizeText(name)
    const normalizedEdNo = normalizeText(edNo)

    if (!normalizedName) {
      throw new Error('Student name is required.')
    }

    const duplicateName = students.value.some(
      (student) =>
        student.id !== studentId &&
        normalizeForComparison(student.name) ===
        normalizeForComparison(normalizedName),
    )

    if (duplicateName) {
      throw new Error('This student name already exists.')
    }

    const duplicateEdNo =
      normalizedEdNo &&
      students.value.some(
        (student) =>
          student.id !== studentId &&
          normalizeForComparison(student.edNo) ===
          normalizeForComparison(normalizedEdNo),
      )

    if (duplicateEdNo) {
      throw new Error(
        'This ED number belongs to another student.',
      )
    }

    students.value = students.value.map((student) =>
      student.id === studentId
        ? {
          ...student,
          name: normalizedName,
          edNo: normalizedEdNo,
        }
        : student,
    )

    scheduleSave()
  }

  function deleteStudent(studentId) {
    students.value = students.value.filter(
      (student) => student.id !== studentId,
    )

    const removeStudentRecord = (source) => {
      const output = { ...source }
      delete output[studentId]
      return output
    }

    progress.value = removeStudentRecord(progress.value)
    startedAt.value = removeStudentRecord(startedAt.value)
    timeSpent.value = removeStudentRecord(timeSpent.value)
    lastActivity.value = removeStudentRecord(
      lastActivity.value,
    )
    completedAt.value = removeStudentRecord(completedAt.value)

    subProgressBool.value = removeStudentRecord(
      subProgressBool.value,
    )

    testScores.value = removeStudentRecord(testScores.value)

    overallPointBase.value = removeStudentRecord(
      overallPointBase.value,
    )

    studentNotes.value = removeStudentRecord(
      studentNotes.value,
    )

    scheduleSave()
  }
  function normalizeObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }

    return value
  }

  function applyDataset(dataset) {
    const fallback = createEmptyDataset()

    topics.value =
      Array.isArray(dataset?.topics) && dataset.topics.length
        ? ensureTopicIds(dataset.topics)
        : fallback.topics

    students.value = Array.isArray(dataset?.students)
      ? dataset.students
        .filter(
          (student) =>
            student &&
            typeof student === 'object' &&
            student.id,
        )
        .map((student) => ({
          ...student,
          name: String(student.name ?? ''),
          edNo: String(student.edNo ?? ''),
        }))
      : []

    progress.value = normalizeObject(dataset?.progress)
    startedAt.value = normalizeObject(dataset?.startedAt)
    timeSpent.value = normalizeObject(dataset?.timeSpent)
    lastActivity.value = normalizeObject(dataset?.lastActivity)
    completedAt.value = normalizeObject(dataset?.completedAt)

    subProgressBool.value = normalizeObject(
      dataset?.subProgressBool,
    )

    testScores.value = normalizeObject(dataset?.testScores)

    overallPointBase.value = normalizeObject(
      dataset?.overallPointBase,
    )

    studentNotes.value = normalizeObject(dataset?.studentNotes)
  }

  function createDataset() {
    return {
      schemaVersion: DATA_SCHEMA_VERSION,
      topics: topics.value,
      students: students.value,
      progress: progress.value,
      startedAt: startedAt.value,
      timeSpent: timeSpent.value,
      lastActivity: lastActivity.value,
      completedAt: completedAt.value,
      subProgressBool: subProgressBool.value,
      testScores: testScores.value,
      overallPointBase: overallPointBase.value,
      studentNotes: studentNotes.value,
      exportedAt: new Date().toISOString(),
    }
  }

  function saveNow() {
    if (!initialized.value) {
      return false
    }

    saveError.value = null

    const saved = saveStoredDataset(createDataset())

    if (!saved) {
      saveError.value = 'Could not save MathApp data.'
    }

    return saved
  }
  function updateStudentNote(studentId, note) {
    const updatedNotes = {
      ...studentNotes.value,
    }

    const cleanedNote = String(note ?? '').trim()

    if (cleanedNote) {
      updatedNotes[studentId] = cleanedNote
    } else {
      delete updatedNotes[studentId]
    }

    studentNotes.value = updatedNotes
    scheduleSave()
  }
  function scheduleSave(delay = 350) {
    if (!initialized.value) {
      return
    }

    if (saveTimer) {
      window.clearTimeout(saveTimer)
    }

    saveTimer = window.setTimeout(() => {
      saveNow()
      saveTimer = null
    }, delay)
  }

  async function initialize() {
    if (initialized.value || loading.value) {
      return
    }

    loading.value = true
    loadError.value = null

    try {
      const stored = loadStoredDataset()

      if (stored?.dataset) {
        applyDataset(stored.dataset)
      } else {
        applyDataset(createEmptyDataset())
      }

      initialized.value = true

      /*
       * This saves the initial dataset under the current v100 key.
       * Full legacy schema migration will be added in Part 5.
       */
      saveNow()
    } catch (error) {
      console.error('MathApp initialization failed', error)

      loadError.value =
        error instanceof Error
          ? error.message
          : 'Could not initialize MathApp.'

      applyDataset(createEmptyDataset())
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    initialized,
    loading,
    loadError,
    saveError,

    topics,
    students,
    progress,
    startedAt,
    timeSpent,
    lastActivity,
    completedAt,
    subProgressBool,
    testScores,
    overallPointBase,
    studentNotes,

    studentCount,
    topicCount,
    completedStudents,

    initialize,
    createDataset,
    applyDataset,
    saveNow,
    scheduleSave,

    findTopicIndex,
    getTopicById,
    getStudentById,

    addTopic,
    updateTopic,
    deleteTopic,
    moveTopic,

    addSubtopic,
    updateSubtopic,
    deleteSubtopic,

    addStudent,
    updateStudent,
    deleteStudent,
    updateStudentNote
  }
})
