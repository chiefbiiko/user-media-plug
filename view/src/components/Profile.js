import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { craftUserAvatarAction, craftUserStatusAction } from './../actions'

const profile_style = {}

const Profile = ({ avatar, status, chooseAvatar, setStatus }) => (
  <div style={ profile_style }>
    <img src={ avatar } alt='avatar' onClick={ chooseAvatar } />
    <div contentEditable onBlur={ setStatus }>{ status }</div>
  </div>
)

const mapStateToProps = state => ({
  avatar: state.avatar,
  status: state.status
})

const mapDispatchToProps = dispatch => ({
  chooseAvatar: null,
  setStatus: bindActionCreators(craftUserStatusAction, dispatch)
})

const chooseAvatar = () => { // TODO
  // open a file reader
  // get a filename
  // read that file to a base64 datauri
  // dispatch that
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile)
