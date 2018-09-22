export function areTruthyStrings (...xyz) {
  return xyz.every(x => typeof x === 'string' && x.length)
}

export function blur (s) {
  return s
    .split('')
    .map(c => String.fromCharCode(c.charCodeAt(0) ^ 19))
    .join('')
}

export function isTruthyString (x) {
  return x && typeof x === 'string'
}

export function isLengthyStringArray (x) {
  return Array.isArray(x) && x.length && x.every(isTruthyString)
}

export function noop () {}
