const outbound = {
  forceCall (peer) {
    return {
      type: 'FORCE_CALL',
      peer,
      unix_ts_ms: Date.now()
    }
  },
  res (req_event_name = 'unknown', tx = 0, ok = false, ...sources) {
    var payload = {
      type: 'RESPONSE',
      for: req_event_name,
      tx,
      unix_ts_ms: Date.now(),
      ok
    }
    for (const source of sources) payload = Object.assign({}, source, payload)
    return payload
  },
  online (user) {
    return {
      type: 'ONLINE',
      user,
      unix_ts_ms: Date.now()
    }
  },
  offline (user) {
    return {
      type: 'OFFLINE',
      user,
      unix_ts_ms: Date.now()
    }
  }
}

module.exports = outbound
