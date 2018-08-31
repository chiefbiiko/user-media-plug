const predThen = (stream, pred) => {
  return new Promise((resolve, reject) => {
    stream.on('error', reject)
    stream.on('data', function proxy (...args) {
      if (!pred(...args)) return
      stream.removeListener('error', reject)
      stream.removeListener('data', proxy)
      resolve(...args)
    })
  })
}

module.exports = predThen
