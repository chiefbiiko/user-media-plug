/*

  # agenda

  **develop**

  + a metadataserver that emits 'pair' and 'unpair' events
  + a mediadataserver that dis/connects peers according to the events above
  + a simple client api

  app has 3 data layers:
  + dynamic mediadata
  + dynamic metadata
  + static user data

  dynamic metadata structure, sth like:

  ``` js
  [ { id: string, media: boolean, desktop: boolean }, ... ]
  ```

  static user data, sth like:

  ``` js
  { [userIdA]: { peers: [ userIdB, userIdC ] }, ... }
  ```

  ## ...

  `upd`s do not get responses, only `req`s.

  + for userA to be registered, userA writes:
    -> { type: 'upd', msg: 'reg-user', user: id, peers: [] }
  + for userA to have userB..Z be persisted as peers, userA writes:
    -> { type: 'upd', msg: 'add-peers', user: id, peers: [] }
  + for userA to have userB..Z be discarded as peers, userA writes:
    -> { type: 'upd', msg: 'del-peers', user: id, peers: [] }

  + to go online, user writes:
   -> { type: 'upd', msg: 'online', user: id }
  + to go offline, user writes:
   -> { type: 'upd', msg: 'offline', user: id }

  + for userA to call userB, userA writes:
   -> { type: 'req', msg: 'call', user: id, peer: id, tx: id }
  + for userB to accept userA, userB writes:
   -> { type: 'res', msg: 'accept', user: id, peer: id, tx: id }
  + for userB to reject userA, userB writes:
   -> { type: 'res', msg: 'reject', user: id, peer: id, tx: id }

  { type: 'req', msg: 'peers-online', user: id, tx: id }
  { type: 'res', msg: 'peers-online', tx: id, 'peers-online': [] }

  { type: 'cmd', msg: 'force-call', peer: id } // server to client

*/

const http = require('http')
const websocket = require('websocket-stream')
const url = require('url')
const debug = require('debug')('user-media-plug')

const USERS_JSON_PATH = './test.users.json'

const { createReadTransformWriteUsers } = require('./utils.js')
const readTransformWriteUsers = createReadTransformWriteUsers(USERS_JSON_PATH)

const httpserver = http.createServer()

const metaserver = new websocket.Server({
  perMessageDeflate: false,
  noServer: true
})

const mediaserver = new websocket.Server({
  perMessageDeflate: false,
  noServer: true
})

metaserver.on('stream', (stream, req) => {
  debug('::metaserver.on("stream")::')
  stream.on('data', handleMetadata)
  stream.on('error', handleError)
})

mediaserver.on('stream', (stream, req) => {
  // ...
})

function handleUpgrade (server, req, socket, head) {
  server.handleUpgrade(req, socket, head, ws => {
    debug('::emitting connection::')
    server.emit('connection', ws, req)
  })
}

function onUpgrade (req, socket, head) {
  const pathname = url.parse(req.url).pathname
  debug(`pathname:: ${pathname}`)
  if (pathname === '/meta') {
    debug(`::${req.url} routed to metaserver::`)
    handleUpgrade(metaserver, req, socket, head)
  } else if (pathname === '/media') {
    debug(`::${req.url} routed to mediaserver::`)
    handleUpgrade(mediaserver, req, socket, head)
  } else {
    socket.destroy()
  }
}

httpserver.on('upgrade', onUpgrade)

httpserver.listen(10000, 'localhost', () => {
  const addy = httpserver.address()
  console.log(`httpserver live @ ${addy.address}:${addy.port}`)
})

function handleError (err) {
  if (err) console.error(err)
}

function registerUser (metadata) {
  // TODO: validate to make sure metadata has all required properties
  debug('::registerUser::')
  readTransformWriteUsers(users => ({
    [metadata.user]: metadata.peers,
    ...users
  }), handleError)
}

function addPeers (metadata) {
  // TODO: validate to make sure metadata has all required properties
  debug('::addPeers::')
  readTransformWriteUsers(users => {
    for (const peer of metadata.peers) users[metadata.user].peers.push(peer)
    return users
  }, handleError)
}

function deletePeers (metadata) {
  // TODO: validate to make sure metadata has all required properties
  debug('::deletePeers::')
  readTransformWriteUsers(users => {
    for (const peer of metadata.peers) {
      const i = users[metadata.user].peers.indexOf(peer)
      users[metadata.user].peers.splice(i, 1)
    }
    return users
  }, handleError)
}

function handleMetadata (data) {
  debug(`handleMetadata data:: ${data}`)
  var metadata
  try {
    metadata = JSON.parse(data)
  } catch (err) {
    return handleError(err)
  }

  debug('handleMetadata metadata::', metadata)

  switch (metadata.msg) {
    case 'reg-user':
      registerUser(metadata)
      break
    case 'add-peers':
      addPeers(metadata)
      break
    case 'del-peers':
      deletePeers(metadata)
      break
    default:
      handleError(new Error(`invalid property "metadata.msg": ${metadata.msg}`))
  }
}

module.exports = {}
