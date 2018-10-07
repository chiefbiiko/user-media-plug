// <link rel="manifest" href="/manifest.json"><link rel="shortcut icon" href="/favicon.ico">

require('fs').readFile(process.argv[2], 'utf8', (err, js) => {
  if (err) return console.error(err)
  console.log(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no"><meta name="theme-color" content="#000000"><title>plugtube</title></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div><script>${js}</script></body></html>`
  )
})
