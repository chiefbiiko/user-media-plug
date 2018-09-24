import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, compose } from 'redux'
import { createUserAvatarAction, createUserStatusAction } from './../actions'

const profile_style = {}

const Profile = ({ avatar, status, chooseAvatar, setStatus }) => (
  <div style={ profile_style }>
    <img src={ avatar } alt='avatar' onDrop={ setAvatar } />
    <div contentEditable onBlur={ setStatus }>{ status }</div>
  </div>
)

const mapStateToProps = state => ({
  avatar: state.avatar,
  status: state.status
})

const mapDispatchToProps = dispatch => ({
  setAvatar: null,
  setStatus: compose(dispatch, createUserStatusAction, e => e.target.value)
})

const setAvatar = e => { // TODO
  // open a file reader
  // get a filename
  // read that file to a base64 datauri
  // dispatch that
  e.stopPropagation()
  e.preventDefault()
  const pic = e.dataTransfer.files[0]
  if (pic) null
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile)
