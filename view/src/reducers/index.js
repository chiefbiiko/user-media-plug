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

const peersReducer = (state = {}, action) => {
  switch (action.type) {
    case 'OUTBOUND_CALL': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        outbound_ringing: true
      }
    }
    case 'INBOUND_CALL': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        inbound_ringing: true
      }
    }
    case 'OUTBOUND_STOP_RINGING': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        outbound_ringing: false
      }
    }
    case 'INBOUND_STOP_RINGING': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        inbound_ringing: false
      }
    }
    case 'OUTBOUND_ACCEPT': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        inbound_ringing: false,
        calling: true
      }
    }
    case 'INBOUND_ACCEPT': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        outbound_ringing: false,
        calling: true
      }
    }
    case 'OUTBOUND_REJECT': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        inbound_ringing: false
      }
    }
    case 'INBOUND_REJECT': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        outbound_ringing: false
      }
    }
    case 'OUTBOUND_UNPAIR':
    case 'INBOUND_UNPAIR': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        calling: false
      }
    }
    case 'PEER_STATUS': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        status: action.status
      }
    }
    case 'PEER_AVATAR': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        avatar: action.avatar
      }
    }
    case 'PEER_ONLINE': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        online: true
      }
    }
    case 'PEER_OFFLINE': return {
      ...state,
      [action.peer]: {
        ...state[action.peer],
        online: false
      }
    }
    case 'GOT_PEERS': return {
      ...state,
      ...action.peers
    }
    default: return state
  }
}

export default combineReducers({
  io_log: ioReducer,
  crashed: crashReducer,
  user: userReducer,
  logged_in: loginLogoutReducer,
  password_visible: passwordVisibilityReducer,
  peers: peersReducer
})
