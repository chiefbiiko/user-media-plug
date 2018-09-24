import React from 'react'
import { connect } from 'react-redux'

const profile_style = {}

// TODO: make both editable...
const Profile = ({ avatar, status }) => (
  <div style={ profile_style }>
    <img src={ avatar } alt='avatar' />
    <div contentEditable>{ status }</div>
  </div>
)

const mapStateToProps = state => ({
  avatar: state.avatar,
  status: state.status
})

const mapDispatchToProps = dispatch => ({
  setAvatar: null,
  setStatus: null
})

export default connect(mapStateToProps, mapDispatchToProps)(Profile)
