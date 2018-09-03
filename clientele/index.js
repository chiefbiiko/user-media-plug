const { EventEmitter } = require('events')
const { inherits } = require('util')
const websocket = require('websocket-stream')
const jsonStream = require('duplex-json-stream')
const createReadableValve = require('readable-valve')

const { isTruthyString, isStringArray } = require('./lib/is.js')
const outbound = require('./lib/outbound.js')

const debug = require('debug')('clientele')

function Clientele (url, user) {
  if (!(this instanceof Clientele)) return new Clientele(url, user)
  EventEmitter.call(this)

  if (!isTruthyString(url)) throw TypeError('url is not a truthy string')
  if (!isTruthyString(user)) throw TypeError('user is not a truthy string')

  this._user = user

  this._meta_url = url.replace('media', 'meta')
  this._media_url = url.replace('meta', 'media')

  this._meta_ws = jsonStream(websocket(url))
  this._meta_ws.on('error', this.emit.bind(this, 'error'))

  this._meta_ws_valve = createReadableValve(this._meta_ws)
    .subscribe(
      this._makeMediastream.bind(this),
      msg => msg.type === 'FORCE_CALL'
    )
    .subscribe(
      this.emit.bind(this, 'status'),
      msg => msg.type === 'STATUS'
    )
    .subscribe(
      this.emit.bind(this, 'accept'),
      msg => msg.type === 'ACCEPT'
    )
    .subscribe(
      this.emit.bind(this, 'reject'),
      msg => msg.type === 'REJECT'
    )
}

inherits(Clientele, EventEmitter)

Clientele.prototype._makeMediastream = function makeMediastream (msg) {
  const self = this
  const media_ws = websocket(this._media_url)
  media_ws.write(JSON.stringify({ user: this._user, peer: msg.peer }), err => {
    if (err) return self.emit('error', err)
    self.emit('mediastream', media_ws) // inbound duplex t.b.c...
    // TODO: just emit a playing video element
    // have it destroy itself as much as possible! once the readable closes
  })
}

Clientele.prototype.whoami = function (cb) {
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._meta_ws.write(outbound.whoami(self._user, tx), err => {
    if (err) return cb(err)
    self._meta_ws_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.register = function (password, cb) {
  if (!isTruthyString(password))
    return cb(new TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._meta_ws.write(outbound.register(self._user, password, tx), err => {
    if (err) return cb(err)
    self._meta_ws_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.login = function (password, cb) {
  if (!isTruthyString(password))
    return cb(new TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._meta_ws.write(outbound.login(self._user, password, tx), err => {
    if (err) return cb(err)
    self._meta_ws_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.logout = function (cb) {
  if (typeof cb !== 'function')
    return cb(new TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._meta_ws.write(outbound.logout(self._user, tx), err => {
    if (err) return cb(err)
    self._meta_ws_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
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
