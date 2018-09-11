export default function io (state = [], action) {
  switch (action.type) {
    case 'IO': return [ ...state, action.msg ]
    default: return state
  }
}
