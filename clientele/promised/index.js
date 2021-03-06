const { inherits } = require('util')

const Clientele = require('./../index.js')

function PromisedClientele (url, user) {
  if (!(this instanceof PromisedClientele))
    return new PromisedClientele(url, user)
  Clientele.call(this, url, user)
}

inherits(PromisedClientele, Clientele)

PromisedClientele.prototype.whoami = function whoami () {
  return new Promise((resolve, reject) => {
    Clientele.prototype.whoami.call(
      this,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.register = function register (password) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.register.call(
      this,
      password,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.login = function login (password) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.login.call(
      this,
      password,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.logout = function logout () {
  return new Promise((resolve, reject) => {
    Clientele.prototype.logout.call(
      this,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.addPeers = function addPeers (peers) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.addPeers.call(
      this,
      peers,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.deletePeers = function deletePeers (peers) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.deletePeers.call(
      this,
      peers,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.getPeers = function getPeers () {
  return new Promise((resolve, reject) => {
    Clientele.prototype.getPeers.call(
      this,
      (err, peers) => err ? reject(err) : resolve(peers)
    )
  })
}

PromisedClientele.prototype.getUser = function getUser () {
  return new Promise((resolve, reject) => {
    Clientele.prototype.getUser.call(
      this,
      (err, user) => err ? reject(err) : resolve(user)
    )
  })
}

PromisedClientele.prototype.status = function status (status) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.status.call(
      this,
      status,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.avatar = function avatar (avatar) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.avatar.call(
      this,
      avatar,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.call = function call (peer) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.call.call(
      this,
      peer,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.stopRinging = function stopRinging (peer) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.stopRinging.call(
      this,
      peer,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.accept = function accept (peer) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.accept.call(
      this,
      peer,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.reject = function reject (peer) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.reject.call(
      this,
      peer,
      err => err ? reject(err) : resolve()
    )
  })
}

PromisedClientele.prototype.unpair = function unpair (peer) {
  return new Promise((resolve, reject) => {
    Clientele.prototype.unpair.call(
      this,
      peer,
      err => err ? reject(err) : resolve()
    )
  })
}

module.exports = PromisedClientele
