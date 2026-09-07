import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createId } from '@/utils/id'
import { topicApi } from '@/services/topicApi'
import { studentApi } from '@/services/studentApi'
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
  function mapTopicResponse(topic) {
    const backendSubtopics = Array.isArray(topic.subtopics)
      ? topic.subtopics
      : []

    return {
      id: topic.id,
      title: topic.title,
      displayOrder: topic.displayOrder,
      difficulty: Number(topic.difficulty) || 1,

      /*
       * Existing Vue components expect subs to be strings.
       * subtopicIds keeps the matching PostgreSQL IDs.
       */
      subs: backendSubtopics.map(
        (subtopic) => subtopic.title,
      ),

      subtopicIds: backendSubtopics.map(
        (subtopic) => subtopic.id,
      ),
    }
  }
  async function loadTopics() {
    const response = await topicApi.findAll()

    topics.value = response.map(mapTopicResponse)

    return topics.value
  }

  async function loadStudents() {
    const response = await studentApi.findAll()

    students.value = response.map(mapStudentResponse)

    return students.value
  }

  async function loadCoreData() {
    const results = await Promise.all([
      topicApi.findAll(),
      studentApi.findAll(),
    ])

    topics.value = results[0].map(mapTopicResponse)
    students.value = results[1].map(mapStudentResponse)
  }
  function mapStudentResponse(student) {
    return {
      id: student.id,
      name: student.name,
      edNo: student.edNo || '',
      overallPointBase:
        Number(student.overallPointBase) || 0,
      lastActivityAt: student.lastActivityAt || null,
      createdAt: student.createdAt || null,
      updatedAt: student.updatedAt || null,
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
  async function addTopic(title) {
    const normalizedTitle = normalizeText(title)

    if (!normalizedTitle) {
      throw new Error('Topic name is required.')
    }

    if (normalizedTitle.length > 120) {
      throw new Error(
        'Topic name cannot exceed 120 characters.',
      )
    }

    const created = await topicApi.create({
      title: normalizedTitle,
      difficulty: Math.min(
        6,
        1 + Math.floor(topics.value.length / 10),
      ),
    })

    await loadTopics()

    return mapTopicResponse(created)
  }

  async function updateTopic(topicId, title) {
    const topic = getTopicById(topicId)

    if (!topic) {
      throw new Error('Topic was not found.')
    }

    const normalizedTitle = normalizeText(title)

    if (!normalizedTitle) {
      throw new Error('Topic name is required.')
    }

    await topicApi.update(topicId, {
      title: normalizedTitle,
      difficulty: topic.difficulty,
    })

    await loadTopics()
  }

  async function deleteTopic(topicId) {
    await topicApi.delete(topicId)
    await loadTopics()
  }

  async function moveTopic(topicId, newPosition) {
    const position = Number(newPosition)

    if (!Number.isInteger(position)) {
      throw new Error('Invalid topic position.')
    }

    await topicApi.move(topicId, position)
    await loadTopics()
  }

  async function addSubtopic(topicId, name) {
    const normalizedName = normalizeText(name)

    if (!normalizedName) {
      throw new Error('Subtopic name is required.')
    }

    await topicApi.addSubtopic(topicId, {
      title: normalizedName,
    })

    await loadTopics()
  }

  async function updateSubtopic(
    topicId,
    subtopicIndex,
    name,
  ) {
    const topic = getTopicById(topicId)

    if (!topic) {
      throw new Error('Topic was not found.')
    }

    const subtopicId =
      topic.subtopicIds?.[subtopicIndex]

    if (!subtopicId) {
      throw new Error('Subtopic was not found.')
    }

    const normalizedName = normalizeText(name)

    if (!normalizedName) {
      throw new Error('Subtopic name is required.')
    }

    await topicApi.updateSubtopic(
      topicId,
      subtopicId,
      {
        title: normalizedName,
      },
    )

    await loadTopics()
  }

  async function deleteSubtopic(
    topicId,
    subtopicIndex,
  ) {
    const topic = getTopicById(topicId)

    if (!topic) {
      throw new Error('Topic was not found.')
    }

    const subtopicId =
      topic.subtopicIds?.[subtopicIndex]

    if (!subtopicId) {
      throw new Error('Subtopic was not found.')
    }

    await topicApi.deleteSubtopic(
      topicId,
      subtopicId,
    )

    await loadTopics()
  }

  async function addStudent(name, edNo = '') {
    const normalizedName = normalizeText(name)
    const normalizedEdNo = normalizeText(edNo)

    if (!normalizedName) {
      throw new Error('Student name is required.')
    }

    const created = await studentApi.create({
      name: normalizedName,
      edNo: normalizedEdNo || null,
    })

    await loadStudents()

    return mapStudentResponse(created)
  }

  async function updateStudent(
    studentId,
    name,
    edNo = '',
  ) {
    const normalizedName = normalizeText(name)
    const normalizedEdNo = normalizeText(edNo)

    if (!normalizedName) {
      throw new Error('Student name is required.')
    }

    await studentApi.update(studentId, {
      name: normalizedName,
      edNo: normalizedEdNo || null,
    })

    await loadStudents()
  }

  async function deleteStudent(studentId) {
    await studentApi.delete(studentId)
    await loadStudents()

    /*
     * Remove browser-only state until progress is connected
     * to PostgreSQL in Part 8B.
     */
    const stateObjects = [
      progress,
      startedAt,
      timeSpent,
      lastActivity,
      completedAt,
      subProgressBool,
      testScores,
      overallPointBase,
      studentNotes,
    ]

    stateObjects.forEach((stateRef) => {
      const copy = { ...stateRef.value }
      delete copy[studentId]
      stateRef.value = copy
    })
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
      await loadCoreData()

      /*
       * Progress, tests, and notes are still temporarily
       * loaded from localStorage until Part 8B and 8C.
       */
      const stored = loadStoredDataset()

      if (stored?.dataset) {
        const dataset = stored.dataset

        progress.value = normalizeObject(dataset.progress)
        startedAt.value = normalizeObject(dataset.startedAt)
        timeSpent.value = normalizeObject(dataset.timeSpent)
        lastActivity.value = normalizeObject(
          dataset.lastActivity,
        )
        completedAt.value = normalizeObject(
          dataset.completedAt,
        )
        subProgressBool.value = normalizeObject(
          dataset.subProgressBool,
        )
        testScores.value = normalizeObject(
          dataset.testScores,
        )
        overallPointBase.value = normalizeObject(
          dataset.overallPointBase,
        )
        studentNotes.value = normalizeObject(
          dataset.studentNotes,
        )
      }

      initialized.value = true
    } catch (error) {
      console.error(
        'MathApp initialization failed',
        error,
      )

      loadError.value =
        error instanceof Error
          ? error.message
          : 'Could not connect to the backend.'

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
    mapTopicResponse,
    mapStudentResponse,
    loadTopics,
    loadStudents,
    loadCoreData,
    addStudent,
    updateStudent,
    deleteStudent,
    updateStudentNote
  }
})
