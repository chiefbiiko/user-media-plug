import React from 'react'

const peer_style = {}

export default function Peer (props) {
  const {
    call,
    accept,
    reject,
    unpair,
    being_ringed,
    ringing,
    calling,
    peer,
    status,
    online
  } = props
  return (
    <div style={ peer_style }>
      <strong>{ peer }</strong>&nbsp;
      <span>{ online ? 'ONLINE' : 'OFFLINE' }</span><br />
      <em>{ status }</em><br />
      {
        being_ringed
          ? <div>
              <button onClick={ accept }>Accept</button>
              <button onClick={ reject }>Reject</button>
            </div>
          : <div>
              <button onClick={ calling ? unpair : ringing ? null : call }>
                { calling ? 'Hang up' : ringing ? '...' : 'Call' }
              </button>
            </div>
      }
    </div>
  )
}
