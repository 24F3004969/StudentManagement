import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { ALL_TOPICS_COMPLETED } from '@/constants/app'
import { useMathStore } from '@/stores/mathStore'

export function useTopicProgress() {
  const mathStore = useMathStore()

  const {
    topics,
    students,
    progress,
    startedAt,
    timeSpent,
    lastActivity,
    completedAt,
    subProgressBool,
  } = storeToRefs(mathStore)

  function getStudent(studentId) {
    return (
      students.value.find(
        (student) => student.id === studentId,
      ) || null
    )
  }

  function getTopic(topicId) {
    return (
      topics.value.find(
        (topic) => topic.id === topicId,
      ) || null
    )
  }

  function getTopicIndex(topicId) {
    return topics.value.findIndex(
      (topic) => topic.id === topicId,
    )
  }

  function getSubtopicProgress(studentId, topicId) {
    const topic = getTopic(topicId)

    if (!topic) {
      return []
    }

    const studentProgress =
      subProgressBool.value[studentId] || {}

    const savedChecks = studentProgress[topicId]

    if (!Array.isArray(savedChecks)) {
      return Array.from(
        { length: topic.subs.length },
        () => false,
      )
    }

    return Array.from(
      { length: topic.subs.length },
      (_, index) => Boolean(savedChecks[index]),
    )
  }

  function getTopicStatus(studentId, topicId) {
    const topic = getTopic(topicId)

    if (!topic) {
      return 'not-started'
    }

    const currentTopicId = progress.value[studentId]
    const topicIndex = getTopicIndex(topicId)

    if (!topic.subs.length) {
      if (currentTopicId === ALL_TOPICS_COMPLETED) {
        return 'completed'
      }

      const currentTopicIndex =
        getTopicIndex(currentTopicId)

      if (
        currentTopicIndex >= 0 &&
        currentTopicIndex > topicIndex
      ) {
        return 'completed'
      }

      if (currentTopicId === topicId) {
        return 'in-progress'
      }

      return 'not-started'
    }

    const checks = getSubtopicProgress(
      studentId,
      topicId,
    )

    const completedCount = checks.filter(Boolean).length

    if (
      checks.length > 0 &&
      completedCount === checks.length
    ) {
      return 'completed'
    }

    if (
      completedCount > 0 ||
      currentTopicId === topicId
    ) {
      return 'in-progress'
    }

    return 'not-started'
  }

  function getCurrentTopic(studentId) {
    if (!topics.value.length) {
      return null
    }

    if (
      progress.value[studentId] ===
      ALL_TOPICS_COMPLETED
    ) {
      return null
    }

    let topicIndex = getTopicIndex(
      progress.value[studentId],
    )

    if (topicIndex < 0) {
      topicIndex = 0
    }

    while (topicIndex < topics.value.length) {
      const topic = topics.value[topicIndex]

      if (
        getTopicStatus(studentId, topic.id) !==
        'completed'
      ) {
        return {
          index: topicIndex,
          topic,
        }
      }

      topicIndex += 1
    }

    return null
  }

  function getCompletedTopicCount(studentId) {
    return topics.value.filter((topic) => {
      return (
        getTopicStatus(studentId, topic.id) ===
        'completed'
      )
    }).length
  }

  function getStudentProgressPercentage(studentId) {
    if (!topics.value.length) {
      return 0
    }

    const completed =
      getCompletedTopicCount(studentId)

    return Math.round(
      (completed / topics.value.length) * 100,
    )
  }

  function getTopicProgressPercentage(
    studentId,
    topicId,
  ) {
    const topic = getTopic(topicId)

    if (!topic) {
      return 0
    }

    if (!topic.subs.length) {
      return getTopicStatus(studentId, topicId) ===
      'completed'
        ? 100
        : 0
    }

    const checks = getSubtopicProgress(
      studentId,
      topicId,
    )

    const completed = checks.filter(Boolean).length

    return Math.round(
      (completed / topic.subs.length) * 100,
    )
  }

  function saveStudentTopicRecord(
    stateRef,
    studentId,
    topicId,
    value,
  ) {
    const newState = { ...stateRef.value }

    const studentState = {
      ...(newState[studentId] || {}),
    }

    studentState[topicId] = value
    newState[studentId] = studentState
    stateRef.value = newState
  }

  function saveStudentValue(
    stateRef,
    studentId,
    value,
  ) {
    const newState = { ...stateRef.value }

    newState[studentId] = value
    stateRef.value = newState
  }

  function deleteStudentValue(stateRef, studentId) {
    const newState = { ...stateRef.value }

    delete newState[studentId]
    stateRef.value = newState
  }

  function deleteStudentTopicRecord(
    stateRef,
    studentId,
    topicId,
  ) {
    const newState = { ...stateRef.value }

    if (!newState[studentId]) {
      return
    }

    const studentState = {
      ...newState[studentId],
    }

    delete studentState[topicId]

    if (Object.keys(studentState).length) {
      newState[studentId] = studentState
    } else {
      delete newState[studentId]
    }

    stateRef.value = newState
  }

  function completeTopic(studentId, topicId) {
    const topicIndex = getTopicIndex(topicId)

    if (topicIndex < 0) {
      return
    }

    const now = Date.now()
    const topicStartedAt = startedAt.value[studentId]

    let minutes = 0

    if (typeof topicStartedAt === 'number') {
      minutes = Math.max(
        0,
        Math.round((now - topicStartedAt) / 60000),
      )
    }

    const studentTime =
      timeSpent.value[studentId] || {}

    const previousMinutes =
      Number(studentTime[topicId]) || 0

    saveStudentTopicRecord(
      timeSpent,
      studentId,
      topicId,
      previousMinutes + minutes,
    )

    saveStudentTopicRecord(
      completedAt,
      studentId,
      topicId,
      now,
    )

    saveStudentValue(
      lastActivity,
      studentId,
      now,
    )

    const nextTopic = topics.value[topicIndex + 1]

    if (nextTopic) {
      saveStudentValue(
        progress,
        studentId,
        nextTopic.id,
      )

      saveStudentValue(
        startedAt,
        studentId,
        now,
      )

      const nextChecks = getSubtopicProgress(
        studentId,
        nextTopic.id,
      )

      saveStudentTopicRecord(
        subProgressBool,
        studentId,
        nextTopic.id,
        nextChecks,
      )
    } else {
      saveStudentValue(
        progress,
        studentId,
        ALL_TOPICS_COMPLETED,
      )

      deleteStudentValue(startedAt, studentId)
    }

    mathStore.scheduleSave()
  }

  function toggleSubtopic(
    studentId,
    topicId,
    subtopicIndex,
  ) {
    const topic = getTopic(topicId)

    if (!topic) {
      return
    }

    const checks = getSubtopicProgress(
      studentId,
      topicId,
    )

    if (
      subtopicIndex < 0 ||
      subtopicIndex >= checks.length
    ) {
      return
    }

    checks[subtopicIndex] = !checks[subtopicIndex]

    saveStudentTopicRecord(
      subProgressBool,
      studentId,
      topicId,
      checks,
    )

    saveStudentValue(
      lastActivity,
      studentId,
      Date.now(),
    )

    if (!checks[subtopicIndex]) {
      deleteStudentTopicRecord(
        completedAt,
        studentId,
        topicId,
      )
    }

    const allCompleted =
      checks.length > 0 && checks.every(Boolean)

    if (allCompleted) {
      completeTopic(studentId, topicId)
    } else {
      mathStore.scheduleSave()
    }
  }

  function markAllSubtopicsComplete(
    studentId,
    topicId,
  ) {
    const topic = getTopic(topicId)

    if (!topic || !topic.subs.length) {
      return
    }

    const completedChecks = Array.from(
      { length: topic.subs.length },
      () => true,
    )

    saveStudentTopicRecord(
      subProgressBool,
      studentId,
      topicId,
      completedChecks,
    )

    completeTopic(studentId, topicId)
  }

  function completeTopicWithoutSubtopics(
    studentId,
    topicId,
  ) {
    const topic = getTopic(topicId)

    if (!topic || topic.subs.length) {
      return
    }

    completeTopic(studentId, topicId)
  }

  function setTopicCompletionDate(
    studentId,
    topicId,
    dateValue,
  ) {
    if (!dateValue) {
      deleteStudentTopicRecord(
        completedAt,
        studentId,
        topicId,
      )

      mathStore.scheduleSave()
      return
    }

    const timestamp = new Date(
      `${dateValue}T12:00:00`,
    ).getTime()

    if (!Number.isFinite(timestamp)) {
      return
    }

    saveStudentTopicRecord(
      completedAt,
      studentId,
      topicId,
      timestamp,
    )

    mathStore.scheduleSave()
  }

  function restartStudent(studentId) {
    const firstTopic = topics.value[0]

    if (!firstTopic) {
      return
    }

    const now = Date.now()
    const resetProgress = {}

    topics.value.forEach((topic) => {
      resetProgress[topic.id] = Array.from(
        { length: topic.subs.length },
        () => false,
      )
    })

    saveStudentValue(
      progress,
      studentId,
      firstTopic.id,
    )

    saveStudentValue(
      startedAt,
      studentId,
      now,
    )

    saveStudentValue(
      lastActivity,
      studentId,
      now,
    )

    saveStudentValue(
      subProgressBool,
      studentId,
      resetProgress,
    )

    deleteStudentValue(completedAt, studentId)
    deleteStudentValue(timeSpent, studentId)

    mathStore.scheduleSave()
  }

  const studentProgressRows = computed(() => {
    return students.value.map((student) => {
      return {
        ...student,
        completedCount: getCompletedTopicCount(
          student.id,
        ),
        percentage:
          getStudentProgressPercentage(student.id),
        current: getCurrentTopic(student.id),
      }
    })
  })

  return {
    getStudent,
    getTopic,
    getTopicIndex,
    getSubtopicProgress,
    getTopicStatus,
    getCurrentTopic,
    getCompletedTopicCount,
    getStudentProgressPercentage,
    getTopicProgressPercentage,

    completeTopic,
    toggleSubtopic,
    markAllSubtopicsComplete,
    completeTopicWithoutSubtopics,
    setTopicCompletionDate,
    restartStudent,

    studentProgressRows,
  }
}
