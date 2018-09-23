const levelHasAllKeys = (db, keys, cb) => {
  const kz = new Set(keys)
  var pending = kz.size
  db.createKeyStream()
    .once('error', cb)
    .on('data', key => kz.has(key) ? pending-- : null)
    .once('end', () => cb(null, !pending))
}

module.exports = { levelHasAllKeys }
