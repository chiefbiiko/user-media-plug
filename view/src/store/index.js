import { applyMiddleware, compose, createStore } from 'redux'
import thunk from 'redux-thunk'
import clientele from 'clientele/promised'
import rootReducer from './../reducers'

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const client = clientele('ws://localhost:10000')

const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk.withExtraArgument({ client })))
)

client.on('call', compose(store.dispatch, craftInboundCallAction))
client.on('stop-ringing', compose(store.dispatch, craftInboundStopRingingAction))
client.on('accept', compose(store.dispatch, craftInboundAcceptAction))
client.on('reject', compose(store.dispatch, craftInboundRejectAction))
client.on('unpair', compose(store.dispatch, craftInboundUnpairAction))
client.on('status', compose(store.dispatch, craftPeerStatusAction))
client.on('avatar', compose(store.dispatch, craftPeerAvatarAction))
client.on('online', compose(store.dispatch, craftPeerOnlineAction))
client.on('offline', compose(store.dispatch, craftPeerOfflineAction))
client.on('videostream', video => { /* show da video element on ui */ })

export default store
