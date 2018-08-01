const { readFile, writeFile } = require('fs')

const VALID_TYPE_PROPS = [
  'reg-user',
  'add-peers',
  'del-peers',
  'online',
  'offline',
  'call',
  'accept',
  'reject',
  'peers-online'
]

function noop () {}

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

function createReadTransformWriteUsers (USERS_JSON_PATH) {
  return function readTransformWriteUsers (func, cb) {
    if (typeof cb !== 'function') cb = noop
    readFile(USERS_JSON_PATH, (err, buf) => {
      if (err) return cb(err)

      var users
      try {
        users = JSON.parse(buf)
      } catch (err) {
        return cb(err)
      }

      users = func(users)

      writeFile(USERS_JSON_PATH, JSON.stringify(users), cb)
    })
  }
}

function findinSet (set, pred) {
  for (const v of set) {
    if (pred(v)) return v
  }
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
  schemaA (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'reg-user', 'add-peers', 'del-peers' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    return isStringArray(x.peers)
  },
  schemaB (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'online', 'offline' ].includes(x.type)) return false
    return isTruthyString(x.user)
  },
  schemaC (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'call', 'accept', 'reject' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isTruthyString(x.peer)) return false
    return isUint(x.tx)
  },
  schemaD (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'peers-online') return false
    if (!isTruthyString(x.user)) return false
    return isUint(x.tx)
  },
  schemaE (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'peers-online') return false
    if (!isUint(x.tx)) return false
    return isStringArray(x.peersOnline)
  },
  schemaF (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'force-call') return false
    return isTruthyString(x.peer)
  },
  schemaZ (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'whoami') return false
    return isTruthyString(x.user)
  }
}

const OUTBOUND_MSGS = {
  peersOnline (tx, peersOnline) {
    return {
      type: 'peers-online',
      tx: tx,
      peersOnline: peersOnline
    }
  },
  forceCall (peer) {
    return {
      type: 'force-call',
      peer: peer
    }
  }
}

module.exports = {
  createReadTransformWriteUsers,
  createReadUsers,
  valid,
  OUTBOUND_MSGS
}
