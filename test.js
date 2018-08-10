const tape = require('tape')

const { PassThrough } = require('stream')

const WebSocketServer = require('websocket-stream').Server
const streamSet = require('stream-set')
const jsonStream = require('duplex-json-stream')

const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')

const valid = require('./lib/valid.js')

const { createForward, createSendForceCall } = require('./lib/notify.js')

const {
  createMetaWhoami,
  createLogin,
  createLogoff,
  createStatus,
  createCall,
  createAccept,
  createReject,
  createRegisterUser,
  createAddPeers,
  createDeletePeers,
  createPeers,
  createHandleMetadata,
  createHandleUpgrade
} = require('./lib/handlers.js')

tape('handleMetadata - initial assertions - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const online_users = new Set()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    login: createLogin(db, logged_in_users),
    logoff: createLogoff(db, logged_in_users),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    status: createStatus(db, online_users, active_meta_streams, forward),
    call: createCall(online_users, forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward),
    peers: createPeers(db, online_users)
  }, new Set())

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

tape('handleMetadata - initial assertions - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const online_users = new Set()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    login: createLogin(db, logged_in_users),
    logoff: createLogoff(db, logged_in_users),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    status: createStatus(db, online_users, active_meta_streams, forward),
    call: createCall(online_users, forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward),
    peers: createPeers(db, online_users)
  }, new Set())

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

tape('handleMetadata - initial assertions - fail pt3', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()
  const online_users = new Set()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    login: createLogin(db, logged_in_users),
    logoff: createLogoff(db, logged_in_users),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    status: createStatus(db, online_users, active_meta_streams, forward),
    call: createCall(online_users, forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward),
    peers: createPeers(db, online_users)
  }, new Set()) // set is logged_in_users

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
  const online_users = new Set()
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_meta_streams)
  const sendForceCall = createSendForceCall(active_meta_streams)

  const handleMetadata = createHandleMetadata({
    metaWhoami: createMetaWhoami(active_meta_streams),
    login: createLogin(db, logged_in_users),
    logoff: createLogoff(db, logged_in_users),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    status: createStatus(db, online_users, active_meta_streams, forward),
    call: createCall(online_users, forward),
    accept: createAccept(meta_server, forward, sendForceCall),
    reject: createReject(forward),
    peers: createPeers(db, online_users)
  }, new Set())

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

tape('whoami', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_meta_streams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const meta_server = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

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

tape('login - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const login = createLogin(db, logged_in_users)

  db.put('chiefbiiko', { password: 'abc', peers: [] }, err => {
    if (err) t.end(err)

    const tx = Math.random()
    const meta_stream = jsonStream(new PassThrough())
    const metadata = { type: 'login', user: 'chiefbiiko', password: 'abc', tx }

    meta_stream.whoami = 'chiefbiiko'

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

    meta_stream.whoami = 'chiefbiiko'

    meta_stream.once('data', res => {
      t.true(valid.schemaR(res), 'response is valid schema R')
      t.false(res.ok, 'response status not ok...')
      t.comment('...wrong password')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      t.end()
    })

    login(meta_stream, metadata, err => {
      t.equal(err.message, 'invalid password provided for chiefbiiko')
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

  meta_stream.whoami = 'chiefbiiko'

  meta_stream.once('data', res => {
    t.true(valid.schemaR(res), 'response is valid schema R')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  login(meta_stream, metadata, err => {
    t.true(/invalid schema [A-Z]{1,2}/i.test(err.message), 'cb err')
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
    or    implementing ./lib/handlers::logOff
  @Biiko: test all remaining handlers
*/
