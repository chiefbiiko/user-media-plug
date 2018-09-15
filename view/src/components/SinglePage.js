import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { createCrashAction } from './../actions'

const page_style = { textAlign: 'center' }

class SinglePage extends Component {
  componentDidCatch (err) {
    this.props.crashApp(err)
  }
  render () {
    return (
      <div style={ page_style }>
        { this.props.crashed ? 'Damn, app crashed' : 'single page' }
        <ToastContainer autoClose={ 2000 } />
      </div>
    )
  }
}

const mapStateToProps = state => ({ crashed: state.crashed })
const mapDispatchToProps = dispatch =>
  ({ crashApp: bindActionCreators(createCrashAction, dispatch) })

export default connect(mapStateToProps, mapDispatchToProps)(SinglePage)
