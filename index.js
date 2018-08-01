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

const http = require('http')
const websocket = require('websocket-stream')
const url = require('url')
const jsonStream = require('duplex-json-stream')
const streamSet = require('stream-set')
const debug = require('debug')('user-media-plug')

const USERS_JSON_PATH = './test.users.json'

const {
  createReadUsers,
  createReadTransformWriteUsers,
  isTruthyString,
  valid,
  OUTBOUND_MSGS
} = require('./utils.js')

const readTransformWriteUsers = createReadTransformWriteUsers(USERS_JSON_PATH)
const readUsers = createReadUsers(USERS_JSON_PATH)

const active_meta_streams = streamSet()
const active_media_streams = streamSet()
const ONLINE_USERS = new Set()

const http_server = http.createServer()

const meta_server = new websocket.Server({
  perMessageDeflate: false,
  noServer: true
})

const media_server = new websocket.Server({
  perMessageDeflate: false,
  noServer: true
})

meta_server.on('stream', (stream, req) => {
  debug('::meta_server.on("stream")::')
  stream.on('data', handleMetadata)
  stream.on('error', handleError)
})

media_server.on('stream', (stream, req) => {
  debug('::media_server.on("stream")::')
  // ...
})

function handleUpgrade (websocket_server, req, socket, head) {
  websocket_server.handleUpgrade(req, socket, head, ws => {
    debug('::websocket_server emitting connection::')
    websocket_server.emit('connection', ws, req)
  })
}

function onUpgrade (req, socket, head) {
  const pathname = url.parse(req.url).pathname
  debug(`pathname:: ${pathname}`)
  if (pathname === '/meta') {
    debug(`::${req.url} routed to meta_server::`)
    handleUpgrade(meta_server, req, socket, head)
  } else if (pathname === '/media') {
    debug(`::${req.url} routed to media_server::`)
    handleUpgrade(media_server, req, socket, head)
  } else {
    socket.destroy()
  }
}

http_server.on('upgrade', onUpgrade)

http_server.listen(10000, 'localhost', () => {
  const addy = http_server.address()
  console.log(`http_server live @ ${addy.address}:${addy.port}`)
})

function handleError (err) {
  if (err) console.error(err)
}

function metaWhoami (metadata, stream) {
  debug('::metaWhoami::')
  if (!valid.schemaZ(metadata)) return debug('invalid schema Z:', metadata)
  stream.whoami = metadata.user
}

function registerUser (metadata) {
  debug('::registerUser::')
  if (!valid.schemaA(metadata)) return debug('invalid schema A:', metadata)
  readTransformWriteUsers(users => {
    if (!users[metadata.user]) users[metadata.user] = { peers: metadata.peers }
    return users
  }, handleError)
}

function addPeers (metadata) {
  debug('::addPeers::')
  if (!valid.schemaA(metadata)) return debug('invalid schema A:', metadata)
  readTransformWriteUsers(users => {
    if (users[metadata.user]) {
      for (const peer of metadata.peers) users[metadata.user].peers.push(peer)
      users[metadata.user].peers = [ ...new Set(users[metadata.user].peers) ]
    }
    return users
  }, handleError)
}

function deletePeers (metadata) {
  debug('::deletePeers::')
  if (!valid.schemaA(metadata)) return debug('invalid schema A:', metadata)
  readTransformWriteUsers(users => {
    for (const peer of metadata.peers) {
      const i = users[metadata.user].peers.indexOf(peer)
      debug(`peer index:: ${i}`)
      if (i !== -1) users[metadata.user].peers.splice(i, 1)
    }
    return users
  }, handleError)
}

function online (metadata) {
  debug('::online::')
  if (!valid.schemaB(metadata)) return debug('invalid schema B:', metadata)
  ONLINE_USERS.add(metadata.user)
}

function offline (metadata) {
  debug('::offline::')
  if (!valid.schemaB(metadata)) return debug('invalid schema B:', metadata)
  ONLINE_USERS.delete(metadata.user)
}

function call (metadata) {
  debug('::call::')
  if (!valid.schemaC(metadata)) return debug('invalid schema C:', metadata)
  // find metadata.peer within active_meta_streams and simply forward the msg!
  active_meta_streams // Set.find or similar?
}

function accept (metadata) {
  debug('::accept::')
}

function reject (metadata) {
  debug('::reject::')

}

function peersOnline (metadata, stream) {
  debug('::peersOnline::')
  if (!valid.schemaD(metadata)) return debug('invalid schema D:', metadata)
  readUsers((err, users) => {
    if (err) return handleError(err)
    const peers_online = Array.from(ONLINE_USERS).filter(user => {
      return users[metadata.user].peers.includes(user)
    })
    stream.write(JSON.stringify(
      OUTBOUND_MSGS.peersOnline(metadata.tx, peers_online)
    ))
  })
}

function handleMetadata (data) { // this === websocket stream
  debug(`handleMetadata data:: ${data}`)
  var metadata
  try {
    metadata = JSON.parse(data)
  } catch (err) {
    return handleError(err)
  }

  if (!isTruthyString(this.whoami)/*!active_meta_streams.has(this)*/) {
    return debug('ignoring data from unidentified stream')
  }

  switch (metadata.type) {
    case 'whoami': metaWhoami(metadata, stream); break
    case 'reg-user': registerUser(metadata); break
    case 'add-peers': addPeers(metadata); break
    case 'del-peers': deletePeers(metadata); break
    case 'online': online(metadata); break
    case 'offline': offline(metadata); break
    case 'call': call(metadata); break
    case 'accept': accept(metadata); break
    case 'reject': reject(metadata); break
    case 'peers-online': peersOnline(metadata, this); break
    default: handleError(new Error(`invalid message type "${metadata.type}"`))
  }
}

module.exports = {}
