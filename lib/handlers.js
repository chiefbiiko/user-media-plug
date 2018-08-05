const outbound = require('./outbound.js')
const valid = require('./valid.js')
// TODO: replace data.js by levelup access!!
const { createListOnlinePeers } = require('./data.js')

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
    return debug(`ignoring excess whoami for: ${metadata.user}`)
  }
  meta_stream.whoami = metadata.user
  active_meta_streams.add(meta_stream)
  debug(`identified: ${metadata.user}`)
  meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
}

const createRegisterUser = db => (metadata, meta_stream, cb) => {
  debug('::registerUser::')
  if (!valid.schemaA(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  }
  // readTransformWriteUsers(users => {
  //   if (!users[metadata.user]) users[metadata.user] = { peers: metadata.peers }
  //   return users
  // }, cb)
  // _TODO: register user in db
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
  // readTransformWriteUsers(users => {
  //   if (!users[metadata.user]) return users
  //   for (const peer of metadata.peers)
  //     if (peer !== metadata.user && !users[metadata.user].peers.includes(peer))
  //       users[metadata.user].peers.push(peer)
  //   return users
  // }, cb)
  // _TODO: add peers in db
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
  // readTransformWriteUsers(users => {
  //   for (const peer of metadata.peers) {
  //     const i = users[metadata.user].peers.indexOf(peer)
  //     if (i !== -1) users[metadata.user].peers.splice(i, 1)
  //   }
  //   return users
  // }, cb)
  // _TODO: delete peers in db
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
  if (!valid.schemaF(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema F: ${JSON.stringify(metadata)}`))
  }
  if (metadata.status === 'online') online_users.add(metadata.user)
  else if (metadata.status === 'offline') online_users.delete(metadata.user)
  // listOnlinePeers(metadata.user, (err, online_peers) => {
  //   if (err) return cb(err)
  //   debug(`online_peers of ${metadata.user}: ${JSON.stringify(online_peers)}`)
  //   forward(metadata, online_peers, cb)
  // })
  // _TODO:
  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }
    const active_peers = active_meta_streams.streams
      .filter(meta_stream => user.peers.includes(meta_stream.whoami))
    debug(`broadcasting ${JSON.stringify(metadata)} to ` +
          `active_peers of ${metadata.user}: ${JSON.stringify(active_peers)}`)
    forward(metadata, active_peers, err => {
      if (err) {
        meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
        return cb(err)
      }
      meta_stream.write(outbound.res(metadata.type, metadata.tx, true), cb)
    })
  })
}

// const createOffline = (db, online_users, forward) => (metadata, cb) => {
//   debug('::offline::')
//   if (!valid.schemaB(metadata))
//     return cb(new Error(`invalid schema B: ${JSON.stringify(metadata)}`))
//   online_users.delete(metadata.user)
//   // listOnlinePeers(metadata.user, (err, online_peers) => {
//   //   if (err) return cb(err)
//   //   debug(`online_peers of ${metadata.user}: ${JSON.stringify(online_peers)}`)
//   //   forward(metadata, online_peers, cb)
//   // })
//   // _TODO:
//   db.get(metadata.user, (err, user) => {
//     if (err) return cb(err)
//     const peers_online = Array.from(online_users)
//       .filter(online_user => user.peers.includes(online_user))
//     debug(`peers_online of ${metadata.user}: ${JSON.stringify(peers_online)}`)
//     forward(metadata, peers_online, cb)
//   })
// }

const createCall = (online_users, forward) => (metadata, meta_stream, cb) => {
  debug('::call::')
  if (!valid.schemaC(metadata)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  }
  if (!online_users.has(metadata.user) || !online_users.has(metadata.peer)) {
    meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
    return debug(`call attempt from/with an offline peer\n` +
      `metadata: ${JSON.stringify(metadata)}\n` +
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
  // readUsers((err, users) => {
  //   if (err) return cb(err)
  //   const peers_online = Array.from(online_users)
  //     .filter(online_user => users[metadata.user].peers.includes(online_user))
  //   debug(`peers_online of ${metadata.user}: ${JSON.stringify(peers_online)}`)
  //   stream.write(outbound.peersOnline(peers_online), cb)
  // })
  // _TODO: read friend lists from db
  db.get(metadata.user, (err, user) => {
    if (err) {
      meta_stream.write(outbound.res(metadata.type, metadata.tx, false))
      return cb(err)
    }
    debug(`peer request: ${JSON.stringify(metadata)}`)
    var payload
    if (metadata.type === 'peers') {
      debug(`peers for ${metadata.user}: ${JSON.stringify(user.peers)}`)
      // meta_stream.write(outbound.peers(user.peers), cb)
      payload = outbound.res(metadata.type, metadata.tx, true, { peers: user.peers })
      // meta_stream.write(payload, cb)
    } else if (metadata.type === 'peers-online') {
      const peers_online = Array.from(online_users)
        .filter(online_user => user.peers.includes(online_user))
      debug(`peers_online for ${metadata.user}: ${JSON.stringify(peers_online)}`)
      payload = outbound.res(metadata.type, metadata.tx, true, { peers_online })
      // meta_stream.write(payload, cb)
    }
    meta_stream.write(payload, cb)
    // const peers_online = Array.from(online_users)
    //   .filter(online_user => user.peers.includes(online_user))
    // debug(`peers_online of ${metadata.user}: ${JSON.stringify(peers_online)}`)
  })
}

module.exports = {
  createMetaWhoami,
  // createOnline,
  // createOffline,
  createStatus,
  createCall,
  createAccept,
  createReject,
  createRegisterUser,
  createAddPeers,
  createDeletePeers,
  createPeers
}
