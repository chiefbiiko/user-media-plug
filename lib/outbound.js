const outbound = Object.freeze({
  forceCall (peer) {
    return JSON.stringify({
      type: 'force-call',
      peer
    })
  },
  // peers (peers) {
  //   return JSON.stringify({
  //     type: 'peers',
  //     peers
  //   })
  // },
  // peersOnline (peers_online) {
  //   return JSON.stringify({
  //     type: 'peers-online',
  //     peers_online
  //   })
  // }
  res (req_event_name, tx, ok, ...sources) {
    var payload = JSON.stringify({
      type: 'res',
      for: req_event_name,
      tx,
      ok
    })
    for (const source of sources) payload = Object.assign({}, source, payload)
    return payload
  }
})

module.exports = outbound
