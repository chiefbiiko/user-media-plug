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

// TODO: dipatch ALL client inbound events as equivalent actions

// client.on('call', bindActionCreators(craftInboundCallAction, store.dispatch))

export default store
