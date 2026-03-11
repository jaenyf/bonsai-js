import { describe, bench } from 'vitest'
import { bonsai } from '../src/index.js'
import { strings, arrays, math } from '../src/stdlib/index.js'

describe('bonsai benchmarks', () => {
  const expr = bonsai()
  expr.use(strings)
  expr.use(arrays)
  expr.use(math)

  const context = {
    user: { name: 'Dan', age: 30, verified: true },
    items: [1, 2, 3, 4, 5],
    price: 99.99,
  }

  bench('simple literal', () => {
    expr.evaluateSync('42')
  })

  bench('arithmetic', () => {
    expr.evaluateSync('1 + 2 * 3')
  })

  bench('property access', () => {
    expr.evaluateSync('user.name', context)
  })

  bench('comparison with context', () => {
    expr.evaluateSync('user.age >= 18 && user.verified', context)
  })

  bench('ternary', () => {
    expr.evaluateSync('user.age >= 18 ? "adult" : "minor"', context)
  })

  bench('nullish coalescing', () => {
    expr.evaluateSync('user.missing ?? "default"', context)
  })

  bench('transform pipeline', () => {
    expr.evaluateSync('user.name |> upper', context)
  })

  bench('compiled expression (evaluate only)', () => {
    const compiled = expr.compile('user.age >= 18 && user.verified')
    compiled.evaluateSync(context)
  })

  bench('array operations', () => {
    expr.evaluateSync('items |> sum', context)
  })
})
