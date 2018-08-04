const outbound = require('./outbound.js')
const valid = require('./valid.js')
// TODO: replace data.js by levelup access!!
const { createListOnlinePeers } = require('./data.js')

const debug = require('debug')('user-media-plug:handlers')

const createMetaWhoami = active_meta_streams => (metadata, meta_stream, cb) => {
  debug('::metaWhoami::')
  if (!valid.schemaZ(metadata))
    return cb(new Error(`invalid schema Z: ${JSON.stringify(metadata)}`))
  const alreadyActive = Array.from(active_meta_streams)
    .some(meta_stream => meta_stream.whoami === metadata.user)
  if (alreadyActive)
    return debug(`ignoring excess whoami for: ${metadata.user}`)
  meta_stream.whoami = metadata.user
  active_meta_streams.add(meta_stream)
  debug(`identified: ${metadata.user}`)
  cb(null)
}

const createRegisterUser = db => (metadata, cb) => {
  debug('::registerUser::')
  if (!valid.schemaA(metadata))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  // readTransformWriteUsers(users => {
  //   if (!users[metadata.user]) users[metadata.user] = { peers: metadata.peers }
  //   return users
  // }, cb)
  // _TODO: register user in db
  db.get(metadata.user, err => {
    if (!err.notFound)
      return cb(new Error(`cannot register: ${metadata.user}; user exists`))
    db.put(metadata.user, { peers: metadata.peers }, cb)
  })
}

const createAddPeers = db => (metadata, cb) => {
  debug('::addPeers::')
  if (!valid.schemaA(metadata))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  // readTransformWriteUsers(users => {
  //   if (!users[metadata.user]) return users
  //   for (const peer of metadata.peers)
  //     if (peer !== metadata.user && !users[metadata.user].peers.includes(peer))
  //       users[metadata.user].peers.push(peer)
  //   return users
  // }, cb)
  // _TODO: add peers in db
  db.get(metadata.user, (err, user) => {
    if (err) return cb(err)
    const new_peers = [ ...new Set(
      user.peers.concat(metadata.peers.filter(peer => {
        return peer !== metadata.user && !user.peers.includes(peer)
      }))
    ) ]
    db.put(metadata.user, { peers: new_peers }, cb)
  })
}

const createDeletePeers = db => (metadata, cb) => {
  debug('::deletePeers::')
  if (!valid.schemaA(metadata))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  // readTransformWriteUsers(users => {
  //   for (const peer of metadata.peers) {
  //     const i = users[metadata.user].peers.indexOf(peer)
  //     if (i !== -1) users[metadata.user].peers.splice(i, 1)
  //   }
  //   return users
  // }, cb)
  // _TODO: delete peers in db
  db.get(metadata.user, (err, user) => {
    if (err) return cb(err)
    const new_peers = user.peers.filter(peer => !metadata.peers.includes(peer))
    db.put(metadata.user, { peers: new_peers }, cb)
  })
}

const createStatus =
  (db, online_users, active_meta_streams, forward) => (metadata, cb) => {
  debug('::status::')
  if (!valid.schemaF(metadata))
    return cb(new Error(`invalid schema F: ${JSON.stringify(metadata)}`))
  if (metadata.status === 'online') online_users.add(metadata.user)
  else if (metadata.status === 'offline') online_users.delete(metadata.user)
  // listOnlinePeers(metadata.user, (err, online_peers) => {
  //   if (err) return cb(err)
  //   debug(`online_peers of ${metadata.user}: ${JSON.stringify(online_peers)}`)
  //   forward(metadata, online_peers, cb)
  // })
  // _TODO:
  db.get(metadata.user, (err, user) => {
    if (err) return cb(err)
    const active_peers = Array.from(active_meta_streams)
      .filter(meta_stream => user.peers.includes(meta_stream.whoami))
    debug(`broadcasting ${JSON.stringify(metadata)} to ` +
          `active_peers of ${metadata.user}: ${JSON.stringify(active_peers)}`)
    forward(metadata, active_peers, cb)
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

const createCall = (online_users, forward) => (metadata, cb) => {
  debug('::call::')
  if (!valid.schemaC(metadata))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  if (!online_users.has(metadata.user) || !online_users.has(metadata.peer))
    return debug(`call attempt from/with an offline peer\n` +
      `online_users: ${JSON.stringify(online_users)}\n` +
      `metadata: ${JSON.stringify(metadata)}`)
  forward(metadata, [ metadata.peer ], cb)
}

const createAccept =
  (meta_server, forward, sendForceCall) => (metadata, cb) => {
  debug('::accept::')
  if (!valid.schemaC(metadata))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  var first_error = null
  var pending = 3
  const internalErrorHandler = err => {
    if (err && !first_error) first_error = err
    if (!--pending) cb(first_error)
  }
  forward(metadata, [ metadata.peer ], internalErrorHandler)
  const a = metadata.peer, b = metadata.user
  meta_server.emit('pair', a, b)
  sendForceCall(a, b, internalErrorHandler) // rx, user, cb
  sendForceCall(b, a, internalErrorHandler) // rx, user, cb
}

const createReject = forward => (metadata, cb) => {
  debug('::reject::')
  if (!valid.schemaC(metadata))
    return cb(new Error(`invalid schema C: ${JSON.stringify(metadata)}`))
  forward(metadata, [ metadata.peer ], cb)
}

const createPeersOnline = (db, online_users) => (metadata, stream, cb) => {
  debug('::peersOnline::')
  if (!valid.schemaB(metadata))
    return cb(new Error(`invalid schema B: ${JSON.stringify(metadata)}`))
  // readUsers((err, users) => {
  //   if (err) return cb(err)
  //   const peers_online = Array.from(online_users)
  //     .filter(online_user => users[metadata.user].peers.includes(online_user))
  //   debug(`peers_online of ${metadata.user}: ${JSON.stringify(peers_online)}`)
  //   stream.write(outbound.peersOnline(peers_online), cb)
  // })
  // _TODO: read friend lists from db
  db.get(metadata.user, (err, user) => {
    if (err) return cb(err)
    const peers_online = Array.from(online_users)
      .filter(online_user => user.peers.includes(online_user))
    debug(`peers_online of ${metadata.user}: ${JSON.stringify(peers_online)}`)
    stream.write(outbound.peersOnline(peers_online), cb)
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
  createPeersOnline
}
