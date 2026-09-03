<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import ParentReportModal from '@/components/reports/ParentReportModal.vue'
import { useMathStore } from '@/stores/mathStore'
import { useTopicProgress } from '@/composables/useTopicProgress'
import {
  formatDate,
  formatDateTime,
} from '@/utils/date'

const mathStore = useMathStore()
const {
  topics,
  lastActivity,
  completedAt,
  studentNotes,
} = storeToRefs(mathStore)
const parentReportStudentId = ref(null)
const teacherNoteDraft = ref('')
const {
  getStudent,
  getSubtopicProgress,
  getTopicStatus,
  getCurrentTopic,
  getCompletedTopicCount,
  getStudentProgressPercentage,
  getTopicProgressPercentage,
  toggleSubtopic,
  markAllSubtopicsComplete,
  completeTopicWithoutSubtopics,
  restartStudent,
  studentProgressRows,
} = useTopicProgress()

const searchQuery = ref('')
const selectedStudentId = ref(null)
const progressFilter = ref('all')
const expandedTopicIds = ref(new Set())
function openStudent(studentId) {
  selectedStudentId.value = studentId

  teacherNoteDraft.value =
    studentNotes.value[studentId] || ''

  const current = getCurrentTopic(studentId)

  expandedTopicIds.value = current
    ? new Set([current.topic.id])
    : new Set()
}
function saveTeacherNote() {
  if (!selectedStudentId.value) {
    return
  }

  mathStore.updateStudentNote(
    selectedStudentId.value,
    teacherNoteDraft.value,
  )
}

function openParentReport() {
  if (!selectedStudentId.value) {
    return
  }

  saveTeacherNote()

  parentReportStudentId.value =
    selectedStudentId.value
}

function closeParentReport() {
  parentReportStudentId.value = null
}
const filteredStudents = computed(() => {
  const query = searchQuery.value
    .trim()
    .toLowerCase()

  let rows = [...studentProgressRows.value].sort(
    (first, second) =>
      first.name.localeCompare(second.name),
  )

  if (query) {
    rows = rows.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.edNo.toLowerCase().includes(query),
    )
  }

  return rows.filter((student) => {
    const percentage = student.percentage

    switch (progressFilter.value) {
      case '0-25':
        return percentage <= 25
      case '25-50':
        return percentage > 25 && percentage <= 50
      case '50-75':
        return percentage > 50 && percentage <= 75
      case '75-99':
        return percentage > 75 && percentage < 100
      case '100':
        return percentage === 100
      default:
        return true
    }
  })
})

const selectedStudent = computed(() =>
  selectedStudentId.value
    ? getStudent(selectedStudentId.value)
    : null,
)

const selectedCurrentTopic = computed(() =>
  selectedStudentId.value
    ? getCurrentTopic(selectedStudentId.value)
    : null,
)

const selectedCompletedCount = computed(() =>
  selectedStudentId.value
    ? getCompletedTopicCount(selectedStudentId.value)
    : 0,
)

const selectedPercentage = computed(() =>
  selectedStudentId.value
    ? getStudentProgressPercentage(
      selectedStudentId.value,
    )
    : 0,
)



function closeStudent() {
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

function handleSubtopicToggle(topicId, subtopicIndex) {
  if (!selectedStudentId.value) {
    return
  }

  toggleSubtopic(
    selectedStudentId.value,
    topicId,
    subtopicIndex,
  )
}

function handleMarkAll(topic) {
  if (!selectedStudentId.value) {
    return
  }

  const confirmed = window.confirm(
    `Mark all remaining subtopics in "${topic.title}" as completed?`,
  )

  if (confirmed) {
    markAllSubtopicsComplete(
      selectedStudentId.value,
      topic.id,
    )
  }
}

function handleTopicCompletion(topic) {
  if (!selectedStudentId.value) {
    return
  }

  const confirmed = window.confirm(
    `Mark "${topic.title}" as completed?`,
  )

  if (confirmed) {
    completeTopicWithoutSubtopics(
      selectedStudentId.value,
      topic.id,
    )
  }
}

function handleRestart() {
  if (!selectedStudent.value) {
    return
  }

  const confirmed = window.confirm(
    `Restart progress for ${selectedStudent.value.name}? Existing completion and time data will be cleared.`,
  )

  if (confirmed) {
    restartStudent(selectedStudent.value.id)

    const current = getCurrentTopic(
      selectedStudent.value.id,
    )

    expandedTopicIds.value = current
      ? new Set([current.topic.id])
      : new Set()
  }
}

function statusLabel(status) {
  if (status === 'completed') {
    return 'Completed'
  }

  if (status === 'in-progress') {
    return 'In progress'
  }

  return 'Not started'
}
</script>

<template>
  <div class="progress-page">
    <header class="progress-header">
      <div>
        <h1>Student Progress</h1>
        <p>
          View topics and update student progress.
        </p>
      </div>
    </header>

    <main class="progress-content">
      <template v-if="!selectedStudent">
        <section class="progress-search-panel">
          <div>
            <h2>Find a Student</h2>
            <p>
              Search by student name or ED number.
            </p>
          </div>

          <input
            v-model="searchQuery"
            type="search"
            class="progress-search"
            placeholder="Search name or ED number"
            autofocus
          />

          <div class="progress-filters">
            <button
              v-for="filter in [
                ['all', 'All'],
                ['0-25', '0–25%'],
                ['25-50', '25–50%'],
                ['50-75', '50–75%'],
                ['75-99', '75–99%'],
                ['100', 'Completed'],
              ]"
              :key="filter[0]"
              type="button"
              :class="[
                'progress-filter',
                {
                  'progress-filter--active':
                    progressFilter === filter[0],
                },
              ]"
              @click="progressFilter = filter[0]"
            >
              {{ filter[1] }}
            </button>
          </div>
        </section>

        <section class="progress-student-grid">
          <button
            v-for="student in filteredStudents"
            :key="student.id"
            type="button"
            class="progress-student-card"
            @click="openStudent(student.id)"
          >
            <div class="progress-student-heading">
              <div class="progress-student-identity">
                <div class="progress-avatar">
                  {{
                    student.name
                      .slice(0, 1)
                      .toUpperCase()
                  }}
                </div>

                <div>
                  <strong>{{ student.name }}</strong>
                  <span>
                    ED No.:
                    {{ student.edNo || 'Not assigned' }}
                  </span>
                </div>
              </div>

              <strong class="progress-percentage">
                {{ student.percentage }}%
              </strong>
            </div>

            <div class="progress-bar">
              <div
                :style="{
                  width: `${student.percentage}%`,
                }"
              />
            </div>

            <div class="progress-student-details">
              <span>
                {{ student.completedCount }} of
                {{ topics.length }} topics completed
              </span>

              <span>
                {{
                  student.current?.topic.title ||
                  'All topics completed'
                }}
              </span>
            </div>
          </button>

          <div
            v-if="!filteredStudents.length"
            class="progress-empty"
          >
            No students match your search or filter.
          </div>
        </section>
      </template>

      <template v-else>
        <section class="student-progress-summary">
          <div class="student-progress-top">
            <button
              type="button"
              class="secondary-button"
              @click="closeStudent"
            >
              ← Students
            </button>

            <div class="student-progress-actions">
              <button
                type="button"
                class="primary-button"
                @click="openParentReport"
              >
                Parent Report
              </button>

              <button
                type="button"
                class="danger-outline-button"
                @click="handleRestart"
              >
                Restart Progress
              </button>
            </div>
          </div>

          <div class="student-progress-profile">
            <div class="progress-avatar progress-avatar--large">
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
                {{ selectedStudent.edNo || 'Not assigned' }}
              </p>

              <p>
                Last activity:
                {{
                  formatDateTime(
                    lastActivity[selectedStudent.id],
                  )
                }}
              </p>
            </div>

            <div class="student-progress-total">
              <strong>{{ selectedPercentage }}%</strong>
              <span>
                {{ selectedCompletedCount }} of
                {{ topics.length }} topics
              </span>
            </div>
          </div>

          <div class="progress-bar progress-bar--large">
            <div
              :style="{
                width: `${selectedPercentage}%`,
              }"
            />
          </div>

          <div
            v-if="selectedCurrentTopic"
            class="current-topic-banner"
          >
            <span>Current topic</span>
            <strong>
              {{ selectedCurrentTopic.index + 1 }}.
              {{ selectedCurrentTopic.topic.title }}
            </strong>
          </div>

          <div
            v-else
            class="completed-banner"
          >
            All topics completed
          </div>
        </section>
        <section
          v-if="selectedStudent"
          class="teacher-notes-section"
        >
          <div>
            <h2>Teacher Notes</h2>

            <p>
              This note will appear in the parent report.
            </p>
          </div>

          <textarea
            v-model="teacherNoteDraft"
            rows="5"
            maxlength="2000"
            placeholder="Add observations, homework, weak areas, or parent discussion points..."
            @blur="saveTeacherNote"
          />

          <div class="teacher-note-actions">
    <span>
      {{ teacherNoteDraft.length }}/2000
    </span>

            <button
              type="button"
              class="primary-button"
              @click="saveTeacherNote"
            >
              Save Note
            </button>
          </div>
        </section>
        <section class="student-topic-list">
          <article
            v-for="(topic, topicIndex) in topics"
            :key="topic.id"
            :class="[
              'student-topic-card',
              `student-topic-card--${getTopicStatus(
                selectedStudent.id,
                topic.id,
              )}`,
            ]"
          >
            <button
              type="button"
              class="student-topic-header"
              @click="toggleTopic(topic.id)"
            >
              <span class="student-topic-number">
                {{ topicIndex + 1 }}
              </span>

              <span class="student-topic-title">
                <strong>{{ topic.title }}</strong>

                <small>
                  {{
                    statusLabel(
                      getTopicStatus(
                        selectedStudent.id,
                        topic.id,
                      ),
                    )
                  }}
                </small>
              </span>

              <span class="student-topic-result">
                {{
                  getTopicProgressPercentage(
                    selectedStudent.id,
                    topic.id,
                  )
                }}%
              </span>

              <span
                :class="[
                  'topic-chevron',
                  {
                    'topic-chevron--open':
                      expandedTopicIds.has(topic.id),
                  },
                ]"
              >
                ›
              </span>
            </button>

            <div class="progress-bar topic-progress-bar">
              <div
                :style="{
                  width: `${getTopicProgressPercentage(
                    selectedStudent.id,
                    topic.id,
                  )}%`,
                }"
              />
            </div>

            <div
              v-if="expandedTopicIds.has(topic.id)"
              class="student-topic-body"
            >
              <div
                v-if="topic.subs.length"
                class="student-subtopic-list"
              >
                <label
                  v-for="(subtopic, subtopicIndex) in topic.subs"
                  :key="`${topic.id}-${subtopicIndex}`"
                  class="student-subtopic"
                >
                  <input
                    type="checkbox"
                    :checked="
                      getSubtopicProgress(
                        selectedStudent.id,
                        topic.id,
                      )[subtopicIndex]
                    "
                    @change="
                      handleSubtopicToggle(
                        topic.id,
                        subtopicIndex,
                      )
                    "
                  />

                  <span>{{ subtopic }}</span>
                </label>

                <button
                  v-if="
                    getTopicStatus(
                      selectedStudent.id,
                      topic.id,
                    ) !== 'completed'
                  "
                  type="button"
                  class="primary-button mark-all-button"
                  @click="handleMarkAll(topic)"
                >
                  Mark All Remaining Completed
                </button>
              </div>

              <div
                v-else
                class="topic-without-subtopics"
              >
                <p>
                  This topic has no subtopics.
                </p>

                <button
                  v-if="
                    getTopicStatus(
                      selectedStudent.id,
                      topic.id,
                    ) !== 'completed'
                  "
                  type="button"
                  class="primary-button"
                  @click="handleTopicCompletion(topic)"
                >
                  Mark Topic Completed
                </button>
              </div>

              <div
                v-if="
                  getTopicStatus(
                    selectedStudent.id,
                    topic.id,
                  ) === 'completed'
                "
                class="topic-completion-date"
              >
                Completed:
                {{
                  formatDate(
                    completedAt?.[selectedStudent.id]?.[
                      topic.id
                      ],
                  )
                }}
              </div>
            </div>
          </article>
        </section>
      </template>
    </main>
    <ParentReportModal
      v-if="parentReportStudentId"
      :student-id="parentReportStudentId"
      @close="closeParentReport"
    />
  </div>
</template>
