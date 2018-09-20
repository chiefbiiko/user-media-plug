import React from 'react'

// TODO: connect each Peer Component to the store to minimize rerenders!

const PeerHeader = props => (
  <div>
    <strong>{ props.peer }</strong>&nbsp;
    <span>{ props.online ? 'ONLINE' : 'OFFLINE' }</span>&nbsp;
    <em>{ props.status }</em>
  </div>
)

const AcceptRejectButtons = props => (
  <div>
    <button onClick={ props.accept }>Accept</button>
    <button onClick={ props.reject }>Reject</button>
  </div>
)

const CallOrHangUpButton = props => {
  if (props.calling)
    return <button onClick={ props.unpair }>Hang up</button>
  if (!props.calling && props.outbound_ringing)
    return <button onClick={ props.stopRinging }>Hang up</button></div>
  if (!props.calling && !props.outbound_ringing)
    return <button onClick={ props.call }>Call</button></div>
}

const PeerButtons = props => {
  if (!props.online) return null // render some fun placeholder
  if (props.inbound_ringing) return <AcceptRejectButtons { ...props } />
  if (!props.inbound_ringing) return <CallOrHangUpButton { ...props } />
}

const peer_style = {}

export default function Peer (props) {
  return (
    <div style={ peer_style }>
      <PeerHeader { ...props } />
      <PeerButtons { ...props } />
    </div>
  )
}
