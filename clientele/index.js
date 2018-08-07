const { EventEmitter } = require('events')
const { inherits } = require('util')
const websocket = require('websocket-stream')

const outbound = require('./lib/outbound.js')

const debug = require('debug')('clientele')

const isTruthyString = x => x && typeof x === 'string'
const isStringArray = x => Array.isArray(x) && x.every(isTruthyString)

const onceMatch = (emitter, eventName, pred, handler) => {
  var leftover = Buffer.alloc(0)
  emitter.on(eventName, function proxy (data) {
    var metadata
    try {
      if (leftover.length) {
        data = Buffer.concat([ leftover, data ])
        leftover = Buffer.alloc(0)
      }
      metadata = JSON.parse(data)
    } catch (err) {
      leftover = Buffer.concat([ leftover, data ])
    }
    if (pred(metadata)) {
      emitter.removeListener(eventName, proxy)
      return handler(metadata)
    }
  })
}

function Clientele (url) {
  if (!(this instanceof Clientele)) return new Clientele(url)
  EventEmitter.call(this)
  this._websocket = websocket(url)
  this._websocket.on('error', this.emit.bind(this, 'error'))
  this._username = ''
}

inherits(Clientele, EventEmitter)

Clientele.prototype.whoami = function (username, cb) {
  if (!isTruthyString(username))
    return cb(new TypeError('username is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))
  this._username = username
  // TODO: write to socket and return response in cb
  const tx = Math.random()
  this._websocket.write(outbound.whoami(username, tx))
  onceMatch(this._websocket, 'data',
    res => res.tx === tx,
    res => cb(res.ok ? null : new Error('response status not ok')))
}

Clientele.prototype.login = function (username, password, cb) {}
Clientele.prototype.logoff = function (cb) {}
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
