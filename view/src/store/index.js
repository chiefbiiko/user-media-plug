import { createStore, applyMiddleware/*, bindActionCreators*/ } from 'redux'
import thunk from 'redux-thunk'
import clientele from 'clientele/promised'
import rootReducer from './../reducers'

const client = clientele('ws://localhost:10000')

const store = createStore(
  rootReducer,
  applyMiddleware(thunk.withExtraArgument({ client }))
)

// TODO: dipatch ALL client inbound events as equivalent actions

// client.on('call', bindActionCreators(craftInboundCallAction, store.dispatch))

export default store
