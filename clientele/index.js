const { EventEmitter } = require('events')
const { inherits } = require('util')
const websocket = require('websocket-stream')
const jsonStream = require('duplex-json-stream')

const outbound = require('./lib/outbound.js')

const debug = require('debug')('clientele')

const isTruthyString = x => x && typeof x === 'string'
const isStringArray = x => Array.isArray(x) && x.every(isTruthyString)

const onceStreamPayloadPasses = (readable, pred) => {
  return new Promise((resolve, reject) => {
    readable.on('data', function proxy (metadata) {
      if (!pred(metadata)) return
      readable.removeListener('data', proxy)
      resolve(metadata)
    })
  })
}

function Clientele (url) {
  if (!(this instanceof Clientele)) return new Clientele(url)
  EventEmitter.call(this)

  this._websocket = jsonStream(websocket(url))
  this._websocket.on('error', this.emit.bind(this, 'error'))
  this._username = ''
}

inherits(Clientele, EventEmitter)

Clientele.prototype.whoami = function (username, cb) {
  if (!isTruthyString(username))
    return cb(new TypeError('username is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  var self = this
  self._username = username
  const tx = Math.random()

  self._websocket.write(outbound.whoami(username, tx), err => {
    if (err) return cb(err)
    onceStreamPayloadPasses(self._websocket, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.login = function (username, password, cb) {}
Clientele.prototype.logout = function (cb) {}
Clientele.prototype.register = function (username, password, peers, cb) {}
Clientele.prototype.addPeers = function (peers, cb) {}
Clientele.prototype.deletePeers = function (peers, cb) {}
Clientele.prototype.status = function (status, cb) {}
Clientele.prototype.call = function (peer, cb) {}
Clientele.prototype.accept = function (peer, cb) {}
Clientele.prototype.reject = function (peer, cb) {}
Clientele.prototype.peers = function (cb) {}
Clientele.prototype.peersOnline = function (cb) {}

module.exports = Clientele
