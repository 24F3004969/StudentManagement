<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'
import { useTopicProgress } from '@/composables/useTopicProgress'
import { useStudentPoints } from '@/composables/useStudentPoints'
import { useStudentAnalytics } from '@/composables/useStudentAnalytics'
import { formatDate } from '@/utils/date'

const props = defineProps({
  studentId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close'])

const mathStore = useMathStore()

const {
  students,
  topics,
  completedAt,
  studentNotes,
} = storeToRefs(mathStore)

const {
  getCurrentTopic,
  getTopicStatus,
  getCompletedTopicCount,
  getStudentProgressPercentage,
  getTopicProgressPercentage,
} = useTopicProgress()

const {
  getStudentTestStats,
  getStudentTotalPoints,
  getStudentRank,
  formatPoints,
} = useStudentPoints()

const {
  getStudentRiskProfile,
  getWeakTopics,
} = useStudentAnalytics()

const student = computed(() => {
  return (
    students.value.find(
      (item) => item.id === props.studentId,
    ) || null
  )
})

const currentTopic = computed(() => {
  return getCurrentTopic(props.studentId)
})

const completedTopicCount = computed(() => {
  return getCompletedTopicCount(props.studentId)
})

const progressPercentage = computed(() => {
  return getStudentProgressPercentage(
    props.studentId,
  )
})

const testStats = computed(() => {
  return getStudentTestStats(props.studentId)
})

const totalPoints = computed(() => {
  return getStudentTotalPoints(props.studentId)
})

const studentRank = computed(() => {
  return getStudentRank(props.studentId)
})

const riskProfile = computed(() => {
  return getStudentRiskProfile(props.studentId)
})

const weakTopics = computed(() => {
  return getWeakTopics(props.studentId, 5)
})

const completedTopics = computed(() => {
  return topics.value
    .map((topic, index) => {
      return {
        ...topic,
        index,
        status: getTopicStatus(
          props.studentId,
          topic.id,
        ),
      }
    })
    .filter((topic) => topic.status === 'completed')
})

const nextTopics = computed(() => {
  const currentIndex =
    currentTopic.value?.index ?? -1

  return topics.value
    .map((topic, index) => {
      return {
        ...topic,
        index,
        status: getTopicStatus(
          props.studentId,
          topic.id,
        ),
      }
    })
    .filter((topic) => {
      return (
        topic.index > currentIndex &&
        topic.status !== 'completed'
      )
    })
    .slice(0, 3)
})

function printReport() {
  window.print()
}

function closeReport() {
  emit('close')
}
</script>

<template>
  <div
    v-if="student"
    class="parent-report-backdrop"
    @click.self="closeReport"
  >
    <section
      class="parent-report-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Parent report for ${student.name}`"
    >
      <div class="parent-report-toolbar">
        <div>
          <strong>Parent Progress Report</strong>
          <span>
            Review and print the student report.
          </span>
        </div>

        <div class="parent-report-toolbar-actions">
          <button
            type="button"
            class="primary-button"
            @click="printReport"
          >
            Print / Save PDF
          </button>

          <button
            type="button"
            class="secondary-button"
            @click="closeReport"
          >
            Close
          </button>
        </div>
      </div>

      <div
        id="parent-progress-report"
        class="parent-report-document"
      >
        <header class="parent-report-heading">
          <div>
            <div class="parent-report-brand">
              GradeEd
            </div>

            <h1>Mathematics Progress Report</h1>

            <p>
              Student learning and assessment summary
            </p>
          </div>

          <div class="parent-report-date">
            <span>Report date</span>
            <strong>
              {{
                new Date().toLocaleDateString(
                  undefined,
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  },
                )
              }}
            </strong>
          </div>
        </header>

        <section class="parent-student-section">
          <div class="parent-student-avatar">
            {{
              student.name
                .slice(0, 1)
                .toUpperCase()
            }}
          </div>

          <div class="parent-student-identity">
            <span>Student</span>
            <h2>{{ student.name }}</h2>
            <p>
              ED No.:
              {{ student.edNo || 'Not assigned' }}
            </p>
          </div>

          <div class="parent-overall-progress">
            <strong>
              {{ progressPercentage }}%
            </strong>

            <span>Overall progress</span>
          </div>
        </section>

        <div class="parent-progress-bar">
          <div
            :style="{
              width: `${progressPercentage}%`,
            }"
          />
        </div>

        <section class="parent-stat-grid">
          <article>
            <span>Completed Topics</span>

            <strong>
              {{ completedTopicCount }}/{{
                topics.length
              }}
            </strong>
          </article>

          <article>
            <span>Leaderboard Rank</span>

            <strong>
              #{{ studentRank || '—' }}
            </strong>
          </article>

          <article>
            <span>Total Points</span>

            <strong>
              {{ formatPoints(totalPoints) }}
            </strong>
          </article>

          <article>
            <span>Test Average</span>

            <strong>
              {{
                testStats.percentage === null
                  ? '—'
                  : `${testStats.percentage.toFixed(
                    2,
                  )}%`
              }}
            </strong>

            <small>
              {{ testStats.totalTests }} tests recorded
            </small>
          </article>
        </section>

        <section
          v-if="currentTopic"
          class="parent-current-topic"
        >
          <div class="parent-section-heading">
            <div>
              <span>Currently Studying</span>

              <h2>
                {{ currentTopic.index + 1 }}.
                {{ currentTopic.topic.title }}
              </h2>
            </div>

            <strong>
              {{
                getTopicProgressPercentage(
                  studentId,
                  currentTopic.topic.id,
                )
              }}%
            </strong>
          </div>

          <div class="parent-progress-bar">
            <div
              :style="{
                width: `${getTopicProgressPercentage(
                  studentId,
                  currentTopic.topic.id,
                )}%`,
              }"
            />
          </div>
        </section>

        <section
          v-else
          class="parent-complete-message"
        >
          All mathematics topics have been completed.
        </section>

        <section class="parent-report-columns">
          <article class="parent-report-panel">
            <div class="parent-section-heading">
              <div>
                <span>Learning Progress</span>
                <h2>Completed Topics</h2>
              </div>

              <strong>
                {{ completedTopics.length }}
              </strong>
            </div>

            <div
              v-if="completedTopics.length"
              class="parent-topic-list"
            >
              <div
                v-for="topic in completedTopics"
                :key="topic.id"
                class="parent-topic-row"
              >
                <div>
                  <strong>
                    {{ topic.index + 1 }}.
                    {{ topic.title }}
                  </strong>
                </div>

                <span>
                  {{
                    formatDate(
                      completedAt?.[studentId]?.[
                        topic.id
                        ],
                    )
                  }}
                </span>
              </div>
            </div>

            <p
              v-else
              class="parent-empty"
            >
              No topics have been completed yet.
            </p>
          </article>

          <article class="parent-report-panel">
            <div class="parent-section-heading">
              <div>
                <span>Learning Plan</span>
                <h2>Next Topics</h2>
              </div>
            </div>

            <div
              v-if="nextTopics.length"
              class="parent-topic-list"
            >
              <div
                v-for="topic in nextTopics"
                :key="topic.id"
                class="parent-next-topic"
              >
                <span>
                  {{ topic.index + 1 }}
                </span>

                <strong>{{ topic.title }}</strong>
              </div>
            </div>

            <p
              v-else
              class="parent-empty"
            >
              No upcoming topics.
            </p>
          </article>
        </section>

        <section class="parent-report-columns">
          <article class="parent-report-panel">
            <div class="parent-section-heading">
              <div>
                <span>Academic Monitoring</span>
                <h2>Current Status</h2>
              </div>
            </div>

            <div class="parent-status-result">
              <strong>
                {{ riskProfile.level }}
              </strong>

              <p>
                Based on progress, assessments, weak
                topics, and study consistency.
              </p>
            </div>
          </article>

          <article class="parent-report-panel">
            <div class="parent-section-heading">
              <div>
                <span>Teacher Feedback</span>
                <h2>Teacher Note</h2>
              </div>
            </div>

            <p class="parent-teacher-note">
              {{
                studentNotes[studentId] ||
                'No teacher note has been recorded.'
              }}
            </p>
          </article>
        </section>

        <section
          v-if="weakTopics.length"
          class="parent-report-panel parent-weak-topics"
        >
          <div class="parent-section-heading">
            <div>
              <span>Support Areas</span>
              <h2>Topics Requiring More Practice</h2>
            </div>
          </div>

          <div class="parent-topic-list">
            <div
              v-for="topic in weakTopics"
              :key="topic.topicId"
              class="parent-topic-row"
            >
              <strong>
                {{ topic.topicIndex + 1 }}.
                {{ topic.title }}
              </strong>

              <span>
                {{ topic.percentage.toFixed(1) }}%
                test average
              </span>
            </div>
          </div>
        </section>

        <footer class="parent-report-footer">
          <strong>GradeEd Coaching Classes</strong>

          <span>
            Mathematics Progress Manager
          </span>
        </footer>
      </div>
    </section>
  </div>
</template>
