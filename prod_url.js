if (!process.env.NOW_URL) return

const { readFile, writeFile } = require('fs')

const fix = `wss://${process.env.NOW_URL}:${process.env.PORT}`

readFile('./view/src/store/index.js', 'utf8', (err, txt) => {
  if (err) throw err

  txt = txt.replace(/ws:\/\/localhost:\d+/, fix)

  writeFile('./view/src/store/index.js', txt, err => {
    if (err) throw err
    console.log(`fixed server address in ./view/src/store/index.js to: ${fix}`)
  })
})
