const isBool = x => x === true || x === false
const isRealNumber = x => typeof x === 'number' && !isNaN(x)
const isTruthyString = x => x && typeof x === 'string'
const isStringArray = x => Array.isArray(x) && x.every(isTruthyString)
const isIntGt1536Mil = x => typeof x === 'number' && !(x % 1) && x > 1.536e12

module.exports = {
  isBool,
  isRealNumber,
  isStringArray,
  isTruthyString,
  isIntGt1536Mil
}
