import React from 'react'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { toast } from 'react-toastify'
import { createUserAvatarAction, createUserStatusAction } from './../actions'

const profile_style = {}

const Profile = ({ avatar, status, setAvatar, setStatus }) => (
  <div style={ profile_style }>
    <img src={ avatar } alt='avatar'
      onDrop={ setAvatar }
      onDragOver={ mute }
      onDragEnter={ mute } />
    <div contentEditable onBlur={ setStatus }>{ status }</div>
  </div>
)

const mute = e => {
  e.stopPropagation()
  e.preventDefault()
}

const makeAvatar = (dispatchUserAvatar, e) => {
  mute(e)
  const file_reader = new FileReader()
  file_reader.onerror = _ => toast.error('setting avatar failed')
  file_reader.onload = () => dispatchUserAvatar(file_reader.result)
  file_reader.readAsDataURL(e.dataTransfer.files[0])
}

const mapStateToProps = state => ({
  avatar: state.avatar,
  status: state.status
})

const e2InnerText = e => e.target.innerText

const mapDispatchToProps = dispatch => ({
  setAvatar: makeAvatar.bind(null, compose(dispatch, createUserAvatarAction)),
  setStatus: compose(dispatch, createUserStatusAction, e2InnerText)
})

export default connect(mapStateToProps, mapDispatchToProps)(Profile)
