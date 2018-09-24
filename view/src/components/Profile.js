import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, compose } from 'redux'
import { toast } from 'react-toastify'
import { createUserAvatarAction, createUserStatusAction } from './../actions'

const profile_style = {}

const Profile = ({ avatar, status, setAvatar, setStatus }) => (
  <div style={ profile_style }>
    <img src={ avatar } alt='avatar' onDrop={ setAvatar } />
    <div contentEditable onBlur={ setStatus }>{ status }</div>
  </div>
)

const setAvatar = (dispatchAvatar, e) => { // TODO
  // open a file reader
  // get a filename
  // read that file to a base64 datauri
  // dispatch that
  e.stopPropagation()
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  const file_reader = new FileReader()
  file_reader.readAsDataURL(file)
  file_reader.onload = () => {dispatchAvatar(file_reader.result);console.log(file_reader.result)}
  file_reader.onerror = _ => toast.error('setting avatar failed')
}

const mapStateToProps = state => ({
  avatar: state.avatar,
  status: state.status
})

const mapDispatchToProps = dispatch => ({
  setAvatar: setAvatar.bind(null, compose(dispatch, createUserAvatarAction)),
  setStatus: compose(dispatch, createUserStatusAction, e => e.target.value)
})

export default connect(mapStateToProps, mapDispatchToProps)(Profile)
