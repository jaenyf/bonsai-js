import { describe, it, expect } from 'vitest'
import { bonsai } from '../../src/index.js'
import { types } from '../../src/stdlib/index.js'

describe('stdlib - types', () => {
  const expr = bonsai()
  expr.use(types)

  it('isString', () => {
    expect(expr.evaluateSync('"hello" |> isString')).toBe(true)
    expect(expr.evaluateSync('42 |> isString')).toBe(false)
  })
  it('isNumber', () => {
    expect(expr.evaluateSync('42 |> isNumber')).toBe(true)
    expect(expr.evaluateSync('"hello" |> isNumber')).toBe(false)
  })
  it('isArray', () => {
    expect(expr.evaluateSync('[1,2] |> isArray')).toBe(true)
    expect(expr.evaluateSync('42 |> isArray')).toBe(false)
  })
  it('isNull', () => {
    expect(expr.evaluateSync('null |> isNull')).toBe(true)
    expect(expr.evaluateSync('42 |> isNull')).toBe(false)
  })
  it('toBool', () => {
    expect(expr.evaluateSync('1 |> toBool')).toBe(true)
    expect(expr.evaluateSync('0 |> toBool')).toBe(false)
  })
  it('toNumber', () => {
    expect(expr.evaluateSync('"42" |> toNumber')).toBe(42)
  })
  it('toString', () => {
    expect(expr.evaluateSync('42 |> toString')).toBe('42')
  })
})
