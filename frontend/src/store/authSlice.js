import { createSlice } from '@reduxjs/toolkit'

/**
 * Who is logged in. Phase 3: the Login / Register forms "log in" without a server (demo).
 * Phase 5 fills this from POST /api/auth/login and adds the JWT token.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null },
  reducers: {
    /** payload: { name, email, role } */
    loggedIn: (state, action) => {
      state.user = action.payload
    },
    loggedOut: (state) => {
      state.user = null
      state.token = null
    },
  },
})

export const { loggedIn, loggedOut } = authSlice.actions
export default authSlice.reducer

export const selectUser = (state) => state.auth.user
