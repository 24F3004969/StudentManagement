import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/main.css'
import {
  MASTER_TOPICS,
  MASTER_TOPICS_MERGED,
} from '@/constants/topics'

console.log('Original topics:', MASTER_TOPICS.length)
console.log('Merged topics:', MASTER_TOPICS_MERGED.length)

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
