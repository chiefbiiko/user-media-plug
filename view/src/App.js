import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { createCrashAction } from './actions/index.js'

import './App.css'

class App extends Component {
  componentDidCatch (err) {
    this.props.crashApp(err)
  }
  render () {
    return (
      <div className="App">
        { this.props.crashed ? 'Damn, app crashed' : this.props.children }
      </div>
    )
  }
}

const mapStateToProps = state => ({ crashed: state.crashed })
const mapDispatchToProps = dispatch => ({
  crashApp: bindActionCreators(createCrashAction, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
