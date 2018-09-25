import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { createCrashAction } from './../actions'
import { Gate, Peers, Profile } from '.'

const page_style = { textAlign: 'center' }

class SinglePage extends Component {
  componentDidCatch (err) {
    this.props.crashApp(err)
  }
  render () {
    return (
      <div style={ page_style }>
        {
          this.props.crashed
            ? 'Damn, app crashed' // REFACTOR below
            : <div><Gate />{ this.props.logged_in ? <Profile /> : null }</div>
        }
        <ToastContainer autoClose={ 2000 } />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  crashed: state.crashed,
  logged_in: state.logged_in
})

const mapDispatchToProps = dispatch =>
  ({ crashApp: compose(dispatch, createCrashAction) })

export default connect(mapStateToProps, mapDispatchToProps)(SinglePage)
