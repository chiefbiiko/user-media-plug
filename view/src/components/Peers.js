import React, { Component } from 'react'
import Peer from './Peer.js'

const peers_style = {}

class Peers extends Component {
  render () {
    return (
      <div style={ peers_style }>

      </div>
    )
  }
}

const mapStateToProps = state => ({ peers: state.peers })

mapDispatchToProps = dispatch => ({
  call: null,
  stopRinging: null,
  accept: null,
  reject: null,
  unpair: null
})

export default connect(mapStateToProps, mapDispatchToProps)(Peers)
