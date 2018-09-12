import { combineReducers } from 'redux'

function io (state = [], action) {
  switch (action.type) {
    case 'IO': return [ ...state, action.msg ]
    default: return state
  }
}

function logio (state = false, action) {
  switch (action.type) {
    case 'LOGIN': return true
    case 'LOGOUT': return false
    default: return state
  }
}

export default combineReducers({
  io_log: io,
  logged_in: logio
})
