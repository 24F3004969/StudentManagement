<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'

const mathStore = useMathStore()

const {
  initialized,
  loading,
  loadError,
  topics,
  students,
  progress,
  startedAt,
  timeSpent,
  lastActivity,
  completedAt,
  subProgressBool,
  testScores,
  overallPointBase,
  studentNotes,
} = storeToRefs(mathStore)

let stopPersistenceWatcher = null

onMounted(async () => {
  await mathStore.initialize()

  stopPersistenceWatcher = watch(
    [
      topics,
      students,
      progress,
      startedAt,
      timeSpent,
      lastActivity,
      completedAt,
      subProgressBool,
      testScores,
      overallPointBase,
      studentNotes,
    ],
    () => {
      mathStore.scheduleSave()
    },
    {
      deep: true,
    },
  )
})

onBeforeUnmount(() => {
  if (stopPersistenceWatcher) {
    stopPersistenceWatcher()
  }

  mathStore.saveNow()
})
</script>

<template>
  <div class="app-shell">
    <div
      v-if="loading || !initialized"
      class="app-status"
    >
      Loading MathApp...
    </div>

    <div
      v-else-if="loadError"
      class="app-status app-status--error"
    >
      <strong>MathApp could not load correctly.</strong>
      <span>{{ loadError }}</span>
    </div>

    <RouterView v-else />
  </div>
</template>
