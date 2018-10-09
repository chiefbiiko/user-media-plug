if (!process.env.NOW_URL) return

const { readFile, writeFile } = require('fs')

readFile('./view/src/store/index.js', 'utf8', (err, txt) => {
  if (err) throw err

  txt = txt.replace(
    /ws:\/\/localhost:\d+/,
    `wss://${process.env.NOW_URL}:41900`
  )

  writeFile('./view/src/store/index.js', txt, () => {})
})
