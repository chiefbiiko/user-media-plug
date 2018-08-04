const outbound = Object.freeze({
  forceCall (peer) {
    return JSON.stringify({
      type: 'force-call',
      peer: peer
    })
  },
  peers (peers) {
    return JSON.stringify({
      type: 'peers',
      peers: peers
    })
  },
  peersOnline (peers_online) {
    return JSON.stringify({
      type: 'peers-online',
      peers_online: peers_online
    })
  }
})

module.exports = outbound
