var tape = require('tape')
const Clientele = require('./index.js')

tape('whoami', t => {
  const client = new Clientele('ws://localhost:10000', 'chiefbiiko')
  client.whoami(err => {
    t.notOk(err, 'successful whoami')
    t.end()
  })
})
