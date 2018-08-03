const outbound = require('./outbound.js')

const createForward = active_meta_streams => (metadata, rxs, cb) => {
  const active_meta_streams_map = new Map(
    active_meta_streams.streams
      .map(meta_stream => [ meta_stream.whoami, meta_stream ])
  )
  var first_error = null
  var pending = rxs.length
  rxs.forEach(rx => {
    if (active_meta_streams_map.has(rx)) {
      active_meta_streams_map.get(rx).write(JSON.stringify(metadata), err => {
        if (err && !first_error) first_error = err
      })
    } else if (!first_error) {
      first_error = new Error(`no active metadata stream for rx "${rx}"`)
    }
    if (!--pending) cb(first_error)
  })
}

const createSendForceCall = active_meta_streams => (rx, user, cb) => {
  const rx_stream = active_meta_streams.streams
    .find(meta_stream => meta_stream.whoami === rx)
  if (rx_stream) rx_stream.write(outbound.forceCall(user), cb)
  else cb(new Error(`no active metadata stream for rx "${rx}"`))
}

module.exports = { createForward, createSendForceCall }
