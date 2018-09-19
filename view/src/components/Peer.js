import React from 'react'

const PeerHeader = ({ peer, online, status }) => (
  <div>
    <strong>{ peer }</strong>&nbsp;
    <span>{ online ? 'ONLINE' : 'OFFLINE' }</span>&nbsp;
    <em>{ status }</em>
  </div>
)

const AcceptRejectButtons = ({ accept, reject }) => (
  <div>
    <button onClick={ accept }>Accept</button>
    <button onClick={ reject }>Reject</button>
  </div>
)

const CallOrHangUpButton = ({
  call,
  stopRinging,
  unpair,
  calling,
  outbound_ringing
}) => {
  if (calling)
    return <button onClick={ unpair }>Hang up</button>
  if (!calling && outbound_ringing)
    return <button onClick={ stopRinging }>Hang up</button></div>
  if (!calling && !outbound_ringing)
    return <button onClick={ call }>Call</button></div>
}

const peer_style = {}

export default function Peer ({
  call,
  stopRinging,
  accept,
  reject,
  unpair,
  peer,
  status,
  online,
  outbound_ringing,
  inbound_ringing,
  calling
}) {
  return (
    <div style={ peer_style }>
      <PeerHeader peer={ peer } status={ status } online={ online } />
      {
        inbound_ringing
          ? <AcceptRejectButtons accept={ accept } reject={ reject } />
          : <CallOrHangUpButton
              call={ call }
              stopRinging={ stopRinging }
              unpair={ unpair }
              calling={ calling }
              outbound_ringing={ outbound_ringing } />
      }
    </div>
  )
}
