export function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) {
    return '—'
  }

  const seconds = Math.floor(milliseconds / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days) {
    return `${days}d ${hours}h`
  }

  if (hours) {
    return `${hours}h ${minutes}m`
  }

  if (minutes) {
    return `${minutes}m`
  }

  return `${seconds % 60}s`
}

export function formatDate(timestamp) {
  if (!timestamp) {
    return 'Date not recorded'
  }

  const date = new Date(Number(timestamp))

  if (Number.isNaN(date.getTime())) {
    return 'Date not recorded'
  }

  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(timestamp) {
  if (!timestamp) {
    return 'No activity recorded'
  }

  const date = new Date(Number(timestamp))

  if (Number.isNaN(date.getTime())) {
    return 'No activity recorded'
  }

  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timestampToDateInput(timestamp) {
  if (!timestamp) {
    return ''
  }

  const date = new Date(Number(timestamp))

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function dateInputToTimestamp(value) {
  if (!value) {
    return null
  }

  const timestamp = new Date(`${value}T12:00:00`).getTime()

  return Number.isFinite(timestamp) ? timestamp : null
}

export function getDaysSince(timestamp) {
  if (!timestamp) {
    return null
  }

  const difference = Math.max(0, Date.now() - Number(timestamp))

  return Math.floor(difference / 86400000)
}
