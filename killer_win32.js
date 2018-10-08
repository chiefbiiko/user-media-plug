const child = require('child_process')

const line = child.execSync(
  'wmic process where "name=\'cmd.exe\'" get processid,commandline | findstr /v findstr | findstr /c:/b'
)

const pid = parseInt(line.toString().replace(/[^\d]/g, ''))

child.execSync(`taskkill /pid ${pid} /f`)
