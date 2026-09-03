<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'
import { useStudentAnalytics } from '@/composables/useStudentAnalytics'
import { useStudentPoints } from '@/composables/useStudentPoints'

const mathStore = useMathStore()
const { students } = storeToRefs(mathStore)

const {
  studentMetrics,
  classAverageProgress,
  classAverageTest,
  topPerformers,
  studentsNeedingAttention,
  stalledStudentCount,
  riskLevelCounts,
  problemTopics,
} = useStudentAnalytics()

const { formatPoints } = useStudentPoints()

const searchQuery = ref('')

const searchedStudents = computed(() => {
  const query = searchQuery.value
    .trim()
    .toLowerCase()

  if (!query) {
    return []
  }

  return studentMetrics.value.filter((metric) => {
    const student = metric.student

    return (
      student.name.toLowerCase().includes(query) ||
      String(student.edNo || '')
        .toLowerCase()
        .includes(query)
    )
  })
})

function riskClass(level) {
  if (level === 'Critical') {
    return 'risk-critical'
  }

  if (level === 'At Risk') {
    return 'risk-high'
  }

  if (level === 'Needs Attention') {
    return 'risk-attention'
  }

  return 'risk-track'
}

function problemSeverity(value) {
  if (value >= 65) {
    return 'Critical'
  }

  if (value >= 45) {
    return 'High'
  }

  if (value >= 25) {
    return 'Moderate'
  }

  return 'Low'
}

function formatMinutes(minutes) {
  const value = Number(minutes) || 0

  if (value >= 60) {
    return `${Math.round((value / 60) * 10) / 10} h`
  }

  return `${Math.round(value)} min`
}
</script>

<template>
  <div class="overview-page">
    <header class="overview-header">
      <div>
        <h1>Academic Overview</h1>

        <p>
          Class performance, risks, and topics needing
          attention.
        </p>
      </div>

      <div class="overview-header-actions">
        <RouterLink
          :to="{ name: 'student-progress' }"
          class="secondary-button"
        >
          Student Progress
        </RouterLink>

        <RouterLink
          :to="{ name: 'testing' }"
          class="secondary-button"
        >
          Testing
        </RouterLink>
      </div>
    </header>

    <main class="overview-content">
      <section class="overview-search-wrapper">
        <input
          v-model="searchQuery"
          type="search"
          class="overview-search"
          placeholder="Find a student by name or ED number"
        />

        <div
          v-if="searchQuery.trim()"
          class="overview-search-results"
        >
          <RouterLink
            v-for="metric in searchedStudents"
            :key="metric.student.id"
            :to="{
              name: 'student-progress',
            }"
            class="overview-search-result"
          >
            <div>
              <strong>
                {{ metric.student.name }}
              </strong>

              <span>
                ED No.:
                {{
                  metric.student.edNo ||
                  'Not assigned'
                }}
              </span>
            </div>

            <div>
              <strong>
                {{ metric.progressPercentage }}%
              </strong>

              <span>{{ metric.risk.level }}</span>
            </div>
          </RouterLink>

          <div
            v-if="!searchedStudents.length"
            class="overview-empty"
          >
            No matching students.
          </div>
        </div>
      </section>

      <section class="overview-stat-grid">
        <article class="overview-stat-card">
          <span>Students</span>
          <strong>{{ students.length }}</strong>
        </article>

        <article class="overview-stat-card">
          <span>Class progress</span>
          <strong>{{ classAverageProgress }}%</strong>
        </article>

        <article class="overview-stat-card">
          <span>Test average</span>
          <strong>
            {{
              classAverageTest === null
                ? '—'
                : `${classAverageTest}%`
            }}
          </strong>
        </article>

        <article class="overview-stat-card">
          <span>Need attention</span>
          <strong>
            {{ studentsNeedingAttention.length }}
          </strong>
        </article>

        <article class="overview-stat-card">
          <span>Stalled students</span>
          <strong>{{ stalledStudentCount }}</strong>
        </article>
      </section>

      <section class="overview-panel">
        <div class="overview-panel-heading">
          <div>
            <h2>Student Risk Engine</h2>

            <p>
              Based on tests, progress, weak topics,
              inactivity, and time spent.
            </p>
          </div>
        </div>

        <div class="risk-level-grid">
          <article class="risk-level risk-critical">
            <span>Critical</span>
            <strong>
              {{ riskLevelCounts.Critical }}
            </strong>
          </article>

          <article class="risk-level risk-high">
            <span>At Risk</span>
            <strong>
              {{ riskLevelCounts['At Risk'] }}
            </strong>
          </article>

          <article class="risk-level risk-attention">
            <span>Needs Attention</span>
            <strong>
              {{
                riskLevelCounts['Needs Attention']
              }}
            </strong>
          </article>

          <article class="risk-level risk-track">
            <span>On Track</span>
            <strong>
              {{ riskLevelCounts['On Track'] }}
            </strong>
          </article>
        </div>

        <div
          v-if="studentsNeedingAttention.length"
          class="attention-list"
        >
          <article
            v-for="metric in studentsNeedingAttention"
            :key="metric.student.id"
            class="attention-row"
          >
            <span
              :class="[
                'risk-dot',
                riskClass(metric.risk.level),
              ]"
            />

            <div class="attention-identity">
              <strong>
                {{ metric.student.name }}
              </strong>

              <span>
                {{
                  metric.current
                    ? `Current: ${metric.current.topic.title}`
                    : 'No current topic'
                }}
              </span>
            </div>

            <div class="attention-details">
              <span>
                {{
                  metric.testPercentage === null
                    ? 'No test average'
                    : `${metric.testPercentage}% tests`
                }}
              </span>

              <span>
                {{ metric.weakTopics.length }} weak
                topics
              </span>
            </div>

            <strong
              :class="[
                'risk-label',
                riskClass(metric.risk.level),
              ]"
            >
              {{ metric.risk.level }}
            </strong>
          </article>
        </div>

        <div
          v-else
          class="overview-empty"
        >
          No students currently need attention.
        </div>
      </section>

      <section class="overview-two-column">
        <article class="overview-panel">
          <div class="overview-panel-heading">
            <div>
              <h2>Best Performing Students</h2>
              <p>Top five academic scores.</p>
            </div>
          </div>

          <div
            v-if="topPerformers.length"
            class="performer-list"
          >
            <article
              v-for="(metric, index) in topPerformers"
              :key="metric.student.id"
              class="performer-row"
            >
              <span class="performer-rank">
                {{ index + 1 }}
              </span>

              <div class="performer-identity">
                <strong>
                  {{ metric.student.name }}
                </strong>

                <span>
                  {{ metric.progressPercentage }}%
                  progress ·
                  {{
                    metric.testPercentage === null
                      ? 'No tests'
                      : `${metric.testPercentage}% tests`
                  }}
                </span>
              </div>

              <div class="performer-score">
                <strong>
                  {{ metric.academicScore }}
                </strong>

                <span>academic score</span>
              </div>
            </article>
          </div>

          <div
            v-else
            class="overview-empty"
          >
            No performance information yet.
          </div>
        </article>

        <article class="overview-panel">
          <div class="overview-panel-heading">
            <div>
              <h2>Class Points</h2>

              <p>
                Students ordered by current total points.
              </p>
            </div>
          </div>

          <div class="performer-list">
            <article
              v-for="metric in [...studentMetrics]
                .sort(
                  (first, second) =>
                    second.points - first.points,
                )
                .slice(0, 5)"
              :key="metric.student.id"
              class="performer-row"
            >
              <div class="overview-avatar">
                {{
                  metric.student.name
                    .slice(0, 1)
                    .toUpperCase()
                }}
              </div>

              <div class="performer-identity">
                <strong>
                  {{ metric.student.name }}
                </strong>

                <span>
                  {{ metric.completedTopics }} completed
                  topics
                </span>
              </div>

              <div class="performer-score">
                <strong>
                  {{ formatPoints(metric.points) }}
                </strong>

                <span>points</span>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section class="overview-panel">
        <div class="overview-panel-heading">
          <div>
            <h2>Topics Causing the Most Problems</h2>

            <p>
              Combines tests, study time, and the number
              of students currently on each topic.
            </p>
          </div>
        </div>

        <div
          v-if="problemTopics.length"
          class="problem-topic-list"
        >
          <article
            v-for="topic in problemTopics"
            :key="topic.topicId"
            class="problem-topic-row"
          >
            <div class="problem-topic-heading">
              <div>
                <strong>
                  {{ topic.topicIndex + 1 }}.
                  {{ topic.title }}
                </strong>

                <span>
                  {{
                    topic.averageTest === null
                      ? 'No test data'
                      : `${Math.round(
                        topic.averageTest,
                      )}% test average`
                  }}
                  ·
                  {{
                    topic.averageMinutes
                      ? `${formatMinutes(
                        topic.averageMinutes,
                      )} average time`
                      : 'No time data'
                  }}
                  · {{ topic.activeStudents }} active
                </span>
              </div>

              <div class="problem-score">
                <strong>
                  {{ topic.problemIndex }}
                </strong>

                <span>
                  {{
                    problemSeverity(
                      topic.problemIndex,
                    )
                  }}
                </span>
              </div>
            </div>

            <div class="problem-progress">
              <div
                :style="{
                  width: `${Math.max(
                    2,
                    Math.min(
                      100,
                      topic.problemIndex,
                    ),
                  )}%`,
                }"
              />
            </div>
          </article>
        </div>

        <div
          v-else
          class="overview-empty"
        >
          Not enough data to identify problem topics.
        </div>
      </section>
    </main>
  </div>
</template>
