const { isTruthyString, isStringArray } = require('./is.js')

const valid = Object.freeze({
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
})

module.exports = valid