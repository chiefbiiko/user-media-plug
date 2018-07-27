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

// const inherits = require('util').inherits
// const lpstream = require('length-prefixed-stream')
const http = require('http')
const websocket = require('websocket-stream')
const url = require('url')
const { readFile, writeFile } = require('fs')
const debug = require('debug')('user-media-plug')

const USERS_JSON_PATH = './users.json'

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
  stream.on('data', onMetadata)
  stream.on('error', onStreamError)
  stream.on('end', onStreamEnd)
  // ...
})

mediaserver.on('stream', (stream, req) => {
  // ...
})

function handleUpgrade (server, req, socket, head) {
  server.handleUpgrade(req, socket, head, ws => {
    server.emit('connection', ws, req)
  })
}

function onUpgrade (req, socket, head) {
  debug('req.url::', req.url)
  const pathname = url.parse(req.url).pathname
  debug('pathname::', pathname)
  if (pathname === '/meta') {
    debug('::inside /meta if block::')
    handleUpgrade(metaserver, req, socket, head)
  } else if (pathname === '/media') {
    handleUpgrade(mediaserver, req, socket, head)
  } else {
    socket.destroy()
  }
}

httpserver.on('upgrade', onUpgrade)

httpserver.listen(8080, () => {
  const addy = httpserver.address()
  console.log(`httpserver live @ ${addy.address}:${addy.port}`)
})

function onError (err) {
  console.error(err)
}

function onStreamError (err) { // this === stream
  onError(err)
  this.destroy() // necessary?
}

function onStreamEnd () {
  this.destroy() // necessary?
}

function registerUser (metadata) {
  // TODO: validate to make sure metadata has all required properties
  readTransformWriteUsers(users => ({
    [metadata.user]: metadata.peers,
    ...users
  }))
}

function addPeers (metadata) {
  // TODO: validate to make sure metadata has all required properties
  readTransformWriteUsers(users => {
    for (const peer of metadata.peers) users[metadata.user].peers.push(peer)
    return users
  })
}

function deletePeers (metadata) {
  // TODO: validate to make sure metadata has all required properties
  readTransformWriteUsers(users => {
    for (const peer of metadata.peers) {
      const i = users[metadata.user].peers.indexOf(peer)
      users[metadata.user].peers.splice(i, 1)
    }
    return users
  })
}

function onMetadata (data) {
  var metadata
  try {
    metadata = JSON.parse(data)
  } catch (err) {
    return onError(err)
  }

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
      onError(new Error(`invalid property "metadata.msg": ${metadata.msg}`))
  }
}



/*
function onconnection (socket) {
  const decode = lpstream.decode()
  socket.pipe(decode)
  decode.on('data', ondata.bind(this))
}

function ondata (chunk) {
  const data
  try {
    data = JSON.parse(chunk)
  } catch (err) {
    this.emit('error', err)
  }
  switch(data.cmd) {
    case 'online':
      ononline.call(this, data)
      break
    case 'offline':
      console.log(data.cmd)
      break
    case 'call':
      console.log(data.cmd)
      break
    case 'accept':
      console.log(data.cmd)
      break
    case 'reject':
      console.log(data.cmd)
      break
    default:
      console.error(data)
  }
  this.emit('metadata', data)
}

function ononline (data) {
  this.users.push(data.user)
}

function onoffline (data) {
  this.users = this.users // ...
}
*/

module.exports = {}
