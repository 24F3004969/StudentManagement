<script setup>
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'

const mathStore = useMathStore()

const {
  studentCount,
  topicCount,
  completedStudents,
} = storeToRefs(mathStore)

const actions = [
  {
    title: 'Student Progress',
    description: 'Track individual progress',
    route: 'student-progress',
  },
  {
    title: 'Testing',
    description: 'Enter and review marks',
    route: 'testing',
  },
  {
    title: 'Leaderboard',
    description: 'View student rankings',
    route: 'leaderboard',
  },
  {
    title: 'Overview',
    description: 'See class insights',
    route: 'overview',
  },
]
</script>

<template>
  <main class="dashboard">
    <section class="dashboard__hero">
      <p class="dashboard__eyebrow">
        Mathematics Progress Manager
      </p>

      <h1>GradeEd MathApp</h1>

      <div class="dashboard__stats">
        <div>
          <strong>{{ studentCount }}</strong>
          <span>Students</span>
        </div>

        <div>
          <strong>{{ topicCount }}</strong>
          <span>Topics</span>
        </div>

        <div>
          <strong>{{ completedStudents.length }}</strong>
          <span>Completed</span>
        </div>
      </div>
    </section>

    <section class="dashboard__actions">
      <RouterLink
        v-for="action in actions"
        :key="action.route"
        :to="{ name: action.route }"
        class="dashboard-action"
      >
        <strong>{{ action.title }}</strong>
        <span>{{ action.description }}</span>
      </RouterLink>
    </section>

    <RouterLink
      :to="{ name: 'manage' }"
      class="dashboard-manage"
    >
      <strong>Manage Topics and Students</strong>
      <span>Add, edit, and manage application data.</span>
    </RouterLink>
  </main>
</template>
