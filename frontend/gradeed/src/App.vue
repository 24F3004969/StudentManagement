<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import { useMathStore } from '@/stores/mathStore'

const mathStore = useMathStore()

const {
  initialized,
  loading,
  loadError,
} = storeToRefs(mathStore)

onMounted(async () => {
  await mathStore.initialize()
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
      <strong>MathApp could not load.</strong>
      <span>{{ loadError }}</span>

      <button
        type="button"
        class="primary-button"
        @click="mathStore.initialize()"
      >
        Try Again
      </button>
    </div>

    <RouterView v-else />
  </div>
</template>
