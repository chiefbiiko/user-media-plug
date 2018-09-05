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

function Clientele (url, user) { // url can just be 'ws://localhost:10000'
  if (!(this instanceof Clientele)) return new Clientele(url, user)
  EventEmitter.call(this)

  if (!/firefox/i.test(navigator.userAgent))
    console.error(`clientele probly won't work on ${navigator.userAgent}`)
  else if (!MediaSource.isTypeSupported(Clientele.MIME_CODEC) ||
           !MediaRecorder.isTypeSupported(Clientele.MIME))
    throw Error(`unsupported MIME type or codec: ${Clientele.MIME_CODEC}`)

  if (!isTruthyString(url)) throw TypeError('url is not a truthy string')
  if (!isTruthyString(user)) throw TypeError('user is not a truthy string')

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
  const init_info = JSON.stringify({ user: self._user, peer: msg.peer })
  mediastream.on('error', self.emit.bind(self, 'error'))
  mediastream.write(init_info, err => {
    if (err) return self.emit('error', err)
    // i
    var video = document.createElement('video')
    const mediasource = new MediaSource()
    video.src = URL.createObjectURL(mediasource)
    mediasource.onsourceopen = () => {
      const mediasource_buf = mediasource.addSourceBuffer(Clientele.MIME_CODEC)
      mediastream.on('data', chunk => mediasource_buf.appendBuffer(chunk))
      mediastream.once('readable', () => video.play())
      mediastream.once('error', () => video = null)
      self.emit('videostream', video)
    }
    // o
    getMedia({ audio: true, video: true }, (err, media) => {
      if (err) return self.emit('error', err)
      pump(
        createRecorder(media, { interval: 1000, mimeType: Clientele.MIME }),
        mediastream,
        err => err && self.emit('error', err)
      )
    })
  })
}

Clientele.prototype.whoami = function whoami (cb) {
  if (typeof cb !== 'function')
    return cb(TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._metastream.write(outbound.whoami(self._user, tx), err => {
    if (err) return cb(err)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.register = function register (password, cb) {
  if (!isTruthyString(password))
    return cb(TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._metastream.write(outbound.register(self._user, password, tx), err => {
    if (err) return cb(err)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.login = function login (password, cb) {
  if (!isTruthyString(password))
    return cb(TypeError('password is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._metastream.write(outbound.login(self._user, password, tx), err => {
    if (err) return cb(err)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.logout = function logout (cb) {
  if (typeof cb !== 'function')
    return cb(TypeError('cb is not a function'))

  const self = this
  const tx = Math.random()

  self._metastream.write(outbound.logout(self._user, tx), err => {
    if (err) return cb(err)
    self._metastream_valve
      .subscribe(
        res => cb(res.ok ? null : Error('response status not ok')),
        res => res.tx === tx,
        1
      )
  })
}

Clientele.prototype.addPeers = function addPeers (peers, cb) {}
Clientele.prototype.deletePeers = function deletePeers (peers, cb) {}
Clientele.prototype.getPeers = function getPeers (cb) {}
Clientele.prototype.status = function status (status, cb) {}

Clientele.prototype.call = function call (peer, cb) {
  if (!isTruthyString(peer))
    return cb(TypeError('peer is not a truthy string'))
  if (typeof cb !== 'function')
    return cb(TypeError('cb is not a function'))

  const tx = Math.random()

  self._metastream.write(outbound.call(self._user, peer, tx), err => {
    if (err) return cb(err)
    self._metastream_valve
      .subscribe(
        function listener (res) {
          if (!res.ok) {
            self._metastream_valve.unsubscribe(listener)
            return cb(Error('response status not ok'), false)
          }
          if (res.type === 'REJECT') cb(null, false)
          else if (res.type === 'ACCEPT') cb(null, true)
        },
        res => res.tx === tx,
        2
      )
  })
}

Clientele.prototype.accept = function accept (peer, cb) {}
Clientele.prototype.reject = function reject (peer, cb) {}
Clientele.prototype.unpair = function unpair (peer, cb) {}

Clientele.prototype.__defineGetter__('user', function () { return this._user })

module.exports = Clientele
