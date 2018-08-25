const { parse } = require('url')

const jsonStream = require('duplex-json-stream')
const pump = require('pump')
const preactor = require('preactor')
const CacheSet = require('cache-set')
const HookedTimeToLiveMap = require('hooked-ttl-map') // TODO: publish

const outbound = require('./outbound.js')
const valid = require('./valid.js')

const { isTruthyString } = require('./is.js')

const debug = require('debug')('user-media-plug:handlers')

const i = msg => {
  debug(`inbound msg: ` +
        `${Buffer.isBuffer(msg) ? String(msg) : JSON.stringify(msg)}`)
  return msg
}

const o = msg => {
  debug(`outbound msg: ` +
        `${Buffer.isBuffer(msg) ? String(msg) : JSON.stringify(msg)}`)
  return msg
}

const parseJSON = (buf, cb) => {
  try {
    cb(null, JSON.parse(buf))
  } catch (err) {
    cb(err)
  }
}

const hashtag = (...words) => `#${words.sort().join('-')}`

const handleError = err => err && debug(`error: ${err.message}`)

const createMetaWhoami = active_meta_streams => (meta_stream, metadata, cb) => {
  debug('::metaWhoami::')

  if (!valid.schema_WHOAMI(metadata)) {
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

  if (!valid.schema_REGISTER(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema N: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, err => {
    if (!err || !err.notFound) {
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

  if (!valid.schema_ADD_DEL_PEERS(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, {
      peers: user.peers.concat(metadata.peers.filter(peer => {
        return peer !== metadata.user && !user.peers.includes(peer)
      }))
    })

    db.put(metadata.user, updated_user, err => {
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

  if (!valid.schema_ADD_DEL_PEERS(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, {
      peers: user.peers.filter(peer => !metadata.peers.includes(peer))
    })

    db.put(metadata.user, updated_user, err => {
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

  if (!valid.schema_STATUS(metadata)) {
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

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
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

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
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

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
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

  if (!valid.schema_GET_PEERS(metadata)) {
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

  if (!valid.schema_LOGIN(metadata)) {
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

  if (!valid.schema_LOGOUT(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
  }

  logged_in_users.delete(metadata.user)

  meta_stream.write(o(outbound.res(metadata.type, metadata.tx, true, cb)))
}

const createHandleMetadata = (handlerMap, logged_in_users) => {
  const {
    metaWhoami,
    registerUser,
    addPeers,
    deletePeers,
    getPeers,
    login,
    logout,
    status,
    call,
    accept,
    reject,
    unpair
  } = handlerMap

  return (meta_stream, metadata) => {
    debug('::handleMetadata::')
    i(metadata)

    if (!isTruthyString(meta_stream.whoami) && metadata.type !== 'WHOAMI') {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error('ignoring metadata from incognito stream'))
    } else if (metadata.type !== 'WHOAMI' &&
               metadata.user !== meta_stream.whoami) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error(
        `ignoring metadata due to inconsistent user identifier; ` +
        `metadata.user: ${JSON.stringify(metadata.user)}; ` +
        `meta_stream.whoami: ${JSON.stringify(meta_stream.whoami)}`
      ))
    } else if (![ 'REGISTER', 'WHOAMI', 'LOGIN' ].includes(metadata.type) &&
               !logged_in_users.has(metadata.user)) {
      meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error(
        `ignoring metadata bc ${metadata.user} is not logged in; ` +
        `metadata: ${JSON.stringify(metadata)}`
      ))
    }

    switch (metadata.type) {
      case 'WHOAMI': metaWhoami(meta_stream, metadata, handleError); break
      case 'LOGIN': login(meta_stream, metadata, handleError); break
      case 'LOGOUT': logout(meta_stream, metadata, handleError); break
      case 'REGISTER': registerUser(meta_stream, metadata, handleError); break
      case 'ADD_PEERS': addPeers(meta_stream, metadata, handleError); break
      case 'DEL_PEERS': deletePeers(meta_stream, metadata, handleError); break
      case 'GET_PEERS': peers(meta_stream, metadata, handleError); break
      case 'STATUS': status(meta_stream, metadata, handleError); break
      case 'CALL': call(meta_stream, metadata, handleError); break
      case 'ACCEPT': accept(meta_stream, metadata, handleError); break
      case 'REJECT': reject(meta_stream, metadata, handleError); break
      case 'UNPAIR': unpair(meta_stream, metadata, handleError); break
      default:
        meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return handleError(new Error(`invalid metadata.type: ${metadata.type}`))
    }
  }
}

const createHandleMetastream = handleMetadata => (meta_stream, req) => {
  debug('::meta_server.on("stream")::')
  meta_stream = jsonStream(meta_stream)
  meta_stream.on('data', handleMetadata.bind(null, meta_stream))
  meta_stream.on('error', handleError)
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

const createHandlePair = (media_server, active_media_streams) => {
  const pairs = new CacheSet()
  const waiting = new HookedTimeToLiveMap()

  return (a, b) => {
    debug('::handlePair::')
    debug(`finna pair: ${a}, ${b}; within the next 10s only...`)

    pairs.add(10000, new Set([ a, b ]))

    const now = Date.now()
    const end = now + 10000

    preactor(media_server, 'stream')
      .onlyWithin(now, end)
      .on('stream', (media_stream, req) => {
        media_stream.on('error', handleError)
        media_stream.once('data', chunk => {
          debug(`first media_stream chunk: ${i(chunk)}`)
          parseJSON(chunk, (err, info) => {
            if (err) {
              media_stream.destroy()
              return handleError(err)
            }

            if (!valid.schema_INFO(info)) {
              media_stream.destroy()
              return handleError(new Error(
                `just destroyed a media_stream due to invalid schema I; ` +
                `info: ${JSON.stringify(info)}`
              ))
            }

            const paired = pairs.some(s => s.has(info.user) && s.has(info.peer))

            if (!paired) {
              media_stream.destroy()
              return handleError(new Error(
                `just destroyed an unpaired media_stream; ` +
                `info: ${JSON.stringify(info)}`
              ))
            } else if (waiting.has(info.peer)) {
              debug(`cross-pumping: <${info.user} x ${info.peer}> ...`)
              const peer_stream = waiting.get(info.peer)
              peer_stream.paired = true
              const tag = hashtag(info.user, info.peer)
              active_media_streams.add(tag, peer_stream, media_stream)
              pump(peer_stream.resume(), media_stream, handleError)
              pump(media_stream, peer_stream, handleError)
            } else {
              debug(`${info.user} about to await ${info.peer} for 10s...`)
              waiting.set(10000, info.user, media_stream.pause(),
                (k, v, doDelete) => { // willDelete hook (4 cleanup)
                  debug(`${k}'s stream.paired in willDelete hook: ${v.paired}`)
                  if (!v.paired && !v.destroyed) v.destroy()
                  doDelete()
                })
            }

          })
        })
      })
  }
}

const createUnpair = active_media_streams => (meta_stream, metadata, cb) => {
  debug('::unpair::')

  if (!valid.schema_UNPAIR(metadata)) {
    meta_stream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema UNPAIR: ${JSON.stringify(metadata)}`))
  }

  const tag = hashtag(metadata.user, metadata.peer)
  const deleted = active_media_streams.delete(tag)
  debug(`just attempted an unpair; hashtag: ${tag}, deleted: ${deleted}`)
  meta_stream.write(o(outbound.res(metadata.type, metadata.tx, deleted)), cb)
}

const willDeleteMediaStreams = (tag, fading_streams, doDelete) => {
  debug(`bouta delete all media streams with hashtag: ${tag}`)
  fading_streams.forEach(stream => stream.unpipe().destroy())
  doDelete()
}

module.exports = {
  createHandleUpgrade,
  createHandleMetastream,
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
  createReject,
  createUnpair,
  createHandlePair,
  willDeleteMediaStreams
}
