import React from 'react'
import { Provider } from 'react-redux'
import store from './store'
import { Page } from './components'

const App = <Provider store={ store }><Page /></Provider>

export default App
