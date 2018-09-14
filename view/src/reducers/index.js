import { combineReducers } from 'redux'

const ioReducer = (state = [], action) => {
  switch (action.type) {
    case 'IO': return [ ...state, action.msg ]
    default: return state
  }
}

const crashReducer = (state = false, action) => {
  switch (action.type) {
    case 'CRASH': return true
    default: return state
  }
}

const userReducer = (state = '', action) => {
  switch (action.type) {
    case 'USER': return action.user
    default: return state
  }
}

const whoamiReducer = (state = false, action) => {
  switch (action.type) {
    case 'WHOAMI': return true
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

export default combineReducers({
  io_log: ioReducer,
  crashed: crashReducer,
  user: userReducer,
  whoami: whoamiReducer,
  logged_in: loginLogoutReducer
})
