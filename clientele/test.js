var tape = require('tape')
const Clientele = require('./index.js')

tape('whoami', t => {
  const client = new Clientele('ws://localhost:10000/meta')
  client.whoami('chiefbiiko', err => {
    if (err) t.end(err)
    t.pass('response status ok')
    t.end()
  })
})
