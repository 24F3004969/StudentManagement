import {storeToRefs} from 'pinia'

import {useMathStore} from '@/stores/mathStore'
import {useTopicProgress} from '@/composables/useTopicProgress'
import {createId} from '@/utils/id'
import {testApi} from '@/services/testApi'

export function useStudentPoints() {
  const mathStore = useMathStore()
  const {
    topics,
    students,
    testScores,
    timeSpent,
    subProgressBool,
    overallPointBase,
  } = storeToRefs(mathStore)
  const {
    getTopicStatus,
    getSubtopicProgress,
    getCompletedTopicCount,
    getStudentProgressPercentage,
  } = useTopicProgress()
  function getTopicDifficulty(topicIndex) {
    const topic = topics.value[topicIndex]

    if (Number(topic?.difficulty) > 0) {
      return Math.min(
        6,
        Math.max(1, Number(topic.difficulty)),
      )
    }

    return Math.min(
      6,
      1 + Math.floor(Math.max(0, topicIndex) / 10),
    )
  }

  function getSpeedMultiplier(minutes, difficulty) {
    const numericMinutes = Number(minutes)
    const numericDifficulty = Math.max(
      1,
      Math.min(6, Number(difficulty) || 1),
    )

    if (
      !Number.isFinite(numericMinutes) ||
      numericMinutes <= 0
    ) {
      return 1
    }

    const expectedMinutes = 30 * numericDifficulty

    if (numericMinutes <= expectedMinutes) {
      return 1.5
    }

    if (numericMinutes <= expectedMinutes * 1.5) {
      return 1.25
    }

    if (numericMinutes <= expectedMinutes * 2) {
      return 1
    }

    return 0.75
  }

  function getTopicCorePoints(studentId, topic, topicIndex) {
    const difficulty = getTopicDifficulty(topicIndex)

    const status = getTopicStatus(
      studentId,
      topic.id,
    )

    let completedSubtopics = 0

    if (topic.subs.length) {
      const checks = getSubtopicProgress(
        studentId,
        topic.id,
      )

      completedSubtopics = checks.filter(Boolean).length
    } else if (status === 'completed') {
      completedSubtopics = 1
    }

    const subtopicPoints =
      completedSubtopics * 10 * difficulty

    let completionBonus = 0
    let speedMultiplier = 1

    if (status === 'completed') {
      const studentTimes =
        timeSpent.value[studentId] || {}

      const minutes =
        Number(studentTimes[topic.id]) || 0

      speedMultiplier = getSpeedMultiplier(
        minutes,
        difficulty,
      )

      completionBonus = Math.round(
        50 * difficulty * speedMultiplier,
      )
    }

    return {
      difficulty,
      completedSubtopics,
      subtopicPoints,
      completionBonus,
      speedMultiplier,
      total: subtopicPoints + completionBonus,
    }
  }
  async function setOverallPoints(
    studentId,
    totalPoints,
  ) {
    const enteredTotal = Math.max(
      0,
      Math.round(Number(totalPoints) || 0),
    )

    const testPoints =
      getStudentTestPoints(studentId)

    const basePoints = Math.max(
      0,
      enteredTotal - testPoints,
    )

    await mathStore.updateOverallPointBase(
      studentId,
      basePoints,
    )
  }
  async function clearOverallPointsOverride(
    studentId,
  ) {
    await mathStore.updateOverallPointBase(
      studentId,
      0,
    )
  }
  function getStudentCorePoints(studentId) {
    return topics.value.reduce(
      (total, topic, topicIndex) => {
        const topicPoints = getTopicCorePoints(
          studentId,
          topic,
          topicIndex,
        )

        return total + topicPoints.total
      },
      0,
    )
  }

  function getStudentTestPoints(studentId) {
    return getStudentTestStats(studentId).totalPoints
  }

  function getStudentTotalPoints(studentId) {
    const testPoints = getStudentTestPoints(studentId)

    const hasManualBase =
      Object.prototype.hasOwnProperty.call(
        overallPointBase.value,
        studentId,
      )

    const basePoints = hasManualBase
      ? Number(overallPointBase.value[studentId]) || 0
      : getStudentCorePoints(studentId)

    return basePoints + testPoints
  }

  function getStudentPointBreakdown(studentId) {
    return topics.value.map((topic, topicIndex) => {
      const core = getTopicCorePoints(
        studentId,
        topic,
        topicIndex,
      )

      const tests = getTopicTestStats(
        studentId,
        topic.id,
      )

      return {
        topicId: topic.id,
        topicIndex,
        topicTitle: topic.title,
        difficulty: core.difficulty,
        completedSubtopics: core.completedSubtopics,
        totalSubtopics: topic.subs.length || 1,
        subtopicPoints: core.subtopicPoints,
        completionBonus: core.completionBonus,
        speedMultiplier: core.speedMultiplier,
        testPoints: tests.totalPoints,
        total:
          core.total + tests.totalPoints,
      }
    })
  }

  function getLeaderboard() {
    return students.value
      .map((student) => {
        return {
          ...student,
          points: getStudentTotalPoints(student.id),

          completedTopics:
            getCompletedTopicCount(student.id),

          progressPercentage:
            getStudentProgressPercentage(student.id),

          testStats:
            getStudentTestStats(student.id),
        }
      })
      .sort((first, second) => {
        if (second.points !== first.points) {
          return second.points - first.points
        }

        if (
          second.progressPercentage !==
          first.progressPercentage
        ) {
          return (
            second.progressPercentage -
            first.progressPercentage
          )
        }

        return first.name.localeCompare(second.name)
      })
  }

  function getStudentRank(studentId) {
    const ranking = getLeaderboard()

    const index = ranking.findIndex(
      (student) => student.id === studentId,
    )

    return index >= 0 ? index + 1 : null
  }
  function getTestAwardPoints(score, maximumMarks) {
    const numericScore = Number(score)
    const numericMaximum = Number(maximumMarks)

    if (
      !Number.isFinite(numericScore) ||
      !Number.isFinite(numericMaximum) ||
      numericMaximum <= 0
    ) {
      return 0
    }

    const percentage =
      (numericScore / numericMaximum) * 100

    if (percentage >= 95) {
      return 200
    }

    if (percentage >= 80) {
      return 100
    }

    if (percentage >= 60) {
      return 50
    }

    if (percentage >= 50) {
      return 25
    }

    if (percentage >= 30) {
      return 10
    }

    return -100
  }

  function createEmptyTest(
    studentId,
    topicId,
    testIndex,
  ) {
    return {
      id: createId(),
      studentId,
      topicId,
      testNumber: testIndex + 1,
      score: '',
      max: '',
      date: '',
      remark: '',
      points: 0,
    }
  }

  function getTests(studentId, topicId) {
    const studentScores =
      testScores.value[studentId] || {}

    const savedTests = Array.isArray(
      studentScores[topicId],
    )
      ? studentScores[topicId]
      : []

    return Array.from({ length: 3 }, (_, index) => {
      const savedTest = savedTests[index]

      if (!savedTest) {
        return createEmptyTest(
          studentId,
          topicId,
          index,
        )
      }

      return {
        id: savedTest.id || createId(),
        studentId,
        topicId,
        testNumber: index + 1,
        score: savedTest.score ?? '',
        max: savedTest.max ?? '',
        date: savedTest.date ?? '',
        remark: savedTest.remark ?? '',
        points: getTestAwardPoints(
          savedTest.score,
          savedTest.max,
        ),
      }
    })
  }

  function applyTopicTests(
    studentId,
    topicId,
    backendTests,
  ) {
    const mappedTests = Array.isArray(backendTests)
      ? backendTests.map(
        mathStore.mapTestResponse,
      )
      : []

    const updatedScores = {
      ...testScores.value,
    }

    const studentScores = {
      ...(updatedScores[studentId] || {}),
    }

    studentScores[topicId] = mappedTests
    updatedScores[studentId] = studentScores

    testScores.value = updatedScores
  }

  async function updateTest(
    studentId,
    topicId,
    testIndex,
    changes,
  ) {
    if (
      !Number.isInteger(testIndex) ||
      testIndex < 0 ||
      testIndex > 2
    ) {
      throw new Error('Invalid test number.')
    }

    const tests = getTests(studentId, topicId)

    const updated = {
      ...tests[testIndex],
      ...changes,
      testNumber: testIndex + 1,
    }

    const scoreText = String(updated.score ?? '').trim()
    const maximumText = String(updated.max ?? '').trim()

    const score = Number(scoreText)
    const maximumScore = Number(maximumText)

    const validScore =
      scoreText !== '' &&
      Number.isFinite(score) &&
      score >= 0

    const validMaximum =
      maximumText !== '' &&
      Number.isFinite(maximumScore) &&
      maximumScore > 0

    // Always retain the current input locally.
    const updatedScores = {
      ...testScores.value,
    }

    const studentScores = {
      ...(updatedScores[studentId] || {}),
    }

    tests[testIndex] = updated
    studentScores[topicId] = tests
    updatedScores[studentId] = studentScores
    testScores.value = updatedScores

    // Do not call Spring Boot until both marks are valid.
    if (!validScore || !validMaximum) {
      return updated
    }

    if (score > maximumScore) {
      throw new Error(
        'Marks obtained cannot exceed total marks.',
      )
    }

    const response = await testApi.save(
      studentId,
      topicId,
      testIndex + 1,
      {
        testNumber: testIndex + 1,
        score,
        maximumScore,
        testDate: updated.date || null,
        remark: updated.remark || null,
      },
    )

    const topicTests = await testApi.findByTopic(
      studentId,
      topicId,
    )

    applyTopicTests(
      studentId,
      topicId,
      topicTests,
    )

    return mathStore.mapTestResponse(response)
  }

  async function clearTest(
    studentId,
    topicId,
    testIndex,
  ) {
    if (
      !Number.isInteger(testIndex) ||
      testIndex < 0 ||
      testIndex > 2
    ) {
      throw new Error('Invalid test number.')
    }

    try {
      await testApi.delete(
        studentId,
        topicId,
        testIndex + 1,
      )
    } catch (error) {
      /*
       * Clearing an unsaved local draft can return 404.
       * Ignore only that specific case.
       */
      if (error.status !== 404) {
        throw error
      }
    }

    const topicTests = await testApi.findByTopic(
      studentId,
      topicId,
    )

    applyTopicTests(
      studentId,
      topicId,
      topicTests,
    )
  }

  function getTestPercentage(test) {
    const score = Number(test?.score)
    const maximumMarks = Number(test?.max)

    if (
      test?.score === '' ||
      test?.max === '' ||
      !Number.isFinite(score) ||
      !Number.isFinite(maximumMarks) ||
      maximumMarks <= 0
    ) {
      return null
    }

    return (score / maximumMarks) * 100
  }

  function isTestRecorded(test) {
    return getTestPercentage(test) !== null
  }

  function getCompletedTopics(studentId) {
    return topics.value.filter((topic) => {
      return (
        getTopicStatus(studentId, topic.id) ===
        'completed'
      )
    })
  }

  function getTopicTestStats(studentId, topicId) {
    const tests = getTests(studentId, topicId)

    let totalScore = 0
    let totalMaximum = 0
    let totalPoints = 0
    let recordedTests = 0

    tests.forEach((test) => {
      const percentage = getTestPercentage(test)

      if (percentage === null) {
        return
      }

      totalScore += Number(test.score)
      totalMaximum += Number(test.max)
      totalPoints += getTestAwardPoints(
        test.score,
        test.max,
      )

      recordedTests += 1
    })

    return {
      tests,
      recordedTests,
      totalScore,
      totalMaximum,
      totalPoints,
      percentage:
        totalMaximum > 0
          ? (totalScore / totalMaximum) * 100
          : null,
    }
  }

  function getStudentTestStats(studentId) {
    const completedTopics =
      getCompletedTopics(studentId)

    let totalScore = 0
    let totalMaximum = 0
    let totalPoints = 0
    let totalTests = 0

    completedTopics.forEach((topic) => {
      const topicStats = getTopicTestStats(
        studentId,
        topic.id,
      )

      totalScore += topicStats.totalScore
      totalMaximum += topicStats.totalMaximum
      totalPoints += topicStats.totalPoints
      totalTests += topicStats.recordedTests
    })

    return {
      totalTests,
      totalScore,
      totalMaximum,
      totalPoints,
      percentage:
        totalMaximum > 0
          ? (totalScore / totalMaximum) * 100
          : null,
    }
  }

  function formatPoints(points) {
    return Math.round(Number(points) || 0).toLocaleString()
  }

  return {
    getTestAwardPoints,
    getTests,
    updateTest,
    clearTest,
    getTestPercentage,
    isTestRecorded,
    getCompletedTopics,
    getTopicTestStats,
    getStudentTestStats,
    formatPoints,

    getTopicDifficulty,
    getSpeedMultiplier,
    getTopicCorePoints,
    getStudentCorePoints,
    getStudentTestPoints,
    getStudentTotalPoints,
    getStudentPointBreakdown,
    getLeaderboard,
    getStudentRank,
    applyTopicTests,
    clearOverallPointsOverride,
  }
}
