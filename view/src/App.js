import React from 'react'
import { Provider } from 'react-redux'
import store from './store'
import { SinglePage } from './components'

const App = <Provider store={ store }><SinglePage /></Provider>

export default App
