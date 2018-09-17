const { parse } = require('url')
const { timingSafeEqual } = require('crypto')

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

const ERR = {
  invalidSchema (schema, metadata) {
    return Error(`invalid schema ${schema}: ${JSON.stringify(metadata)}`)
  }
}

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
    return cb(ERR.invalidSchema('WHOAMI', metadata))
  }

  const alreadyActive = active_metastreams.streams
    .some(mstream => mstream !== metastream && mstream.whoami === metadata.user)

  if (alreadyActive) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(Error(`ignoring excess whoami for: ${metadata.user}`))
  }

  if (!isTruthyString(metastream.whoami)) {
    metastream.whoami = metadata.user
    active_metastreams.add(metastream)
  } else {
    metastream.whoami = metadata.user
  }

  debug(`identified: ${metadata.user}`)
  metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
}

const createRegisterUser = db => (metastream, metadata, cb) => {
  debug('::registerUser::')

  if (!valid.schema_REGISTER(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('REGISTER', metadata))
  }

  db.get(metadata.user, err => {
    if (!err || !err.notFound) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(Error(`cannot register: "${metadata.user}"; user exists`))
    }

    const new_user = {
      password: metadata.password,
      peers: [],
      status: 'noop',
      avatar: 'data:image/*;base64,...' // TODO: default avatar!!!
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

const createLogin =
  (db, logged_in_users, forward) => (metastream, metadata, cb) => {
  debug('::login::')

  if (!valid.schema_LOGIN(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('LOGIN', metadata))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const actual = Buffer.from(metadata.password)
    const expected = Buffer.from(user.password)

    if (!timingSafeEqual(actual, expected)) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(Error(`invalid password provided for ${metadata.user}`))
    }

    logged_in_users.add(metadata.user)

    const logged_in_peers = user.peers.filter(peer => logged_in_users.has(peer))

    forward(outbound.online(metadata.user), logged_in_peers, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createLogout =
  (db, logged_in_users, forward) => (metastream, metadata, cb) => {
  debug('::logout::')

  if (!valid.schema_LOGOUT(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('LOGOUT', metadata))
  }

  logged_in_users.delete(metadata.user)

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const logged_in_peers = user.peers.filter(peer => logged_in_users.has(peer))

    forward(outbound.offline(metadata.user), logged_in_peers, err => {
      if (err) {
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return cb(err)
      }

      metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
    })
  })
}

const createAvatar = db => (metastream, metadata, cb) => {
  debug('::avatar::')

  if (!valid.schema_AVATAR(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('AVATAR', metadata))
  }

  db.get(metadata.user, (err, user) => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const updated_user = Object.assign({}, user, { avatar: metadata.avatar })

    db.put(metadata.user, updated_user, err => {
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
    return cb(ERR.invalidSchema('ADD_DEL_PEERS', metadata))
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
    return cb(ERR.invalidSchema('ADD_DEL_PEERS', metadata))
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
    return cb(ERR.invalidSchema('STATUS', metadata))
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
    return cb(ERR.invalidSchema('CALL_ACCEPT_REJECT', metadata))
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
  (metaserver, forward, sendForceCall) => (metastream, metadata, cb) => {
  debug('::accept::')

  if (!valid.schema_CALL_ACCEPT_REJECT(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('CALL_ACCEPT_REJECT', metadata))
  }

  debug(`call accept: ${JSON.stringify(metadata)}`)

  forward(metadata, [ metadata.peer ], err => {
    if (err) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return cb(err)
    }

    const a = metadata.peer, b = metadata.user
    metaserver.emit('pair', a, b)
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
    return cb(ERR.invalidSchema('CALL_ACCEPT_REJECT', metadata))
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

const createGetPeers = (db, logged_in_users) => (metastream, metadata, cb) => {
  debug('::getPeers::')

  if (!valid.schema_GET_PEERS(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('GET_PEERS', metadata))
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
        if (!err) {
          peers.push({
            peer,
            status: user.status,
            online: logged_in_users.has(peer)
          })
        }
        if (!--pending) _respond()
      })
    })
  })
}

const createHandleMetadata = (msg_handlers, logged_in_users) => {
  const {
    whoami,
    registerUser,
    avatar,
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
  } = msg_handlers

  return (metastream, metadata) => {
    debug('::handleMetadata::')
    i(metadata)

    if (!isTruthyString(metastream.whoami) && metadata.type !== 'WHOAMI') {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(Error('ignoring metadata from incognito stream'))
    } else if (metadata.type !== 'WHOAMI' &&
               metadata.user !== metastream.whoami) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(Error(
        `ignoring metadata due to inconsistent user identifier; ` +
        `metadata.user: ${JSON.stringify(metadata.user)}; ` +
        `metastream.whoami: ${JSON.stringify(metastream.whoami)}`
      ))
    } else if (![ 'REGISTER', 'WHOAMI', 'LOGIN' ].includes(metadata.type) &&
               !logged_in_users.has(metadata.user)) {
      metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
      return handleError(Error(
        `ignoring metadata bc ${metadata.user} is not logged in; ` +
        `metadata: ${JSON.stringify(metadata)}`
      ))
    }

    switch (metadata.type) {
      case 'WHOAMI': whoami(metastream, metadata, handleError); break
      case 'LOGIN': login(metastream, metadata, handleError); break
      case 'LOGOUT': logout(metastream, metadata, handleError); break
      case 'REGISTER': registerUser(metastream, metadata, handleError); break
      case 'AVATAR': avatar(metastream, metadata, handleError); break
      case 'ADD_PEERS': addPeers(metastream, metadata, handleError); break
      case 'DEL_PEERS': deletePeers(metastream, metadata, handleError); break
      case 'GET_PEERS': getPeers(metastream, metadata, handleError); break
      case 'STATUS': status(metastream, metadata, handleError); break
      case 'CALL': call(metastream, metadata, handleError); break
      case 'ACCEPT': accept(metastream, metadata, handleError); break
      case 'REJECT': reject(metastream, metadata, handleError); break
      case 'UNPAIR': unpair(metastream, metadata, handleError); break
      default:
        metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
        return handleError(Error(`invalid metadata.type: ${metadata.type}`))
    }
  }
}

const createHandleMetastream = injects => {
  const {
    db,
    metaserver,
    active_metastreams,
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
      avatar: createAvatar(db),
      addPeers: createAddPeers(db),
      deletePeers: createDeletePeers(db),
      getPeers: createGetPeers(db, logged_in_users),
      login: createLogin(db, logged_in_users, forward),
      logout: createLogout(db, logged_in_users, forward),
      status: createStatus(db, active_metastreams, forward),
      call: createCall(forward),
      accept: createAccept(metaserver, forward, sendForceCall),
      reject: createReject(forward),
      unpair: createUnpair(metaserver)
    }, logged_in_users).bind(null, metastream))
  }
}

const createHandleUpgrade = (metaserver, mediaserver) => {
  const _handleUpgrade = (websocket_server, req, socket, head) => {
    websocket_server.handleUpgrade(req, socket, head, ws => {
      websocket_server.emit('connection', ws, req)
    })
  }

  return (req, socket, head) => {
    debug('::handleUpgrade::')

    switch (parse(req.url).pathname) {
      case '/meta': _handleUpgrade(metaserver, req, socket, head); break
      case '/media': _handleUpgrade(mediaserver, req, socket, head); break
      default:
        socket.destroy()
        return handleError(Error(`invalid path on req.url: ${req.url}`))
    }
  }
}

const createUnpair = metaserver => (metastream, metadata, cb) => {
  debug('::unpair::')

  if (!valid.schema_UNPAIR(metadata)) {
    metastream.write(o(outbound.res(metadata.type, metadata.tx, false)))
    return cb(ERR.invalidSchema('UNPAIR', metadata))
  }

  metaserver.emit('unpair', metadata)
  metastream.write(o(outbound.res(metadata.type, metadata.tx, true)), cb)
}

const createHandlePair = (mediaserver, active_mediastreams) => {
  const pairs = new CacheSet()
  const waiting = new HookedTimeToLiveMap()

  return (a, b) => {
    debug('::handlePair::')
    debug(`finna pair: ${a}, ${b}; within the next 10s only...`)

    pairs.add(10000, new Set([ a, b ]))

    const now = Date.now()
    const end = now + 10000

    preactor(mediaserver, 'stream')
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
              return handleError(Error(
                `just destroyed a mediastream due to invalid schema I; ` +
                `info: ${JSON.stringify(info)}`
              ))
            }

            const paired = pairs.some(s => s.has(info.user) && s.has(info.peer))

            if (!paired) {
              mediastream.destroy()
              return handleError(Error(
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

const createHandleUnpair = active_mediastreams => metadata => {
  const tag = hashtag(metadata.user, metadata.peer)
  const del = active_mediastreams.delete(tag)
  debug(`just attempted an unpair; hashtag: ${tag}, deleted: ${del}`)
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
  createLogin,
  createLogout,
  createAvatar,
  createAddPeers,
  createDeletePeers,
  createGetPeers,
  createStatus,
  createCall,
  createAccept,
  createReject,
  createUnpair,
  createHandlePair,
  createHandleUnpair,
  willDeleteMediastreams
}
