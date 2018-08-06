const outbound = require('./outbound.js')

const debug = require('debug')('user-media-plug:notify')

const createForward = active_meta_streams => (metadata, rxs, cb) => {
  // const active_meta_streams_map = new Map(
  //   active_meta_streams.streams
  //     .map(meta_stream => [ meta_stream.whoami, meta_stream ])
  // )

  // const active_rxs = rxs
  //   .filter(rx => active_meta_streams_map.has(rx))

  // debug(`broadcasting ${JSON.stringify(metadata)} to ` +
  //       `active_peers of ${metadata.user}: ` +
  //       `${JSON.stringify(active_rxs)}`)

  // var first_err = null
  // var pending = active_rxs.length
  // const payload = JSON.stringify(metadata)
  //
  // active_rxs.forEach(active_rx => {
  //   active_meta_streams_map.get(active_rx).write(payload, err => {
  //     if (err && !first_err) first_err = err
  //     if (!--pending) cb(first_err)
  //   })
  // })

  var first_err = null
  var pending = rxs.length
  const payload = JSON.stringify(metadata)

  rxs.forEach(rx => {
    const rx_stream = active_meta_streams.streams
      .find(meta_stream => meta_stream.whoami === rx)

    if (!rx_stream) {
      if (!first_err) first_err = new Error(`can't forward; inactive rx: ${rx}`)
      if (!--pending) cb(first_err)
      return
    }

    rx_stream.write(payload, err => {
      if (err && !first_err) first_err = err
      if (!--pending) cb(first_err)
    })
  })
}

const createSendForceCall = active_meta_streams => (rx, peer, cb) => {
  const rx_stream = active_meta_streams.streams
    .find(meta_stream => meta_stream.whoami === rx)

  if (rx_stream) rx_stream.write(outbound.forceCall(peer), cb)
  else cb(new Error(`can't forward; inactive rx: ${rx}`))
}

module.exports = { createForward, createSendForceCall }
