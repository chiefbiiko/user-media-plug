const { parse } = require('url')

const outbound = require('./outbound.js')
const valid = require('./valid.js')

const { isTruthyString } = require('./is.js')

const debug = require('debug')('user-media-plug:handlers')
const i = msg => debug(`inbound msg: ${JSON.stringify(msg)}`) || msg
const o = msg => debug(`outbound msg: ${JSON.stringify(msg)}`) || msg

const handleError = err => err && debug(`error: ${err.message}`)

const createMetaWhoami = active_meta_streams => (meta_stream, metadata, cb) => {
  debug('::metaWhoami::')

  if (!valid.schemaZ(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema Z: ${JSON.stringify(metadata)}`))
  }

  const alreadyActive = active_meta_streams.streams
    .some(meta_stream => meta_stream.whoami === metadata.user)

  if (alreadyActive) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`ignoring excess whoami for: ${metadata.user}`))
  }

  meta_stream.whoami = metadata.user
  active_meta_streams.add(meta_stream)
  debug(`identified: ${metadata.user}`)
  meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
}

const createRegisterUser = db => (meta_stream, metadata, cb) => {
  debug('::registerUser::')

  if (!valid.schemaN(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema N: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, err => {
    if (!err.notFound) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(new Error(`cannot register: "${metadata.user}"; user exists`))
    }

    db.put(metadata.user, { peers: metadata.peers }, err => {
      if (err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createAddPeers = db => (meta_stream, metadata, cb) => {
  debug('::addPeers::')

  if (!valid.schemaA(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const new_peers = user.peers.concat(metadata.peers.filter(peer => {
      return peer !== metadata.user && !user.peers.includes(peer)
    }))

    db.put(metadata.user, { peers: new_peers }, err => {
      if (err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createDeletePeers = db => (meta_stream, metadata, cb) => {
  debug('::deletePeers::')

  if (!valid.schemaA(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const new_peers = user.peers.filter(peer => !metadata.peers.includes(peer))

    db.put(metadata.user, { peers: new_peers }, err => {
      if (err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createStatus = (db, online_users, active_meta_streams, forward) =>
  (meta_stream, metadata, cb) => {
  debug('::status::')

  if (!valid.schemaS(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema S: ${JSON.stringify(metadata)}`))
  }

  if (metadata.status === 'online') online_users.add(metadata.user)
  else if (metadata.status === 'offline') online_users.delete(metadata.user)

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const active_peers = active_meta_streams.streams
      .filter(meta_stream => user.peers.includes(meta_stream.whoami))
      .map(peer_stream => peer_stream.whoami)

    forward(metadata, active_peers, err => {
      if (err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createCall = (online_users, forward) => (meta_stream, metadata, cb) => {
  debug('::call::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  if (!online_users.has(metadata.user) || !online_users.has(metadata.peer)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return debug(`call attempt from/with an offline peer: ` +
      `metadata: ${JSON.stringify(metadata)}; ` +
      `online_users: ${JSON.stringify(online_users)}`)
  }

  debug(`call attempt: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
  })
}

const createAccept =
  (meta_server, forward, sendForceCall) => (meta_stream, metadata, cb) => {
  debug('::accept::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call accept: ${JSON.stringify(metadata)}`)

  var first_err = null
  var pending = 3

  const internalErrorHandler = err => {
    if (err && !first_err) first_err = err

    if (!--pending) {
      if (first_err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(first_err)
      }

      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    }
  }

  forward(metadata, [ metadata.peer ], internalErrorHandler)

  const a = metadata.peer, b = metadata.user
  meta_server.emit('pair', a, b)
  sendForceCall(a, b, internalErrorHandler) // rx, peer, cb
  sendForceCall(b, a, internalErrorHandler) // rx, peer, cb
}

const createReject = forward => (meta_stream, metadata, cb) => {
  debug('::reject::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call reject: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
  })
}

const createPeers = (db, online_users) => (meta_stream, metadata, cb) => {
  debug('::peers::')

  if (!valid.schemaB(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema B: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
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
  (db, online_users, logged_in_users) => (meta_stream, metadata, cb) => {
  debug('::login::')

  if (!valid.schemaL(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
  }

  // make sure metadata.user is the same as meta_stream.whoami - DONE
  // verify that metadata.password is the same as stored in db[user].password
  // add metadata.user to logged_in_users
  if (metadata.user !== meta_stream.whoami) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid login attempt: `+
                        `metadata.user ${metadata.user}; ` +
                        `meta_stream.whoami: ${meta_stream.whoami}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    if (metadata.password !== user.password) { // make this timing-safe
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(new Error(`invalid password provided for ${metadata.user}`))
    }

    logged_in_users.add(metadata.user)

    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
  })
}

const createLogoff =
  (db, online_users, logged_in_users) => (meta_stream, metadata, cb) => {
  // TODO: ...

}

const createHandleMetadata = handlerMap => {
  const {
    metaWhoami,
    login,
    logoff,
    status,
    call,
    accept,
    reject,
    registerUser,
    addPeers,
    deletePeers,
    peers
  } = handlerMap

  return (meta_stream, metadata) => {
    debug('::handleMetadata::')
    i(metadata)

    if (!isTruthyString(meta_stream.whoami) && metadata.type !== 'whoami') {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error('ignoring metadata from unidentified stream'))
    } else if (metadata.type !== 'whoami' &&
               metadata.user !== meta_stream.whoami) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error(
        `ignoring metadata due to inconsistent user identifier; ` +
        `metadata.user: ${JSON.stringify(metadata.user)}; ` +
        `meta_stream.whoami: ${JSON.stringify(meta_stream.whoami)}`
      ))
    } else if (![ 'reg-user', 'whoami', 'login' ].includes(metadata.type) &&
               !logged_in_users.has(metadata.user)) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error(
        `ignoring metadata bc ${metadata.user} is not logged in; ` +
        `metadata: ${JSON.stringify(metadata)}`
      ))
    }

    switch (metadata.type) {
      case 'whoami': metaWhoami(meta_stream, metadata, handleError); break
      case 'login': login(meta_stream, metadata, handleError); break
      case 'logoff': logoff(meta_stream, metadata, handleError); break
      case 'reg-user': registerUser(meta_stream, metadata, handleError); break
      case 'add-peers': addPeers(meta_stream, metadata, handleError); break
      case 'del-peers': deletePeers(meta_stream, metadata, handleError); break
      case 'status': status(meta_stream, metadata, handleError); break
      case 'call': call(meta_stream, metadata, handleError); break
      case 'accept': accept(meta_stream, metadata, handleError); break
      case 'reject': reject(meta_stream, metadata, handleError); break
      case 'peers': peers(meta_stream, metadata, handleError); break
      case 'peers-online': peers(meta_stream, metadata, handleError); break
      default: debug(`invalid metadata.type: ${metadata.type}`)
    }
  }
}

const createHandleUpgrade = (meta_server, media_server) => {
  const _handleUpgrade = (websocket_server, req, socket, head) => {
    websocket_server.handleUpgrade(req, socket, head, ws => {
      websocket_server.emit('connection', ws, req)
    })
  }

  return (req, socket, head) => {
    debug('::handleUpgrade::')

    switch (parse(req.url).pathname) {
      case '/meta': _handleUpgrade(meta_server, req, socket, head); break
      case '/media': _handleUpgrade(media_server, req, socket, head); break
      default:
        handleError(new Error(`invalid path on req.url: ${req.url}`))
        socket.destroy()
    }
  }
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
  createPeers,
  createHandleMetadata,
  createHandleUpgrade
}