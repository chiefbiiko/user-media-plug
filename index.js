/* dev agenda
  + a metadataserver that emits 'pair' and 'unpair' events
  + a mediadataserver that dis/connects peers according to the events above
  + a simple client api
*/

const { createServer } = require('http')

const WebSocketServer = require('websocket-stream').Server
const streamSet = require('stream-set')
const jsonStream = require('duplex-json-stream')

const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')

const { createForward, createSendForceCall } = require('./lib/notify.js')

const {
  createMetaWhoami,
  createLogin,
  createLogoff,
  createStatus,
  createCall,
  createAccept,
  createReject,
  createRegisterUser,
  createAddPeers,
  createDeletePeers,
  createPeers,
  createHandleMetadata,
  createHandleUpgrade
} = require('./lib/handlers.js')

const debug = require('debug')('user-media-plug:index')

const PORT = process.env.PORT || 10000
const HOST = process.env.HOST || 'localhost'

const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
const active_meta_streams = streamSet()
const active_media_streams = streamSet()
const logged_in_users = new Set()

const http_server = createServer()
const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
const media_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

const forward = createForward(active_meta_streams)
const sendForceCall = createSendForceCall(active_meta_streams)

const handleError = err => err && debug(`error: ${err.message}`)
const handleUpgrade = createHandleUpgrade(meta_server, media_server)
const handleMetadata = createHandleMetadata({
  metaWhoami: createMetaWhoami(active_meta_streams),
  login: createLogin(db, logged_in_users),
  logoff: createLogoff(db, logged_in_users),
  registerUser: createRegisterUser(db),
  addPeers: createAddPeers(db),
  deletePeers: createDeletePeers(db),
  status: createStatus(db, active_meta_streams, forward),
  call: createCall(forward),
  accept: createAccept(meta_server, forward, sendForceCall),
  reject: createReject(forward),
  peers: createPeers(db)
}, logged_in_users)

meta_server.on('pair', (a, b) => debug('pair:', a, b))

meta_server.on('stream', (meta_stream, req) => {
  debug('::meta_server.on("stream")::')
  meta_stream = jsonStream(meta_stream)
  meta_stream.on('data', handleMetadata.bind(null, meta_stream))
  meta_stream.on('error', handleError)
})

media_server.on('stream', (stream, req) => {
  debug('::media_server.on("stream")::')
  // ...
})

http_server.on('upgrade', handleUpgrade)

http_server.on('error', handleError)
meta_server.on('error', handleError)
media_server.on('error', handleError)

http_server.on('listening', () => debug(`http_server live @ ${HOST}:${PORT}`))
http_server.listen(PORT, HOST)
