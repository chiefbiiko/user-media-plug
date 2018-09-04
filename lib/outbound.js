const outbound = Object.freeze({
  forceCall (peer) {
    return {
      type: 'FORCE_CALL',
      peer
    }
  },
  res (req_event_name = 'unknown', tx = 0, ok = false, ...sources) {
    var payload = { type: 'RESPONSE', for: req_event_name, tx, ok }
    for (const source of sources) payload = Object.assign({}, source, payload)
    return payload
  }
})

module.exports = outbound
