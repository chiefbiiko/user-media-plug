import React from 'react'
import { Provider } from 'react-redux'
import { compose } from 'redux'
// import store from './store'
import configureStore from './store'
import { SinglePage } from './components'
import clientele from 'clientele/promised'

const client = clientele('ws://localhost:10000')
const store = configureStore(client)

client.on('call', compose(store.dispatch, craftInboundCallAction))
  .on('stop-ringing', compose(store.dispatch, craftInboundStopRingingAction))
  .on('accept', compose(store.dispatch, craftInboundAcceptAction))
  .on('reject', compose(store.dispatch, craftInboundRejectAction))
  .on('unpair', compose(store.dispatch, craftInboundUnpairAction))
  .on('status', compose(store.dispatch, craftPeerStatusAction))
  .on('avatar', compose(store.dispatch, craftPeerAvatarAction))
  .on('online', compose(store.dispatch, craftPeerOnlineAction))
  .on('offline', compose(store.dispatch, craftPeerOfflineAction))
  .on('videostream', video => { /* show da video element on ui */ })

const ReduxApp = <Provider store={ store }><SinglePage /></Provider>

export default ReduxApp
