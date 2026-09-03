<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'

const mathStore = useMathStore()
const { topics, students } = storeToRefs(mathStore)

const topicName = ref('')
const studentName = ref('')
const studentEdNo = ref('')

const topicQuery = ref('')
const studentQuery = ref('')

const openTopicIds = ref(new Set())
const editingTopicId = ref(null)
const editingTopicName = ref('')

const editingStudentId = ref(null)
const editingStudentName = ref('')
const editingStudentEdNo = ref('')

const newSubtopics = ref({})
const editingSubtopic = ref(null)
const editingSubtopicName = ref('')

const message = ref('')
const errorMessage = ref('')

function clearMessages() {
  message.value = ''
  errorMessage.value = ''
}

function showError(error) {
  message.value = ''
  errorMessage.value =
    error instanceof Error
      ? error.message
      : 'Something went wrong.'
}

function showSuccess(value) {
  errorMessage.value = ''
  message.value = value
}

const filteredTopics = computed(() => {
  const query = topicQuery.value.trim().toLowerCase()

  if (!query) {
    return topics.value
  }

  return topics.value.filter((topic) => {
    const titleMatches = topic.title
      .toLowerCase()
      .includes(query)

    const subtopicMatches = topic.subs.some((subtopic) =>
      subtopic.toLowerCase().includes(query),
    )

    return titleMatches || subtopicMatches
  })
})

const filteredStudents = computed(() => {
  const query = studentQuery.value.trim().toLowerCase()

  const sortedStudents = [...students.value].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  if (!query) {
    return sortedStudents
  }

  return sortedStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(query) ||
      student.edNo.toLowerCase().includes(query),
  )
})

function toggleTopic(topicId) {
  const next = new Set(openTopicIds.value)

  if (next.has(topicId)) {
    next.delete(topicId)
  } else {
    next.add(topicId)
  }

  openTopicIds.value = next
}

function expandAll() {
  openTopicIds.value = new Set(
    filteredTopics.value.map((topic) => topic.id),
  )
}

function collapseAll() {
  openTopicIds.value = new Set()
}

function submitTopic() {
  clearMessages()

  try {
    mathStore.addTopic(topicName.value)
    topicName.value = ''
    showSuccess('Topic added successfully.')
  } catch (error) {
    showError(error)
  }
}

function startTopicEdit(topic) {
  editingTopicId.value = topic.id
  editingTopicName.value = topic.title
}

function cancelTopicEdit() {
  editingTopicId.value = null
  editingTopicName.value = ''
}

function saveTopicEdit(topicId) {
  clearMessages()

  try {
    mathStore.updateTopic(
      topicId,
      editingTopicName.value,
    )

    cancelTopicEdit()
    showSuccess('Topic updated successfully.')
  } catch (error) {
    showError(error)
  }
}

function removeTopic(topic) {
  const confirmed = window.confirm(
    `Delete "${topic.title}" and all its subtopics?`,
  )

  if (!confirmed) {
    return
  }

  clearMessages()

  try {
    mathStore.deleteTopic(topic.id)
    showSuccess('Topic deleted successfully.')
  } catch (error) {
    showError(error)
  }
}

function changeTopicPosition(topic, event) {
  clearMessages()

  try {
    mathStore.moveTopic(topic.id, event.target.value)
    showSuccess('Topic position updated.')
  } catch (error) {
    showError(error)
  }
}

function submitSubtopic(topic) {
  clearMessages()

  try {
    mathStore.addSubtopic(
      topic.id,
      newSubtopics.value[topic.id] || '',
    )

    newSubtopics.value[topic.id] = ''
    showSuccess('Subtopic added successfully.')
  } catch (error) {
    showError(error)
  }
}

function startSubtopicEdit(topic, index) {
  editingSubtopic.value = {
    topicId: topic.id,
    index,
  }

  editingSubtopicName.value = topic.subs[index]
}

function cancelSubtopicEdit() {
  editingSubtopic.value = null
  editingSubtopicName.value = ''
}

function saveSubtopicEdit() {
  if (!editingSubtopic.value) {
    return
  }

  clearMessages()

  try {
    mathStore.updateSubtopic(
      editingSubtopic.value.topicId,
      editingSubtopic.value.index,
      editingSubtopicName.value,
    )

    cancelSubtopicEdit()
    showSuccess('Subtopic updated successfully.')
  } catch (error) {
    showError(error)
  }
}

function removeSubtopic(topic, index) {
  const subtopic = topic.subs[index]

  const confirmed = window.confirm(
    `Delete subtopic "${subtopic}"?`,
  )

  if (!confirmed) {
    return
  }

  clearMessages()

  try {
    mathStore.deleteSubtopic(topic.id, index)
    showSuccess('Subtopic deleted successfully.')
  } catch (error) {
    showError(error)
  }
}

function submitStudent() {
  clearMessages()

  try {
    mathStore.addStudent(
      studentName.value,
      studentEdNo.value,
    )

    studentName.value = ''
    studentEdNo.value = ''

    showSuccess('Student added successfully.')
  } catch (error) {
    showError(error)
  }
}

function startStudentEdit(student) {
  editingStudentId.value = student.id
  editingStudentName.value = student.name
  editingStudentEdNo.value = student.edNo
}

function cancelStudentEdit() {
  editingStudentId.value = null
  editingStudentName.value = ''
  editingStudentEdNo.value = ''
}

function saveStudentEdit(studentId) {
  clearMessages()

  try {
    mathStore.updateStudent(
      studentId,
      editingStudentName.value,
      editingStudentEdNo.value,
    )

    cancelStudentEdit()
    showSuccess('Student updated successfully.')
  } catch (error) {
    showError(error)
  }
}

function removeStudent(student) {
  const label = student.edNo
    ? `${student.name} (${student.edNo})`
    : student.name

  const confirmed = window.confirm(
    `Permanently remove ${label}?`,
  )

  if (!confirmed) {
    return
  }

  clearMessages()

  try {
    mathStore.deleteStudent(student.id)
    showSuccess('Student removed successfully.')
  } catch (error) {
    showError(error)
  }
}
</script>

<template>
  <div class="manage-page">
    <header class="manage-header">
      <div>
        <h1>Manage Topics and Students</h1>
        <p>
          Add, edit, reorder, and remove application data.
        </p>
      </div>
    </header>

    <main class="manage-content">
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

      <section class="management-grid">
        <div class="management-panel">
          <div class="panel-heading">
            <div>
              <h2>Topics</h2>
              <p>{{ topics.length }} topics</p>
            </div>

            <div class="panel-actions">
              <button
                type="button"
                class="text-button"
                @click="expandAll"
              >
                Expand all
              </button>

              <button
                type="button"
                class="text-button"
                @click="collapseAll"
              >
                Collapse all
              </button>
            </div>
          </div>

          <form
            class="add-form"
            @submit.prevent="submitTopic"
          >
            <input
              v-model="topicName"
              type="text"
              maxlength="120"
              placeholder="New topic name"
            />

            <button
              type="submit"
              class="primary-button"
            >
              Add Topic
            </button>
          </form>

          <input
            v-model="topicQuery"
            class="search-input"
            type="search"
            placeholder="Search topics or subtopics"
          />

          <div class="topic-list">
            <article
              v-for="topic in filteredTopics"
              :key="topic.id"
              class="topic-card"
            >
              <div class="topic-header">
                <button
                  type="button"
                  class="topic-toggle"
                  @click="toggleTopic(topic.id)"
                >
                  <span class="topic-number">
                    {{
                      topics.findIndex(
                        (item) => item.id === topic.id,
                      ) + 1
                    }}
                  </span>

                  <span class="topic-title-area">
                    <strong>{{ topic.title }}</strong>
                    <small>
                      {{ topic.subs.length }} subtopics
                    </small>
                  </span>
                </button>

                <div class="topic-controls">
                  <select
                    :value="
                      topics.findIndex(
                        (item) => item.id === topic.id,
                      ) + 1
                    "
                    title="Topic position"
                    @change="
                      changeTopicPosition(topic, $event)
                    "
                  >
                    <option
                      v-for="position in topics.length"
                      :key="position"
                      :value="position"
                    >
                      {{ position }}
                    </option>
                  </select>

                  <button
                    type="button"
                    class="icon-button"
                    title="Edit topic"
                    @click="startTopicEdit(topic)"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="icon-button icon-button--danger"
                    title="Delete topic"
                    @click="removeTopic(topic)"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <form
                v-if="editingTopicId === topic.id"
                class="inline-edit"
                @submit.prevent="saveTopicEdit(topic.id)"
              >
                <input
                  v-model="editingTopicName"
                  type="text"
                  maxlength="120"
                  autofocus
                />

                <button
                  type="submit"
                  class="primary-button"
                >
                  Save
                </button>

                <button
                  type="button"
                  class="secondary-button"
                  @click="cancelTopicEdit"
                >
                  Cancel
                </button>
              </form>

              <div
                v-if="openTopicIds.has(topic.id)"
                class="subtopic-section"
              >
                <form
                  class="add-form"
                  @submit.prevent="submitSubtopic(topic)"
                >
                  <input
                    v-model="newSubtopics[topic.id]"
                    type="text"
                    maxlength="160"
                    placeholder="New subtopic"
                  />

                  <button
                    type="submit"
                    class="primary-button"
                  >
                    Add
                  </button>
                </form>

                <div
                  v-if="topic.subs.length"
                  class="subtopic-list"
                >
                  <div
                    v-for="(subtopic, index) in topic.subs"
                    :key="`${topic.id}-${index}`"
                    class="subtopic-row"
                  >
                    <template
                      v-if="
                        editingSubtopic?.topicId ===
                          topic.id &&
                        editingSubtopic?.index === index
                      "
                    >
                      <input
                        v-model="editingSubtopicName"
                        type="text"
                        maxlength="160"
                        autofocus
                        @keydown.enter.prevent="
                          saveSubtopicEdit
                        "
                        @keydown.esc="cancelSubtopicEdit"
                      />

                      <button
                        type="button"
                        class="primary-button"
                        @click="saveSubtopicEdit"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        class="secondary-button"
                        @click="cancelSubtopicEdit"
                      >
                        Cancel
                      </button>
                    </template>

                    <template v-else>
                      <span>{{ subtopic }}</span>

                      <div>
                        <button
                          type="button"
                          class="text-button"
                          @click="
                            startSubtopicEdit(topic, index)
                          "
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          class="danger-text-button"
                          @click="
                            removeSubtopic(topic, index)
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </template>
                  </div>
                </div>

                <p
                  v-else
                  class="empty-message"
                >
                  No subtopics added.
                </p>
              </div>
            </article>

            <p
              v-if="!filteredTopics.length"
              class="empty-message"
            >
              No topics match the search.
            </p>
          </div>
        </div>

        <div class="management-panel">
          <div class="panel-heading">
            <div>
              <h2>Students</h2>
              <p>{{ students.length }} students</p>
            </div>
          </div>

          <form
            class="student-form"
            @submit.prevent="submitStudent"
          >
            <input
              v-model="studentName"
              type="text"
              maxlength="60"
              placeholder="Student name"
            />

            <input
              v-model="studentEdNo"
              type="text"
              maxlength="30"
              placeholder="ED number"
            />

            <button
              type="submit"
              class="primary-button"
            >
              Add Student
            </button>
          </form>

          <input
            v-model="studentQuery"
            class="search-input"
            type="search"
            placeholder="Search name or ED number"
          />

          <div class="student-list">
            <article
              v-for="student in filteredStudents"
              :key="student.id"
              class="student-card"
            >
              <template
                v-if="editingStudentId === student.id"
              >
                <form
                  class="student-edit-form"
                  @submit.prevent="
                    saveStudentEdit(student.id)
                  "
                >
                  <input
                    v-model="editingStudentName"
                    type="text"
                    maxlength="60"
                    placeholder="Student name"
                  />

                  <input
                    v-model="editingStudentEdNo"
                    type="text"
                    maxlength="30"
                    placeholder="ED number"
                  />

                  <div class="student-buttons">
                    <button
                      type="submit"
                      class="primary-button"
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      class="secondary-button"
                      @click="cancelStudentEdit"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </template>

              <template v-else>
                <div class="student-identity">
                  <div class="student-avatar">
                    {{
                      student.name
                        .slice(0, 1)
                        .toUpperCase()
                    }}
                  </div>

                  <div>
                    <strong>{{ student.name }}</strong>
                    <small>
                      ED No.:
                      {{ student.edNo || 'Not assigned' }}
                    </small>
                  </div>
                </div>

                <div class="student-buttons">
                  <button
                    type="button"
                    class="text-button"
                    @click="startStudentEdit(student)"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="danger-text-button"
                    @click="removeStudent(student)"
                  >
                    Delete
                  </button>
                </div>
              </template>
            </article>

            <p
              v-if="!filteredStudents.length"
              class="empty-message"
            >
              No students found.
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
