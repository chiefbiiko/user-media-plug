import React from 'react'

const peer_style = {}

export default function Peer (props) {
  const {
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
  } = props
  return (
    <div style={ peer_style }>
      <strong>{ peer }</strong>&nbsp;
      <span>{ online ? 'ONLINE' : 'OFFLINE' }</span><br />
      <em>{ status }</em><br />
      {
        inbound_ringing
          ? <div>
              <button onClick={ accept }>Accept</button>
              <button onClick={ reject }>Reject</button>
            </div>
          : <div>
              <button onClick={ calling ? unpair : outbound_ringing ? stopRinging : call }>
                { calling ? 'Hang up' : outbound_ringing ? 'Hang Up' : 'Call' }
              </button>
            </div>
      }
    </div>
  )
}
