import { combineReducers } from 'redux'
import io from './io.js'
import logio from './logio.js'

export default combineReducers({
  io_log: io,
  logged_in: logio
})
