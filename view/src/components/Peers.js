import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import TagsInput from 'react-tagsinput'
import 'react-tagsinput/react-tagsinput.css'
import Peer from './Peer.js'
import {
  createOutboundCallAction,
  createOutboundStopRingingAction,
  createOutboundAcceptAction,
  createOutboundRejectAction,
  createOutboundUnpairAction,
  createSyncPeersAction
} from './../actions'

const peers_style = {}

// TODO: fix allow deleting peers
const Peers = ({
  call,
  stopRinging,
  accept,
  reject,
  unpair,
  syncPeers,
  peer_names,
  peers
}) => (
  <div style={ peers_style }>
    <TagsInput
      value={ peer_names }
      onChange={ syncPeers }
      inputProps={ { placeholder: 'yo friend list' } }>
    </TagsInput>
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
          unpair={ unpair }>
        </Peer>
      ))
    }
  </div>
)

const mapStateToProps = state => ({
  peers: Object.entries(state.peers).map(([ k, v ]) => ({ ...v, name: k })),
  peer_names: Object.keys(state.peers)
})

const mapDispatchToProps = dispatch => ({
  call: bindActionCreators(createOutboundCallAction, dispatch),
  stopRinging: bindActionCreators(createOutboundStopRingingAction, dispatch),
  accept: bindActionCreators(createOutboundAcceptAction, dispatch),
  reject: bindActionCreators(createOutboundRejectAction, dispatch),
  unpair: bindActionCreators(createOutboundUnpairAction, dispatch),
  syncPeers: bindActionCreators(createSyncPeersAction, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Peers)
