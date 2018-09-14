// TODO: swap all alerts with react-toastify or similar

const TRY_AWAIT = async (promise, caught) => {
  var rtn
  try {
    rtn = await promise
  } catch (err) {
    caught(err)
  }
  return rtn
}

export function craftIOAction (msg) {
  return {
    type: 'IO',
    unix_ts_ms: Date.now(),
    msg
  }
}

const craftCrashAction = (err, state) => ({
  type: 'CRASH',
  unix_ts_ms: Date.now(),
  err_msg: err.message,
  err_stack: err.stack,
  state
})

const craftUserAction = user => ({
  type: 'USER',
  unix_ts_ms: Date.now(),
  user
})

const craftWhoamiAction = () => ({
  type: 'WHOAMI',
  unix_ts_ms: Date.now()
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
    TRY_AWAIT(fetch('http://localhost:10000/crash', conf), () => {}) // muted
  }
}

export function createRegisterAction (user, password) {
  return async (dispatch, getState, { client }) => {
    dispatch(craftUserAction(user))
    client.setUser(user)
    TRY_AWAIT(client.whoami(), err => alert('identification failed'))
    dispatch(craftWhoamiAction())

    TRY_AWAIT(client.register(password), err => alert('registration failed'))

    dispatch(createLoginAction(user, password, true))
  }
}

export function createLoginAction (user, password, skip_identification) {
  return async (dispatch, getState, { client }) => {
    if (!skip_identification) {
      dispatch(craftUserAction(user))
      client.setUser(user)
      TRY_AWAIT(client.whoami(), err => alert('identification failed'))
      dispatch(craftWhoamiAction())
    }

    TRY_AWAIT(client.login(password), err => alert('login failed'))

    dispatch(craftLoginAction())
  }
}
