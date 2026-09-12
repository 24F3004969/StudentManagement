import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {progressApi} from '@/services/progressApi'
import {topicApi} from '@/services/topicApi'
import {studentApi} from '@/services/studentApi'
import {normalizeText,} from '@/utils/text'
import { testApi } from '@/services/testApi'
import { noteApi } from '@/services/noteApi'
import {ALL_TOPICS_COMPLETED, DATA_SCHEMA_VERSION,} from '@/constants/app'

import {MASTER_TOPICS_MERGED,} from '@/constants/topics'



import {ensureTopicIds} from '@/utils/topic'

export const useMathStore = defineStore('math', () => {
  const initialized = ref(false)
  const loading = ref(false)
  const loadError = ref(null)
  const saveError = ref(null)
  const progressLoading = ref(false)
  const progressError = ref(null)
  const topics = ref([])
  const students = ref([])
  const testsLoading = ref(false)
  const notesLoading = ref(false)

  const testsError = ref(null)
  const notesError = ref(null)
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
  function mapTestResponse(test) {
    return {
      id: test.id,
      testNumber: Number(test.testNumber),
      score:
        test.score === null || test.score === undefined
          ? ''
          : String(test.score),

      max:
        test.maximumScore === null ||
        test.maximumScore === undefined
          ? ''
          : String(test.maximumScore),

      date: test.testDate || '',
      remark: test.remark || '',
      points: Number(test.awardedPoints) || 0,
      percentage:
        test.percentage === null ||
        test.percentage === undefined
          ? null
          : Number(test.percentage),
    }
  }
  function applyStudentProgressResponse(response) {
    if (!response?.studentId) {
      return
    }

    const studentId = response.studentId
    const topicRows = Array.isArray(response.topics)
      ? response.topics
      : []

    const studentSubProgress = {}
    const studentTimeSpent = {}
    const studentCompletedAt = {}

    let activeTopicId = null
    let activeStartedAt = null

    topicRows.forEach((topicRow) => {
      const topicId = topicRow.topicId

      if (!topicId) {
        return
      }

      const subtopics = Array.isArray(topicRow.subtopics)
        ? topicRow.subtopics
        : []

      studentSubProgress[topicId] = subtopics.map(
        (subtopic) => Boolean(subtopic.completed),
      )

      studentTimeSpent[topicId] =
        Number(topicRow.timeSpentMinutes) || 0

      if (topicRow.completedAt) {
        studentCompletedAt[topicId] = new Date(
          topicRow.completedAt,
        ).getTime()
      }

      if (
        topicRow.status === 'IN_PROGRESS' &&
        !activeTopicId
      ) {
        activeTopicId = topicId

        activeStartedAt = topicRow.startedAt
          ? new Date(topicRow.startedAt).getTime()
          : null
      }
    })

    if (!activeTopicId && response.currentTopicId) {
      activeTopicId = response.currentTopicId

      const currentRow = topicRows.find(
        (topicRow) =>
          topicRow.topicId === response.currentTopicId,
      )

      activeStartedAt = currentRow?.startedAt
        ? new Date(currentRow.startedAt).getTime()
        : null
    }

    const updatedProgress = { ...progress.value }

    if (response.allTopicsCompleted) {
      updatedProgress[studentId] =
        ALL_TOPICS_COMPLETED
    } else {
      updatedProgress[studentId] =
        activeTopicId ||
        response.currentTopicId ||
        topics.value[0]?.id ||
        ALL_TOPICS_COMPLETED
    }

    progress.value = updatedProgress

    const updatedSubProgress = {
      ...subProgressBool.value,
    }

    updatedSubProgress[studentId] =
      studentSubProgress

    subProgressBool.value = updatedSubProgress

    const updatedTimeSpent = {
      ...timeSpent.value,
    }

    updatedTimeSpent[studentId] =
      studentTimeSpent

    timeSpent.value = updatedTimeSpent

    const updatedCompletedAt = {
      ...completedAt.value,
    }

    if (Object.keys(studentCompletedAt).length) {
      updatedCompletedAt[studentId] =
        studentCompletedAt
    } else {
      delete updatedCompletedAt[studentId]
    }

    completedAt.value = updatedCompletedAt

    const updatedStartedAt = {
      ...startedAt.value,
    }

    if (
      activeTopicId &&
      Number.isFinite(activeStartedAt)
    ) {
      updatedStartedAt[studentId] =
        activeStartedAt
    } else {
      delete updatedStartedAt[studentId]
    }

    startedAt.value = updatedStartedAt

    const updatedLastActivity = {
      ...lastActivity.value,
    }

    if (response.lastActivityAt) {
      updatedLastActivity[studentId] = new Date(
        response.lastActivityAt,
      ).getTime()
    } else {
      delete updatedLastActivity[studentId]
    }

    lastActivity.value = updatedLastActivity

    const studentIndex = students.value.findIndex(
      (student) => student.id === studentId,
    )

    if (studentIndex >= 0) {
      const updatedStudents = [...students.value]

      updatedStudents[studentIndex] = {
        ...updatedStudents[studentIndex],
        lastActivityAt:
          response.lastActivityAt || null,
      }

      students.value = updatedStudents
    }
  }
  async function loadStudentProgress(studentId) {
    progressError.value = null

    try {
      const response =
        await progressApi.findByStudent(studentId)

      applyStudentProgressResponse(response)

      return response
    } catch (error) {
      console.error(
        `Could not load progress for student ${studentId}`,
        error,
      )

      progressError.value =
        error instanceof Error
          ? error.message
          : 'Could not load student progress.'

      throw error
    }
  }
  async function loadAllStudentProgress() {
    progressLoading.value = true
    progressError.value = null

    try {
      const requests = students.value.map((student) => {
        return progressApi.findByStudent(student.id)
      })

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        applyStudentProgressResponse(response)
      })

      return responses
    } catch (error) {
      console.error(
        'Could not load student progress',
        error,
      )

      progressError.value =
        error instanceof Error
          ? error.message
          : 'Could not load student progress.'

      throw error
    } finally {
      progressLoading.value = false
    }
  }
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
    synchronizeOverallPointBase()
    return students.value
  }

  async function loadCoreData() {
    const results = await Promise.all([
      topicApi.findAll(),
      studentApi.findAll(),
    ])

    topics.value = results[0].map(mapTopicResponse)
    students.value = results[1].map(mapStudentResponse)

    synchronizeOverallPointBase()

    const backgroundResults =
      await Promise.allSettled([
        loadAllStudentProgress(),
        loadAllStudentTests(),
        loadAllStudentNotes(),
      ])

    backgroundResults.forEach((result) => {
      if (result.status === 'rejected') {
        console.error(
          'A student-data section failed to load',
          result.reason,
        )
      }
    })
  }
  async function updateOverallPointBase(
    studentId,
    basePoints,
  ) {
    const numericPoints = Math.max(
      0,
      Math.round(Number(basePoints) || 0),
    )

    const response =
      await studentApi.updateOverallPoints(
        studentId,
        numericPoints,
      )

    const mappedStudent =
      mapStudentResponse(response)

    students.value = students.value.map((student) => {
      if (student.id === studentId) {
        return mappedStudent
      }

      return student
    })

    const updatedBase = {
      ...overallPointBase.value,
    }

    updatedBase[studentId] =
      mappedStudent.overallPointBase

    overallPointBase.value = updatedBase

    return mappedStudent
  }
  function mapStudentResponse(student) {
    return {
      id: student.id,
      name: student.name,
      edNo: student.edNo || '',
      overallPointBase:
        Number(student.overallPointBase) || 0,
      lastActivityAt:
        student.lastActivityAt || null,
      createdAt: student.createdAt || null,
      updatedAt: student.updatedAt || null,
    }
  }
  function synchronizeOverallPointBase() {
    const updatedBase = {}

    students.value.forEach((student) => {
      updatedBase[student.id] =
        Number(student.overallPointBase) || 0
    })

    overallPointBase.value = updatedBase
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
    await loadAllStudentProgress()
  }

  async function moveTopic(topicId, newPosition) {
    const position = Number(newPosition)

    if (!Number.isInteger(position)) {
      throw new Error('Invalid topic position.')
    }

    await topicApi.move(topicId, position)
    await loadTopics()
    await loadAllStudentProgress()
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
    await loadStudentProgress(created.id)
    await loadStudentTests(created.id)
    await loadStudentNote(created.id)
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
  async function loadStudentTests(studentId) {
    testsError.value = null

    try {
      const response = await testApi.findAll(studentId)

      applyStudentTests(studentId, response)

      return response
    } catch (error) {
      console.error(
        `Could not load tests for student ${studentId}`,
        error,
      )

      testsError.value =
        error instanceof Error
          ? error.message
          : 'Could not load student tests.'

      throw error
    }
  }
  async function loadAllStudentTests() {
    testsLoading.value = true
    testsError.value = null

    try {
      const responses = await Promise.all(
        students.value.map(async (student) => {
          const tests = await testApi.findAll(student.id)

          return {
            studentId: student.id,
            tests,
          }
        }),
      )

      responses.forEach((result) => {
        applyStudentTests(
          result.studentId,
          result.tests,
        )
      })
    } catch (error) {
      console.error(
        'Could not load student tests',
        error,
      )

      testsError.value =
        error instanceof Error
          ? error.message
          : 'Could not load student tests.'

      throw error
    } finally {
      testsLoading.value = false
    }
  }
  async function loadStudentNote(studentId) {
    notesError.value = null

    try {
      const response =
        await noteApi.findByStudent(studentId)

      const updatedNotes = {
        ...studentNotes.value,
      }

      const note = String(response?.note || '')

      if (note.trim()) {
        updatedNotes[studentId] = note
      } else {
        delete updatedNotes[studentId]
      }

      studentNotes.value = updatedNotes

      return note
    } catch (error) {
      console.error(
        `Could not load note for student ${studentId}`,
        error,
      )

      notesError.value =
        error instanceof Error
          ? error.message
          : 'Could not load the student note.'

      throw error
    }
  }

  async function loadAllStudentNotes() {
    notesLoading.value = true
    notesError.value = null

    try {
      const responses = await Promise.all(
        students.value.map(async (student) => {
          const response =
            await noteApi.findByStudent(student.id)

          return {
            studentId: student.id,
            note: String(response?.note || ''),
          }
        }),
      )

      const updatedNotes = {}

      responses.forEach((result) => {
        if (result.note.trim()) {
          updatedNotes[result.studentId] =
            result.note
        }
      })

      studentNotes.value = updatedNotes
    } catch (error) {
      console.error(
        'Could not load student notes',
        error,
      )

      notesError.value =
        error instanceof Error
          ? error.message
          : 'Could not load student notes.'

      throw error
    } finally {
      notesLoading.value = false
    }
  }


  async function deleteStudent(studentId) {
    await studentApi.delete(studentId)
    await loadStudents()

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
  async function updateStudentNote(studentId, note) {
    const cleanedNote = String(note || '').trim()

    if (cleanedNote.length > 2000) {
      throw new Error(
        'Student note cannot exceed 2000 characters.',
      )
    }

    if (cleanedNote) {
      const response = await noteApi.save(
        studentId,
        cleanedNote,
      )

      const updatedNotes = {
        ...studentNotes.value,
      }

      updatedNotes[studentId] =
        response?.note || cleanedNote

      studentNotes.value = updatedNotes

      return response
    }

    await noteApi.delete(studentId)

    const updatedNotes = {
      ...studentNotes.value,
    }

    delete updatedNotes[studentId]
    studentNotes.value = updatedNotes

    return null
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
  function applyStudentTests(studentId, testResults) {
    const results = Array.isArray(testResults)
      ? testResults
      : []

    const studentTopicTests = {}

    results.forEach((test) => {
      if (!test.topicId) {
        return
      }

      if (!studentTopicTests[test.topicId]) {
        studentTopicTests[test.topicId] = []
      }

      studentTopicTests[test.topicId].push(
        mapTestResponse(test),
      )
    })

    Object.keys(studentTopicTests).forEach((topicId) => {
      studentTopicTests[topicId].sort(
        (first, second) =>
          first.testNumber - second.testNumber,
      )
    })

    const updatedScores = {
      ...testScores.value,
    }

    updatedScores[studentId] = studentTopicTests
    testScores.value = updatedScores
  }
  async function initialize() {
    if (initialized.value || loading.value) {
      return
    }

    loading.value = true
    loadError.value = null

    try {
      await loadCoreData()
      initialized.value = true
    } catch (error) {
      console.error(
        'MathApp initialization failed',
        error,
      )

      loadError.value =
        error instanceof Error
          ? error.message
          : 'Could not connect to the server.'

      initialized.value = false
    } finally {
      loading.value = false
    }
  }
  async function retryInitialization() {
    initialized.value = false
    loading.value = false

    await initialize()
  }
  return {
    // Existing state
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
    retryInitialization,
    // Existing computed values
    studentCount,
    topicCount,
    completedStudents,

    // Backend loading states
    progressLoading,
    progressError,
    testsLoading,
    testsError,
    notesLoading,
    notesError,

    // Existing initialization methods
    initialize,
    loadCoreData,
    loadTopics,
    loadStudents,

    // Progress methods
    applyStudentProgressResponse,
    loadStudentProgress,
    loadAllStudentProgress,

    // Test methods
    mapTestResponse,
    applyStudentTests,
    loadStudentTests,
    loadAllStudentTests,

    // Note methods
    loadStudentNote,
    loadAllStudentNotes,
    updateStudentNote,

    // Topic methods
    findTopicIndex,
    getTopicById,
    addTopic,
    updateTopic,
    deleteTopic,
    moveTopic,
    addSubtopic,
    updateSubtopic,
    deleteSubtopic,

    // Student methods
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    synchronizeOverallPointBase,
    updateOverallPointBase,
  }
})
