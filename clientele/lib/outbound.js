const outbound = Object.freeze({
  whoami (user, tx) {
    return {
      type: 'WHOAMI',
      user,
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
  register (user, password, tx) {
    return {
      type: 'REGISTER',
      user,
      password,
      tx
    }
  }
})

module.exports = outbound
