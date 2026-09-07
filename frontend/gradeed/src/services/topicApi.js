import { apiClient } from '@/services/apiClient'

export const topicApi = {
  findAll() {
    return apiClient.get('/topics')
  },

  findById(topicId) {
    return apiClient.get(`/topics/${topicId}`)
  },

  create(data) {
    return apiClient.post('/topics', data)
  },

  update(topicId, data) {
    return apiClient.put(`/topics/${topicId}`, data)
  },

  move(topicId, position) {
    return apiClient.patch(
      `/topics/${topicId}/position`,
      { position },
    )
  },

  delete(topicId) {
    return apiClient.delete(`/topics/${topicId}`)
  },

  addSubtopic(topicId, data) {
    return apiClient.post(
      `/topics/${topicId}/subtopics`,
      data,
    )
  },

  updateSubtopic(topicId, subtopicId, data) {
    return apiClient.put(
      `/topics/${topicId}/subtopics/${subtopicId}`,
      data,
    )
  },

  deleteSubtopic(topicId, subtopicId) {
    return apiClient.delete(
      `/topics/${topicId}/subtopics/${subtopicId}`,
    )
  },
}
