import React from 'react'

const peer_style = {}

export default function Peer (props) {
  const {
    call,
    accept,
    reject,
    unpair,
    being_called,
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
        being_called
          ? <div>
              <button onClick={ accept }>Accept</button>
              <button onClick={ reject }>Reject</button>
            </div>
          : <div>
              <button onClick={ calling ? unpair : call }>
                { calling ? 'Hang up' : 'Call' }
              </button>
            </div>
      }
    </div>
  )
}
