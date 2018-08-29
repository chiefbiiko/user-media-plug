const onceTransactionResponse = (ws, tx) => {
  return new Promise((resolve, reject) => {
    ws.on('error', reject)
    ws.on('data', function proxy (metadata) {
      if (metadata.tx !== tx) return
      ws.removeListener('error', reject)
      ws.removeListener('data', proxy)
      resolve(metadata)
    })
  })
}

module.exports = onceTransactionResponse
