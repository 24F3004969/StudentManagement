import { apiClient } from '@/services/apiClient'

export const studentApi = {
  findAll(query = '') {
    const cleanedQuery = String(query).trim()

    if (!cleanedQuery) {
      return apiClient.get('/students')
    }

    return apiClient.get(
      `/students?query=${encodeURIComponent(
        cleanedQuery,
      )}`,
    )
  },

  findById(studentId) {
    return apiClient.get(`/students/${studentId}`)
  },

  create(data) {
    return apiClient.post('/students', data)
  },

  update(studentId, data) {
    return apiClient.put(
      `/students/${studentId}`,
      data,
    )
  },

  updateOverallPoints(studentId, basePoints) {
    return apiClient.patch(
      `/students/${studentId}/overall-points`,
      { basePoints },
    )
  },

  delete(studentId) {
    return apiClient.delete(`/students/${studentId}`)
  },
}
