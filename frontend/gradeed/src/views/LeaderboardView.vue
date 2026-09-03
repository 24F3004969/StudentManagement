<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'
import { useStudentPoints } from '@/composables/useStudentPoints'

const mathStore = useMathStore()
const { topics } = storeToRefs(mathStore)

const {
  getLeaderboard,
  getStudentPointBreakdown,
  getStudentCorePoints,
  getStudentTestPoints,
  formatPoints,
} = useStudentPoints()

const searchQuery = ref('')
const selectedStudentId = ref(null)

const ranking = computed(() => {
  const query = searchQuery.value
    .trim()
    .toLowerCase()

  const students = getLeaderboard()

  if (!query) {
    return students
  }

  return students.filter((student) => {
    return (
      student.name.toLowerCase().includes(query) ||
      String(student.edNo || '')
        .toLowerCase()
        .includes(query)
    )
  })
})

const fullRanking = computed(() => {
  return getLeaderboard()
})

const selectedStudent = computed(() => {
  if (!selectedStudentId.value) {
    return null
  }

  return (
    fullRanking.value.find(
      (student) =>
        student.id === selectedStudentId.value,
    ) || null
  )
})

const selectedStudentRank = computed(() => {
  if (!selectedStudentId.value) {
    return null
  }

  const index = fullRanking.value.findIndex(
    (student) =>
      student.id === selectedStudentId.value,
  )

  return index >= 0 ? index + 1 : null
})

const selectedBreakdown = computed(() => {
  if (!selectedStudentId.value) {
    return []
  }

  return getStudentPointBreakdown(
    selectedStudentId.value,
  ).filter((row) => row.total !== 0)
})

function openBreakdown(studentId) {
  selectedStudentId.value = studentId
}

function closeBreakdown() {
  selectedStudentId.value = null
}

function getRankClass(rank) {
  if (rank === 1) {
    return 'leaderboard-row--gold'
  }

  if (rank === 2) {
    return 'leaderboard-row--silver'
  }

  if (rank === 3) {
    return 'leaderboard-row--bronze'
  }

  return ''
}

function formatMultiplier(multiplier) {
  const value = Number(multiplier) || 1
  return `${value.toFixed(2).replace(/\.?0+$/, '')}×`
}
</script>

<template>
  <div class="leaderboard-page">
    <header class="leaderboard-header">
      <div>
        <h1>Math Leaderboard</h1>
        <p>
          Student ranking based on progress,
          completion bonuses, and tests.
        </p>
      </div>

    </header>

    <main class="leaderboard-content">
      <section class="leaderboard-summary">
        <div>
          <span>Students</span>
          <strong>{{ fullRanking.length }}</strong>
        </div>

        <div>
          <span>Topics</span>
          <strong>{{ topics.length }}</strong>
        </div>

        <div>
          <span>Highest score</span>
          <strong>
            {{
              fullRanking.length
                ? formatPoints(fullRanking[0].points)
                : '0'
            }}
          </strong>
        </div>
      </section>

      <section class="leaderboard-card">
        <div class="leaderboard-card-heading">
          <div>
            <h2>Student Leaderboard</h2>
            <p>
              Select a student to view the point
              breakdown.
            </p>
          </div>

          <input
            v-model="searchQuery"
            type="search"
            class="leaderboard-search"
            placeholder="Search student or ED number"
          />
        </div>

        <div
          v-if="ranking.length"
          class="leaderboard-list"
        >
          <button
            v-for="student in ranking"
            :key="student.id"
            type="button"
            :class="[
              'leaderboard-row',
              getRankClass(
                fullRanking.findIndex(
                  (item) => item.id === student.id,
                ) + 1,
              ),
            ]"
            @click="openBreakdown(student.id)"
          >
            <span class="leaderboard-rank">
              {{
                fullRanking.findIndex(
                  (item) => item.id === student.id,
                ) + 1
              }}
            </span>

            <span class="leaderboard-avatar">
              {{
                student.name
                  .slice(0, 1)
                  .toUpperCase()
              }}
            </span>

            <span class="leaderboard-identity">
              <strong>{{ student.name }}</strong>

              <small>
                ED No.:
                {{ student.edNo || 'Not assigned' }}
              </small>
            </span>

            <span class="leaderboard-progress">
              <strong>
                {{ student.progressPercentage }}%
              </strong>

              <small>
                {{ student.completedTopics }}/{{
                  topics.length
                }}
                topics
              </small>
            </span>

            <span class="leaderboard-tests">
              <strong>
                {{
                  student.testStats.percentage === null
                    ? '—'
                    : `${student.testStats.percentage.toFixed(
                      1,
                    )}%`
                }}
              </strong>

              <small>test average</small>
            </span>

            <span class="leaderboard-points">
              <strong>
                {{ formatPoints(student.points) }}
              </strong>

              <small>points</small>
            </span>

            <span class="leaderboard-arrow">→</span>
          </button>
        </div>

        <div
          v-else
          class="leaderboard-empty"
        >
          No students found.
        </div>

        <div class="points-information">
          <strong>How points work</strong>

          <ul>
            <li>
              Every completed subtopic earns 10 points
              multiplied by topic difficulty.
            </li>

            <li>
              Completing a full topic adds a bonus based
              on difficulty and completion speed.
            </li>

            <li>
              Test points are added to the student's
              total.
            </li>

            <li>
              Test scores below 30% deduct 100 points.
            </li>
          </ul>
        </div>
      </section>
    </main>

    <div
      v-if="selectedStudent"
      class="leaderboard-modal-backdrop"
      @click.self="closeBreakdown"
    >
      <section
        class="leaderboard-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="`${selectedStudent.name} point breakdown`"
      >
        <header class="leaderboard-modal-header">
          <div>
            <span>
              Rank #{{ selectedStudentRank }}
            </span>

            <h2>{{ selectedStudent.name }}</h2>

            <p>
              ED No.:
              {{
                selectedStudent.edNo ||
                'Not assigned'
              }}
            </p>
          </div>

          <button
            type="button"
            class="modal-close-button"
            aria-label="Close point breakdown"
            @click="closeBreakdown"
          >
            ×
          </button>
        </header>

        <div class="leaderboard-modal-totals">
          <div>
            <span>Core points</span>

            <strong>
              {{
                formatPoints(
                  getStudentCorePoints(
                    selectedStudent.id,
                  ),
                )
              }}
            </strong>
          </div>

          <div>
            <span>Test points</span>

            <strong>
              {{
                formatPoints(
                  getStudentTestPoints(
                    selectedStudent.id,
                  ),
                )
              }}
            </strong>
          </div>

          <div>
            <span>Total points</span>

            <strong>
              {{
                formatPoints(
                  selectedStudent.points,
                )
              }}
            </strong>
          </div>
        </div>

        <div class="point-breakdown-list">
          <article
            v-for="row in selectedBreakdown"
            :key="row.topicId"
            class="point-breakdown-row"
          >
            <div class="point-breakdown-heading">
              <div>
                <strong>
                  {{ row.topicIndex + 1 }}.
                  {{ row.topicTitle }}
                </strong>

                <span>
                  Difficulty {{ row.difficulty }}
                </span>
              </div>

              <strong>
                {{ formatPoints(row.total) }} points
              </strong>
            </div>

            <div class="point-breakdown-details">
              <span>
                Subtopics:
                {{ formatPoints(row.subtopicPoints) }}
              </span>

              <span>
                Completion bonus:
                {{ formatPoints(row.completionBonus) }}
              </span>

              <span>
                Speed:
                {{
                  formatMultiplier(
                    row.speedMultiplier,
                  )
                }}
              </span>

              <span>
                Tests:
                {{ formatPoints(row.testPoints) }}
              </span>
            </div>
          </article>

          <div
            v-if="!selectedBreakdown.length"
            class="leaderboard-empty"
          >
            This student has not earned any points yet.
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
