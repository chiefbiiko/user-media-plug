import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import Peer from './Peer.js'
import {
  createOutboundCallAction,
  createOutboundStopRingingAction,
  createOutboundAcceptAction,
  createOutboundRejectAction,
  createOutboundUnpairAction
} from './../actions'

const peers_style = {}

// TODO: addPeers, deletePeers functionality!
const Peers = ({ call, stopRinging, accept, reject, unpair, peers }) => (
  <div style={ peers_style }>
    {
      peers.map(peer => (
        <Peer
          key={ peer.name }
          name={ peer.name }
          online={ peer.online }
          status={ peer.status }
          calling={ peer.calling }
          inbound_ringing={ peer.inbound_ringing }
          outbound_ringing={ peer.outbound_ringing }
          call={ call }
          stopRinging={ stopRinging }
          accept={ accept }
          reject={ reject }
          unpair={ unpair } >
        </Peer>
      ))
    }
  </div>
)

const mapStateToProps = state => ({
  peers: Object.entries(state.peers).map(([ k, v ]) => ({ ...v, name: k }))
})

const mapDispatchToProps = dispatch => ({
  call: bindActionCreators(createOutboundCallAction, dispatch),
  stopRinging: bindActionCreators(createOutboundStopRingingAction, dispatch),
  accept: bindActionCreators(createOutboundAcceptAction, dispatch),
  reject: bindActionCreators(createOutboundRejectAction, dispatch),
  unpair: bindActionCreators(createOutboundUnpairAction, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Peers)
