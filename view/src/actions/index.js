// NOTE: use async await with client methods

export function createIOAction (msg) {
  return {
    type: 'IO',
    unix_ts_ms: Date.now(),
    msg
  }
}

// export function createLoginAction (password, whoami_pending = true) {
//   return (dispatch, getState, { client }) => {
//     const _login = client.login.bind(client, password, err => {
//       if (err) return alert(err.message) // TODO: pipe err to ui
//       dispatch({ type: 'LOGIN', unix_ts_ms: Date.now() })
//     })
//     if (whoami_pending) {
//
//     } else {
//       _login()
//     }
//   }
// }

// export function createLogioAction (login) {
//   return {
//     type: login ? 'LOGIN' : 'LOGOUT',
//     unix_ts_ms: Date.now()
//   }
// }

// export function createLogioAction (login, user, password) {
//   return (dispatch, getState, { client }) => {
//     if (login) {
//       client.login(password, err => {
//         if (err) return alert(err.message) // TODO: pipe err to ui
//         dispatch({ type: 'LOGIN', unix_ts_ms: Date.now() })
//       })
//     } else {
//       client.logout(err => {
//         if (err) return alert(err.message) // TODO: pipe err to ui
//         dispatch({ type: 'LOGOUT', unix_ts_ms: Date.now() })
//       })
//     }
//   }
// }
