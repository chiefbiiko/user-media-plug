export function areTruthyStrings (...xyz) {
  return xyz.every(x => typeof x === 'string' && x.length)
}
