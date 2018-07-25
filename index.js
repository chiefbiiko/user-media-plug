var Server = require('net').Server
var inherits = require('util').inherits
var lpstream = require('length-prefixed-stream')

/* AGENDA
  develop a metadataserver that manages online clients.
  and emits 'pair' and 'unpair' events.
 + maintained data structure of the metadataserver:
   -> [ { id: string, media: boolean, desktop: boolean }, ... ]
 + to go online, user writes:
   -> { cmd: 'online', user: { id: string, media: boolean, desktop: boolean } }
 + to go offline, user writes:
   -> { cmd: 'offline', user: { id: string } }
 + for userA to call userB, userA writes:
   -> { cmd: 'call', user: { id: userA }, peers: [ { id: userB } ] }
 + for userB to accept userA, userB writes:
   -> { cmd: 'accept', user: { id: userB }, peer: { id: userA } }
 + for userB to reject userA, userB writes:
   -> { cmd: 'reject', user: { id: userB }, peer: { id: userA } }
*/

function MetaServer (opts) {
  if (!(this instanceof MetaServer)) return new MetaServer(opts)
  Server.call(this, opts)
  this.users = []
  this.on('connection', onconnection.bind(this))
}

inherits(MetaServer, Server)

function onconnection (socket) {
  var decode = lpstream.decode()
  socket.pipe(decode)
  decode.on('data', ondata.bind(this))
}

function ondata (chunk) {
  var data
  try {
    data = JSON.parse(chunk)
  } catch (err) {
    this.emit('error', err)
  }
  switch(data.cmd) {
    case 'online':
      ononline.call(this, data)
      break
    case 'offline':
      console.log(data.cmd)
      break
    case 'call':
      console.log(data.cmd)
      break
    case 'accept':
      console.log(data.cmd)
      break
    case 'reject':
      console.log(data.cmd)
      break
    default:
      console.error(data)
  }
  this.emit('metadata', data)
}

function ononline (data) {
  this.users.push(data.user)
}

function onoffline (data) {
  this.users = this.users // ...
}

module.exports = MetaServer
