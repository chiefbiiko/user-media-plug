import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { toast } from 'react-toastify'
import { areTruthyStrings } from './../utils'
import {
  craftTogglePasswordVisibilityAction,
  createRegisterAction,
  createLoginAction,
  createLogoutAction
} from './../actions'

const gate_style = {}

class Gate extends Component {
  constructor (props) {
    super(props)
    this.name = React.createRef()
    this.pass = React.createRef()
    this.register = this.generic.bind(this, 'register')
    this.login = this.generic.bind(this, 'login')
    this.logout = this.generic.bind(this, 'logout')
  }
  componentDidMount () { // find a sibling that focuses on each display
    this.name.current.focus()
  }
  generic (method, e) {
    e.preventDefault()
    if (method === 'logout') return this.props[method]()
    if (!areTruthyStrings(this.name.current.value, this.pass.current.value))
      return toast.error('invalid name or password')
    // TODO: choose some cheap hash function and apply it rite here!
    this.props[method](this.name.current.value, this.pass.current.value)
  }
  render () {
    return (
     <div style={ gate_style }>
       {
         this.props.logged_in
           ? <button onClick={ this.logout }>Logout</button>
           : <div>
               <input placeholder='name' ref={ this.name }/>
               <input type={ this.props.password_visible ? 'text' : 'password' }
                 placeholder='password' ref={ this.pass }/>
               <button onClick={ this.register }>Register</button>
               <button onClick={ this.login }>Login</button>
               <button onClick={ this.props.togglePasswordVisibility }>
                 { this.props.password_visible ? 'Hide' : 'Show' } password
               </button>
             </div>
       }
     </div>
    )
  }
}

const mapStateToProps = state => ({
  logged_in: state.logged_in,
  password_visible: state.password_visible
})

const mapDispatchToProps = dispatch => ({
  register: bindActionCreators(createRegisterAction, dispatch),
  login: bindActionCreators(createLoginAction, dispatch),
  logout: bindActionCreators(createLogoutAction, dispatch),
  togglePasswordVisibility:
    bindActionCreators(craftTogglePasswordVisibilityAction, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Gate)
