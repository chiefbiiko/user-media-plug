const tape = require('tape')
const child = require('child_process')
const websocket = require('websocket-stream')
const { readFileSync, writeFileSync } = require('fs')

tape.onFinish(() => {
  del.sync([ './.users.json' ])
})

tape('metadata - reg-user', t => {
  writeFileSync('./.users.json', '{}') // setup

  // child.exec('node ./index.js') // starting the servers

  // TODO: connect as websocket client and send some metadata

  setTimeout(() => { // allow 4 server
    ws = websocket('ws://localhost:8080/meta')
    ws.end(JSON.stringify({
      type: 'upd',
      msg: 'reg-user',
      user: 'noop',
      peers: []
    }))

    const users = JSON.parse(readFileSync('./.users.json'))

    t.ok(users.noop, 'users.noop')
    t.true(Array.isArray(users.noop.peers), 'users.noop.peers')

    t.end()
  }, 1500)
})
