import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { createCrashAction } from './../actions/index.js'
import './Page.css'

class Page extends Component {
  componentDidCatch (err) {
    this.props.crashApp(err)
  }
  render () {
    const { children, crashed } = this.props
    return (
      <div className="Page">
        { crashed ? 'Damn, app crashed' : 'cool' }
      </div>
    )
  }
}

const mapStateToProps = state => ({ crashed: state.crashed })
const mapDispatchToProps = dispatch => ({
  crashApp: bindActionCreators(createCrashAction, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Page)
