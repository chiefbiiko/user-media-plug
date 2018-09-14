import React, { Component } from 'react'
import { connect } from 'react-redux'

import './App.css'

class App extends Component {

  // componentDidMount () {
  //   setTimeout(() => {
  //     this.props.crashApp(Error('fatal error'))
  //   }, 3000)
  // }

  render () {
    if (this.props.crashed) return <div>Damn, app crashed...</div>
    return (
      <div className="App">Cool app stuff</div>
    )
  }

}

const mapStateToProps = state => ({ crashed: state.crashed })

// const mapDispatchToProps = dispatch => ({
//   crashApp: bindActionCreators(createCrashAction, dispatch)
// })

export default connect(mapStateToProps)(App)
