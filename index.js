/* dev agenda
  + a metadataserver that manages essential metadata exchange and persistence
      and ultimately emits a 'pair' event, that is delegated to a
      mediadataserver. 'unpair' metadata messages by clients are handled by the
      metadataserver solely as its corresponding handler just needs to close
      over the active_media_streams set which is a HashtagStreamSet whose
      prototype provides methods for managing "stream groups" through hashtags
  + a mediadataserver that pairs peers (pipes their websockets)
  + a simple client api
*/

const { createServer } = require('http')
const WebSocketServer = require('websocket-stream').Server
const streamSet = require('stream-set')
const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')
const hashtagStreamSet = require('hashtag-stream-set')

const {
  createHandleUpgrade,
  createHandleMetastream,
  createHandlePair,
  willDeleteMediastreams
} = require('./lib/handlers.js')

const debug = require('debug')('user-media-plug:index')

const PORT = Number(process.env.PORT) || 10000
const HOST = process.env.HOST || 'localhost'

const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
const active_meta_streams = streamSet()
const active_media_streams = hashtagStreamSet(willDeleteMediastreams)
const logged_in_users = new Set()

const http_server = createServer()
const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
const media_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

const handleError = err => err && debug(`error: ${err.message}`)
const handleUpgrade = createHandleUpgrade(meta_server, media_server)
const handlePair = createHandlePair(media_server)
const handleMetastream = createHandleMetastream({
  db,
  meta_server,
  active_meta_streams,
  active_media_streams,
  logged_in_users
})

http_server.on('upgrade', handleUpgrade)
meta_server.on('stream', handleMetastream)
meta_server.on('pair', handlePair)

http_server.on('error', handleError)
meta_server.on('error', handleError)
media_server.on('error', handleError)

http_server.on('listening', () => debug(`http_server live @ ${HOST}:${PORT}`))
http_server.listen(PORT, HOST)
