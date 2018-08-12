const {
  isBool,
  isStringArray,
  isTruthyString,
  isRealNumber
} = require('./is.js')

const valid = Object.freeze({
  schemaZ (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'whoami') return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schemaA (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'add-peers', 'del-peers' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isStringArray(x.peers)
  },
  schemaN (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'reg-user') return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isStringArray(x.peers)) return false
    return isTruthyString(x.password)
  },
  schemaB (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'peers') return false
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
  schemaL (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'login', 'logout' ].includes(x.type)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schemaR (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'res') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    return isBool(x.ok)
  },
  schemaRP (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'res') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isBool(x.ok)) return false
    return Array.isArray(x.peers) // no deep checks here, bc it's just outbound
  },
  schemaF (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'force-call') return false
    return isTruthyString(x.peer)
  }
})

module.exports = valid
