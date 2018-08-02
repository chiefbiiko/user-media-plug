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
    // readFile(USERS_JSON_PATH, (err, buf) => {
    //   if (err) return cb(err)
    //
    //   var users
    //   try {
    //     users = JSON.parse(buf)
    //   } catch (err) {
    //     return cb(err)
    //   }
    //
    //   users = func(users)
    //
    //   writeFile(USERS_JSON_PATH, JSON.stringify(users), cb)
    // })
  }
}

function createForward (active_meta_streams) {
  return function forward (metadata, rxs, cb) {
    if (typeof cb !== 'function') cb = noop
    var firstError
    var pending = rxs.length
    rxs.forEach(rx => {
      const rx_stream = findInSet(active_meta_streams, meta_stream => {
        return meta_stream.whoami === rx
      })
      if (rx_stream) {
        rx_stream.write(JSON.stringify(metadata), err => {
          if (err && !firstError) firstError = err
          if (!--pending) cb(firstError)
        })
      }
    })
    // const rx_stream = findInSet(active_meta_streams, meta_stream => {
    //   return meta_stream.whoami === rx
    // })
    // if (!rx_stream) return false
    // rx_stream.write(JSON.stringify(metadata))
    // return true // write will be flushed anyways (probly) ;)
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

function createSendForceCall (active_meta_streams) {
  return function sendForceCall (rx, user, cb) {
    if (typeof cb !== 'function') cb = noop
    const rx_stream = findInSet(active_meta_streams, meta_stream => {
      return meta_stream.whoami === rx
    })
    if (rx_stream) {
      rx_stream.write(OUTBOUND_MSG.forceCall(user), err => {
        if (err) return cb(err)
      })
    }
    // if (!rx_stream) return false
    // rx_stream.write(OUTBOUND_MSG.forceCall(user))
    // return true // write will be flushed anyways (probly) ;)
  }
}

function findInSet (set, pred) {
  for (const v of set)
    if (pred(v)) return v
}

function isTruthyString (x) {
  return x && typeof x === 'string' && x.length
}

function isStringArray (x) {
  return x && Array.isArray(x) && x.every(isTruthyString)
}

function isUint (x) {
  return x && typeof x === 'number' && x >= 0
}

const valid = {
  schemaZ (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'whoami') return false
    return isTruthyString(x.user)
  },
  schemaA (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'reg-user', 'add-peers', 'del-peers' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    return isStringArray(x.peers)
  },
  schemaB (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'online', 'offline', 'peers-online' ].includes(x.type)) return false
    return isTruthyString(x.user)
  },
  schemaC (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'call', 'accept', 'reject' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    return isTruthyString(x.peer)
  },
  schemaD (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'peers-online') return false
    return isStringArray(x.peersOnline)
  },
  schemaE (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'force-call') return false
    return isTruthyString(x.peer)
  }
}

const OUTBOUND_MSG = {
  peersOnline (peersOnline) {
    return JSON.stringify({
      type: 'peers-online',
      peersOnline: peersOnline
    })
  },
  forceCall (peer) {
    return JSON.stringify({
      type: 'force-call',
      peer: peer
    })
  }
}

module.exports = {
  createForward,
  createListOnlinePeers,
  createReadTransformWriteUsers,
  createReadUsers,
  isTruthyString,
  createSendForceCall,
  valid,
  OUTBOUND_MSG
}
