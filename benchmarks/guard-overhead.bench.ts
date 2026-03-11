import { describe, bench } from 'vitest'

describe('Date.now() overhead', () => {
  let x = 0
  bench('Date.now()', () => {
    x = Date.now()
  })
  bench('no-op increment', () => {
    x++
  })
})
