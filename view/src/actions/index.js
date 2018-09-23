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

export function craftTogglePasswordVisibilityAction () {
  return {
    type: 'TOGGLE_PASSWORD_VISIBILITY',
    unix_ts_ms: Date.now()
  }
}

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

const craftResetAction = () => ({
  type: 'RESET',
  unix_ts_ms: Date.now()
})

// TODO: reset redux store to initial state!
export function createLoginAction (user, password) {
  return async (dispatch, getState, { client }) => {
    if (user !== getState().user) {
      dispatch(craftResetAction())
      dispatch(craftUserAction(user))
      client.setUser(user)
    }
    try { await client.whoami() }
    catch (_) { return alert('identification failed') }
    try { await client.login(password) }
    catch (_) { return alert('login failed') }
    try { dispatch(craftGotPeersAction(await client.getPeers()))  }
    catch (_) { return alert('getting peers failed') }
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

const craftOutboundCallAction = peer => ({
  type: 'OUTBOUND_CALL',
  unix_ts_ms: Date.now(),
  peer
})

const craftOutboundAcceptAction = peer => ({
  type: 'OUTBOUND_ACCEPT',
  unix_ts_ms: Date.now(),
  peer
})

const craftOutboundRejectAction = peer => ({
  type: 'OUTBOUND_REJECT',
  unix_ts_ms: Date.now(),
  peer
})

const craftOutboundUnpairAction = peer => ({
  type: 'OUTBOUND_UNPAIR',
  unix_ts_ms: Date.now(),
  peer
})

const craftOutboundStopRingingAction = peer => ({
  type: 'OUTBOUND_STOP_RINGING',
  unix_ts_ms: Date.now(),
  peer
})

export function createOutboundCallAction (peer) {
  return async (dispatch, getState, { client }) => {
    try { await client.call(peer) }
    catch (_) { return alert(`calling ${peer} failed`) }
    dispatch(craftOutboundCallAction(peer))
  }
}

export function createOutboundAcceptAction (peer) {
  return async (dispatch, getState, { client }) => {
    try { await client.accept(peer) }
    catch (_) { return alert(`accepting ${peer} failed`) }
    dispatch(craftOutboundAcceptAction(peer))
  }
}

export function createOutboundRejectAction (peer) {
  return async (dispatch, getState, { client }) => {
    try { await client.reject(peer) }
    catch (_) { return alert(`rejecting ${peer} failed`) }
    dispatch(craftOutboundRejectAction(peer))
  }
}

export function createOutboundUnpairAction (peer) {
  return async (dispatch, getState, { client }) => {
    try { await client.unpair(peer) }
    catch (_) { return alert(`unpairing ${peer} failed`) }
    // NOTE: check how unpairin performs in da real world: UI
    dispatch(craftOutboundUnpairAction(peer))
  }
}

export function createOutboundStopRingingAction (peer) {
  return async (dispatch, getState, { client }) => {
    try { await client.stopRinging(peer) }
    catch (_) { return alert(`stopRinging ${peer} failed`) }
    dispatch(craftOutboundStopRingingAction(peer))
  }
}

export function craftInboundCallAction (msg) {
  return {
    type: 'INBOUND_CALL',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

export function craftInboundAcceptAction (msg) {
  return {
    type: 'INBOUND_ACCEPT',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

export function craftInboundRejectAction (msg) {
  return {
    type: 'INBOUND_REJECT',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

export function craftInboundUnpairAction (msg) {
  return {
    type: 'INBOUND_UNPAIR',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

export function craftPeerStatusAction (msg) {
  return {
    type: 'PEER_STATUS',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user,
    status: msg.status
  }
}

export function craftPeerAvatarAction (msg) {
  return {
    type: 'PEER_AVATAR',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user,
    avatar: msg.avatar
  }
}

export function craftPeerOnlineAction (msg) {
  return {
    type: 'PEER_ONLINE',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

export function craftPeerOfflineAction (msg) {
  return {
    type: 'PEER_OFFLINE',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

export function craftInboundStopRingingAction (msg) {
  return {
    type: 'INBOUND_STOP_RINGING',
    unix_ts_ms: msg.unix_ts_ms,
    peer: msg.user
  }
}

// const craftDeletePeersAction = peer_names => ({
//   type: 'DELETE_PEERS',
//   unix_ts_ms: Date.now(),
//   peers
// })

const craftGotPeersAction = peers => ({
  type: 'GOT_PEERS',
  unix_ts_ms: Date.now(),
  peers
})

export function createSyncPeersAction (peer_names) {
  return async (dispatch, getState, { client }) => {
    const old_names = Object.keys(getState().peers)
    const del_names = old_names.filter(oldie => !peer_names.includes(oldie))
    const add_names = peer_names.filter(nubie => !old_names.includes(nubie))
    try {
      if (del_names.length) await client.delPeers(del_names)
      if (add_names.length) await client.addPeers(add_names)
      if (del_names.length || add_names.length)
        dispatch(craftGotPeersAction(await client.getPeers()))
    }
    catch (_) { return alert(`syncing peers failed`) }
  }
}
//
// export function createAddPeersAction (peer_names) {
//   return async (dispatch, getState, { client }) => {
//     var peers
//     try {
//       await client.addPeers(peer_names)
//       peers = await client.getPeers()
//     }
//     catch (_) { return alert(`adding ${peer_names} failed`) }
//     dispatch(craftGotPeersAction(peers))
//   }
// }
//
// export function createDeletePeersAction (peer_names) {
//   return async (dispatch, getState, { client }) => {
//     try { await client.deletePeers(peer_names) }
//     catch (_) { return alert(`deleting ${peer_names} failed`) }
//     dispatch(craftDeletePeersAction(peer_names))
//   }
// }
//
// export function createGetPeersAction () {
//   return async (dispatch, getState, { client }) => {
//     var peers
//     try { peers = await client.getPeers() }
//     catch (_) { return alert(`getting peers failed`) }
//     dispatch(craftGotPeersAction(peers))
//   }
// }
