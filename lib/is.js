const isBool = x => x === true || x === false
const isRealNumber = x => typeof x === 'number' && !isNaN(x)
const isTruthyString = x => x && typeof x === 'string'
const isStringArray = x => Array.isArray(x) && x.every(isTruthyString)

module.exports = { isBool, isRealNumber, isStringArray, isTruthyString }
