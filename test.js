const tape = require('tape')

const { createServer } = require('http')
const { PassThrough } = require('stream')

const websocket = require('websocket-stream')
const WebSocketServer = websocket.Server
const streamSet = require('stream-set')
const jsonStream = require('duplex-json-stream')
const hashtagStreamSet = require('hashtag-stream-set')

const levelup = require('levelup')
const memdown = require('memdown')
const enc = require('encoding-down')

const valid = require('./lib/valid.js')

const { createForward, createSendForceCall } = require('./lib/notify.js')

const {
  createHandleUpgrade,
  createHandleMetastream,
  createHandleMetadata,
  createWhoami,
  createRegisterUser,
  createLogin,
  createLogout,
  createAvatar,
  createAddPeers,
  createDeletePeers,
  createGetPeers,
  createGetUser,
  createStatus,
  createCall,
  createStopRinging,
  createAccept,
  createReject,
  createUnpair,
  createHandlePair,
  createHandleUnpair,
  willDeleteMediastreams
} = require('./lib/handlers.js')

tape('handleUpgrade - pass', t => {
  const httpserver = createServer()
  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const handleUpgrade = createHandleUpgrade(metaserver, mediaserver)

  httpserver.on('upgrade', handleUpgrade)
  httpserver.listen(10001, 'localhost')

  const a_ws = websocket('ws://localhost:10001/meta')
  const b_ws = websocket('ws://localhost:10001/media')

  a_ws.on('error', t.end)
  b_ws.on('error', t.end)

  setTimeout(() => {
    t.pass('connections upgraded from http to ws without errors')
    a_ws.destroy()
    b_ws.destroy()
    httpserver.close(t.end)
  }, 250)
})

tape('handleUpgrade - fail - switch fallthru', t => {
  const httpserver = createServer()
  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const handleUpgrade = createHandleUpgrade(metaserver, mediaserver)

  httpserver.on('upgrade', handleUpgrade)
  httpserver.listen(10001, 'localhost')

  const a_ws = websocket('ws://localhost:10001/')
  const b_ws = websocket('ws://localhost:10001/noop')

  a_ws.on('error', err => t.ok(err, 'got a\'s connection error'))
  b_ws.on('error', err => t.ok(err, 'got b\'s connection error'))

  setTimeout(() => httpserver.close(t.end), 250)
})

tape('handleMetastream', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handleMetastream = createHandleMetastream({
    db,
    metaserver,
    active_metastreams,
    logged_in_users
  })

  handleMetastream(new PassThrough(), null)
  t.pass('handleMetastream so simple, hardly testable, asserting no errs')
  t.end()
})

tape('handleMetadata - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handleMetadata = createHandleMetadata({
    whoami: createWhoami(active_metastreams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db, logged_in_users),
    getUser: createGetUser(db),
    login: createLogin(db, logged_in_users, forward),
    logout: createLogout(db, logged_in_users, forward),
    status: createStatus(db, active_metastreams, forward),
    call: createCall(forward),
    stopRinging: createStopRinging(forward),
    accept: createAccept(metaserver, forward, sendForceCall),
    reject: createReject(forward),
    unpair: createUnpair(metaserver, forward)
  }, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'login',
    user: 'chiefbiiko',
    password: 'abc',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc "whoami" must be the inital msg sent thru a socket')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('handleMetadata - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handleMetadata = createHandleMetadata({
    whoami: createWhoami(active_metastreams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db, logged_in_users),
    getUser: createGetUser(db),
    login: createLogin(db, logged_in_users, forward),
    logout: createLogout(db, logged_in_users, forward),
    status: createStatus(db, active_metastreams, forward),
    call: createCall(forward),
    stopRinging: createStopRinging(forward),
    accept: createAccept(metaserver, forward, sendForceCall),
    reject: createReject(forward),
    unpair: createUnpair(metaserver, forward)
  }, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'login',
    user: 'chiefbiiko',
    password: 'abc',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.whoami = 'noop'

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc metastream.whoami !== metadata.user')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('handleMetadata - fail pt3', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handleMetadata = createHandleMetadata({
    whoami: createWhoami(active_metastreams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db, logged_in_users),
    getUser: createGetUser(db),
    login: createLogin(db, logged_in_users, forward),
    logout: createLogout(db, logged_in_users, forward),
    status: createStatus(db, active_metastreams, forward),
    call: createCall(forward),
    stopRinging: createStopRinging(forward),
    accept: createAccept(metaserver, forward, sendForceCall),
    reject: createReject(forward),
    unpair: createUnpair(metaserver, forward)
  }, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'peers',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.whoami = 'chiefbiiko'

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc metadata.user is not logged in')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('handleMetadata - switch fallthru', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handleMetadata = createHandleMetadata({
    whoami: createWhoami(active_metastreams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db, logged_in_users),
    getUser: createGetUser(db),
    login: createLogin(db, logged_in_users, forward),
    logout: createLogout(db, logged_in_users, forward),
    status: createStatus(db, active_metastreams, forward),
    call: createCall(forward),
    stopRinging: createStopRinging(forward),
    accept: createAccept(metaserver, forward, sendForceCall),
    reject: createReject(forward),
    unpair: createUnpair(metaserver, forward)
  }, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'unknown',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of an unknown metadata.type')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  handleMetadata(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('whoami - pass', t => {
  const active_metastreams = streamSet()
  const whoami = createWhoami(active_metastreams)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'WHOAMI',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    t.end()
  })

  whoami(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('whoami - fail pt1', t => {
  const active_metastreams = streamSet()

  const whoami = createWhoami(active_metastreams)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'WHOAMI',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  const peerstream = jsonStream(new PassThrough())
  peerstream.whoami = 'chiefbiiko'
  active_metastreams.add(peerstream)

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc the sent whoami identifier (user) already exists')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  whoami(metastream, metadata, err => {
    t.true(err.message.includes('excess'), 'excess whoami')
    t.end()
  })
})

tape('whoami - fail pt2', t => {
  const active_metastreams = streamSet()

  const whoami = createWhoami(active_metastreams)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'whoami',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  whoami(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('login - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const login = createLogin(db, logged_in_users, forward)

  db.put('chiefbiiko', { password: 'abc', peers: [] }, err => {
    if (err) t.end(err)

    const tx = Math.random()
    const metastream = jsonStream(new PassThrough())
    const metadata = {
      type: 'LOGIN',
      user: 'chiefbiiko',
      password: 'abc',
      tx,
      unix_ts_ms: Date.now()
    }

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.true(res.ok, 'response status ok')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      t.end()
    })

    login(metastream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('login - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const login = createLogin(db, logged_in_users, forward)

  db.put('chiefbiiko', { password: 'abc', peers: [] }, err => {
    if (err) t.end(err)

    const tx = Math.random()
    const metastream = jsonStream(new PassThrough())
    const metadata = {
      type: 'LOGIN',
      user: 'chiefbiiko',
      password: 'abz',
      tx,
      unix_ts_ms: Date.now()
    }

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.false(res.ok, 'response status not ok...')
      t.comment('...wrong password')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    login(metastream, metadata, err => {
      t.true(err.message.startsWith('invalid password'), 'invlid password')
      t.end()
    })
  })
})

tape('login - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const login = createLogin(db, logged_in_users, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    msg: 'LOGIN',
    user: 'chiefbiiko',
    password: 'abc',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  login(metastream, metadata, err => {
    t.true(/invalid schema [A-Z]{1,2}/i.test(err.message), 'cb err')
    t.end()
  })
})

tape('logout - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const logout = createLogout(db, logged_in_users, forward)

  db.put('chiefbiiko', { status: 'sth', password: 'sth', peers: [] }, err => {
    if (err) t.end(err)

    const tx = Math.random()
    const metastream = jsonStream(new PassThrough())
    const metadata = {
      type: 'LOGOUT',
      user: 'chiefbiiko',
      tx,
      unix_ts_ms: Date.now()
    }

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.true(res.ok, 'response status ok')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      t.end()
    })

    logout(metastream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('logout - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const logout = createLogout(db, logged_in_users, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'LOGOUT',
    username: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  logout(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('logout - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const logout = createLogout(db, logged_in_users, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'LOGOUT',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of a db err (key not found)')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  logout(metastream, metadata, err => {
    t.true(err.message.includes('not found'), 'not found err')
    t.end()
  })
})

tape('avatar - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const forward = createForward(active_metastreams)

  const avatar = createAvatar(db, active_metastreams, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'AVATAR',
    user: 'chiefbiiko',
    avatar: 'data:image/*;base64,...',
    tx,
    unix_ts_ms: Date.now()
  }

  const chiefbiiko = { status: 'og', password: 'abc', peers: [], avatar: '' }

  db.put('chiefbiiko', chiefbiiko , err => {
    if (err) t.end(err)

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.true(res.ok, 'response status ok')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      db.get(metadata.user, (err, user) => {
        if (err) t.end(err)
        t.equal(user.avatar, metadata.avatar, 'same avatar')
        t.end()
      })
    })

    avatar(metastream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('avatar - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const avatar = createAvatar(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'PICTURE',
    user: 'chiefbiiko',
    avatar: 'data:image/*;base64,...',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  avatar(metastream, metadata, err => {
    t.true(err.message.includes('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('status - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const status = createStatus(db, active_metastreams, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'STATUS',
    user: 'chiefbiiko',
    status: 'cool',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  db.put('chiefbiiko', { peers: [ 'noop' ], status: 'none' }, err => {
    if (err) t.end(err)

    var pending = 2

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.true(res.ok, 'response status ok')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      if (!--pending) t.end()
    })

    peerstream.once('data', notif => {
      t.same(notif, metadata, 'forwarded metadata to peer noop')
      t.equal(notif.status, 'cool', 'got the status update in a notification')
      if (!--pending) t.end()
    })

    status(metastream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('status - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const status = createStatus(db, active_metastreams, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'STATUS',
    user: 'chiefbiiko',
    status: '',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  db.put('chiefbiiko', { peers: [ 'noop' ], status: 'none' }, err => {
    if (err) t.end(err)

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.false(res.ok, 'response status not ok...')
      t.comment('...invalid schema')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    status(metastream, metadata, err => {
      t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
      t.end()
    })
  })
})

tape('status - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const status = createStatus(db, active_metastreams, forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'STATUS',
    user: 'biiko',
    status: 'boss',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  db.put('chiefbiiko', { peers: [ 'noop' ], status: 'none' }, err => {
    if (err) t.end(err)

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.false(res.ok, 'response status not ok...')
      t.comment('...bc of a db error (notFound)')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    status(metastream, metadata, err => {
      t.ok(err.notFound, 'db triggered cb err not found')
      t.end()
    })
  })
})

tape('call - pass', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const call = createCall(forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'CALL',
    user: 'chiefbiiko',
    peer: 'noop',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  var pending = 2

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  peerstream.once('data', notif => {
    t.same(notif, metadata, 'forwarded metadata to peer noop')
    t.equal(notif.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  call(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('call - fail pt1', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const call = createCall(forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'CALLING',
    user: 'chiefbiiko',
    peer: 'noop',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  call(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('call - fail pt2', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const call = createCall(forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'CALL',
    user: 'chiefbiiko',
    peer: 'poop',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  var pending = 2

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of an inactive/unknown receiver')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  peerstream.once('data', notif => {
    t.fail('should be unreachable')
  })

  call(metastream, metadata, err => {
    t.true(err.message.includes('can\'t forward'))
    t.end()
  })
})

tape('stopRinging - pass', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const call = createCall(forward)
  const stopRinging = createStopRinging(forward)

  const tx_1 = Math.random()
  const tx_2 = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata_1 = {
    type: 'CALL',
    user: 'chiefbiiko',
    peer: 'noop',
    tx: tx_1,
    unix_ts_ms: Date.now()
  }
  const metadata_2 = {
    type: 'STOP_RINGING',
    user: 'chiefbiiko',
    peer: 'noop',
    tx: tx_2,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  var pending = 4

  var data_count = 0
  metastream.on('data', res => {
    switch (++data_count) {
      case 1:
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.true(res.ok, 'response status ok')
        t.equal(res.tx, tx_1, 'transaction identifiers equal')
        break
      case 2:
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.true(res.ok, 'response status ok')
        t.equal(res.tx, tx_2, 'transaction identifiers equal')
        break
    }
    if (!--pending) t.end()
  })

  var notif_count = 0
  peerstream.on('data', notif => {
    switch (++notif_count) {
      case 1: t.same(notif, metadata_1, 'forwarded metadata #1'); break
      case 2: t.same(notif, metadata_2, 'forwarded metadata #2'); break
    }
    if (!--pending) t.end()
  })

  call(metastream, metadata_1, err => {
    if (err) t.end(err)
    setTimeout(() => {
      stopRinging(metastream, metadata_2, err => err && t.end(err))
    }, 500)
  })
})


tape('stopRinging - fail pt1', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const call = createCall(forward)
  const stopRinging = createStopRinging(forward)

  const tx_1 = Math.random()
  const tx_2 = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata_1 = {
    type: 'CALL',
    user: 'chiefbiiko',
    peer: 'noop',
    tx: tx_1,
    unix_ts_ms: Date.now()
  }
  const metadata_2 = {
    type: 'STOP_RINGING',
    user: 'chiefbiiko',
    friend: 'noop',
    tx: tx_2,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  var pending = 4

  var data_count = 0
  metastream.on('data', res => {
    switch (++data_count) {
      case 1:
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.true(res.ok, 'response status ok')
        t.equal(res.tx, tx_1, 'transaction identifiers equal')
        break
      case 2:
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.false(res.ok, 'response status not ok...')
        t.comment('...invalid schema')
        t.equal(res.tx, tx_2, 'transaction identifiers equal')
        break
    }
    if (!--pending) t.end()
  })

  var notif_count = 0
  peerstream.on('data', notif => {
    switch (++notif_count) {
      case 1: t.same(notif, metadata_1, 'forwarded metadata #1'); break
      case 2: t.same(notif, metadata_2, 'forwarded metadata #2'); break
    }
    if (!--pending) t.end()
  })

  call(metastream, metadata_1, err => {
    if (err) t.end(err)
    setTimeout(() => {
      stopRinging(metastream, metadata_2, err => {
        t.true(err.message.includes('invalid schema'))
        t.end()
      })
    }, 500)
  })
})

tape('stopRinging - fail pt2', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const call = createCall(forward)
  const stopRinging = createStopRinging(forward)

  const tx_1 = Math.random()
  const tx_2 = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata_1 = {
    type: 'CALL',
    user: 'chiefbiiko',
    peer: 'noop',
    tx: tx_1,
    unix_ts_ms: Date.now()
  }
  const metadata_2 = {
    type: 'STOP_RINGING',
    user: 'chiefbiiko',
    peer: 'noop',
    tx: tx_2,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'poop'
  active_metastreams.add(peerstream)

  var pending = 4

  var data_count = 0
  metastream.on('data', res => {
    switch (++data_count) {
      case 1:
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.false(res.ok, 'response status not ok...')
        t.comment('...unknown receiver')
        t.equal(res.tx, tx_1, 'transaction identifiers equal')
        break
      case 2:
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.false(res.ok, 'response status not ok...')
        t.comment('...unknown receiver')
        t.equal(res.tx, tx_2, 'transaction identifiers equal')
        break
    }
    if (!--pending) t.end()
  })

  var notif_count = 0
  peerstream.on('data', notif => {
    switch (++notif_count) {
      case 1: t.same(notif, metadata_1, 'forwarded metadata #1'); break
      case 2: t.same(notif, metadata_2, 'forwarded metadata #2'); break
    }
    if (!--pending) t.end()
  })

  call(metastream, metadata_1, err => {
    t.true(err.message.includes('can\'t forward'))
    setTimeout(() => {
      stopRinging(metastream, metadata_2, err => {
        t.true(err.message.includes('can\'t forward'))
        t.end()
      })
    }, 500)
  })
})

tape('accept - pass', t => {
  const active_metastreams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)
  const accept = createAccept(metaserver, forward, sendForceCall)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'ACCEPT',
    user: 'chiefbiiko',
    peer: 'noop',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.whoami = 'chiefbiiko'
  peerstream.whoami = 'noop'
  active_metastreams.add(metastream)
  active_metastreams.add(peerstream)

  var pending = 2

  metastream.on('data', msg => {
    switch (msg.type) {
      case 'FORCE_CALL':
        t.true(valid.schema_FORCE_CALL(msg), 'valid schema 4 force-call msg')
        t.equal(msg.peer, 'noop', 'peer noop')
        break
      case 'RESPONSE':
        t.true(valid.schema_RESPONSE(msg), 'valid response schema')
        t.true(msg.ok, 'response status ok')
        t.equal(msg.tx, tx, 'transaction identifiers equal')
        if (!--pending) t.end()
        break
      default:
        t.fail('should be unreachable')
    }
  })

  peerstream.on('data', notif => {
    switch (notif.type) {
      case 'FORCE_CALL':
        t.true(valid.schema_FORCE_CALL(notif), 'valid schema 4 force-call msg')
        t.equal(notif.peer, 'chiefbiiko', 'peer chiefbiiko')
        break
      case 'ACCEPT':
        t.true(valid.schema_CALL_ACCEPT_REJECT(notif), 'valid response schema')
        t.equal(notif.tx, tx, 'transaction identifiers equal')
        if (!--pending) t.end()
        break
      default:
        t.fail('should be unreachable')
    }
  })

  metaserver.once('pair', (a, b) => {
    const peers = [ a, b ]
    t.true(peers.includes('chiefbiiko'), 'one peer')
    t.true(peers.includes('noop'), 'two peer')
  })

  accept(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('accept - fail pt1', t => {
  const active_metastreams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)
  const accept = createAccept(metaserver, forward, sendForceCall)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'ACCEPTING',
    user: 'chiefbiiko',
    peer: 'noop',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.on('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  accept(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('accept - fail pt2', t => {
  const active_metastreams = streamSet()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)
  const accept = createAccept(metaserver, forward, sendForceCall)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'ACCEPT',
    user: 'chiefbiiko',
    peer: 'poop',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.whoami = 'chiefbiiko'
  active_metastreams.add(metastream)

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok')
    t.comment('...bc of an inactive/unknown receiver')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  accept(metastream, metadata, err => {
    t.true(err.message.includes('can\'t forward'))
    t.end()
  })
})

tape('reject - pass', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const reject = createReject(forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'REJECT',
    user: 'chiefbiiko',
    peer: 'noop',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  var pending = 2

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  peerstream.once('data', notif => {
    t.same(notif, metadata, 'forwarded metadata to peer noop')
    t.equal(notif.tx, tx, 'transaction identifiers equal')
    if (!--pending) t.end()
  })

  reject(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('reject - fail pt1', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const reject = createReject(forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'CALLING',
    user: 'chiefbiiko',
    peer: 'noop',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  reject(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('reject - fail pt2', t => {
  const active_metastreams = streamSet()

  const forward = createForward(active_metastreams)
  const reject = createReject(forward)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const peerstream = jsonStream(new PassThrough())
  const metadata = {
    type: 'CALL',
    user: 'chiefbiiko',
    peer: 'poop',
    tx,
    unix_ts_ms: Date.now()
  }

  peerstream.whoami = 'noop'
  active_metastreams.add(peerstream)

  var pending = 2

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of an inactive/unknown receiver')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  peerstream.once('data', notif => {
    t.fail('should be unreachable')
  })

  reject(metastream, metadata, err => {
    t.true(err.message.includes('can\'t forward'))
    t.end()
  })
})

tape('getPeers - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const getPeers = createGetPeers(db, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_PEERS',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  logged_in_users.add('noop')

  const chiefbiiko = {
    password: '...',
    peers: [ 'noop', 'og' ],
    status: 'offline',
    avatar: '...'
  }

  db.put('chiefbiiko', chiefbiiko, err => {
    if (err) t.end(err)
    db.put('noop', { peers: [], status: 'noop', avatar: '...' }, err => {
      if (err) t.end(err)
      db.put('og', { peers: [], status: 'busy', avatar: '...' }, err => {
        if (err) t.end(err)

        const expected = {
          noop: { status: 'noop', online: true, avatar: '...' },
          og: { status: 'busy', online: false, avatar: '...' }
        }

        metastream.once('data', res => {
          t.true(valid.schema_RESPONSE(res), 'valid response schema')
          t.true(res.ok, 'response status ok')
          t.true(res.peers.constructor === Object, 'pojo')
          t.same(res.peers, expected, 'peer n status n online')
          t.equal(res.tx, tx, 'transaction identifiers equal')
          t.end()
        })

        getPeers(metastream, metadata, err => {
          if (err) t.end(err)
        })
      })
    })
  })
})

tape('getPeers - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const getPeers = createGetPeers(db, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_PEERS',
    username: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  getPeers(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('getPeers - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const getPeers = createGetPeers(db, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_PEERS',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of a db error (notFound)')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  getPeers(metastream, metadata, err => {
    t.ok(err.notFound, 'db triggered cb err not found')
    t.end()
  })
})

tape('getPeers - fail pt3', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const logged_in_users = new Set()

  const getPeers = createGetPeers(db, logged_in_users)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_PEERS',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  db.put('chiefbiiko', { peers: [ 'noop', 'og' ], status: 'out' }, err => {
    if (err) t.end(err)
    db.put('noop', { peers: [], status: 'home' }, err => {
      if (err) t.end(err)
      db.put('og_maco', { peers: [], status: 'busy' }, err => {
        if (err) t.end(err)

        metastream.once('data', res => {
          t.true(valid.schema_RESPONSE(res), 'valid response schema')
          t.false(res.ok, 'response status not ok...')
          t.comment('...bc of a db error (notFound)')
          t.equal(res.tx, tx, 'transaction identifiers equal')
        })

        getPeers(metastream, metadata, err => {
          t.ok(err.notFound, 'db triggered cb err not found')
          t.end()
        })
      })
    })
  })
})

tape('getUser - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getUser = createGetUser(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_USER',
    user: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  const chiefbiiko = {
    password: '...',
    peers: [ 'noop', 'og' ],
    status: 'offline',
    avatar: '...'
  }

  db.put('chiefbiiko', chiefbiiko, err => {
    if (err) t.end(err)

    const expected = {
      peers: [ 'noop', 'og' ],
      status: 'offline',
      avatar: '...'
    }

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.true(res.ok, 'response status ok')
      t.true(res.user.constructor === Object, 'pojo')
      t.same(res.user, expected, 'expected user')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      t.end()
    })

    getUser(metastream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('getUser - fail pt1', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getUser = createGetUser(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_USER',
    usr: 'chiefbiiko',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...invalid schema')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  getUser(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('getUser - fail pt2', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const getUser = createGetUser(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'GET_USER',
    user: 'chief',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc of a db error (notFound)')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  getUser(metastream, metadata, err => {
    t.ok(err.notFound, 'db triggered cb err not found')
    t.end()
  })
})

tape('registerUser - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const registerUser = createRegisterUser(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'REGISTER',
    user: 'balou',
    password: 'kd',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.true(res.ok, 'response status ok')
    t.equal(res.tx, tx, 'transaction identifiers equal')
    db.get(metadata.user, (err, user) => {
      if (err) t.end(err)
      t.equal(user.password, metadata.password, 'password')
      t.end()
    })
  })

  registerUser(metastream, metadata, err => {
    if (err) t.end(err)
  })
})

tape('registerUser - fail pt1 - invalid metadata', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const registerUser = createRegisterUser(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'REGISTER',
    user: 'balou',
    tx,
    unix_ts_ms: Date.now()
  }

  metastream.once('data', res => {
    t.true(valid.schema_RESPONSE(res), 'valid response schema')
    t.false(res.ok, 'response status not ok...')
    t.comment('...bc request metadata was lacking prop "password"')
    t.equal(res.tx, tx, 'transaction identifiers equal')
  })

  registerUser(metastream, metadata, err => {
    t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
    t.end()
  })
})

tape('registerUser - fail pt2 - user already exists', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const registerUser = createRegisterUser(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'REGISTER',
    user: 'balou',
    password: 'kd',
    tx,
    unix_ts_ms: Date.now()
  }

  db.put('balou', { password: 'kd', peers: [], status: 'busy' }, err => {
    if (err) t.end(err)

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.false(res.ok, 'response status not ok...')
      t.comment('...user already exists')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    registerUser(metastream, metadata, err => {
      t.true(err.message.startsWith('cannot register'), 'registration error')
      t.end()
    })
  })
})

tape('addPeers - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const addPeers = createAddPeers(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'ADD_PEERS',
    user: 'balou',
    peers: [ 'mikey' ],
    tx,
    unix_ts_ms: Date.now()
  }

  const balou = { password: 'kd', peers: [], status: 'noop', avatar: '.' }
  const mikey = { password: 'lo', peers: [], status: 'noop', avatar: '.' }
  const expected = [ 'mikey' ]

  db.put('mikey', mikey, err => {
    if (err) t.end(err)
    db.put('balou', balou, err => {
      if (err) t.end(err)

      metastream.once('data', res => {
        t.true(valid.schema_RESPONSE(res), 'valid response schema')
        t.equal(res.tx, tx, 'transaction identifiers equal')
        t.true(res.ok, 'response status ok')
        db.get(metadata.user, function (err, user) {
          if (err) t.end(err)
          t.same(user.peers, expected, 'peers in db')
          t.end()
        })
      })

      addPeers(metastream, metadata, err => {
        if (err) t.end(err)
      })
    })
  })
})

tape('addPeers - fail pt1 - invalid metadata', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const addPeers = createAddPeers(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'ADD_PEERS',
    user: 'balou',
    tx,
    unix_ts_ms: Date.now()
  }

  db.put('balou', { password: 'kd', peers: [ 'og' ], status: 'noop' }, err => {
    if (err) t.end(err)

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.false(res.ok, 'response status not ok')
      t.comment('... metadata is missing prop peers')
      t.equal(res.tx, tx, 'transaction identifiers equal')
    })

    addPeers(metastream, metadata, err => {
      t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
      t.end()
    })
  })
})

tape('deletePeers - pass', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

  const deletePeers = createDeletePeers(db)

  const tx = Math.random()
  const metastream = jsonStream(new PassThrough())
  const metadata = {
    type: 'DEL_PEERS',
    user: 'balou',
    peers: [ 'og' ],
    tx,
    unix_ts_ms: Date.now()
  }

  db.put('balou', { password: 'kd', peers: [ 'og' ], status: 'busy' }, err => {
    if (err) t.end(err)

    metastream.once('data', res => {
      t.true(valid.schema_RESPONSE(res), 'valid response schema')
      t.equal(res.tx, tx, 'transaction identifiers equal')
      t.true(res.ok, 'response status ok')
      db.get(metadata.user, function (err, user) {
        if (err) t.end(err)
        t.same(user.peers, [], 'peers deleted')
        t.end()
      })
    })

    deletePeers(metastream, metadata, err => {
      if (err) t.end(err)
    })
  })
})

tape('deletePeers - fail pt1 - invalid metadata', t => {
   const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))

   const deletePeers = createDeletePeers(db)

   const tx = Math.random()
   const metastream = jsonStream(new PassThrough())
   const metadata = {
     type: 'DEL_PEERS',
     user: 'balou',
     tx,
     unix_ts_ms: Date.now()
   }

   db.put('balou', { password: 'kd', peers: [ 'og' ], status: 'busy' }, err => {
     if (err) t.end(err)

     metastream.once('data', res => {
       t.true(valid.schema_RESPONSE(res), 'valid response schema')
       t.false(res.ok, 'response status not ok...')
       t.comment('...bc metadata is missing prop peers')
       t.equal(res.tx, tx, 'transaction identifiers equal')
     })

     deletePeers(metastream, metadata, err => {
       t.true(err.message.startsWith('invalid schema'), 'invalid schema err')
       t.end()
     })
   })
})

tape('handlePair - pass', t => {
  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const httpserver = createServer()

  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)

  const handlePair = createHandlePair(mediaserver, active_mediastreams)

  const a = 'chiefbiiko'
  const b = 'noop'
  const a_info = JSON.stringify({ user: a, peer: b, unix_ts_ms: Date.now() })
  const b_info = JSON.stringify({ user: b, peer: a, unix_ts_ms: Date.now() })

  const a_ws = websocket('ws://localhost:10001/media')
  const b_ws = websocket('ws://localhost:10001/media')

  const shutdown = () => {
    a_ws.destroy()
    b_ws.destroy()
    httpserver.close(t.end)
  }

  var pending = 2

  a_ws.on('error', t.end)
  b_ws.on('error', t.end)

  a_ws.on('data', chunk => {
    t.equal(chunk.toString(), 'noop', 'chiefbiiko got peer data')
    if (!--pending) shutdown()
  })

  b_ws.on('data', chunk => {
    t.equal(chunk.toString(), 'chiefbiiko', 'noop got peer data')
    if (!--pending) shutdown()
  })

  httpserver.on('upgrade', createHandleUpgrade(metaserver, mediaserver))
  httpserver.listen(10001, 'localhost')

  handlePair(a, b)

  a_ws.write(a_info, err => {
    if (err) t.end(err)
    a_ws.write('chiefbiiko', err => err && t.end(err))
  })

  b_ws.write(b_info, err => {
    if (err) t.end(err)
    b_ws.write('noop', err => err && t.end(err))
  })
})

tape('handlePair - fail pt1 - invalid schema', t => {
  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const httpserver = createServer()

  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)

  const handlePair = createHandlePair(mediaserver, active_mediastreams)

  const a = 'chiefbiiko'
  const b = 'noop'
  const a_info = JSON.stringify({ uname: a, peer: b, unix_ts_ms: Date.now() })
  const b_info = JSON.stringify({ user: b, pname: a, unix_ts_ms: Date.now() })

  const a_ws = websocket('ws://localhost:10001/media')
  const b_ws = websocket('ws://localhost:10001/media')

  a_ws.on('error', t.end)
  b_ws.on('error', t.end)

  a_ws.on('data', chunk => t.fail('should be unreachable'))
  b_ws.on('data', chunk => t.fail('should be unreachable'))

  httpserver.on('upgrade', createHandleUpgrade(metaserver, mediaserver))
  httpserver.listen(10001, 'localhost')

  handlePair(a, b)

  setTimeout(() => {
    t.pass('did not get any unintended fails so far')
    a_ws.destroy()
    b_ws.destroy()
    httpserver.close(t.end)
  }, 500)

  a_ws.write(a_info, err => err && t.end(err))
  b_ws.write(b_info, err => err && t.end(err))
})

tape('handlePair - fail pt2 - no pair', t => {
  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const httpserver = createServer()

  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)

  const handlePair = createHandlePair(mediaserver, active_mediastreams)

  const a = 'chiefbiiko'
  const b = 'noop'
  const a_info = JSON.stringify({ user: a, peer: b, unix_ts_ms: Date.now() })
  const b_info = JSON.stringify({ user: b, peer: a, unix_ts_ms: Date.now() })

  const a_ws = websocket('ws://localhost:10001/media')
  const b_ws = websocket('ws://localhost:10001/media')

  a_ws.on('error', t.end)
  b_ws.on('error', t.end)

  a_ws.on('data', chunk => t.fail('should be unreachable'))
  b_ws.on('data', chunk => t.fail('should be unreachable'))

  httpserver.on('upgrade', createHandleUpgrade(metaserver, mediaserver))
  httpserver.listen(10001, 'localhost')

  handlePair(a, 'oj pic')

  setTimeout(() => {
    t.pass('did not get any unintended fails so far')
    a_ws.destroy()
    b_ws.destroy()
    httpserver.close(t.end)
  }, 500)

  a_ws.write(a_info, err => err && t.end(err))
  b_ws.write(b_info, err => err && t.end(err))
})

tape('unpair - pass', t => {
  t.comment('this test case establishes a media con between 2 peers, ' +
            'with one of them sending an unpair msg after some data has ' +
            'been exchanged. after an ok response for the unpair msg no more' +
            'data should become readable on any of the websockets...')

  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const httpserver = createServer()

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handlePair = createHandlePair(mediaserver, active_mediastreams)
  const handleMetadata = createHandleMetadata({
    whoami: createWhoami(active_metastreams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db, logged_in_users),
    getUser: createGetUser(db),
    login: createLogin(db, logged_in_users, forward),
    logout: createLogout(db, logged_in_users, forward),
    status: createStatus(db, active_metastreams, forward),
    call: createCall(forward),
    stopRinging: createStopRinging(forward),
    accept: createAccept(metaserver, forward, sendForceCall),
    reject: createReject(forward),
    unpair: createUnpair(metaserver, forward)
  }, logged_in_users)

  httpserver.on('upgrade', createHandleUpgrade(metaserver, mediaserver))
  httpserver.listen(10001, 'localhost')

  metaserver.on('unpair', createHandleUnpair(active_mediastreams))

  const a = 'chiefbiiko'
  const b = 'noop'
  const a_info = JSON.stringify({ user: a, peer: b, unix_ts_ms: Date.now() })
  const b_info = JSON.stringify({ user: b, peer: a, unix_ts_ms: Date.now() })

  const a_ws = websocket('ws://localhost:10001/media')
  const b_ws = websocket('ws://localhost:10001/media')

  const done = () => {
    const a_metastream = jsonStream(new PassThrough())
    const b_metastream = jsonStream(new PassThrough())

    const WHOAMI_MSG_A = {
      type: 'WHOAMI',
      user: 'chiefbiiko',
      tx: Math.random(),
      unix_ts_ms: Date.now()
    }

    const WHOAMI_MSG_B = {
      type: 'WHOAMI',
      user: 'noop',
      tx: Math.random(),
      unix_ts_ms: Date.now()
    }

    const LOGIN_MSG = {
      type: 'LOGIN',
      user: 'chiefbiiko',
      password: 'abc',
      tx: Math.random(),
      unix_ts_ms: Date.now()
    }

    const tx = Math.random()
    const UNPAIR_MSG = {
      type: 'UNPAIR',
      user: 'chiefbiiko',
      peer: 'noop',
      tx,
      unix_ts_ms: Date.now()
    }

    a_metastream.on('data', res => {
      switch (res.for)  {
        case 'WHOAMI':
          t.true(valid.schema_RESPONSE(res), 'res is valid schema RESPONSE')
          t.true(res.ok, 'res status ok')
          break
        case 'LOGIN':
          t.true(valid.schema_RESPONSE(res), 'res is valid schema RESPONSE')
          t.true(res.ok, 'res status ok')
          break
        case 'UNPAIR':
          t.true(valid.schema_RESPONSE(res), 'res is valid schema RESPONSE')
          t.true(res.ok, 'res status ok')
          t.equal(res.tx, tx, 'transaction identifiers equal')
          a_ws.on('data', _ => t.fail('media_stream unstopped'))
          b_ws.on('data', _ => t.fail('media_stream unstopped'))
          setTimeout(() => httpserver.close(t.end), 750)
          break
        default: t.fail('should be unreachable')
      }
    })

    handleMetadata(a_metastream, WHOAMI_MSG_A)
    setTimeout(() => {
      handleMetadata(b_metastream, WHOAMI_MSG_B)
      setTimeout(() => {
        handleMetadata(a_metastream, LOGIN_MSG)
        setTimeout(() => {
          handleMetadata(a_metastream, UNPAIR_MSG)
        }, 250)
      }, 250)
    }, 250)
  }

  db.put('chiefbiiko', { password: 'abc', peers: [], status: 'busy' }, err => {
    if (err) t.end(err)

    var data_pending = 10
    var a_interval, b_interval

    a_ws.once('error', err => {
      clearInterval(a_interval)
      clearInterval(b_interval)
      t.equal(err.message, 'write after end', 'write after end err')
      a_ws.on('error', t.end)
    })

    b_ws.once('error', err => {
      clearInterval(a_interval)
      clearInterval(b_interval)
      t.equal(err.message, 'write after end', 'write after end err')
      b_ws.on('error', t.end)
    })

    a_ws.on('data', chunk => {
      t.equal(chunk.toString(), 'noop', 'chiefbiiko got peer data')
      if (!--data_pending) done()
    })

    b_ws.on('data', chunk => {
      t.equal(chunk.toString(), 'chiefbiiko', 'noop got peer data')
      if (!--data_pending) done()
    })

    handlePair(a, b)

    a_ws.write(a_info, err => {
      if (err) t.end(err)
      a_interval = setInterval(() => a_ws.write('chiefbiiko'), 250).unref()
    })

    b_ws.write(b_info, err => {
      if (err) t.end(err)
      b_interval = setInterval(() => b_ws.write('noop'), 250).unref()
    })
  })
})

tape('unpair - fail - invalid metadata', t => {
  const db = levelup(enc(memdown('./users.db'), { valueEncoding: 'json' }))
  const active_metastreams = streamSet()
  const active_mediastreams = hashtagStreamSet(willDeleteMediastreams)
  const logged_in_users = new Set()

  const WEBSOCKET_SERVER_OPTS = { perMessageDeflate: false, noServer: true }
  const metaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const mediaserver = new WebSocketServer(WEBSOCKET_SERVER_OPTS)
  const httpserver = createServer()

  const forward = createForward(active_metastreams)
  const sendForceCall = createSendForceCall(active_metastreams)

  const handlePair = createHandlePair(mediaserver, active_mediastreams)
  const handleMetadata = createHandleMetadata({
    whoami: createWhoami(active_metastreams),
    registerUser: createRegisterUser(db),
    addPeers: createAddPeers(db),
    deletePeers: createDeletePeers(db),
    getPeers: createGetPeers(db, logged_in_users),
    getUser: createGetUser(db),
    login: createLogin(db, logged_in_users, forward),
    logout: createLogout(db, logged_in_users, forward),
    status: createStatus(db, active_metastreams, forward),
    call: createCall(forward),
    stopRinging: createStopRinging(forward),
    accept: createAccept(metaserver, forward, sendForceCall),
    reject: createReject(forward),
    unpair: createUnpair(metaserver, forward)
  }, logged_in_users)

  httpserver.on('upgrade', createHandleUpgrade(metaserver, mediaserver))
  httpserver.listen(10001, 'localhost')

  const a = 'chiefbiiko'
  const b = 'noop'
  const a_info = JSON.stringify({ user: a, peer: b, unix_ts_ms: Date.now() })
  const b_info = JSON.stringify({ user: b, peer: a, unix_ts_ms: Date.now() })

  const a_ws = websocket('ws://localhost:10001/media')
  const b_ws = websocket('ws://localhost:10001/media')

  const done = () => {
    const metastream = jsonStream(new PassThrough())

    const WHOAMI_MSG = {
      type: 'WHOAMI',
      user: 'chiefbiiko',
      tx: Math.random(),
      unix_ts_ms: Date.now()
    }

    const LOGIN_MSG = {
      type: 'LOGIN',
      user: 'chiefbiiko',
      password: 'abc',
      tx: Math.random(),
      unix_ts_ms: Date.now()
    }

    const tx = Math.random()
    const UNPAIR_MSG = { // missing prop "peer"
      type: 'UNPAIR',
      user: 'chiefbiiko',
      tx,
      unix_ts_ms: Date.now()
    }

    metastream.on('data', res => {
      switch (res.for)  {
        case 'WHOAMI':
          t.true(valid.schema_RESPONSE(res), 'res is valid schema RESPONSE')
          t.true(res.ok, 'res status ok')
          break
        case 'LOGIN':
          t.true(valid.schema_RESPONSE(res), 'res is valid schema RESPONSE')
          t.true(res.ok, 'res status ok')
          break
        case 'UNPAIR':
          t.true(valid.schema_RESPONSE(res), 'res is valid schema RESPONSE')
          t.false(res.ok, 'res status not ok...')
          t.comment('...invalid metadata')
          t.equal(res.tx, tx, 'transaction identifiers equal')
          a_ws.on('data', _ => t.pass('chiefbiiko\'s media_stream unstopped'))
          b_ws.on('data', _ => t.pass('noop\'s media_stream unstopped'))
          setTimeout(() => {
            a_ws.destroy()
            b_ws.destroy()
            httpserver.close(t.end)
          }, 750)
          break
        default: t.fail('should be unreachable')
      }
    })

    handleMetadata(metastream, WHOAMI_MSG)
    setTimeout(() => {
      handleMetadata(metastream, LOGIN_MSG)
      setTimeout(() => {
        handleMetadata(metastream, UNPAIR_MSG)
      }, 250)
    }, 250)
  }

  db.put('chiefbiiko', { password: 'abc', peers: [], status: 'busy' }, err => {
    if (err) t.end(err)

    var data_pending = 10
    var a_interval, b_interval

    a_ws.once('error', err => {
      clearInterval(a_interval)
      clearInterval(b_interval)
      t.equal(err.message, 'write after end', 'write after end err')
      a_ws.on('error', t.end)
    })

    b_ws.once('error', err => {
      clearInterval(a_interval)
      clearInterval(b_interval)
      t.equal(err.message, 'write after end', 'write after end err')
      b_ws.on('error', t.end)
    })

    a_ws.on('data', chunk => {
      t.equal(chunk.toString(), 'noop', 'chiefbiiko got peer data')
      if (!--data_pending) done()
    })

    b_ws.on('data', chunk => {
      t.equal(chunk.toString(), 'chiefbiiko', 'noop got peer data')
      if (!--data_pending) done()
    })

    handlePair(a, b)

    a_ws.write(a_info, err => {
      if (err) t.end(err)
      a_interval = setInterval(() => a_ws.write('chiefbiiko'), 250).unref()
    })

    b_ws.write(b_info, err => {
      if (err) t.end(err)
      b_interval = setInterval(() => b_ws.write('noop'), 250).unref()
    })
  })
})

tape('willDeleteMediastreams', t => {
  const fading_streams = [ new PassThrough(), new PassThrough() ]
  willDeleteMediastreams('#alice-bob', fading_streams, () => {
    t.true(fading_streams.every(stream => stream.destroyed), 'streams dead')
    t.end()
  })
})
