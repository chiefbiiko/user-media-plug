const { createServer } = require('http')
const WebSocketServer = require('websocket-stream').Server
const streamSet = require('stream-set')
const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')
const hashtagStreamSet = require('hashtag-stream-set')

const debug = require('debug')('user-media-plug:index')

const {
  createHandleUpgrade,
  createHandleMetastream,
  createHandlePair,
  createHandleUnpair,
  willDeleteMediastreams
} = require('./lib/handlers.js')

const PORT = parseInt(process.env.PORT) || 10000
const HOST = process.env.HOST || 'localhost'
const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }

const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
const active_metastreams = streamSet()
const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
const logged_in_users = new Set()

const httpserver = createServer()
const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

const handleError = err => err && debug(`error: ${err.message}`)

db.on('error', handleError)
httpserver.on('error', handleError)
metaserver.on('error', handleError)
mediaserver.on('error', handleError)

httpserver.on('upgrade', createHandleUpgrade(metaserver, mediaserver))
metaserver.on('stream', createHandleMetastream({
  db,
  metaserver,
  active_metastreams,
  logged_in_users
}))

metaserver.on('pair', createHandlePair(mediaserver, active_mediastreams))
metaserver.on('unpair', createHandleUnpair(active_mediastreams))

httpserver.on('listening', () => debug(`httpserver live @ ${HOST}:${PORT}`))
httpserver.listen(PORT, HOST)
