const { EventEmitter } = require('events')
const { inherits } = require('util')
const websocket = require('websocket-stream')
const jsonStream = require('duplex-json-stream')

const outbound = require('./lib/outbound.js')

// const isTruthyString = x => x && typeof x === 'string'
// const isStringArray = x => Array.isArray(x) && x.every(isTruthyString)
const { isTruthyString, isStringArray } = require('./lib/is.js')

// const onceStreamPayloadPasses = (readable, pred) => {
//   return new Promise((resolve, reject) => {
//     readable.on('data', function proxy (metadata) {
//       if (!pred(metadata)) return
//       readable.removeListener('data', proxy)
//       resolve(metadata)
//     })
//   })
// }
const onceTransactionResponse = require('./lib/onceTransactionResponse.js')

const debug = require('debug')('clientele')

// TODO: register handler for force-call server msg and estSablish media con
function Clientele (url) {
  if (!(this instanceof Clientele)) return new Clientele(url)
  EventEmitter.call(this)

  this._websocket = jsonStream(websocket(url))
  this._websocket.on('error', this.emit.bind(this, 'error'))
  this._user = ''
}

inherits(Clientele, EventEmitter)

Clientele.prototype.whoami = function (user, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  var self = this
  self._user = user
  const tx = Math.random()

  self._websocket.write(outbound.whoami(user, tx), err => {
    if (err) return cb(err)
    onceTransactionResponse(self._websocket, tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.register = function (user, password, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (!isTruthyString(password))
    return cb(new TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  var self = this
  self._user = user
  const tx = Math.random()

  self._websocket.write(outbound.register(user, password, peers, tx), err => {
    if (err) return cb(err)
    onceTransactionResponse(self._websocket, tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.login = function (user, password, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (!isTruthyString(password))
    return cb(new TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  var self = this
  self._user = user
  const tx = Math.random()

  self._websocket.write(outbound.login(user, password, tx), err => {
    if (err) return cb(err)
    onceTransactionResponse(self._websocket, tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.logout = function (user, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (!isTruthyString(password))
    return cb(new TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  var self = this
  self._user = user
  const tx = Math.random()

  self._websocket.write(outbound.logout(user, tx), err => {
    if (err) return cb(err)
    onceTransactionResponse(self._websocket, tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.addPeers = function (peers, cb) {}
Clientele.prototype.deletePeers = function (peers, cb) {}
Clientele.prototype.getPeers = function (cb) {}
Clientele.prototype.status = function (status, cb) {}
Clientele.prototype.call = function (peer, cb) {}
Clientele.prototype.accept = function (peer, cb) {}
Clientele.prototype.reject = function (peer, cb) {}
Clientele.prototype.unpair = function (peer, cb) {}

Clientele.prototype.__defineGetter__('user', function () { return this._user })

module.exports = Clientele
