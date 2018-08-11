# user-media-plug design

**TODO**

+ a metadataserver that emits 'pair' and 'unpair' events
+ a mediadataserver that dis/connects peers according to the events above
+ a simple client api

`user-media-plug` has 3 data layers:

+ dynamic mediadata
+ dynamic metadata
+ static user data

## Static user data

Lives in an abstract-leveldown compliant store, with levelup as db interface.

Database schema:

``` js
{ userA: { password: 'sesameopen', peers: [ 'userB', 'userC' ] }, ...userB_Z }
```

## Dynamic metadata

The metadata server acts as a broker that forwards messages between peers and orchestrates connection management.

All messages directed to the server get a response.

Metadata is exchanged via events/messages. These are plain, flat objects that must have a `type` property, plus event-specific additional data. All messages originating from a client must have a numeric `tx` property (transaction identifier).

### Client messages

#### Schema Z

**_userA wants to identify itself, so userA writes:_**

``` js
{ type: 'whoami', user: id, tx: Math.random() }
```

#### Schema A

**_userA wants to be registered, so userA writes:_**

``` js
{ type: 'reg-user', user: 'userA', peers: [], tx: Math.random() }
```

**_userA wants userB..Z be persisted as peers, so userA writes:_**

``` js
{ type: 'add-peers', user: 'userA', peers: [], tx: Math.random() }
```

**_userA wants userB..Z be discarded as peers, so userA writes:_**

``` js
{ type: 'del-peers', user: 'userA', peers: [], tx: Math.random() }
```

#### Schema F

**_userA wants to change status, so userA writes:_**

``` js
{ type: 'status', user: 'userA', status: 'online', tx: Math.random() }
```

#### Schema C

**_userA wants to call userB, so userA writes:_**

``` js
{ type: 'call', user: 'userA', peer: 'userB', tx: 0.4194567419 }
```

**_userB wants to accept userA, so userB writes:_**

``` js
{ type: 'accept', user: 'userB', peer: 'userA', tx: 0.4194567419 }
```

**_userB wants to reject userA, so userB writes:_**

``` js
{ type: 'reject', user: 'userB', peer: 'userA', tx: 0.4194567419 }
```

#### Schema B

**_userA wants to get its peers, so userA writes:_**

``` js
{ type: 'peers', user: 'userA', tx: Math.random() }
```

**_userA wants to get its online peers, so userA writes:_**

``` js
// OBSOLETE...
{ type: 'peers-online', user: 'userA', tx: Math.random() }
```

### Server messages

#### Schema R

**_server respondes to all messages with:_**

``` js
{ type: 'res', for: 'xyz' tx: 0.1234567419, ok: true|false } // + optional fields
```

#### Schema F

**_server wants to force a client to call a peerX:_**

``` js
{ type: 'force-call', peer: 'peerX' }
```
