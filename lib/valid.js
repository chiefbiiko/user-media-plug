const { isBool, isStringArray, isTruthyString, isRealNumber } = require('./is.js')

const valid = Object.freeze({
  schemaZ (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'whoami') return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schemaA (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'reg-user', 'add-peers', 'del-peers' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isStringArray(x.peers)
  },
  schemaB (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'peers', 'peers-online' ].includes(x.type)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schemaC (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'call', 'accept', 'reject' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.peer)
  },
  schemaS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'status') return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.status)
  },
  schemaR (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'res') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isBool(x.ok)) return false
    return isStringArray(x.peersOnline)
  },
  schemaF (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'force-call') return false
    return isTruthyString(x.peer)
  }
})

module.exports = valid
