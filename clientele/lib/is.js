const isTruStr = x => x && typeof x === 'string'
const isStrArr = x => Array.isArray(x) && x.every(isTruStr)

module.exports = { isTruStr, isStrArr }
