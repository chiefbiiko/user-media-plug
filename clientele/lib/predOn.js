const { EventEmitter } = require('events')

const predOn = (stream, pred) => {
  const emitter = new EventEmitter()
  stream.on('error', emitter.emit.bind(emitter, 'error'))
  stream.on('data', (...args) => {
    if (pred(...args)) emitter.emit('data', ...args)
  })
  return emitter
}

module.exports = predOn
