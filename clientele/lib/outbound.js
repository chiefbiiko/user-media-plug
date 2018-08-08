const outbound = Object.freeze({
  whoami (username, tx) {
    return {
      type: 'whoami',
      user: username,
      tx
    }
  }
})

module.exports = outbound
