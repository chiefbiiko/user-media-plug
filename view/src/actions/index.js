export function createIOAction (msg) {
  return {
    type: 'IO',
    unix_ts_ms: Date.now(),
    msg
  }
}

export function createLogioAction (login) {
  return {
    type: login ? 'LOGIN' : 'LOGOUT',
    unix_ts_ms: Date.now()
  }
}
