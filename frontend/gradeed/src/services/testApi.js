import { apiClient } from '@/services/apiClient'

export const testApi = {
  findAll(studentId) {
    return apiClient.get(
      `/students/${studentId}/tests`,
    )
  },

  findSummary(studentId) {
    return apiClient.get(
      `/students/${studentId}/tests/summary`,
    )
  },

  findByTopic(studentId, topicId) {
    return apiClient.get(
      `/students/${studentId}/topics/${topicId}/tests`,
    )
  },

  save(studentId, topicId, testNumber, data) {
    return apiClient.put(
      `/students/${studentId}/topics/${topicId}/tests/${testNumber}`,
      data,
    )
  },

  delete(studentId, topicId, testNumber) {
    return apiClient.delete(
      `/students/${studentId}/topics/${topicId}/tests/${testNumber}`,
    )
  },
}
