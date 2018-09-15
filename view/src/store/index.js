import { createStore, applyMiddleware, bindActionCreators } from 'redux'
import thunk from 'redux-thunk'
import clientele from 'clientele/promised'
import rootReducer from './../reducers'

const client = clientele('ws://localhost:10000')

const store = createStore(
  rootReducer,
  applyMiddleware(thunk.withExtraArgument({ client }))
)

// client events: call status online offline videostream
// client.on('call', msg => {
//   store.dispatch(createInboundCallAction({ ...msg, type: 'INBOUND_CALL'}))
// })

export default store
