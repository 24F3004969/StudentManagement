import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'
import { useTopicProgress } from '@/composables/useTopicProgress'
import { useStudentPoints } from '@/composables/useStudentPoints'
import { getDaysSince } from '@/utils/date'

const STALE_DAYS = 14

export function useStudentAnalytics() {
  const mathStore = useMathStore()

  const {
    topics,
    students,
    timeSpent,
    lastActivity,
  } = storeToRefs(mathStore)

  const {
    getTopicStatus,
    getCurrentTopic,
    getCompletedTopicCount,
    getStudentProgressPercentage,
  } = useTopicProgress()

  const {
    getTests,
    getTopicTestStats,
    getStudentTestStats,
    getStudentTotalPoints,
  } = useStudentPoints()

  function getStudentTotalMinutes(studentId) {
    const studentTimes =
      timeSpent.value[studentId] || {}

    return Object.values(studentTimes).reduce(
      (total, minutes) => {
        return total + (Number(minutes) || 0)
      },
      0,
    )
  }

  function isStudentStale(studentId) {
    const timestamp = lastActivity.value[studentId]
    const days = getDaysSince(timestamp)

    if (days === null) {
      return false
    }

    const progress =
      getStudentProgressPercentage(studentId)

    return days >= STALE_DAYS && progress < 100
  }

  function getWeakTopics(studentId, limit = null) {
    const weakTopics = []

    topics.value.forEach((topic, topicIndex) => {
      const stats = getTopicTestStats(
        studentId,
        topic.id,
      )

      if (
        stats.percentage !== null &&
        stats.percentage < 70
      ) {
        weakTopics.push({
          topicId: topic.id,
          topicIndex,
          title: topic.title,
          percentage: stats.percentage,
          recordedTests: stats.recordedTests,
          status: getTopicStatus(
            studentId,
            topic.id,
          ),
        })
      }
    })

    weakTopics.sort(
      (first, second) =>
        first.percentage - second.percentage,
    )

    if (Number.isInteger(limit) && limit >= 0) {
      return weakTopics.slice(0, limit)
    }

    return weakTopics
  }

  function getFailedTestCount(studentId) {
    let failedTests = 0

    topics.value.forEach((topic) => {
      const tests = getTests(studentId, topic.id)

      tests.forEach((test) => {
        const score = Number(test.score)
        const maximum = Number(test.max)

        if (
          test.score !== '' &&
          test.max !== '' &&
          Number.isFinite(score) &&
          Number.isFinite(maximum) &&
          maximum > 0 &&
          score / maximum < 0.4
        ) {
          failedTests += 1
        }
      })
    })

    return failedTests
  }

  function getStudentRiskProfile(studentId) {
    const testStats =
      getStudentTestStats(studentId)

    const progressPercentage =
      getStudentProgressPercentage(studentId)

    const failedTests =
      getFailedTestCount(studentId)

    const weakTopics = getWeakTopics(studentId)
    const stale = isStudentStale(studentId)
    const current = getCurrentTopic(studentId)

    let currentTopicMinutes = 0

    if (current) {
      const studentTimes =
        timeSpent.value[studentId] || {}

      currentTopicMinutes =
        Number(studentTimes[current.topic.id]) || 0
    }

    let riskScore = 0

    if (testStats.percentage !== null) {
      riskScore +=
        Math.max(0, 60 - testStats.percentage) *
        1.15
    }

    riskScore += failedTests * 12
    riskScore += Math.min(24, weakTopics.length * 6)

    if (stale) {
      riskScore += 18
    }

    if (currentTopicMinutes > 600) {
      riskScore += 12
    }

    if (progressPercentage < 30) {
      riskScore += 12
    }

    let level = 'On Track'

    if (riskScore >= 65) {
      level = 'Critical'
    } else if (riskScore >= 42) {
      level = 'At Risk'
    } else if (riskScore >= 22) {
      level = 'Needs Attention'
    }

    return {
      studentId,
      score: Math.round(riskScore),
      level,
      testPercentage: testStats.percentage,
      failedTests,
      weakTopics,
      stale,
      staleDays: getDaysSince(
        lastActivity.value[studentId],
      ),
      current,
      currentTopicMinutes,
      progressPercentage,
    }
  }

  function getStudentMetric(student) {
    const testStats =
      getStudentTestStats(student.id)

    const progressPercentage =
      getStudentProgressPercentage(student.id)

    const completedTopics =
      getCompletedTopicCount(student.id)

    const weakTopics = getWeakTopics(student.id)
    const failedTests =
      getFailedTestCount(student.id)

    const testPercentage =
      testStats.percentage === null
        ? null
        : Number(testStats.percentage.toFixed(2))

    const weakTopicScore = Math.min(
      100,
      Math.max(0, 100 - weakTopics.length * 12),
    )

    const academicScore = Math.round(
      progressPercentage * 0.35 +
      (testPercentage === null
        ? 0
        : testPercentage * 0.45) +
      weakTopicScore * 0.2,
    )

    return {
      student,
      completedTopics,
      progressPercentage,
      testPercentage,
      testCount: testStats.totalTests,
      testPoints: testStats.totalPoints,
      totalMinutes: getStudentTotalMinutes(
        student.id,
      ),
      current: getCurrentTopic(student.id),
      stale: isStudentStale(student.id),
      weakTopics,
      failedTests,
      points: getStudentTotalPoints(student.id),
      academicScore,
      risk: getStudentRiskProfile(student.id),
    }
  }

  const studentMetrics = computed(() => {
    return students.value.map((student) => {
      return getStudentMetric(student)
    })
  })

  const classAverageProgress = computed(() => {
    if (!studentMetrics.value.length) {
      return 0
    }

    const total = studentMetrics.value.reduce(
      (sum, metric) =>
        sum + metric.progressPercentage,
      0,
    )

    return Math.round(
      total / studentMetrics.value.length,
    )
  })

  const classAverageTest = computed(() => {
    const testedStudents =
      studentMetrics.value.filter((metric) => {
        return metric.testPercentage !== null
      })

    if (!testedStudents.length) {
      return null
    }

    const total = testedStudents.reduce(
      (sum, metric) =>
        sum + metric.testPercentage,
      0,
    )

    return Math.round(total / testedStudents.length)
  })

  const topPerformers = computed(() => {
    return [...studentMetrics.value]
      .filter((metric) => {
        return (
          metric.testCount > 0 ||
          metric.completedTopics > 0
        )
      })
      .sort((first, second) => {
        if (
          second.academicScore !==
          first.academicScore
        ) {
          return (
            second.academicScore -
            first.academicScore
          )
        }

        return (
          second.progressPercentage -
          first.progressPercentage
        )
      })
      .slice(0, 5)
  })

  const studentsNeedingAttention = computed(() => {
    return [...studentMetrics.value]
      .filter((metric) => {
        return metric.risk.level !== 'On Track'
      })
      .sort(
        (first, second) =>
          second.risk.score - first.risk.score,
      )
      .slice(0, 6)
  })

  const stalledStudentCount = computed(() => {
    return studentMetrics.value.filter(
      (metric) => metric.stale,
    ).length
  })

  const riskLevelCounts = computed(() => {
    const counts = {
      Critical: 0,
      'At Risk': 0,
      'Needs Attention': 0,
      'On Track': 0,
    }

    studentMetrics.value.forEach((metric) => {
      const level = metric.risk.level

      if (Object.hasOwn(counts, level)) {
        counts[level] += 1
      }
    })

    return counts
  })

  function getProblemTopics() {
    return topics.value
      .map((topic, topicIndex) => {
        const activeStudents = students.value.filter(
          (student) => {
            return (
              getTopicStatus(
                student.id,
                topic.id,
              ) === 'in-progress'
            )
          },
        )

        const testPercentages = []

        students.value.forEach((student) => {
          const stats = getTopicTestStats(
            student.id,
            topic.id,
          )

          if (stats.percentage !== null) {
            testPercentages.push(stats.percentage)
          }
        })

        const averageTest = testPercentages.length
          ? testPercentages.reduce(
          (sum, value) => sum + value,
          0,
        ) / testPercentages.length
          : null

        const studentTimes = []

        students.value.forEach((student) => {
          const times =
            timeSpent.value[student.id] || {}

          const minutes = Number(times[topic.id]) || 0

          if (minutes > 0) {
            studentTimes.push(minutes)
          }
        })

        const averageMinutes =
          studentTimes.length > 0
            ? studentTimes.reduce(
            (sum, value) => sum + value,
            0,
          ) / studentTimes.length
            : 0

        const weakPressure =
          averageTest === null
            ? 0
            : Math.max(0, 100 - averageTest)

        const timePressure = studentTimes.length
          ? Math.min(
            100,
            (averageMinutes / 600) * 100,
          )
          : 0

        const stuckPressure = students.value.length
          ? (activeStudents.length /
            students.value.length) *
          100
          : 0

        let problemIndex = 0

        if (testPercentages.length) {
          problemIndex =
            weakPressure * 0.55 +
            timePressure * 0.3 +
            stuckPressure * 0.15
        } else {
          problemIndex =
            timePressure * 0.65 +
            stuckPressure * 0.35
        }

        return {
          topicId: topic.id,
          topicIndex,
          title: topic.title,
          averageTest,
          averageMinutes,
          activeStudents: activeStudents.length,
          testedStudents: testPercentages.length,
          problemIndex: Math.round(problemIndex),
        }
      })
      .sort(
        (first, second) =>
          second.problemIndex -
          first.problemIndex,
      )
      .slice(0, 7)
  }

  const problemTopics = computed(() => {
    return getProblemTopics()
  })

  return {
    getStudentTotalMinutes,
    isStudentStale,
    getWeakTopics,
    getFailedTestCount,
    getStudentRiskProfile,
    getStudentMetric,

    studentMetrics,
    classAverageProgress,
    classAverageTest,
    topPerformers,
    studentsNeedingAttention,
    stalledStudentCount,
    riskLevelCounts,
    problemTopics,
  }
}
