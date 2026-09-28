import { configureStore } from '@reduxjs/toolkit'

import adminReducer from './adminSlice'
import authReducer from './authSlice'
import cartReducer from './cartSlice'
import notificationsReducer from './notificationsSlice'
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
