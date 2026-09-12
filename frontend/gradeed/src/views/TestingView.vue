<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'
import { useStudentPoints } from '@/composables/useStudentPoints'

const mathStore = useMathStore()
const { students, topics } = storeToRefs(mathStore)

const {
  getTests,
  updateTest,
  clearTest,
  getTestPercentage,
  getCompletedTopics,
  getTopicTestStats,
  getStudentTestStats,
  formatPoints,
} = useStudentPoints()

const searchQuery = ref('')
const selectedStudentId = ref(null)
const expandedTopicIds = ref(new Set())
const message = ref('')
const errorMessage = ref('')
const actionLoading = ref(false)
const actionError = ref('')
const filteredStudents = computed(() => {
  const query = searchQuery.value
    .trim()
    .toLowerCase()

  const sortedStudents = [...students.value].sort(
    (first, second) =>
      first.name.localeCompare(second.name),
  )

  if (!query) {
    return sortedStudents
  }

  return sortedStudents.filter((student) => {
    return (
      student.name.toLowerCase().includes(query) ||
      String(student.edNo || '')
        .toLowerCase()
        .includes(query)
    )
  })
})

const selectedStudent = computed(() => {
  if (!selectedStudentId.value) {
    return null
  }

  return (
    students.value.find(
      (student) =>
        student.id === selectedStudentId.value,
    ) || null
  )
})

const completedTopics = computed(() => {
  if (!selectedStudentId.value) {
    return []
  }

  return getCompletedTopics(selectedStudentId.value)
})

const studentStats = computed(() => {
  if (!selectedStudentId.value) {
    return {
      totalTests: 0,
      totalScore: 0,
      totalMaximum: 0,
      totalPoints: 0,
      percentage: null,
    }
  }

  return getStudentTestStats(
    selectedStudentId.value,
  )
})

function clearMessages() {
  message.value = ''
  errorMessage.value = ''
}

async function openStudent(studentId) {
  clearMessages()
  actionError.value = ''
  actionLoading.value = true

  try {
    await mathStore.loadStudentTests(studentId)

    selectedStudentId.value = studentId
    expandedTopicIds.value = new Set()
  } catch (error) {
    actionError.value =
      error instanceof Error
        ? error.message
        : 'Could not load student tests.'
  } finally {
    actionLoading.value = false
  }
}
async function saveTestField(
  topicId,
  testIndex,
  changes,
) {
  actionError.value = ''
  actionLoading.value = true

  try {
    await updateTest(
      selectedStudentId.value,
      topicId,
      testIndex,
      changes,
    )
  } catch (error) {
    actionError.value =
      error instanceof Error
        ? error.message
        : 'Could not save the test result.'
  } finally {
    actionLoading.value = false
  }
}

function closeStudent() {
  clearMessages()
  selectedStudentId.value = null
  expandedTopicIds.value = new Set()
}

function toggleTopic(topicId) {
  const next = new Set(expandedTopicIds.value)

  if (next.has(topicId)) {
    next.delete(topicId)
  } else {
    next.add(topicId)
  }

  expandedTopicIds.value = next
}

function getTopicNumber(topicId) {
  return (
    topics.value.findIndex(
      (topic) => topic.id === topicId,
    ) + 1
  )
}

async function handleScoreChange(
  topicId,
  testIndex,
  event,
) {
  const value = event.target.value

  if (value !== '' && Number(value) < 0) {
    actionError.value =
      'Marks obtained cannot be negative.'

    return
  }

  await saveTestField(topicId, testIndex, {
    score: value,
  })
}

async function handleMaximumChange(
  topicId,
  testIndex,
  event,
) {
  const value = event.target.value

  actionError.value = ''

  // Allow an empty or zero draft without showing an error.
  if (
    value !== '' &&
    (!Number.isFinite(Number(value)) ||
      Number(value) < 0)
  ) {
    actionError.value =
      'Total marks cannot be negative.'

    return
  }

  await saveTestField(topicId, testIndex, {
    max: value,
  })
}
async function handleDateChange(
  topicId,
  testIndex,
  event,
) {
  await saveTestField(topicId, testIndex, {
    date: event.target.value,
  })
}

async function handleRemarkChange(
  topicId,
  testIndex,
  event,
) {
  await saveTestField(topicId, testIndex, {
    remark: event.target.value,
  })
}
async function removeTest(topicId, testIndex) {
  const confirmed = window.confirm(
    `Clear Test ${testIndex + 1}?`,
  )

  if (!confirmed) {
    return
  }

  actionError.value = ''
  actionLoading.value = true

  try {
    await clearTest(
      selectedStudentId.value,
      topicId,
      testIndex,
    )

    message.value = 'Test result cleared.'
  } catch (error) {
    actionError.value =
      error instanceof Error
        ? error.message
        : 'Could not clear the test result.'
  } finally {
    actionLoading.value = false
  }
}

function percentageLabel(test) {
  const percentage = getTestPercentage(test)

  if (percentage === null) {
    return 'Not recorded'
  }

  return `${percentage.toFixed(2)}%`
}

function pointsLabel(test) {
  const percentage = getTestPercentage(test)

  if (percentage === null) {
    return '—'
  }

  const points = Number(test.points) || 0

  return points > 0 ? `+${points}` : String(points)
}
</script>

<template>
  <div class="testing-page">
    <header class="testing-header">
      <div>
        <h1>
          Testing
          <template v-if="selectedStudent">
            <span>/</span>
            {{ selectedStudent.name }}
          </template>
        </h1>

        <p>
          Enter and review student test results.
        </p>
      </div>

      <button
        v-if="selectedStudent"
        type="button"
        class="secondary-button"
        @click="closeStudent"
      >
        ← Students
      </button>
    </header>

    <main class="testing-content">
      <div
        v-if="message"
        class="message message--success"
      >
        {{ message }}
      </div>

      <div
        v-if="errorMessage"
        class="message message--error"
      >
        {{ errorMessage }}
      </div>

      <template v-if="!selectedStudent">
        <section class="testing-search-panel">
          <h2>Find a Student</h2>

          <p>
            Search by student name or ED number.
          </p>

          <input
            v-model="searchQuery"
            type="search"
            class="testing-search-input"
            placeholder="Search student name or ED number"
            autofocus
          />
        </section>

        <section
          v-if="searchQuery.trim()"
          class="testing-student-list"
        >
          <button
            v-for="student in filteredStudents"
            :key="student.id"
            type="button"
            class="testing-student-row"
            @click="openStudent(student.id)"
          >
            <div class="testing-avatar">
              {{
                student.name
                  .slice(0, 1)
                  .toUpperCase()
              }}
            </div>

            <div class="testing-student-identity">
              <strong>{{ student.name }}</strong>

              <span>
                ED No.:
                {{ student.edNo || 'Not assigned' }}
              </span>
            </div>

            <div class="testing-student-summary">
              <strong>
                {{
                  getCompletedTopics(student.id).length
                }}
              </strong>

              <span>completed topics</span>
            </div>

            <div class="testing-student-summary">
              <strong>
                {{
                  getStudentTestStats(student.id)
                    .totalTests
                }}
              </strong>

              <span>tests recorded</span>
            </div>

            <span class="testing-arrow">→</span>
          </button>

          <div
            v-if="!filteredStudents.length"
            class="testing-empty"
          >
            No student matches “{{ searchQuery }}”.
          </div>
        </section>

        <div
          v-else
          class="testing-empty testing-empty--large"
        >
          Start typing to find a student.
        </div>
      </template>

      <template v-else>
        <section class="testing-summary-card">
          <div class="testing-student-profile">
            <div class="testing-avatar testing-avatar--large">
              {{
                selectedStudent.name
                  .slice(0, 1)
                  .toUpperCase()
              }}
            </div>

            <div>
              <h2>{{ selectedStudent.name }}</h2>

              <p>
                ED No.:
                {{
                  selectedStudent.edNo ||
                  'Not assigned'
                }}
              </p>
            </div>
          </div>

          <div class="testing-stat-grid">
            <div class="testing-stat">
              <span>Completed topics</span>

              <strong>
                {{ completedTopics.length }}
              </strong>
            </div>

            <div class="testing-stat">
              <span>Tests recorded</span>

              <strong>
                {{ studentStats.totalTests }}
              </strong>
            </div>

            <div class="testing-stat">
              <span>Test average</span>

              <strong>
                {{
                  studentStats.percentage === null
                    ? '—'
                    : `${studentStats.percentage.toFixed(
                      2,
                    )}%`
                }}
              </strong>
            </div>

            <div class="testing-stat">
              <span>Test points</span>

              <strong>
                {{
                  formatPoints(
                    studentStats.totalPoints,
                  )
                }}
              </strong>
            </div>
          </div>
        </section>

        <section
          v-if="completedTopics.length"
          class="testing-topic-list"
        >
          <article
            v-for="topic in completedTopics"
            :key="topic.id"
            class="testing-topic-card"
          >
            <button
              type="button"
              class="testing-topic-header"
              @click="toggleTopic(topic.id)"
            >
              <div>
                <strong>
                  {{ getTopicNumber(topic.id) }}.
                  {{ topic.title }}
                </strong>

                <span>
                  {{
                    getTopicTestStats(
                      selectedStudent.id,
                      topic.id,
                    ).recordedTests
                  }}/3 tests recorded
                </span>
              </div>

              <div class="testing-topic-header-result">
                <strong>
                  {{
                    formatPoints(
                      getTopicTestStats(
                        selectedStudent.id,
                        topic.id,
                      ).totalPoints,
                    )
                  }}
                  points
                </strong>

                <span
                  :class="[
                    'testing-chevron',
                    {
                      'testing-chevron--open':
                        expandedTopicIds.has(
                          topic.id,
                        ),
                    },
                  ]"
                >
                  ›
                </span>
              </div>
            </button>

            <div
              v-if="expandedTopicIds.has(topic.id)"
              class="testing-topic-body"
            >
              <article
                v-for="(test, testIndex) in getTests(
                  selectedStudent.id,
                  topic.id,
                )"
                :key="test.id"
                class="test-result-card"
              >
                <div class="test-result-heading">
                  <strong>
                    Test {{ testIndex + 1 }}
                  </strong>

                  <div class="test-result-badges">
                    <span class="test-percentage-badge">
                      {{ percentageLabel(test) }}
                    </span>

                    <span class="test-points-badge">
                      {{ pointsLabel(test) }} points
                    </span>
                  </div>
                </div>

                <div class="test-fields">
                  <label>
                    <span>Marks obtained</span>

                    <input
                      :value="test.score"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      @change="
                        handleScoreChange(
                          topic.id,
                          testIndex,
                          $event,
                        )
                      "
                    />
                  </label>

                  <label>
                    <span>Total marks</span>

                    <input
                      :value="test.max"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      @change="
                        handleMaximumChange(
                          topic.id,
                          testIndex,
                          $event,
                        )
                      "
                    />
                  </label>

                  <label>
                    <span>Date of test</span>

                    <input
                      :value="test.date"
                      type="date"
                      @change="
                        handleDateChange(
                          topic.id,
                          testIndex,
                          $event,
                        )
                      "
                    />
                  </label>

                  <button
                    type="button"
                    class="clear-test-button"
                    @click="
                      removeTest(topic.id, testIndex)
                    "
                  >
                    Clear
                  </button>
                </div>

                <label class="test-remark-field">
                  <span>Teacher remark</span>

                  <textarea
                    :value="test.remark"
                    rows="2"
                    maxlength="500"
                    placeholder="Optional test remark"
                    @change="
                      handleRemarkChange(
                        topic.id,
                        testIndex,
                        $event,
                      )
                    "
                  />
                </label>
              </article>
            </div>
          </article>
        </section>

        <div
          v-else
          class="testing-empty testing-empty--large"
        >
          <strong>No completed topics</strong>

          <span>
            Testing becomes available after the
            student completes a topic.
          </span>
        </div>
      </template>
      <div
        v-if="actionError"
        class="message message--error"
      >
        {{ actionError }}
      </div>

      <div
        v-if="actionLoading"
        class="progress-action-loading"
      >
        Saving test...
      </div>
    </main>
  </div>
</template>
