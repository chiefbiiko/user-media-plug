import React from 'react'
import { Provider } from 'react-redux'
import { compose } from 'redux'
// import store from './store'
import configureStore from './store'
import { SinglePage } from './components'
import clientele from 'clientele/promised'

// const client = clientele('ws://localhost:10000')
// const store = configureStore(client)
//
// client.on('call', compose(dispatch, craftInboundCallAction))
//   .on('stop-ringing', compose(dispatch, craftInboundStopRingingAction))
//   .on('accept', compose(dispatch, craftInboundAcceptAction))
//   .on('reject', compose(dispatch, craftInboundRejectAction))
//   .on('unpair', compose(dispatch, craftInboundUnpairAction))
//   .on('status', compose(dispatch, craftPeerStatusAction))
//   .on('avatar', compose(dispatch, craftPeerAvatarAction))
//   .on('online', compose(dispatch, craftPeerOnlineAction))
//   .on('offline', compose(dispatch, craftPeerOfflineAction))
  // .on('videostream', video => { /* show da video element on ui */ })

// const ReduxApp = <Provider store={ store }><SinglePage /></Provider>

class ReduxApp extends React.Component {
  constructor (props) {
    super(props)
    this.state = { videos: [] }

    this._client = clientele('ws://localhost:10000')
    this._store = configureStore(this._client)
    const dispatch = this._store.dispatch

    this._client
      .on('call', compose(dispatch, craftInboundCallAction))
      .on('stop-ringing', compose(dispatch, craftInboundStopRingingAction))
      .on('accept', compose(dispatch, craftInboundAcceptAction))
      .on('reject', compose(dispatch, craftInboundRejectAction))
      .on('unpair', compose(dispatch, craftInboundUnpairAction))
      .on('status', compose(dispatch, craftPeerStatusAction))
      .on('avatar', compose(dispatch, craftPeerAvatarAction))
      .on('online', compose(dispatch, craftPeerOnlineAction))
      .on('offline', compose(dispatch, craftPeerOfflineAction))
      .on('videostream', video => {
        this.setState((prev_state, props) => ({
          videos: [ ...prev_state.videos, video ]
        }))
      })
  }
  render () {
    return (
      <Provider store={ this._store }>
        <SinglePage videos={ this.state.videos }></SinglePage>
      </Provider>
    )
  }
}
// r render-props an alternative?

export default ReduxApp
