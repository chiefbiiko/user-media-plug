const { parse } = require('url')

const jsonStream = require('duplex-json-stream')
const pump = require('pump')
const preactor = require('preactor')
const CacheSet = require('cache-set')
const HookedTimeToLiveMap = require('hooked-ttl-map') // TODO: publish

const { createForward, createSendForceCall } = require('./notify.js')
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

const createWhoami = active_metastreams => (metastream, metadata, cb) => {
  debug('::whoami::')

  if (!valid.schema_WHOAMI(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema Z: ${JSON.stringify(metadata)}`))
  }

  const alreadyActive = active_metastreams.streams
    .some(metastream => metastream.whoami === metadata.user)

  if (alreadyActive) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`ignoring excess whoami for: ${metadata.user}`))
  }

  metastream.whoami = metadata.user
  active_metastreams.add(metastream)
  debug(`identified: ${metadata.user}`)
  metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
}

const createRegisterUser = db => (metastream, metadata, cb) => {
  debug('::registerUser::')

  if (!valid.schema_REGISTER(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema N: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, err => {
    if (!err || !err.notFound) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(new Error(`cannot register: "${metadata.user}"; user exists`))
    }

    const new_user = {
      password: metadata.password,
      peers: metadata.peers,
      status: 'noop'
    }

    db.put(metadata.user, new_user, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createAddPeers = db => (metastream, metadata, cb) => {
  debug('::addPeers::')

  if (!valid.schema_ADD_DEL_PEERS(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, {
      peers: user.peers.concat(metadata.peers.filter(peer => {
        return peer !== metadata.user && !user.peers.includes(peer)
      }))
    })

    db.put(metadata.user, updated_user, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createDeletePeers = db => (metastream, metadata, cb) => {
  debug('::deletePeers::')

  if (!valid.schema_ADD_DEL_PEERS(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, {
      peers: user.peers.filter(peer => !metadata.peers.includes(peer))
    })

    db.put(metadata.user, updated_user, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createStatus = (db, active_metastreams, forward) =>
  (metastream, metadata, cb) => {
  debug('::status::')

  if (!valid.schema_STATUS(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema S: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, { status: metadata.status })

    db.put(metadata.user, updated_user, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      const active_peers = active_metastreams.streams
        .filter(metastream => user.peers.includes(metastream.whoami))
        .map(peer_stream => peer_stream.whoami)

      forward(metadata, active_peers, err => {
        if (err) {
          metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
          return cb(err)
        }

        metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
      })
    })
  })
}

const createCall = forward => (metastream, metadata, cb) => {
  debug('::call::')

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call attempt: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
  })
}

const createAccept =
  (meta_server, forward, sendForceCall) => (metastream, metadata, cb) => {
  debug('::accept::')

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call accept: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const a = metadata.peer, b = metadata.user
    meta_server.emit('pair', a, b)
    sendForceCall(a, b, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      sendForceCall(b, a, err => {
        if (err) {
          metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
          return cb(err)
        }

        metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
      })
    })
  })
}

const createReject = forward => (metastream, metadata, cb) => {
  debug('::reject::')

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }

  debug(`call reject: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
  })
}

const createGetPeers = db => (metastream, metadata, cb) => {
  debug('::getPeers::')

  if (!valid.schema_GET_PEERS(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema B: ${JSON.stringify(metadata)}`))
  }

  debug(`peer request: ${JSON.stringify(metadata)}`)

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    var peers = []
    var pending = user.peers.length
    var first_err

    const _respond = () => {
      if (first_err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(first_err)
      }
      const payload = outbound.res(metadata.type, metadata.tx, true, { peers })
      debug(`payload for peer request: ${JSON.stringify(payload)}`)
      metastream.write(payload, cb)
    }

    if (!pending) return _respond()

    user.peers.forEach(peer => {
      db.get(peer, (err, user) => {
        if (err && !first_err) first_err = err
        else if (!err) peers.push({ peer, status: user.status })
        if (!--pending) _respond()
      })
    })
  })
}

const createLogin =
  (db, logged_in_users) => (metastream, metadata, cb) => {
  debug('::login::')

  if (!valid.schema_LOGIN(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    if (metadata.password !== user.password) { // make this timing-safe
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(new Error(`invalid password provided for ${metadata.user}`))
    }

    logged_in_users.add(metadata.user)

    metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
  })
}

const createLogout = logged_in_users => (metastream, metadata, cb) => {
  debug('::logout::')

  if (!valid.schema_LOGOUT(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema L: ${JSON.stringify(metadata)}`))
  }

  logged_in_users.delete(metadata.user)

  metastream.write(o(outbound.res(metadata.type, metadata.tx, true, cb)))
}

const createHandleMetadata = (handlerMap, logged_in_users) => {
  const {
    whoami,
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

  return (metastream, metadata) => {
    debug('::handleMetadata::')
    i(metadata)

    if (!isTruthyString(metastream.whoami) && metadata.type !== 'WHOAMI') {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error('ignoring metadata from incognito stream'))
    } else if (metadata.type !== 'WHOAMI' &&
               metadata.user !== metastream.whoami) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error(
        `ignoring metadata due to inconsistent user identifier; ` +
        `metadata.user: ${JSON.stringify(metadata.user)}; ` +
        `metastream.whoami: ${JSON.stringify(metastream.whoami)}`
      ))
    } else if (![ 'REGISTER', 'WHOAMI', 'LOGIN' ].includes(metadata.type) &&
               !logged_in_users.has(metadata.user)) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(new Error(
        `ignoring metadata bc ${metadata.user} is not logged in; ` +
        `metadata: ${JSON.stringify(metadata)}`
      ))
    }

    switch (metadata.type) {
      case 'WHOAMI': whoami(metastream, metadata, handleError); break
      case 'LOGIN': login(metastream, metadata, handleError); break
      case 'LOGOUT': logout(metastream, metadata, handleError); break
      case 'REGISTER': registerUser(metastream, metadata, handleError); break
      case 'ADD_PEERS': addPeers(metastream, metadata, handleError); break
      case 'DEL_PEERS': deletePeers(metastream, metadata, handleError); break
      case 'GET_PEERS': peers(metastream, metadata, handleError); break
      case 'STATUS': status(metastream, metadata, handleError); break
      case 'CALL': call(metastream, metadata, handleError); break
      case 'ACCEPT': accept(metastream, metadata, handleError); break
      case 'REJECT': reject(metastream, metadata, handleError); break
      case 'UNPAIR': unpair(metastream, metadata, handleError); break
      default:
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return handleError(new Error(`invalid metadata.type: ${metadata.type}`))
    }
  }
}

const createHandleMetastream = injects => {
  const {
    db,
    meta_server,
    active_metastreams,
    active_mediastreams,
    logged_in_users
  } = injects

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  return (metastream, req) => {
    debug('::handleMetastream::')
    metastream = jsonStream(metastream)
    metastream.on('error', handleError)
    metastream.on('data', createHandleMetadata({
      whoami: createWhoami(active_metastreams),
      registerUser: createRegisterUser(db),
      addPeers: createAddPeers(db),
      deletePeers: createDeletePeers(db),
      getPeers: createGetPeers(db),
      login: createLogin(db, logged_in_users),
      logout: createLogout(logged_in_users),
      status: createStatus(db, active_metastreams, forward),
      call: createCall(forward),
      accept: createAccept(meta_server, forward, sendForceCall),
      reject: createReject(forward),
      unpair: createUnpair(active_mediastreams)
    }, logged_in_users).bind(null, metastream))
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

const createHandlePair = (media_server, active_mediastreams) => {
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
      .on('stream', (mediastream, req) => {
        mediastream.on('error', handleError)
        mediastream.once('data', chunk => {
          debug(`first mediastream chunk: ${i(chunk)}`)
          parseJSON(chunk, (err, info) => {
            if (err) {
              mediastream.destroy()
              return handleError(err)
            }

            if (!valid.schema_INFO(info)) {
              mediastream.destroy()
              return handleError(new Error(
                `just destroyed a mediastream due to invalid schema I; ` +
                `info: ${JSON.stringify(info)}`
              ))
            }

            const paired = pairs.some(s => s.has(info.user) && s.has(info.peer))

            if (!paired) {
              mediastream.destroy()
              return handleError(new Error(
                `just destroyed an unpaired mediastream; ` +
                `info: ${JSON.stringify(info)}`
              ))
            } else if (waiting.has(info.peer)) {
              debug(`cross-pumping: <${info.user} x ${info.peer}> ...`)
              const peer_stream = waiting.get(info.peer)
              peer_stream.paired = true
              const tag = hashtag(info.user, info.peer)
              active_mediastreams.add(tag, peer_stream, mediastream)
              pump(peer_stream.resume(), mediastream, handleError)
              pump(mediastream, peer_stream, handleError)
            } else {
              debug(`${info.user} about to await ${info.peer} for 10s...`)
              waiting.set(10000, info.user, mediastream.pause(),
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

const createUnpair = active_mediastreams => (metastream, metadata, cb) => {
  debug('::unpair::')

  if (!valid.schema_UNPAIR(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(new Error(`invalid schema UNPAIR: ${JSON.stringify(metadata)}`))
  }

  const tag = hashtag(metadata.user, metadata.peer)
  const deleted = active_mediastreams.delete(tag)
  debug(`just attempted an unpair; hashtag: ${tag}, deleted: ${deleted}`)
  metastream.write(o(outbound.res(metadata.type, metadata.tx, deleted)), cb)
}

const willDeleteMediastreams = (tag, fading_streams, doDelete) => {
  debug(`bouta delete all media streams with hashtag: ${tag}`)
  fading_streams.forEach(stream => stream.unpipe().destroy())
  doDelete()
}

module.exports = {
  createHandleUpgrade,
  createHandleMetastream,
  createHandleMetadata,
  createWhoami,
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
  willDeleteMediastreams
}
