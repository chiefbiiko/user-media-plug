const { EventEmitter } = require('events')
const { inherits } = require('util')
const websocket = require('websocket-stream')
const jsonStream = require('duplex-json-stream')
const createReadableValve = require('readable-valve')
const getMedia = require('getusermedia')
const createRecorder = require('media-recorder-stream')
const pump = require('pump')

const { isTruthyString, isStringArray } = require('./lib/is.js')
const outbound = require('./lib/outbound.js')

const debug = require('debug')('clientele')

const ERR = {
  CB_NOT_FUNC: TypeError('cb is not a function'),
  RES_NOT_OK: Error('response status not ok'),
  NOT_TRUTHY_STRING (x) { return TypeError(`${x} is not a truthy string`) },
  NOT_STRING_ARRAY (x) { return TypeError(`${x} is not a string array`) }
}

// TODO: rethink browser compatibility check!
function Clientele (url, user) { // url can just be 'ws://localhost:10000'
  if (!(this instanceof Clientele)) return new Clientele(url, user)
  EventEmitter.call(this)

  // if (!/firefox/i.test(navigator.userAgent))
  //   alert(`app probly won't work on ${navigator.userAgent}`)
  // else if (!MediaSource.isTypeSupported(Clientele.MIME_CODEC) ||
  //          !MediaRecorder.isTypeSupported(Clientele.MIME))
  //   throw Error(`unsupported MIME type or codec: ${Clientele.MIME_CODEC}`)

  if (!isTruthyString(url)) throw ERR.NOT_TRUTHY_STRING('url')

  if (isTruthyString(user)) this._user = user

  if (!/(?:\/meta|\/media)$/.test(url))
    url = `${url.replace(/^(.+:\d+).*$/, '$1')}/meta`

  this._meta_url = url.replace('media', 'meta')
  this._media_url = url.replace('meta', 'media')

  this._metastream = jsonStream(websocket(this._meta_url))
  this._metastream.on('error', this.emit.bind(this, 'error'))
  this._metastream.on('data', this.emit.bind(this, 'io'))

  this._metastream_valve = createReadableValve(this._metastream)
    .subscribe(
      this._makeVideoStream.bind(this),
      msg => msg.type === 'FORCE_CALL'
    )
    .subscribe(
      this.emit.bind(this, 'call'),
      msg => msg.type === 'CALL'
    )
    .subscribe(
      this.emit.bind(this, 'stop-ringing'),
      msg => msg.type === 'STOP_RINGING'
    )
    .subscribe(
      this.emit.bind(this, 'accept'),
      msg => msg.type === 'ACCEPT'
    )
    .subscribe(
      this.emit.bind(this, 'reject'),
      msg => msg.type === 'REJECT'
    )
    .subscribe(
      this.emit.bind(this, 'unpair'),
      msg => msg.type === 'UNPAIR'
    )
    .subscribe(
      this.emit.bind(this, 'status'),
      msg => msg.type === 'STATUS'
    )
    .subscribe(
      this.emit.bind(this, 'avatar'),
      msg => msg.type === 'AVATAR'
    )
    .subscribe(
      this.emit.bind(this, 'online'),
      msg => msg.type === 'ONLINE'
    )
    .subscribe(
      this.emit.bind(this, 'offline'),
      msg => msg.type === 'OFFLINE'
    )
}

inherits(Clientele, EventEmitter)

Clientele.MIME = 'video/webm'
Clientele.MIME_CODEC = `${Clientele.MIME};codecs=vorbis,vp8`

Clientele.prototype.setUser = function setUser (user) {
  if (!isTruthyString(user)) throw ERR.NOT_TRUTHY_STRING('user')
  this._user = user
}

Clientele.prototype._makeVideoStream = function makeVideoStream (msg) {
  const self = this
  const mediastream = websocket(self._media_url)
  mediastream.write(outbound.info(self._user, msg.peer), err => {
    if (err) return self.emit('error', err)
    // i
    var video = document.createElement('video')
    var mediasource = new MediaSource()
    video.src = URL.createObjectURL(mediasource)
    mediasource.onsourceopen = () => {
      var mediasource_buf = mediasource.addSourceBuffer(Clientele.MIME_CODEC)
      mediastream.on('data', chunk => mediasource_buf.appendBuffer(chunk))
      mediastream.once('readable', () => video.play())
      self.emit('video', video, msg.peer)
    }
    // o
    getMedia({ audio: true, video: true }, (err, media) => {
      if (err) return self.emit('error', err)
      pump(
        createRecorder(media, { interval: 1000, mimeType: Clientele.MIME }),
        mediastream,
        err => {
          video = mediasource = mediasource_buf = null
          if (err) self.emit('error', err)
        }
      )
    })
  })
}

Clientele.prototype.whoami = function whoami (cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC

  const self = this
  const tx = Math.random()
  const msg = outbound.whoami(self._user, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.register = function register (password, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(password)) return cb(ERR.NOT_TRUTHY_STRING('password'))

  const self = this
  const tx = Math.random()
  const msg = outbound.register(self._user, password, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.login = function login (password, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(password)) return cb(ERR.NOT_TRUTHY_STRING('password'))

  const self = this
  const tx = Math.random()
  const msg = outbound.login(self._user, password, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.logout = function logout (cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC

  const self = this
  const tx = Math.random()
  const msg = outbound.logout(self._user, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.addPeers = function addPeers (peers, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isStringArray(peers)) return cb(ERR.NOT_STRING_ARRAY('peers'))

  const self = this
  const tx = Math.random()
  const msg = outbound.addPeers(self._user, peers, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.deletePeers = function deletePeers (peers, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isStringArray(peers)) return cb(ERR.NOT_STRING_ARRAY('peers'))

  const self = this
  const tx = Math.random()
  const msg = outbound.deletePeers(self._user, peers, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.getPeers = function getPeers (cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC

  const self = this
  const tx = Math.random()
  const msg = outbound.getPeers(self._user, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => res.ok ? cb(null, res.peers) : cb(ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.getUser = function getUser (cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC

  const self = this
  const tx = Math.random()
  const msg = outbound.getUser(self._user, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => res.ok ? cb(null, res.user) : cb(ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.status = function status (status, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(status)) return cb(ERR.NOT_TRUTHY_STRING('status'))

  const self = this
  const tx = Math.random()
  const msg = outbound.status(self._user, status, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.avatar = function avatar (avatar, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(avatar)) return cb(ERR.NOT_TRUTHY_STRING('avatar'))

  const self = this
  const tx = Math.random()
  const msg = outbound.avatar(self._user, avatar, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.call = function call (peer, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(peer)) return cb(ERR.NOT_TRUTHY_STRING('peer'))

  const self = this
  const tx = Math.random()
  const msg = outbound.call(self._user, peer, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        function listener (res) {
          if (!res.ok) {
            self._metastream_valve.unsubscribe(listener)
            return cb(ERR.RES_NOT_OK, false)
          }
          if (res.type === 'REJECT') cb(null, false)
          else if (res.type === 'ACCEPT') cb(null, true)
        },
        res => res.tx === tx,
        2
      )
  })
}

Clientele.prototype.stopRinging = function stopRinging (peer, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(peer)) return cb(ERR.NOT_TRUTHY_STRING('peer'))

  const self = this
  const tx = Math.random()
  const msg = outbound.stopRinging(self._user, peer, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.accept = function accept (peer, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(peer)) return cb(ERR.NOT_TRUTHY_STRING('peer'))

  const self = this
  const tx = Math.random()
  const msg = outbound.accept(self._user, peer, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.reject = function reject (peer, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(peer)) return cb(ERR.NOT_TRUTHY_STRING('peer'))

  const self = this
  const tx = Math.random()
  const msg = outbound.reject(self._user, peer, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.unpair = function unpair (peer, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(peer)) return cb(ERR.NOT_TRUTHY_STRING('peer'))

  const self = this
  const tx = Math.random()
  const msg = outbound.accept(self._user, peer, tx)

  self._metastream.write(msg, err => {
    if (err) return cb(err)
    self.emit('io', msg)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : ERR.RES_NOT_OK),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.__defineGetter__('user', function () { return this._user })

module.exports = Clientele
