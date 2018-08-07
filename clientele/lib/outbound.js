const outbound = Object.freeze({
  whoami (username, tx) {
    return JSON.stringify({
      type: 'whoami',
      user: username,
      tx
    })
  }
})

module.exports = outbound
