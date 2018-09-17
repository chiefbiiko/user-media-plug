export function areTruthyStrings (...xyz) {
  return xyz.every(x => typeof x === 'string' && x.length)
}

export function blur (s) {
  return s.split('')
    .map(c => c.charCodeAt(0))
    .reduce((acc, cur) => `${acc}${String.fromCharCode(cur ^ 19)}`, '')
}
