const child = require('child_process')

const line = child.execSync(
  'wmic process where "name=\'node.exe\'" get processid,commandline | ' +
  'findstr /v findstr | findstr /c:"./index.js /b"'
)

const pid = line.toString().replace(/^.*\s+(\d+)\s*$/, '$1')

child.execSync(`taskkill /pid ${pid} /f`)
