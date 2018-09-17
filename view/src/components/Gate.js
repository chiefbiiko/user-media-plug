import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { toast } from 'react-toastify'
import { areTruthyStrings } from './../utils'
import {
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
    this.togglePassword = this.togglePassword.bind(this)
    this.register = this.generic.bind(this, 'register')
    this.login = this.generic.bind(this, 'login')
    this.logout = this.generic.bind(this, 'logout')
  }
  componentDidMount () {
    this.name.current.focus()
  }
  togglePassword (e) {
    if (this.pass.current.type !== 'password') {
      this.pass.current.type = 'password'
      e.target.innerText = 'Show password'
    } else {
      this.pass.current.type = 'text'
      e.target.innerText = 'Hide password'
    }
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
               <input type='password' placeholder='password' ref={ this.pass }/>
               <button onClick={ this.register }>Register</button>
               <button onClick={ this.login }>Login</button>
               <button onClick={ this.togglePassword }>Show password</button>
             </div>
       }
     </div>
    )
  }
}

const mapStateToProps = state => ({ logged_in: state.logged_in })

const mapDispatchToProps = dispatch => ({
  register: bindActionCreators(createRegisterAction, dispatch),
  login: bindActionCreators(createLoginAction, dispatch),
  logout: bindActionCreators(createLogoutAction, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Gate)
