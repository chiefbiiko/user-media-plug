# user-media-plug

## TODO

+ a metadataserver that emits 'pair' and 'unpair' events
+ a mediadataserver that dis/connects peers according to the events above
+ a simple client api

## Design

`user-media-plug` has 3 data layers:

+ dynamic mediadata
+ dynamic metadata
+ static user data

### Static user data

Persisted in a JSON file on the server.

``` js
{ [userIdA]: { peers: [ userIdB, userIdC ] }, ... }
```

### Dynamic metadata

The metadata server primarily acts as a broker that forwards messages between peers.

Some metadata messages require a response from a receiving end, whereas others do not.

Metadata is exchanged via events/messages. These are plain, non-nested objects that must have a `type` property, plus event-specific additional data.

#### Client messages without responses

##### Schema Z

**_userA wants to identify itself, so userA writes:_**

``` js
{ type: 'whoami', user: id, tx: random }
```

##### Schema A

**_userA wants to be registered, so userA writes:_**

``` js
{ type: 'reg-user', user: 'userA', peers: [], tx: random }
```

**_userA wants userB..Z be persisted as peers, so userA writes:_**

``` js
{ type: 'add-peers', user: 'userA', peers: [], tx: random }
```

**_userA wants userB..Z be discarded as peers, so userA writes:_**

``` js
{ type: 'del-peers', user: 'userA', peers: [], tx: random }
```

##### Schema F

**_userA wants to change status, so userA writes:_**

``` js
{ type: 'status', user: 'userA', status: 'online' }
```

#### Client messages with responses

##### Schema C

**_userA wants to call userB, so userA writes:_**

``` js
{ type: 'call', user: 'userA', peer: 'userB' }
```

**_userB wants to accept userA, so userB writes:_**

``` js
{ type: 'accept', user: 'userB', peer: 'userA' }
```

**_userB wants to reject userA, so userB writes:_**

``` js
{ type: 'reject', user: 'userB', peer: 'userA' }
```

##### Schema B

**_userA wants to get its peers, so userA writes:_**

``` js
{ type: 'peers', user: 'userA' }
```

**_userA wants to get its online peers, so userA writes:_**

``` js
{ type: 'peers-online', user: 'userA' }
```

#### Server messages

##### Schema D

**_server responds to "peers-online" message with:_**

``` js
{ type: 'peers-online', peers_online: [] }
```

**_server responds to "peers" message with:_**

``` js
{ type: 'peers', peers: [] }
```

**_server respondes to any response-demanding message with:_**

``` js
{ type: 'res', for: 'xyz' tx: random, ok: true|false } // + optional fields
```

##### Schema E

**_server wants to force a client to call a peer:_** ???????

``` js
{ type: 'force-call', peer: 'peerX' }
```
