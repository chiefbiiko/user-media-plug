const valid = require('./valid.js')
const { readUsers, readTransformWriteUsers } = require('./data.js')

const debug = require('debug')('user-media-plug:handlers')

const createMetaWhoami = active_meta_streams => (metadata, meta_stream, cb) => {
  debug('::metaWhoami::')
  if (!valid.schemaZ(metadata))
    return cb(new Error(`invalid schema Z: ${JSON.stringify(metadata)}`))
  const alreadyActive = Array.from(active_meta_streams)
    .some(meta_stream => meta_stream.whoami === metadata.user)
  if (alreadyActive)
    return debug(`ignoring excess whoami for: ${metadata.user}`)
  meta_stream.whoami = metadata.user
  active_meta_streams.add(meta_stream)
  debug(`identified: ${metadata.user}`)
  cb(null)
}

const registerUser = (metadata, cb) => {
  debug('::registerUser::')
  if (!valid.schemaA(metadata))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  readTransformWriteUsers(users => {
    if (!users[metadata.user]) users[metadata.user] = { peers: metadata.peers }
    return users
  }, cb)
}

const addPeers = (metadata, cb) => {
  debug('::addPeers::')
  if (!valid.schemaA(metadata))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  readTransformWriteUsers(users => {
    if (!users[metadata.user]) return users
    for (const peer of metadata.peers)
      if (peer !== metadata.user && !users[metadata.user].peers.includes(peer))
        users[metadata.user].peers.push(peer)
    return users
  }, cb)
}

const deletePeers = (metadata, cb) {
  debug('::deletePeers::')
  if (!valid.schemaA(metadata))
    return cb(new Error(`invalid schema A: ${JSON.stringify(metadata)}`))
  readTransformWriteUsers(users => {
    for (const peer of metadata.peers) {
      const i = users[metadata.user].peers.indexOf(peer)
      if (i !== -1) users[metadata.user].peers.splice(i, 1)
    }
    return users
  }, cb)
}

module.exports = {
  createMetaWhoami,
  registerUser,
  addPeers,
  deletePeers
}
