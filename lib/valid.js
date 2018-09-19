const {
  isBool,
  isStringArray,
  isTruthyString,
  isRealNumber,
  isIntGt1536Mil
} = require('./is.js')

const valid = Object.freeze({
  schema_WHOAMI (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'WHOAMI') return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.user)
  },
  schema_ADD_DEL_PEERS (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'ADD_PEERS', 'DEL_PEERS' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isStringArray(x.peers)
  },
  schema_REGISTER (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'REGISTER') return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.password)
  },
  schema_GET_PEERS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'GET_PEERS') return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.user)
  },
  schema_CALL_ACCEPT_REJECT (x) {
    if (!x || x.constructor !== Object) return false
    if (![ 'CALL', 'ACCEPT', 'REJECT' ].includes(x.type)) return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.peer)
  },
  schema_STATUS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'STATUS') return false
    if (!isTruthyString(x.user)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.status)
  },
  schema_LOGIN (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'LOGIN') return false
    if (!isTruthyString(x.password)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.user)
  },
  schema_LOGOUT (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'LOGOUT') return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.user)
  },
  schema_RESPONSE (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'RESPONSE') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isBool(x.ok)
  },
  schema_RESPONSE_PEERS (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'RESPONSE') return false
    if (!isTruthyString(x.for)) return false
    if (!isRealNumber(x.tx)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    if (!isBool(x.ok)) return false
    return x.peers && x.peers.constructor === Object
  },
  schema_FORCE_CALL (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'FORCE_CALL') return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.peer)
  },
  schema_INFO (x) {
    if (!x || x.constructor !== Object) return false
    if (!isTruthyString(x.user)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isTruthyString(x.peer)
  },
  schema_UNPAIR (x) {
    if (!x || x.constructor !== Object) return false
    if (!isTruthyString(x.user)) return false
    if (!isTruthyString(x.peer)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isRealNumber(x.tx)
  },
  schema_AVATAR (x) {
    if (!x || x.constructor !== Object) return false
    if (x.type !== 'AVATAR') return false
    if (!isTruthyString(x.user)) return false
    if (!isTruthyString(x.avatar)) return false
    if (!isIntGt1536Mil(x.unix_ts_ms)) return false
    return isRealNumber(x.tx)
  }
})

module.exports = valid
