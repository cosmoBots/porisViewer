import axios from 'axios'

const baseURL = import.meta.env.VITE_PORIS_BACKEND_URL || ''

export function hasPorisControl() {
  return Boolean(baseURL)
}

export function commitPorisState(payload, { url, csrfToken } = {}) {
  const target = url || `${baseURL}/api/poris/commit`
  const headers = csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
  return axios.post(target, payload, { headers }).then((response) => response.data)
}

export function executePorisCommand(commandName) {
  return axios.post(`${baseURL}/api/poris/command/${commandName}`, {}).then((response) => response.data)
}

export function getPorisState() {
  return axios.get(`${baseURL}/api/poris/state`).then((response) => response.data)
}
