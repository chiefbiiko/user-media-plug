const tape = require('tape')
const clientele = require('./promised/index.js')

tape('partial usage flow', async t => {
  t.comment('fraudster:')
  const fraudster = clientele('ws://localhost:10000', 'fraudster')
  t.pass('connected')
  await fraudster.whoami()
  t.pass('identified')
  await fraudster.register('abc')
  t.pass('registered')

  t.comment('chiefbiiko:')
  const chiefbiiko = clientele('ws://localhost:10000')
  t.pass('connected')
  chiefbiiko.setUser('chiefbiiko')
  t.pass('set user')
  await chiefbiiko.whoami()
  t.pass('identified')
  await chiefbiiko.register('sesameopen')
  t.pass('registered')
  await chiefbiiko.login('sesameopen')
  t.pass('logged in')
  await chiefbiiko.status('chiefin')
  t.pass('set status')
  await chiefbiiko.addPeers([ 'og', 'fraudster' ])
  t.pass('added peers')
  await chiefbiiko.deletePeers([ 'og' ])
  t.pass('deleted peers')
  const peers = await chiefbiiko.getPeers()
  t.pass('got peers')
  const expected = {
    fraudster: {
      status: 'noop',
      online: false,
      avatar: 'data:image/*;base64,...'
    }
  }
  t.same(peers, expected, 'same peers')
  await chiefbiiko.logout()
  t.pass('logged out')

  t.end()
})
