const outbound = Object.freeze({
  forceCall (peer) {
    return JSON.stringify({
      type: 'force-call',
      peer
    })
  },
  res (req_event_name, tx, ok, ...sources) {
    var payload = { type: 'res', for: req_event_name, tx, ok }
    for (const source of sources) payload = Object.assign({}, source, payload)
    return JSON.stringify(payload)
  }
})

module.exports = outbound
