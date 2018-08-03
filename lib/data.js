const { readFile, writeFile } = require('fs')

function noop () {}

// TODO: move persisted data into a levelup!

function createReadUsers (USERS_JSON_PATH) {
  return function readUsers (cb) {
    if (typeof cb !== 'function') return cb(new Error('cb is not a function'))
    readFile(USERS_JSON_PATH, (err, buf) => {
      if (err) return cb(err)

      var users
      try {
        users = JSON.parse(buf)
      } catch (err) {
        return cb(err)
      }

      cb(null, users)
    })
  }
}

function createReadTransformWriteUsers (USERS_JSON_PATH, readUsers) {
  return function readTransformWriteUsers (func, cb) {
    if (typeof cb !== 'function') cb = noop
    readUsers((err, users) => {
      if (err) return cb(err)
      writeFile(USERS_JSON_PATH, JSON.stringify(func(users)), cb)
    })
  }
}

function createListOnlinePeers (ONLINE_USERS, readUsers) {
  return function listOnlinePeers (user, cb) {
    readUsers((err, users) => {
      if (err) return cb(err)
      const online_peers = Array.from(ONLINE_USERS).filter(online_user => {
        if (users[online_user]) return users[online_user].peers.includes(user)
        else if (users[user]) return users[user].peers.includes(online_user)
      })
      cb(null, online_peers)
    })
  }
}

module.exports = {
  createListOnlinePeers,
  createReadTransformWriteUsers,
  createReadUsers
}
