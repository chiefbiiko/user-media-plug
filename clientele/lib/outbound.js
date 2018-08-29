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

  },
  deletePeers (user, peers, tx) {

  },
  getPeers (user, tx) {

  },
  status (user, status, tx) {

  },
  call (user, peer, tx) {

  },
  accept (user, peer, tx) {

  },
  reject (user, peer, tx) {

  },
  unpair (user, peer, tx) {

  }
})

module.exports = outbound
