const { readFile, writeFile } = require('fs')

function createReadTransformWriteUsers (USERS_JSON_PATH) {
  return function readTransformWriteUsers (func) {
    readFile(USERS_JSON_PATH, (err, buf) => {
      if (err) return onError(err)

      var users
      try {
        users = JSON.parse(buf)
      } catch (err) {
        return onError(err)
      }

      users = func(users)

      writeFile(USERS_JSON_PATH, JSON.stringify(users), err => {
        if (err) return onError(err)
      })
    })
  }
}

module.exports = { createReadTransformWriteUsers }
