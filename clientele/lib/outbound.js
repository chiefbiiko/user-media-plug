const outbound = Object.freeze({
  whoami (user, tx) {
    return {
      type: 'WHOAMI',
      user,
      tx
    }
  },
  register (user, password, tx) {
    return {
      type: 'REGISTER',
      user,
      password,
      tx
    }
  },
  login (user, password, tx) {
    return {
      type: 'LOGIN',
      user,
      password,
      tx
    }
  },
  logout (user, tx) {
    return {
      type: 'LOGOUT',
      user,
      tx
    }
  },
  addPeers (user, peers, tx) {
    return {
      type: 'ADD_PEERS',
      user,
      peers,
      tx
    }
  },
  deletePeers (user, peers, tx) {
    return {
      type: 'DEL_PEERS',
      user,
      peers,
      tx
    }
  },
  getPeers (user, tx) {
    return {
      type: 'GET_PEERS',
      user,
      tx
    }
  },
  status (user, status, tx) {
    return {
      type: 'STATUS',
      user,
      status,
      tx
    }
  },
  call (user, peer, tx) {
    return {
      type: 'CALL',
      user,
      peer,
      tx
    }
  },
  accept (user, peer, tx) {
    return {
      type: 'ACCEPT',
      user,
      peer,
      tx
    }
  },
  reject (user, peer, tx) {
    return {
      type: 'REJECT',
      user,
      peer,
      tx
    }
  },
  unpair (user, peer, tx) {
    return {
      type: 'UNPAIR',
      user,
      peer,
      tx
    }
  },
  info (user, peer) {
    return JSON.stringify({
      user,
      peer
    })
  }
})

module.exports = outbound
