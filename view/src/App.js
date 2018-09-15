import React from 'react'
import { Provider } from 'react-redux'
import store from './store.js'
import Page from './components/Page'

const App = <Provider store={ store }><Page/></Provider>

export default App
