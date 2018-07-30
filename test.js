const tape = require('tape')
const child = require('child_process')
const websocket = require('websocket-stream')
const { readFileSync, writeFileSync } = require('fs')

// tape.onFinish(() => {
//   del.sync([ './.users.json' ])
// })

var browser = require('browser-run');

tape('metadata - reg-user', t => {

  browser().end(`websocket('ws://localhost:10000/meta').end(JSON.stringify({
    type: 'upd',
    msg: 'reg-user',
    user: 'noop',
    peers: []
  }))`)

  setTimeout(() => { // allow 4 server
    const users = JSON.parse(readFileSync('./.users.json'))

    t.ok(users.noop, 'users.noop')
    t.true(Array.isArray(users.noop.peers), 'users.noop.peers')

    t.end()
  }, 5000)

  // setTimeout(() => { // allow 4 server
  //   ws = websocket('ws://localhost:10000/meta')
  //   ws.end(JSON.stringify({
  //     type: 'upd',
  //     msg: 'reg-user',
  //     user: 'noop',
  //     peers: []
  //   }))
  //
  //   const users = JSON.parse(readFileSync('./.users.json'))
  //
  //   t.ok(users.noop, 'users.noop')
  //   t.true(Array.isArray(users.noop.peers), 'users.noop.peers')
  //
  //   t.end()
  // }, 1000)
})
