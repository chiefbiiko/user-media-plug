const outbound = require('./outbound.js')

const createForward = active_meta_streams => (metadata, rxs, cb) => {
  const active_meta_streams_map = new Map(
    active_meta_streams.streams
      .map(meta_stream => [ meta_stream.whoami, meta_stream ])
  )

  const active_rx_streams = rxs
    .filter(rx => active_meta_streams_map.has(rx))
    .map(active_rx => active_meta_streams.get(active_rx))

  var first_error = null
  var pending = active_rx_streams.length
  const payload = JSON.stringify(metadata)

  active_rx_streams.forEach(active_rx_stream => {
    active_rx_stream.write(payload, err => {
      if (err && !first_error) first_error = err
      if (!--pending) cb(first_error)
    })
  })
}

const createSendForceCall = active_meta_streams => (rx, peer, cb) => {
  const rx_stream = active_meta_streams.streams
    .find(meta_stream => meta_stream.whoami === rx)
    
  if (rx_stream) rx_stream.write(outbound.forceCall(peer), cb)
  else cb(new Error(`no active metadata stream for rx "${rx}"`))
}

module.exports = { createForward, createSendForceCall }
