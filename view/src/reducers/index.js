import { combineReducers } from 'redux'

const ioReducer = (state = [], action) => {
  switch (action.type) {
    case 'IO': return [ ...state, action.msg ]
    default: return state
  }
}

const crashReducer = (state = false, action) => {
  switch (action.type) {
    case 'FRONTEND_CRASH': return true
    default: return state
  }
}

const userReducer = (state = '', action) => {
  switch (action.type) {
    case 'USER': return action.user
    default: return state
  }
}

const loginLogoutReducer = (state = false, action) => {
  switch (action.type) {
    case 'LOGIN': return true
    case 'LOGOUT': return false
    default: return state
  }
}

const passwordVisibilityReducer = (state = false, action) => {
  switch (action.type) {
    case 'TOGGLE_PASSWORD_VISIBILITY': return !state
    default: return state
  }
}

export default combineReducers({
  io_log: ioReducer,
  crashed: crashReducer,
  user: userReducer,
  logged_in: loginLogoutReducer,
  password_visible: passwordVisibilityReducer
})
