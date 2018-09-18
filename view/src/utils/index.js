export function areTruthyStrings (...xyz) {
  return xyz.every(x => typeof x === 'string' && x.length)
}

export function blur (s) {
  return s
    .split('')
    .map(c => String.fromCharCode(c.charCodeAt(0) ^ 19))
    .join('')
}
