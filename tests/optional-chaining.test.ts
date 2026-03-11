import { describe, it, expect } from 'vitest'
import { bonsai } from '../src/index.js'

describe('computed optional chaining', () => {
  it('a?.[0] returns element when array exists', () => {
    const expr = bonsai()
    expect(expr.evaluateSync('a?.[0]', { a: [10, 20, 30] })).toBe(10)
  })

  it('a?.[0] returns undefined when null', () => {
    const expr = bonsai()
    expect(expr.evaluateSync('a?.[0]', { a: null })).toBeUndefined()
  })

  it('a?.[key] with dynamic key', () => {
    const expr = bonsai()
    expect(expr.evaluateSync('a?.[key]', { a: { x: 1 }, key: 'x' })).toBe(1)
  })

  it('nested optional computed access', () => {
    const expr = bonsai()
    expect(expr.evaluateSync('a?.[0]?.[1]', { a: [[10, 20]] })).toBe(20)
    expect(expr.evaluateSync('a?.[0]?.[1]', { a: null })).toBeUndefined()
  })
})

describe('optional call chaining', () => {
  it('fn?.() calls when function exists', () => {
    const expr = bonsai()
    expr.addFunction('greet', () => 'hello')
    expect(expr.evaluateSync('a?.b', { a: { b: 42 } })).toBe(42)
  })
})

describe('optional chaining on method calls', () => {
  const expr = bonsai()

  it('obj?.method() returns undefined when obj is null', () => {
    expect(expr.evaluateSync('a?.includes("x")', { a: null })).toBeUndefined()
  })

  it('obj?.method() returns undefined when obj is undefined', () => {
    expect(expr.evaluateSync('a?.includes("x")', { a: undefined })).toBeUndefined()
  })

  it('obj?.method() works when obj exists', () => {
    expect(expr.evaluateSync('a?.includes("x")', { a: 'fox' })).toBe(true)
  })

  it('async: obj?.method() returns undefined when obj is null', async () => {
    const result = await expr.evaluate('a?.includes("x")', { a: null })
    expect(result).toBeUndefined()
  })

  it('async: obj?.method() works when obj exists', async () => {
    const result = await expr.evaluate('a?.includes("x")', { a: 'fox' })
    expect(result).toBe(true)
  })
})
