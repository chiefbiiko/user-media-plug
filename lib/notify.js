const outbound = require('./outbound.js')

const debug = require('debug')('user-media-plug:notify')

const o = msg => {
  debug(`outbound msg: ` +
        `${Buffer.isBuffer(msg) ? String(msg) : JSON.stringify(msg)}`)
  return msg
}

const createForward = active_metastreams => (metadata, rxs, cb) => {
  var first_err = null
  var pending = rxs.length

  if (!pending) return cb(null)

  rxs.forEach(rx => {
    const rx_stream = active_metastreams.streams
      .find(metastream => metastream.whoami === rx)

    if (!rx_stream) {
      if (!first_err) first_err = new Error(`can't forward; inactive rx: ${rx}`)
      if (!--pending) cb(first_err)
      return
    }

    rx_stream.write(o(metadata), err => {
      if (err && !first_err) first_err = err
      if (!--pending) cb(first_err)
    })
  })
}

const createSendForceCall = active_metastreams => (rx, peer, cb) => {
  const rx_stream = active_metastreams.streams
    .find(metastream => metastream.whoami === rx)

  if (rx_stream) rx_stream.write(o(outbound.forceCall(peer)), cb)
  else cb(new Error(`can't forward; inactive rx: ${rx}`))
}

module.exports = { createForward, createSendForceCall }
