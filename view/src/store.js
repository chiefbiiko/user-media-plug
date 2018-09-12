import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import rootReducer from './reducers/index.js'
import clientele from './../clientele/index.js'

const enhancer = applyMiddleware(thunk.withExtraArgument({
  client: clientele('ws://localhost:10000')
}))

export default function configureStore () {
 return createStore(rootReducer, enhancer)
}
