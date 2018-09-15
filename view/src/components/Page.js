import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { createCrashAction } from './../actions'

const page_style = { textAlign: 'center' }

class Page extends Component {
  componentDidCatch (err) {
    this.props.crashApp(err)
  }
  render () {
    return this.props.crashed
      ? 'Damn, app crashed'
      : <div style={ page_style }>single page</div>
  }
}

const mapStateToProps = state => ({ crashed: state.crashed })
const mapDispatchToProps = dispatch =>
  ({ crashApp: bindActionCreators(createCrashAction, dispatch) })

export default connect(mapStateToProps, mapDispatchToProps)(Page)
