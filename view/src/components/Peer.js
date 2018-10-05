import React from 'react'

const PeerHeader = props => (
  <div>
    <strong>{ props.name }</strong>&nbsp;
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
    return <button onClick={ props.stopRinging }>Hang up</button>
  if (!props.calling && !props.outbound_ringing)
    return <button onClick={ props.call }>Call</button>
}

const PeerButtons = props => {
  if (!props.online) return null // TODO: render some fun placeholder
  if (props.inbound_ringing) return <AcceptRejectButtons { ...props } />
  if (!props.inbound_ringing) return <CallOrHangUpButton { ...props } />
}

const peer_style = {}

export default function Peer (props) {
  return (
    <div style={ peer_style }>
      <PeerHeader { ...props } />
      <PeerButtons { ...props } />
      { props.video }
    </div>
  )
}
