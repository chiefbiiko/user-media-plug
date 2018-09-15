import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import clientele from 'clientele/promised'
import rootReducer from './reducers/index.js'

const enhancer = applyMiddleware(thunk.withExtraArgument({
  client: clientele('ws://localhost:10000')
}))

export default createStore(rootReducer, enhancer)
