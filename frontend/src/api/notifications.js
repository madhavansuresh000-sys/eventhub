import api from './client'

/** The bell (Phase 7): { unread, items: [{ id, kind, title, body, link, createdAt, read }] } */
export const fetchNotifications = () => api.get('/notifications').then((r) => r.data)

export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`).then((r) => r.data)

export const markAllNotificationsRead = () => api.post('/notifications/read-all').then((r) => r.data)
