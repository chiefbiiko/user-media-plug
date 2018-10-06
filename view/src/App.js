import React from 'react'
import { Provider } from 'react-redux'
import { compose } from 'redux'
import store from './store'
import { SinglePage } from './components'
import clientele from 'clientele/promised'

const App = <Provider store={ store }><SinglePage /></Provider>

export default App
