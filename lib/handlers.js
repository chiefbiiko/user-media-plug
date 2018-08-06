const outbound = require('./outbound.js')
const valid = require('./valid.js')

const debug = require('debug')('user-media-plug:handlers')

const createMetaWhoami = active_meta_streams => (metadata, meta_stream, cb) => {
  debug('::metaWhoami::')

  if (!valid.schemaZ(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema Z: ${JSON.stringify(metadata)}`))
  }

  const alreadyActive = active_meta_streams.streams
    .some(meta_stream => meta_stream.whoami === metadata.user)

  if (alreadyActive) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`ignoring excess whoami for: ${metadata.user}`))
  }

  meta_stream.whoami = metadata.user
  active_meta_streams.add(meta_stream)
  debug(`identified: ${metadata.user}`)
  meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
}

const createRegisterUser = db => (metadata, meta_stream, cb) => {
  debug('::registerUser::')

  if (!valid.schemaN(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema N: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, err => {
    if (!err.notFound) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(new Error(`cannot register: ${metadata.user}; user exists`))
    }

    db.put(metadata.user, { peers: metadata.peers }, err => {
      if (err) {
        meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
        return cb(err)
      }

      meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
    })
  })
}

const createAddPeers = db => (metadata, meta_stream, cb) => {
  debug('::addPeers::')

  if (!valid.schemaA(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    const new_peers = user.peers.concat(metadata.peers.filter(peer => {
      return peer !== metadata.user && !user.peers.includes(peer)
    }))

    db.put(metadata.user, { peers: new_peers }, err => {
      if (err) {
        meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
        return cb(err)
      }

      meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
    })
  })
}

const createDeletePeers = db => (metadata, meta_stream, cb) => {
  debug('::deletePeers::')

  if (!valid.schemaA(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    const new_peers = user.peers.filter(peer => !metadata.peers.includes(peer))

    db.put(metadata.user, { peers: new_peers }, err => {
      if (err) {
        meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
        return cb(err)
      }

      meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
    })
  })
}

const createStatus =
  (db, online_users, active_meta_streams, forward) => (metadata, meta_stream, cb) => {
  debug('::status::')

  if (!valid.schemaS(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema S: ${JSON.stringify(metadata)}`))
  }

  if (metadata.status === 'online') online_users.add(metadata.user)
  else if (metadata.status === 'offline') online_users.delete(metadata.user)

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    const active_peers = active_meta_streams.streams
      .filter(meta_stream => user.peers.includes(meta_stream.whoami))
      .map(peer_stream => peer_stream.whoami)

    forward(metadata, active_peers, err => {
      if (err) {
        meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
        return cb(err)
      }

      meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
    })
  })
}

const createCall = (online_users, forward) => (metadata, meta_stream, cb) => {
  debug('::call::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  if (!online_users.has(metadata.user) || !online_users.has(metadata.peer)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return debug(`call attempt from/with an offline peer; ` +
      `metadata: ${JSON.stringify(metadata)}; ` +
      `online_users: ${JSON.stringify(online_users)}`)
  }

  debug(`call attempt: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
  })
}

const createAccept =
  (meta_server, forward, sendForceCall) => (metadata, meta_stream, cb) => {
  debug('::accept::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call accept: ${JSON.stringify(metadata)}`)

  var first_error = null
  var pending = 3

  const internalErrorHandler = err => {
    if (err && !first_error) first_error = err

    if (!--pending) {
      if (first_error) {
        meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
        return cb(first_error)
      }

      meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
    }
  }

  forward(metadata, [ metadata.peer ], internalErrorHandler)

  const a = metadata.peer, b = metadata.user
  meta_server.emit('pair', a, b)
  sendForceCall(a, b, internalErrorHandler) // rx, peer, cb
  sendForceCall(b, a, internalErrorHandler) // rx, peer, cb
}

const createReject = forward => (metadata, meta_stream, cb) => {
  debug('::reject::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call reject: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
  })
}

const createPeers = (db, online_users) => (metadata, meta_stream, cb) => {
  debug('::peers::')

  if (!valid.schemaB(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema B: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    debug(`peer request: ${JSON.stringify(metadata)}`)

    var payload
    if (metadata.type === 'peers') {
      payload = outbound.res(metadata.type, metadata.tx, true, {
        peers: user.peers
      })
    } else if (metadata.type === 'peers-online') {
      payload = outbound.res(metadata.type, metadata.tx, true, {
        peers_online: Array.from(online_users)
          .filter(online_user => user.peers.includes(online_user))
      })
    }

    debug(`payload for peer request: ${payload}`)

    meta_stream.write(payload, cb)
  })
}

const createLogin =
  (db, online_users, logged_in_users) => (metadata, meta_stream, cb) => {
  debug('::login::')

  if (!valid.schemaL(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
  }

  // make sure metadata.user is the same as meta_stream.whoami - DONE
  // verify that metadata.password is the same as stored in db[user].password
  // add metadata.user to logged_in_users
  if (metadata.user !== meta_stream.whoami) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid login attempt; `+
                        `metadata.user ${metadata.user}; ` +
                        `meta_stream.whoami: ${meta_stream.whoami}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }

    if (metadata.password !== user.password) { // make this timing-safe
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(new Error(`invalid password provided for ${metadata.user}`))
    }

    logged_in_users.add(metadata.user)

    meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
  })
}

const createLogoff =
  (db, online_users, logged_in_users) => (metadata, meta_stream, cb) => {
  // ...
}

module.exports = {
  createMetaWhoami,
  createLogin,
  createLogoff,
  createStatus,
  createCall,
  createAccept,
  createReject,
  createRegisterUser,
  createAddPeers,
  createDeletePeers,
  createPeers
}
