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

function Clientele (url, user) { // url can just be 'ws://localhost:10000'
  if (!(this instanceof Clientele)) return new Clientele(url, user)
  EventEmitter.call(this)

  if (!/firefox/i.test(navigator.userAgent))
    debug(`clientele probly won't work on ${navigator.userAgent}`)
  else if (!MediaSource.isTypeSupported(Clientele.MIME_CODEC) ||
           !MediaRecorder.isTypeSupported(Clientele.MIME))
    throw Error(`unsupported MIME type or codec: ${Clientele.MIME_CODEC}`)

  if (!isTruthyString(url)) throw ERR.NOT_TRUTHY_STRING('url')
  if (!isTruthyString(user)) throw ERR.NOT_TRUTHY_STRING('user')

  this._user = user

  if (!/(?:\/meta|\/media)$/.test(url))
    url = `${url.replace(/^(.+:\d+).*$/, '$1')}/meta`

  this._meta_url = url.replace('media', 'meta')
  this._media_url = url.replace('meta', 'media')

  this._metastream = jsonStream(websocket(this._meta_url))
  this._metastream.on('error', this.emit.bind(this, 'error'))

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
      this.emit.bind(this, 'status'),
      msg => msg.type === 'STATUS'
    )
}

inherits(Clientele, EventEmitter)

Clientele.MIME = 'video/webm'
Clientele.MIME_CODEC = `${Clientele.MIME};codecs=vorbis,vp8`

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
      self.emit('videostream', video)
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

  self._metastream.write(outbound.whoami(self._user, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.register(self._user, password, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.login(self._user, password, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.logout(self._user, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.addPeers(self._user, peers, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.deletePeers(self._user, peers, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.getPeers(self._user, tx), err => {
    if (err) return cb(err)
    self._metastream_valve
      .subscribe(
        res => res.ok ? cb(null, res.peers) : cb(ERR.RES_NOT_OK),
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

  self._metastream.write(outbound.status(self._user, status, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.call(self._user, peer, tx), err => {
    if (err) return cb(err)
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

Clientele.prototype.accept = function accept (peer, cb) {
  if (typeof cb !== 'function') throw ERR.CB_NOT_FUNC
  if (!isTruthyString(peer)) return cb(ERR.NOT_TRUTHY_STRING('peer'))

  const self = this
  const tx = Math.random()

  self._metastream.write(outbound.accept(self._user, peer, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.reject(self._user, peer, tx), err => {
    if (err) return cb(err)
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

  self._metastream.write(outbound.accept(self._user, peer, tx), err => {
    if (err) return cb(err)
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
