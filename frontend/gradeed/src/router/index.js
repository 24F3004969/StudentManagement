import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '@/views/DashboardView.vue'
import OverviewView from '@/views/OverviewView.vue'
import StudentProgressView from '@/views/StudentProgressView.vue'
import TestingView from '@/views/TestingView.vue'
import LeaderboardView from '@/views/LeaderboardView.vue'
import ManageView from '@/views/ManageView.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
  },
  {
    path: '/overview',
    name: 'overview',
    component: OverviewView,
  },
  {
    path: '/students',
    name: 'student-progress',
    component: StudentProgressView,
  },
  {
    path: '/testing',
    name: 'testing',
    component: TestingView,
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: LeaderboardView,
  },
  {
    path: '/manage',
    name: 'manage',
    component: ManageView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
