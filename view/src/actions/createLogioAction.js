export default function createLogioAction (login) {
  return {
    type: login ? 'LOGIN' : 'LOGOUT',
    unix_ts_ms: Date.now()
  }
}
