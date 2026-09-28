import { configureStore } from '@reduxjs/toolkit'

import api from '../api/client'

import adminReducer from './adminSlice'
import authReducer, { loadSession, sessionExpired } from './authSlice'
import cartReducer from './cartSlice'
import notificationsReducer, { notify } from './notificationsSlice'
import organizerReducer from './organizerSlice'
import studentReducer from './studentSlice'

/**
 * ONE store for the whole app. Each slice owns one part of the state:
 *   state.auth, state.cart, state.notifications, state.student, state.organizer, state.admin
 * Pages read with useSelector(selectX) and change things with useDispatch()(someAction()).
 * Redux DevTools (browser extension) shows every action and the state after it.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    notifications: notificationsReducer,
    student: studentReducer,
    organizer: organizerReducer,
    admin: adminReducer,
  },
})

// Ask the server who is logged in (the cookie decides) as soon as the app starts.
store.dispatch(loadSession())

// If any call answers 401 while we think someone is logged in, their login ran out (8 hours):
// forget the user and say so. Protected pages then send them to the login page.
api.interceptors.response.use(undefined, (error) => {
  const isAuthCall = error.config?.url?.startsWith('/auth/')
  if (error.response?.status === 401 && !isAuthCall && store.getState().auth.user) {
    store.dispatch(sessionExpired())
    store.dispatch(notify('Your login has expired. Please log in again.', 'error'))
  }
  return Promise.reject(error)
})
