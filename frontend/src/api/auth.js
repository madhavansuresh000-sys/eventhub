import api from './client'

/**
 * Login calls. The JWT travels in an httpOnly cookie that the browser stores and sends by itself:
 * our JavaScript never sees the token (so an injected script cannot steal it).
 * POSTs carry the CSRF token automatically: Axios copies the XSRF-TOKEN cookie into the X-XSRF-TOKEN header.
 */

/** The logged-in user, or null for a visitor (the server answers 204 No Content). */
export const fetchMe = () => api.get('/auth/me').then((r) => (r.status === 204 ? null : r.data))

/** { email, password } -> the user (and the cookie is set) */
export const loginRequest = (credentials) => api.post('/auth/login', credentials).then((r) => r.data)

/** { fullName, email, password, department, yearOfStudy } -> the new user, already logged in */
export const registerRequest = (form) => api.post('/auth/register', form).then((r) => r.data)

/** The server deletes the cookie. */
export const logoutRequest = () => api.post('/auth/logout')
