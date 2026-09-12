import { apiClient } from '@/services/apiClient'

export const noteApi = {
  findByStudent(studentId) {
    return apiClient.get(
      `/students/${studentId}/note`,
    )
  },

  save(studentId, note) {
    return apiClient.put(
      `/students/${studentId}/note`,
      { note },
    )
  },

  delete(studentId) {
    return apiClient.delete(
      `/students/${studentId}/note`,
    )
  },
}
