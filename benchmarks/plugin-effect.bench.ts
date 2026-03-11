import { describe, bench } from 'vitest'
import { bonsai } from '../src/index.js'
import { strings, arrays, math } from '../src/stdlib/index.js'

describe('plugin effect on eval speed', () => {
  const bare = bonsai()
  const loaded = bonsai()
  loaded.use(strings)
  loaded.use(arrays)
  loaded.use(math)

  bench('bare: evaluateSync("42")', () => {
    bare.evaluateSync('42')
  })

  bench('plugins: evaluateSync("42")', () => {
    loaded.evaluateSync('42')
  })

  bench('bare: evaluateSync comparison', () => {
    bare.evaluateSync('1 + 2 * 3')
  })

  bench('plugins: evaluateSync comparison', () => {
    loaded.evaluateSync('1 + 2 * 3')
  })
})
