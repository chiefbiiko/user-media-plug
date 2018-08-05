/*
  # dev agenda

  + a metadataserver that emits 'pair' and 'unpair' events
  + a mediadataserver that dis/connects peers according to the events above
  + a simple client api

  app has 3 data layers:
  + dynamic mediadata
  + dynamic metadata
  + static user data
*/

const { createServer } = require('http')
const { parse } = require('url')

const WebSocketServer = require('websocket-stream').Server
const streamSet = require('stream-set')

const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')

const outbound = require('./lib/outbound.js')
const valid = require('./lib/valid.js')

const { isTruthyString } = require('./lib/is.js')
const { createForward, createSendForceCall } = require('./lib/notify.js')
// const {
//   createListOnlinePeers,
//   createReadUsers,
//   createReadTransformWriteUsers
// } = require('./lib/data.js')
const {
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
} = require('./lib/handlers.js')

const debug = require('debug')('user-media-plug:index')

// const USERS_JSON_PATH = './test.users.json'

const PORT = process.env.PORT || 10000
const HOST = process.env.HOST || 'localhost'

const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
const active_meta_streams = streamSet()
const active_media_streams = streamSet()
const online_users = new Set()

const http_server = createServer()
const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
const media_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

// const readUsers = createReadUsers(USERS_JSON_PATH)
// const readTransformWriteUsers =
//   createReadTransformWriteUsers(USERS_JSON_PATH, readUsers)
// const listOnlinePeers = createListOnlinePeers(online_users, readUsers)
const forward = createForward(active_meta_streams)
const sendForceCall = createSendForceCall(active_meta_streams)

const metaWhoami = createMetaWhoami(active_meta_streams)
const registerUser = createRegisterUser(db)
const addPeers = createAddPeers(db)
const deletePeers = createDeletePeers(db)
// const online = createOnline(db, online_users, forward)
// const offline = createOffline(db, online_users, forward)
const status = createStatus(db, online_users, active_meta_streams, forward)
const call = createCall(online_users, forward)
const accept = createAccept(meta_server, forward, sendForceCall)
const reject = createReject(forward)
const peers = createPeers(db, online_users)

function handleError (err) {
  if (err) debug(err)
}

function _handleUpgrade (websocket_server, req, socket, head) {
  websocket_server.handleUpgrade(req, socket, head, ws => {
    websocket_server.emit('connection', ws, req)
  })
}

function handleUpgrade (req, socket, head) {
  debug('::handleUpgrade::')
  switch (parse(req.url).pathname) {
    case '/meta': _handleUpgrade(meta_server, req, socket, head); break
    case '/media': _handleUpgrade(media_server, req, socket, head); break
    default:
      debug(`invalid path on req.url: ${req.url}`)
      socket.destroy()
  }
}


function handleMetadata (data) { // this === websocket stream
  debug(`handleMetadata data: ${data}`)
  var metadata
  try {
    metadata = JSON.parse(data)
  } catch (err) {
    return handleError(err)
  }

  if (!isTruthyString(this.whoami) && metadata.type !== 'whoami')
    return debug('ignoring metadata from unidentified stream')
  else if (metadata.type !== 'whoami' && metadata.user !== this.whoami)
    return debug(`ignoring metadata due to inconsistent user identifier\n` +
      `metadata.user: ${JSON.stringify(metadata.user)}\n` +
      `meta_stream.whoami: ${JSON.stringify(this.whoami)}`)

  switch (metadata.type) {
    case 'whoami': metaWhoami(metadata, this, handleError); break
    case 'reg-user': registerUser(metadata, this, handleError); break
    case 'add-peers': addPeers(metadata, this, handleError); break
    case 'del-peers': deletePeers(metadata, this, handleError); break
    // case 'online': online(metadata, handleError); break
    // case 'offline': offline(metadata, handleError); break
    case 'status': status(metadata, this, handleError); break
    case 'call': call(metadata, handleError); break
    case 'accept': accept(metadata, handleError); break
    case 'reject': reject(metadata, handleError); break
    case 'peers': peers(metadata, this, handleError); break
    case 'peers-online': peers(metadata, this, handleError); break
    default: debug(`invalid metadata.type: ${metadata.type}`)
  }
}

meta_server.on('pair', (a, b) => debug('pair:', a, b))

meta_server.on('stream', (meta_stream, req) => {
  debug('::meta_server.on("stream")::')
  meta_stream.on('data', handleMetadata)
  meta_stream.on('error', handleError)
})

media_server.on('stream', (stream, req) => {
  debug('::media_server.on("stream")::')
  // ...
})

http_server.on('upgrade', handleUpgrade)

http_server.listen(PORT, process.env.HOST || 'localhost', () => {
  const addy = http_server.address()
  debug(`http_server live @ ${addy.address}:${addy.port}`)
})

// _TODO: give all these handlers a cb and swap "return debug(...)"s with da cb!

// function metaWhoami (metadata, meta_stream) {
//   debug('::metaWhoami::')
//   if (!valid.schemaZ(metadata)) {
//     return debug(`invalid schema Z: ${JSON.stringify(metadata)}`)
//   }
//   const alreadyActive = Array.from(active_meta_streams)
//     .some(meta_stream => meta_stream.whoami === metadata.user)
//   if (alreadyActive) {
//     return debug(`ignoring excess whoami for: ${metadata.user}`)
//   }
//   meta_stream.whoami = metadata.user
//   active_meta_streams.add(meta_stream)
//   debug(`identified: ${metadata.user}`)
// } // moved
//
// function registerUser (metadata) {
//   debug('::registerUser::')
//   if (!valid.schemaA(metadata)) {
//     return debug(`invalid schema A: ${JSON.stringify(metadata)}`)
//   }
//   readTransformWriteUsers(users => {
//     if (!users[metadata.user]) users[metadata.user] = { peers: metadata.peers }
//     return users
//   }, handleError)
// } // moved
//
// function addPeers (metadata) {
//   debug('::addPeers::')
//   if (!valid.schemaA(metadata)) {
//     return debug(`invalid schema A: ${JSON.stringify(metadata)}`)
//   }
//   readTransformWriteUsers(users => {
//     if (users[metadata.user]) {
//       for (const peer of metadata.peers) {
//         if (peer !== metadata.user) users[metadata.user].peers.push(peer)
//       }
//       users[metadata.user].peers = [ ...new Set(users[metadata.user].peers) ]
//     }
//     return users
//   }, handleError)
// } // moved
//
// function deletePeers (metadata) {
//   debug('::deletePeers::')
//   if (!valid.schemaA(metadata)) {
//     return debug(`invalid schema A: ${JSON.stringify(metadata)}`)
//   }
//   readTransformWriteUsers(users => {
//     for (const peer of metadata.peers) {
//       const i = users[metadata.user].peers.indexOf(peer)
//       debug(`peer index: ${i}`)
//       if (i !== -1) users[metadata.user].peers.splice(i, 1)
//     }
//     return users
//   }, handleError)
// } // Moved
//
// function online (metadata) {
//   debug('::online::')
//   if (!valid.schemaB(metadata)) {
//     return debug(`invalid schema B: ${JSON.stringify(metadata)}`)
//   }
//   online_users.add(metadata.user)
//   listOnlinePeers(metadata.user, (err, online_peers) => {
//     if (err) return handleError(err)
//     debug(`online_peers of ${metadata.user}: ${JSON.stringify(online_peers)}`)
//     forward(metadata, online_peers, handleError)
//   })
// } // moved
//
// function offline (metadata) {
//   debug('::offline::')
//   if (!valid.schemaB(metadata)) {
//     return debug(`invalid schema B: ${JSON.stringify(metadata)}`)
//   }
//   online_users.delete(metadata.user)
//   listOnlinePeers(metadata.user, (err, online_peers) => {
//     if (err) return handleError(err)
//     debug(`online_peers of ${metadata.user}: ${JSON.stringify(online_peers)}`)
//     forward(metadata, online_peers, handleError)
//   })
// } // moved
//
// function call (metadata) {
//   debug('::call::')
//   if (!valid.schemaC(metadata)) {
//     return debug(`invalid schema C: ${JSON.stringify(metadata)}`)
//   }
//   if (!online_users.has(metadata.user) || !online_users.has(metadata.peer)) {
//     return debug(`call attempt from/with an offline peer\n`+
//       `online_users: ${JSON.stringify(online_users)}\n` +
//       `metadata: ${JSON.stringify(metadata)}`)
//   }
//   forward(metadata, [ metadata.peer ], handleError)
// }
//
// function accept (metadata) {
//   debug('::accept::')
//   if (!valid.schemaC(metadata)) {
//     return debug(`invalid schema C: ${JSON.stringify(metadata)}`)
//   }
//   forward(metadata, [ metadata.peer ], handleError)
//   const a = metadata.peer, b = metadata.user
//   meta_server.emit('pair', a, b)
//   sendForceCall(a, b, handleError) // rx, user, cb
//   sendForceCall(b, a, handleError) // rx, user, cb
// }
//
// function reject (metadata) {
//   debug('::reject::')
//   if (!valid.schemaC(metadata)) {
//     return debug(`invalid schema C: ${JSON.stringify(metadata)}`)
//   }
//   if (!online_users.has(metadata.peer)) {
//     return debug(`cannot forward ${JSON.stringify(metadata)} to offline peer`)
//   }
//   forward(metadata, [ metadata.peer ], handleError)
// }
//
// function peersOnline (metadata, stream) {
//   debug('::peersOnline::')
//   if (!valid.schemaB(metadata)) {
//     return debug(`invalid schema B: ${JSON.stringify(metadata)}`)
//   }
//   readUsers((err, users) => {
//     if (err) return handleError(err)
//     const peers_online = Array.from(online_users).filter(user => {
//       return users[metadata.user].peers.includes(user)
//     })
//     debug(`peers_online of ${metadata.user}:`, peers_online)
//     stream.write(outbound.peersOnline(peers_online))
//   })
// }
