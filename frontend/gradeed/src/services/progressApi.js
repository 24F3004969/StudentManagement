import { apiClient } from '@/services/apiClient'

export const progressApi = {
  findByStudent(studentId) {
    return apiClient.get(
      `/students/${studentId}/progress`,
    )
  },

  setSubtopicCompletion(
    studentId,
    topicId,
    subtopicId,
    completed,
  ) {
    return apiClient.put(
      `/students/${studentId}/progress/topics/${topicId}/subtopics/${subtopicId}`,
      { completed },
    )
  },

  completeAllSubtopics(studentId, topicId) {
    return apiClient.post(
      `/students/${studentId}/progress/topics/${topicId}/complete-subtopics`,
      {},
    )
  },

  completeTopic(studentId, topicId) {
    return apiClient.post(
      `/students/${studentId}/progress/topics/${topicId}/complete`,
      {},
    )
  },

  changeCompletionDate(
    studentId,
    topicId,
    completedDate,
  ) {
    return apiClient.patch(
      `/students/${studentId}/progress/topics/${topicId}/completion-date`,
      { completedDate },
    )
  },

  restart(studentId) {
    return apiClient.post(
      `/students/${studentId}/progress/restart`,
      {},
    )
  },
}
