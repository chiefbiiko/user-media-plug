// TODO: swap all alerts with react-toastify or similar

export function craftIOAction (msg) {
  return {
    type: 'IO',
    unix_ts_ms: Date.now(),
    msg
  }
}

const craftCrashAction = (err, state) => ({
  type: 'FRONTEND_CRASH',
  unix_ts_ms: Date.now(),
  err_name: err.name,
  err_message: err.message,
  err_stack: err.stack,
  err_fileName: err.fileName,
  err_lineNumber: err.lineNumber,
  err_columnNumber: err.columnNumber,
  state
})

const craftUserAction = user => ({
  type: 'USER',
  unix_ts_ms: Date.now(),
  user
})

const craftLoginAction = () => ({
  type: 'LOGIN',
  unix_ts_ms: Date.now()
})

const craftLogoutAction = () => ({
  type: 'LOGOUT',
  unix_ts_ms: Date.now()
})

export function createCrashAction (err) {
  return async (dispatch, getState) => {
    const crash_action = craftCrashAction(err, getState())
    dispatch(crash_action)
    const conf = { method: 'post', body: JSON.stringify(crash_action) }
    try { await fetch('http://localhost:10000/crash', conf) } catch (_) {}
  }
}

export function createRegisterAction (user, password) {
  return async (dispatch, getState, { client }) => {
    dispatch(craftUserAction(user))
    client.setUser(user)
    try { await client.whoami() }
    catch (_) { return alert('identification failed') }

    try { await client.register(password) }
    catch (_) { return alert('registration failed') }

    dispatch(createLoginAction(user, password))
  }
}

export function createLoginAction (user, password) {
  return async (dispatch, getState, { client }) => {
    if (user !== getState().user) {
      dispatch(craftUserAction(user))
      client.setUser(user)
    }

    try { await client.whoami() }
    catch (_) { return alert('identification failed') }

    try { await client.login(password) }
    catch (_) { return alert('login failed') }

    dispatch(craftLoginAction())
  }
}

export function createLogoutAction () {
  return async (dispatch, getState, { client }) => {
    try { await client.logout() }
    catch (_) { return alert('logout failed') }

    dispatch(craftLogoutAction())
  }
}
