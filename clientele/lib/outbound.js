const outbound = {
  whoami (user, tx) {
    return {
      type: 'WHOAMI',
      user,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  register (user, password, tx) {
    return {
      type: 'REGISTER',
      user,
      password,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  login (user, password, tx) {
    return {
      type: 'LOGIN',
      user,
      password,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  logout (user, tx) {
    return {
      type: 'LOGOUT',
      user,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  addPeers (user, peers, tx) {
    return {
      type: 'ADD_PEERS',
      user,
      peers,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  deletePeers (user, peers, tx) {
    return {
      type: 'DEL_PEERS',
      user,
      peers,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  getPeers (user, tx) {
    return {
      type: 'GET_PEERS',
      user,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  status (user, status, tx) {
    return {
      type: 'STATUS',
      user,
      status,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  call (user, peer, tx) {
    return {
      type: 'CALL',
      user,
      peer,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  accept (user, peer, tx) {
    return {
      type: 'ACCEPT',
      user,
      peer,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  reject (user, peer, tx) {
    return {
      type: 'REJECT',
      user,
      peer,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  unpair (user, peer, tx) {
    return {
      type: 'UNPAIR',
      user,
      peer,
      tx,
      unix_ts_ms: Date.now()
    }
  },
  info (user, peer) {
    return JSON.stringify({
      user,
      peer,
      unix_ts_ms: Date.now()
    })
  },
  avatar (user, avatar, tx) {
    return {
      type: 'AVATAR',
      user,
      avatar,
      tx,
      unix_ts_ms: Date.now()
    }
  }
}

module.exports = outbound
