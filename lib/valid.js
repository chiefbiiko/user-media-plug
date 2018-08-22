const {
  isBool,
  isStringArray,
  isTruthyString,
  isRealNumber
} = require('./is.js')

const valid = Object.freeze({
  schema_WHOAMI (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'WHOAMI') return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schema_ADD_DEL_PEERS (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'ADD_PEERS', 'DEL_PEERS' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isStringArray(x.peers)
  },
  schema_REGISTER (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'REGISTER') return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isStringArray(x.peers)) return false
    return isTruthyString(x.password)
  },
  schema_GET_PEERS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'GET_PEERS') return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schema_CALL_ACCEPT_REJECT (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'CALL', 'ACCEPT', 'REJECT' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.peer)
  },
  schema_STATUS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'STATUS') return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.status)
  },
  schema_LOGIN (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'LOGIN') return false
    if (!isTruthyString(x.password)) return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schema_LOGOUT (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'LOGOUT') return false
    if (!isRealNumber(x.tx)) return false
    return isTruthyString(x.user)
  },
  schema_RESPONSE (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'RES') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    return isBool(x.ok)
  },
  schema_RESPONSE_PEERS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'RES') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isBool(x.ok)) return false
    return Array.isArray(x.peers) // no deep checks here, bc it's just outbound
  },
  schema_FORCE_CALL (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'FORCE_CALL') return false
    return isTruthyString(x.peer)
  },
  schema_INFO (x) {
    if (!x || x.constructor !== Object) return false
    if (!isTruthyString(x.user)) return false
    return isTruthyString(x.peer)
  }
})

module.exports = valid
