var tape = require('tape')
var MetaServer = require('./index')
var net = require('net')
var lpstream = require('length-prefixed-stream')

tape('onconnection', function (t) {
  var server = new MetaServer()
  server.listen(419, function () {
    var socket = net.connect(419, function () {
      var payload = JSON.stringify({
        cmd: 'online',
        user : {
          id: 'chiefbiiko',
          media: true,
          desktop: true
        }
      })
      var encode = lpstream.encode()
      encode.pipe(socket)
      encode.end(payload, function () {
        server.once('metadata', function (metadata) {
          t.pass('noop')
          server.close()
          t.end()
        })
      })
    })
  })
})
