const outbound = Object.freeze({
  peersOnline (peers_online) {
    return JSON.stringify({
      type: 'peers-online',
      peers_online: peers_online
    })
  },
  forceCall (peer) {
    return JSON.stringify({
      type: 'force-call',
      peer: peer
    })
  }
})

module.exports = outbound
