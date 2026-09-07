const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {}),
    },
  })

  if (response.status === 204) {
    return null
  }

  const contentType =
    response.headers.get('content-type') || ''

  let responseBody = null

  if (contentType.includes('application/json')) {
    responseBody = await response.json()
  } else {
    responseBody = await response.text()
  }

  if (!response.ok) {
    const validationMessage =
      responseBody?.validationErrors &&
      Object.values(responseBody.validationErrors)[0]

    const message =
      validationMessage ||
      responseBody?.message ||
      responseBody?.error ||
      `Request failed with status ${response.status}`

    const error = new Error(message)

    error.status = response.status
    error.response = responseBody

    throw error
  }

  return responseBody
}

export const apiClient = {
  get(path) {
    return request(path)
  },

  post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  put(path, body) {
    return request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  patch(path, body) {
    return request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  delete(path) {
    return request(path, {
      method: 'DELETE',
    })
  },
}
