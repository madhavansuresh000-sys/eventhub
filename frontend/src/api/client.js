import axios from 'axios'

// All backend calls go through this one "messenger".
// "/api" is forwarded to Spring Boot (localhost:8080) by vite.config.js.
const api = axios.create({ baseURL: '/api' })

export default api
