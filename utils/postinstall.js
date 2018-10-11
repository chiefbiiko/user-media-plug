if (/^production$/i.test(process.env.NODE_ENV)) return

require('child_process').execSync('cd ./clientele && npm i && cd ..')
