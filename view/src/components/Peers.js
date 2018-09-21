import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import Peer from './Peer.js'
// import { noop } from './../utils'
import {
  createOutboundCallAction,
  createOutboundStopRingingAction,
  createOutboundAcceptAction,
  createOutboundRejectAction,
  createOutboundUnpairAction
} from './../actions'

const peers_style = {}

// TODO: make this a function component and implement mapDispatchToProps
// class Peers extends Component {
//   render () {
//     return (
//       <div style={ peers_style }>
//
//       </div>
//     )
//   }
// }

const Peers = ({ call, stopRinging, accept, reject, unpair, peers }) => (
  <div style={ peers_style }>

  </div>
)

// maybe map the peers object to an array here ?
const mapStateToProps = state => ({ peers: state.peers })

mapDispatchToProps = dispatch => ({
  call: bindActionCreators(createOutboundCallAction, dispatch),
  stopRinging: bindActionCreators(createOutboundStopRingingAction, dispatch),
  accept: bindActionCreators(createOutboundAcceptAction, dispatch),
  reject: bindActionCreators(createOutboundRejectAction, dispatch),
  unpair: bindActionCreators(createOutboundUnpairAction, dispatch)
})

export default connect(noop, mapDispatchToProps)(Peers)
