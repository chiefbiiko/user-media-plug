const { EventEmitter } = require('events')
const { inherits } = require('util')
const websocket = require('websocket-stream')
const jsonStream = require('duplex-json-stream')

const { isTruthyString, isStringArray } = require('./lib/is.js')
const outbound = require('./lib/outbound.js')
const predOn = require('./lib/predOn.js')
const predThen = require('./lib/predThen.js')

const debug = require('debug')('clientele')

function Clientele (url) {
  if (!(this instanceof Clientele)) return new Clientele(url)
  EventEmitter.call(this)

  this._user = ''

  this._meta_url = url.replace('media', 'meta')
  this._media_url = url.replace('meta', 'media')

  this._meta_ws = jsonStream(websocket(url))
  this._meta_ws.on('error', this.emit.bind(this, 'error'))

  predOn(this._meta_ws, msg => msg.type === 'FORCE_CALL')
    .on('data', this._makeMediastream.bind(this))
}

inherits(Clientele, EventEmitter)

Clientele.prototype._makeMediastream = function makeMediastream (msg) {
  const self = this
  const media_ws = websocket(this._media_url)
  media_ws.write(JSON.stringify({ user: this._user, peer: msg.peer }), err => {
    if (err) return self.emit('error', err)
    self.emit('mediastream', media_ws) // inbound duplex t.b.c...
  })
}

Clientele.prototype.whoami = function (user, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.whoami(user, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
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

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.register(user, password, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
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

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.login(user, password, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.logout = function (user, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.logout(user, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.addPeers = function (peers, cb) {
  if (!isTruthyString(peers))
    return cb(new TypeError('peers is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.addPeers(peers, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}
Clientele.prototype.deletePeers = function (peers, cb) {
  if (!isTruthyString(peers))
    return cb(new TypeError('peers is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.deletePeers(peers, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}
Clientele.prototype.getPeers = function (user, cb) {
  if (!isTruthyString(user))
    return cb(new TypeError('user is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.getPeers(user, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}
Clientele.prototype.status = function (status, cb) {
  if (!isTruthyString(status))
    return cb(new TypeError('status is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.status(status, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}
Clientele.prototype.call = function (peer, cb) {

}
Clientele.prototype.accept = function (peer, cb) {
  if (!isTruthyString(peer))
    return cb(new TypeError('user is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.accept(peer, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}
Clientele.prototype.reject = function (peer, cb) {
  if (!isTruthyString(peer))
    return cb(new TypeError('peer is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.reject(peers, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}
Clientele.prototype.unpair = function (peer, cb) {
  if (!isTruthyString(peer))
    return cb(new TypeError('peer is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  self._user = user
  const tx = Math.random()

  self._meta_ws.write(outbound.reject(peers, tx), err => {
    if (err) return cb(err)
    predThen(self._meta_ws, res => res.tx === tx)
      .then(res => cb(res.ok ? null : new Error('response status not ok')))
      .catch(cb)
  })
}

Clientele.prototype.__defineGetter__('user', function () { return this._user })

module.exports = Clientele
