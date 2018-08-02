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
{ type: 'whoami', user: id }
```

##### Schema A

**_userA wants to be registered, so userA writes:_**

``` js
{ type: 'reg-user', user: id, peers: [] }
```

**_userA wants userB..Z be persisted as peers, so userA writes:_**

``` js
{ type: 'add-peers', user: id, peers: [] }
```

**_userA wants userB..Z be discarded as peers, so userA writes:_**

``` js
{ type: 'del-peers', user: id, peers: [] }
```

##### Schema B

**_userA wants to go online, so userA writes:_**

``` js
{ type: 'online', user: id }
```

**_userA wants to go offline, so userA writes:_**

``` js
{ type: 'offline', user: id }
```

#### Client messages with responses

##### Schema C

**_userA wants to call userB, so userA writes:_**

``` js
{ type: 'call', user: id, peer: id }
```

**_userB wants to accept userA, so userB writes:_**

``` js
{ type: 'accept', user: id, peer: id }
```

**_userB wants to reject userA, so userB writes:_**

``` js
{ type: 'reject', user: id, peer: id }
```

##### Schema D

**_userA wants to get its online peers, so userA writes:_**

``` js
{ type: 'peers-online', user: id }
```

#### Server messages

##### Schema E

**_server responds to "online-peers" message with:_**

``` js
{ type: 'peers-online', tx: id, peersOnline: [] }
```

##### Schema F

**_server wants to force a client to call a peer:_** ???????

``` js
{ type: 'force-call', peer: id }
```
