import api from './client'

/** Removes empty options so the URL stays clean: {tag: 'tech', q: ''} -> ?tag=tech */
function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

/** GET /api/events?q=&tag=&club=&from=&to=&sort=&dir=&page=&size= */
export const fetchEvents = (params = {}) => api.get('/events', { params: clean(params) }).then((r) => r.data)

export const fetchEvent = (id) => api.get(`/events/${id}`).then((r) => r.data)

export const fetchClubs = () => api.get('/clubs').then((r) => r.data)

export const fetchClub = (slug) => api.get(`/clubs/${slug}`).then((r) => r.data)

export const fetchTags = () => api.get('/tags').then((r) => r.data)
