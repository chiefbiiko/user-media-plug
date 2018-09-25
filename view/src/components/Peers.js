import React from 'react'
import { connect } from 'react-redux'
import { compose } from 'redux'
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
  call: compose(dispatch, createOutboundCallAction),
  stopRinging: compose(dispatch, createOutboundStopRingingAction),
  accept: compose(dispatch, createOutboundAcceptAction),
  reject: compose(dispatch, createOutboundRejectAction),
  unpair: compose(dispatch, createOutboundUnpairAction),
  syncPeers: compose(dispatch, createSyncPeersAction)
})

export default connect(mapStateToProps, mapDispatchToProps)(Peers)
