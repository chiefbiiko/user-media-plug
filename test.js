const tape = require('tape')

const { createServer } = require('http')
const { PassThrough } = require('stream')

const websocket = require('websocket-stream')
const WebSocketServer = websocket.Server
const streamSet = require('stream-set')
const jsonStream = require('duplex-json-stream')

const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')

const valid = require('./lib/valid.js')

const { createForward, createSendForceCall } = require('./lib/notify.js')

const { // TODO: all "pending"
  createHandleUpgrade,
  createHandleMetadata,
  createMetaWhoami,
  createRegisterUser, // pending
  createAddPeers,     // pending
  createDeletePeers,  // pending
  createGetPeers,
  createLogin,
  createLogout,
  createStatus,
  createCall,
  createAccept,
  createReject,
  createHandlePair // pending
} = require('./lib/handlers.js')

tape('handleMetadata - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db),
    login: createLogin(db, logged_in_users),
    logout: createLogout(logged_in_users),
    status: createStatus(db, active_meta_streams, forward),
    call: createCall(forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward)
  }, logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'login', user: 'chiefbiiko', password: 'abc', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc "whoami" must be the inital msg sent thru a socket')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('handleMetadata - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db),
    login: createLogin(db, logged_in_users),
    logout: createLogout(logged_in_users),
    status: createStatus(db, active_meta_streams, forward),
    call: createCall(forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward)
  }, logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'login', user: 'chiefbiiko', password: 'abc', tx }

  meta_stream.whoami = 'noop'

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc meta_stream.whoami !== metadata.user')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('handleMetadata - fail pt3', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db),
    login: createLogin(db, logged_in_users),
    logout: createLogout(logged_in_users),
    status: createStatus(db, active_meta_streams, forward),
    call: createCall(forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward)
  }, logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'peers', user: 'chiefbiiko', tx }

  meta_stream.whoami = 'chiefbiiko'

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc metadata.user is not logged in')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('handleMetadata - switch fallthru', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db),
    login: createLogin(db, logged_in_users),
    logout: createLogout(logged_in_users),
    status: createStatus(db, active_meta_streams, forward),
    call: createCall(forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward)
  }, logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'unknown', user: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of an unknown metadata.type')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('metaWhoami - pass', t => {
  const active_meta_streams = streamSet()
  const metaWhoami = createMetaWhoami(active_meta_streams)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'whoami', user: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  metaWhoami(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('metaWhoami - fail pt1', t => {
  const active_meta_streams = streamSet()

  const metaWhoami = createMetaWhoami(active_meta_streams)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'whoami', user: 'chiefbiiko', tx }

  const peer_stream = jsonStream(new PassThrough())
  peer_stream.whoami = 'chiefbiiko'
  active_meta_streams.add(peer_stream)

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc the sent whoami identifier (user) already exists')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  metaWhoami(meta_stream, metadata, err => {
    t.true(err.message.includes('excess'), 'excess whoami')
    t.end()
  })
})

tape('metaWhoami - fail pt2', t => {
  const active_meta_streams = streamSet()

  const metaWhoami = createMetaWhoami(active_meta_streams)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'metaWhoami', user: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  metaWhoami(meta_stream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('login - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const login = createLogin(db, logged_in_users)

  db.put('chiefbiiko', { password: 'abc', peers: [] }, err => {
    if (err) t.end(err)

    const tx = Math.random()
    const meta_stream = jsonStream(new PassThrough())
    const metadata = { type: 'login', user: 'chiefbiiko', password: 'abc', tx }

    meta_stream.once('data', res => {
      t.true(valid.schemaR(res), 'response is valid schema R')
      t.true(res.ok, 'response status ok')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      t.end()
    })

    login(meta_stream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('login - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const login = createLogin(db, logged_in_users)

  db.put('chiefbiiko', { password: 'abc', peers: [] }, err => {
    if (err) t.end(err)

    const tx = Math.random()
    const meta_stream = jsonStream(new PassThrough())
    const metadata = { type: 'login', user: 'chiefbiiko', password: 'abz', tx }

    meta_stream.once('data', res => {
      t.true(valid.schemaR(res), 'response is valid schema R')
      t.false(res.ok, 'response status not ok...')
      t.comment('...wrong password')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    login(meta_stream, metadata, err => {
      t.true(err.message.startsWith('invalid password'), 'invlid password')
      t.end()
    })
  })
})

tape('login - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const login = createLogin(db, logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { msg: 'login', user: 'chiefbiiko', password: 'abc', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  login(meta_stream, metadata, err => {
    t.true(/invalid schema [A-Z]{1,2}/i.test(err.message), 'cb err')
    t.end()
  })
})

tape('logout - pass', t => {
  const logged_in_users = new Set()

  const logout = createLogout(logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'logout', user: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  logout(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('logout - fail', t => {
  const logged_in_users = new Set()

  const logout = createLogout(logged_in_users)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'logout', username: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  logout(meta_stream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('status - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const status = createStatus(db, active_meta_streams, forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'status', user: 'chiefbiiko', status: 'cool', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  db.put('chiefbiiko', { peers: [ 'noop' ], status: 'none' }, err => {
    if (err) t.end(err)

    var pending = 2

    meta_stream.once('data', res => {
      t.true(valid.schemaR(res), 'response is valid schema R')
      t.true(res.ok, 'response status ok')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      if (!--pending) t.end()
    })

    peer_stream.once('data', notif => {
      t.same(notif, metadata, 'forwarded metadata to peer noop')
      t.equal(notif.status, 'cool', 'got the status update in a notification')
      if (!--pending) t.end()
    })

    status(meta_stream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('status - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const status = createStatus(db, active_meta_streams, forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'status', user: 'chiefbiiko', status: '', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  db.put('chiefbiiko', { peers: [ 'noop' ], status: 'none' }, err => {
    if (err) t.end(err)

    meta_stream.once('data', res => {
      t.true(valid.schemaR(res), 'response is valid schema R')
      t.false(res.ok, 'response status not ok...')
      t.comment('...invalid schema')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    status(meta_stream, metadata, err => {
      t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
      t.end()
    })
  })
})

tape('status - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const status = createStatus(db, active_meta_streams, forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'status', user: 'biiko', status: 'boss', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  db.put('chiefbiiko', { peers: [ 'noop' ], status: 'none' }, err => {
    if (err) t.end(err)

    meta_stream.once('data', res => {
      t.true(valid.schemaR(res), 'response is valid schema R')
      t.false(res.ok, 'response status not ok...')
      t.comment('...bc of a db error (notFound)')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    status(meta_stream, metadata, err => {
      t.ok(err.notFound, 'db triggered cb err not found')
      t.end()
    })
  })
})

tape('call - pass', t => {
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const call = createCall(forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'call', user: 'chiefbiiko', peer: 'noop', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  var pending = 2

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  peer_stream.once('data', notif => {
    t.same(notif, metadata, 'forwarded metadata to peer noop')
    t.equal(notif.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  call(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('call - fail pt1', t => {
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const call = createCall(forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'calling', user: 'chiefbiiko', peer: 'noop', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  call(meta_stream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('call - fail pt2', t => {
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const call = createCall(forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'call', user: 'chiefbiiko', peer: 'poop', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  var pending = 2

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of an inactive/unknown receiver')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  peer_stream.once('data', notif => {
    t.fail('should be unreachable')
  })

  call(meta_stream, metadata, err => {
    t.true(err.message.includes('can\'t forward'))
    t.end()
  })
})

tape('accept - pass', t => {
  const active_meta_streams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)
  const accept = createAccept(meta_server, forward, sendForceCall)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'accept', user: 'chiefbiiko', peer: 'noop', tx }

  meta_stream.whoami = 'chiefbiiko'
  peer_stream.whoami = 'noop'
  active_meta_streams.add(meta_stream)
  active_meta_streams.add(peer_stream)

  var pending = 2

  meta_stream.on('data', msg => {
    switch (msg.type) {
      case 'force-call':
        t.true(valid.schemaF(msg), 'valid schema F 4 force-call msg')
        t.equal(msg.peer, 'noop', 'peer noop')
        break
      case 'res':
        t.true(valid.schemaR(msg), 'response is valid schema R')
        t.true(msg.ok, 'response status ok')
        t.equal(msg.tx, tx, 'transaction identifiers equal')
        if (!--pending) t.end()
        break
      default:
        t.fail('should be unreachable')
    }
  })

  peer_stream.on('data', notif => {
    switch (notif.type) {
      case 'force-call':
        t.true(valid.schemaF(notif), 'valid schema F 4 force-call msg')
        t.equal(notif.peer, 'chiefbiiko', 'peer chiefbiiko')
        break
      case 'accept':
        t.true(valid.schemaC(notif), 'response is valid schema C')
        t.equal(notif.tx, tx, 'transaction identifiers equal')
        if (!--pending) t.end()
        break
      default:
        t.fail('should be unreachable')
    }
  })

  meta_server.once('pair', (a, b) => {
    const peers = [ a, b ]
    t.true(peers.includes('chiefbiiko'), 'one peer')
    t.true(peers.includes('noop'), 'two peer')
  })

  accept(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('accept - fail pt1', t => {
  const active_meta_streams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)
  const accept = createAccept(meta_server, forward, sendForceCall)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'accepting', user: 'chiefbiiko', peer: 'noop', tx }

  meta_stream.on('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  accept(meta_stream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('accept - fail pt2', t => {
  const active_meta_streams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)
  const accept = createAccept(meta_server, forward, sendForceCall)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'accept', user: 'chiefbiiko', peer: 'poop', tx }

  meta_stream.whoami = 'chiefbiiko'
  active_meta_streams.add(meta_stream)

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok')
    t.comment('...bc of an inactive/unknown receiver')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  accept(meta_stream, metadata, err => {
    t.true(err.message.includes('can\'t forward'))
    t.end()
  })
})

tape('reject - pass', t => {
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const reject = createReject(forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'reject', user: 'chiefbiiko', peer: 'noop', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  var pending = 2

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  peer_stream.once('data', notif => {
    t.same(notif, metadata, 'forwarded metadata to peer noop')
    t.equal(notif.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  reject(meta_stream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('reject - fail pt1', t => {
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const reject = createReject(forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'calling', user: 'chiefbiiko', peer: 'noop', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  reject(meta_stream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('reject - fail pt2', t => {
  const active_meta_streams = streamSet()

  const forward = createForward(active_meta_streams)
  const reject = createReject(forward)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const peer_stream = jsonStream(new PassThrough())
  const metadata = { type: 'call', user: 'chiefbiiko', peer: 'poop', tx }

  peer_stream.whoami = 'noop'
  active_meta_streams.add(peer_stream)

  var pending = 2

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of an inactive/unknown receiver')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  peer_stream.once('data', notif => {
    t.fail('should be unreachable')
  })

  reject(meta_stream, metadata, err => {
    t.true(err.message.includes('can\'t forward'))
    t.end()
  })
})

tape('getPeers - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getPeers = createGetPeers(db)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'peers', user: 'chiefbiiko', tx }

  db.put('chiefbiiko', { peers: [ 'noop', 'og' ], status: 'offline' }, err => {
    if (err) t.end(err)
    db.put('noop', { peers: [], status: 'online' }, err => {
      if (err) t.end(err)
      db.put('og', { peers: [], status: 'busy' }, err => {
        if (err) t.end(err)

        const expected = [
          { peer: 'noop', status: 'online' },
          { peer: 'og', status: 'busy' }
        ]

        meta_stream.once('data', res => {
          t.true(valid.schemaRP(res), 'response is valid schema RP')
          t.true(res.ok, 'response status ok')
          t.true(Array.isArray(res.peers), 'peer array')
          t.same(res.peers, expected, 'peer n status')
          t.equal(res.tx, tx, 'transaction identifiers equal')
          t.end()
        })

        getPeers(meta_stream, metadata, err => {
          if (err) t.end(err)
        })
      })
    })
  })
})

tape('getPeers - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getPeers = createGetPeers(db)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'peers', username: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  getPeers(meta_stream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('getPeers - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getPeers = createGetPeers(db)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'peers', user: 'chiefbiiko', tx }

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of a db error (notFound)')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  getPeers(meta_stream, metadata, err => {
    t.ok(err.notFound, 'db triggered cb err not found')
    t.end()
  })
})

tape('getPeers - fail pt3', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getPeers = createGetPeers(db)

  const tx = Math.random()
  const meta_stream = jsonStream(new PassThrough())
  const metadata = { type: 'peers', user: 'chiefbiiko', tx }

  db.put('chiefbiiko', { peers: [ 'noop', 'og' ], status: 'offline' }, err => {
    if (err) t.end(err)
    db.put('noop', { peers: [], status: 'online' }, err => {
      if (err) t.end(err)
      db.put('og_maco', { peers: [], status: 'busy' }, err => {
        if (err) t.end(err)

        const expected = [
          { peer: 'noop', status: 'online' },
          { peer: 'og', status: 'busy' }
        ]

        meta_stream.once('data', res => {
          t.true(valid.schemaR(res), 'response is valid schema R')
          t.false(res.ok, 'response status not ok...')
          t.comment('...bc of a db error (notFound)')
          t.equal(res.tx, tx, 'transaction identifiers equal')
        })

        getPeers(meta_stream, metadata, err => {
          t.ok(err.notFound, 'db triggered cb err not found')
          t.end()
        })
      })
    })
  })
})

tape.only('handlePair - pass', t => {
  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const media_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const handlePair = createHandlePair(media_server)

  const a = 'chiefbiiko'
  const b = 'noop'
  const a_info = JSON.stringify({ user: 'chiefbiiko', peer: 'noop' })
  const b_info = JSON.stringify({ user: 'noop', peer: 'chiefbiiko' })

  const http_server = createServer()
  http_server.on('upgrade', createHandleUpgrade(meta_server, media_server))
  http_server.listen(10000, 'localhost')

  handlePair(a, b)

  // establish two websocket cons, send media whoami info, and assert x-stream!
  const a_ws = websocket('ws://localhost:10000/media')
  const b_ws = websocket('ws://localhost:10000/media')

  var pending = 2

  a_ws.on('data', chunk => {
    t.equal(chunk.toString(), 'noop', 'chiefbiiko got peer data')
    if (!--pending) {
      http_server.close()
      t.end()
    }
  })

  b_ws.on('data', chunk => {
    t.equal(chunk.toString(), 'chiefbiiko', 'noop got peer data')
    if (!--pending) {
      http_server.close()
      t.end()
    }
  })

  a_ws.write(a_info, err => {
    if (err) t.end(err)
    a_ws.write('chiefbiiko', err => err && t.end(err))
  })

  b_ws.write(b_info, err => {
    if (err) t.end(err)
    b_ws.write('noop', err => err && t.end(err))
  })
})

/* TODO:
  + write tests for all remaining handlers (./lib/handlers/*)
  + keep test coverage high -> test metadata validation if blocks,
    run into db errors where possible; fx: trigger a notFound err
  + do not share instances across test cases; see above
  + add comments to responses that are not ok
  + remove unused variables if you find some
  + ...

  @Balou: you can start by testing ./lib/handlers::registerUser|addPeers|deletePeers
  @Biiko: test all remaining handlers
*/
