const { readFile, writeFile } = require('fs')

function noop () {}

function createReadTransformWriteUsers (USERS_JSON_PATH) {
  return function readTransformWriteUsers (func, cb) {
    if (typeof cb !== 'function') cb = noop
    readFile(USERS_JSON_PATH, (err, buf) => {
      if (err) return cb(err)

      var users
      try {
        users = JSON.parse(buf)
      } catch (err) {
        return cb(err)
      }

      users = func(users)

      writeFile(USERS_JSON_PATH, JSON.stringify(users), cb)
    })
  }
}

module.exports = { createReadTransformWriteUsers }
