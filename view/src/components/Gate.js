import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import {
  createRegisterAction,
  createLoginAction,
  createLogoutAction
} from './../actions'

const gate_style = {}

// TODO: make this work with idiomatic react

class Gate extends Component {
  constructor (props) {
    super(props)
    this.name_ref = React.createRef()
    this.pass_ref = React.createRef()
    this.handleRegisterClick = this.handleRegisterClick.bind(this)
  }
  handleRegisterClick () {
    this.props.login(this.name_ref.current.value, this.pass_ref.current.value)
  }
  render () {
    return (
     <div style={ gate_style }>
       {
         this.props.logged_in
           ? <button onclick={ this.props.logout() }>Logout</button>
           : 'gate wip'
             // <div>
             //   <input placeholder='name' ref={ this.name_ref }/>
             //   <input placeholder='password' ref={ this.pass_ref }/>
             //   <button onclick={ this.handleRegisterClick() }
             //   >Register</button>
             //   <button onclick={ null
             //     // this.props.login(this.name_ref.current.value, this.pass_ref.current.value)
             //   }
             //   >Login</button>
             // </div>
       }
     </div>
    )
  }
}

const mapStateToProps = state => ({ logged_in: state.logged_in })

const mapDispatchToProps = dispatch => ({
  register: bindActionCreators(createRegisterAction, dispatch),
  // register: (user, password) => dispatch(createRegisterAction(user, password)),
  login: bindActionCreators(createLoginAction, dispatch),
  // login: (user, password) => dispatch(createLoginAction(user, password)),
  logout: bindActionCreators(createLogoutAction, dispatch)
  // logout: () => dispatch(createLogoutAction()),
})

export default connect(mapStateToProps, mapDispatchToProps)(Gate)
