const { parse } = require('url')

const pump = require('pump')
const Preactor = require('preactor')
const CacheSet = require('cache-set')

const outbound = require('./outbound.js')
const valid = require('./valid.js')

const { isTruthyString } = require('./is.js')

const debug = require('debug')('user-media-plug:handlers')
const i = msg => debug(`inbound msg: ${JSON.stringify(msg)}`) || msg
const o = msg => debug(`outbound msg: ${JSON.stringify(msg)}`) || msg

const parseJSON = (buf, cb) => {
  try {
    cb(null, JSON.parse(buf))
  } catch (err) {
    cb(err)
  }
}

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
    if (!err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(new Error(`cannot register: "${metadata.user}"; db error`))
    } else if (!err.notFound) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(new Error(`cannot register: "${metadata.user}"; user exists`))
    }

    const new_user = {
      password: metadata.password,
      peers: metadata.peers,
      status: 'noop'
    }

    db.put(metadata.user, new_user, err => {
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

const createStatus = (db, active_meta_streams, forward) =>
  (meta_stream, metadata, cb) => {
  debug('::status::')

  if (!valid.schemaS(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema S: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, { status: metadata.status })

    db.put(metadata.user, updated_user, err => {
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
  })
}

const createCall = forward => (meta_stream, metadata, cb) => {
  debug('::call::')

  if (!valid.schemaC(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
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

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const a = metadata.peer, b = metadata.user
    meta_server.emit('pair', a, b)
    sendForceCall(a, b, err => {
      if (err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      sendForceCall(b, a, err => {
        if (err) {
          meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
          return cb(err)
        }

        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
      })
    })
  })
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

const createGetPeers = db => (meta_stream, metadata, cb) => {
  debug('::peers::')

  if (!valid.schemaB(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema B: ${JSON.stringify(metadata)}`))
  }

  debug(`peer request: ${JSON.stringify(metadata)}`)

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    var peers = []
    var pending = user.peers.length
    var payload
    var first_err

    const _respond = () => {
      if (first_err) {
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(first_err)
      }
      payload = outbound.res(metadata.type, metadata.tx, true, { peers })
      debug(`payload for peer request: ${JSON.stringify(payload)}`)
      meta_stream.write(payload, cb)
    }

    if (!pending) _respond()

    user.peers.forEach(peer => {
      db.get(peer, (err, user) => {
        if (err && !first_err) first_err = err
        else peers.push({ peer, status: user.status })
        if (!--pending) _respond()
      })
    })
  })
}

const createLogin =
  (db, logged_in_users) => (meta_stream, metadata, cb) => {
  debug('::login::')

  if (!valid.schemaL(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
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

const createLogout = logged_in_users => (meta_stream, metadata, cb) => {
  debug('::logout::')

  if (!valid.schemaL(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
  }

  logged_in_users.delete(metadata.user)

  meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true, cb)))
}

const createHandleMetadata = (handlerMap, logged_in_users) => {
  const {
    metaWhoami,
    login,
    logout,
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
      case 'logout': logout(meta_stream, metadata, handleError); break
      case 'reg-user': registerUser(meta_stream, metadata, handleError); break
      case 'add-peers': addPeers(meta_stream, metadata, handleError); break
      case 'del-peers': deletePeers(meta_stream, metadata, handleError); break
      case 'status': status(meta_stream, metadata, handleError); break
      case 'call': call(meta_stream, metadata, handleError); break
      case 'accept': accept(meta_stream, metadata, handleError); break
      case 'reject': reject(meta_stream, metadata, handleError); break
      case 'peers': peers(meta_stream, metadata, handleError); break
      case 'peers-online': peers(meta_stream, metadata, handleError); break
      default:
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return handleError(new Error(`invalid metadata.type: ${metadata.type}`))
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
        socket.destroy()
        return handleError(new Error(`invalid path on req.url: ${req.url}`))
    }
  }
}

const createHandlePair = media_server => {
  const stream_preactor = new Preactor(media_server, 'stream')
  const pairs = new CacheSet()
  const waiting = new Map()
  return (a, b) => {
    debug('::handlePair::')
    debug(`pair: ${a}, ${b}`)

    pairs.add(10000, [a, b])

    stream_preactor.onlyWithin(10000).on('stream', (media_stream, req) => {
      media_stream.once('data', chunk => {
        debug(`first media_stream chunk: ${chunk}`)
        parseJSON(i(chunk), (err, info) => {
          if (err) return handleError(err)

          if (!valid.schemaI(info)) {
            media_stream.destroy()
            return handleError(new Error(
              `just destroyed a media_stream due to invalid schema I; ` +
              `info: ${JSON.stringify(info)}`
            ))
          }

          const pair = pairs
            .find(v => v.includes(info.user) && v.includes(info.peer))

          if (!pair) {
            media_stream.destroy()
            return handleError(new Error(
              `just destroyed an unpaired media_stream; ` +
              `info: ${JSON.stringify(info)}`
            ))
          } else if (waiting.has(info.peer)) {
            const peer_stream = waiting.get(info.peer)
            pump(peer_stream, media_stream, handleError)
            pump(media_stream, peer_stream, handleError)
            waiting.delete(info.peer)
          } else {
            // TODO: HookedCacheMap 4 a willDelete hook 2 call stream.destroy...
            waiting.set(info.user, media_stream)
          }

        })
      })
    })
  }
}

module.exports = {
  createHandleUpgrade,
  createHandleMetadata,
  createMetaWhoami,
  createRegisterUser,
  createAddPeers,
  createDeletePeers,
  createGetPeers,
  createLogin,
  createLogout,
  createStatus,
  createCall,
  createAccept,
  createReject
}
