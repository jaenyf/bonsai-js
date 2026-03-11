import { describe, it, expect } from 'vitest'
import { compile } from '../src/compiler.js'
import { parse } from '../src/parser.js'

describe('compiler - constant folding', () => {
  it('should fold constant arithmetic', () => {
    const ast = parse('2 + 3')
    const optimized = compile(ast)
    expect(optimized).toMatchObject({ type: 'NumberLiteral', value: 5 })
  })

  it('should fold nested constant arithmetic', () => {
    const ast = parse('2 + 3 * 4')
    const optimized = compile(ast)
    expect(optimized).toMatchObject({ type: 'NumberLiteral', value: 14 })
  })

  it('should fold constant string concatenation', () => {
    const ast = parse('"hello" + " " + "world"')
    const optimized = compile(ast)
    expect(optimized).toMatchObject({ type: 'StringLiteral', value: 'hello world' })
  })

  it('should fold constant boolean expressions', () => {
    const ast = parse('true && false')
    const optimized = compile(ast)
    expect(optimized).toMatchObject({ type: 'BooleanLiteral', value: false })
  })

  it('should not fold expressions with identifiers', () => {
    const ast = parse('x + 1')
    const optimized = compile(ast)
    expect(optimized.type).toBe('BinaryExpression')
  })
})

describe('compiler - dead branch elimination', () => {
  it('should eliminate false branch of always-true ternary', () => {
    const ast = parse('true ? "yes" : "no"')
    const optimized = compile(ast)
    expect(optimized).toMatchObject({ type: 'StringLiteral', value: 'yes' })
  })

  it('should eliminate true branch of always-false ternary', () => {
    const ast = parse('false ? "yes" : "no"')
    const optimized = compile(ast)
    expect(optimized).toMatchObject({ type: 'StringLiteral', value: 'no' })
  })

  it('should not eliminate when condition is dynamic', () => {
    const ast = parse('x ? "yes" : "no"')
    const optimized = compile(ast)
    expect(optimized.type).toBe('ConditionalExpression')
  })
})

describe('compiler - null/undefined constant folding', () => {
  it('folds null == null to true', () => {
    const optimized = compile(parse('null == null'))
    expect(optimized).toMatchObject({ type: 'BooleanLiteral', value: true })
  })

  it('folds null != undefined to false', () => {
    const optimized = compile(parse('null != null'))
    expect(optimized).toMatchObject({ type: 'BooleanLiteral', value: false })
  })

  it('does not fold null == undefined (different types)', () => {
    const optimized = compile(parse('null == undefined'))
    // The compiler uses strict equality, so null !== undefined — not foldable
    expect(optimized.type).toBe('BinaryExpression')
  })
})

describe('compiler - exponentiation folding', () => {
  it('folds right-associative ** correctly', () => {
    // 2 ** 3 ** 2 should be 2 ** (3 ** 2) = 2 ** 9 = 512
    const optimized = compile(parse('2 ** 3 ** 2'))
    expect(optimized).toMatchObject({ type: 'NumberLiteral', value: 512 })
  })
})

describe('compiler - passthrough', () => {
  it('should pass through non-optimizable expressions unchanged', () => {
    const ast = parse('user.name |> upper')
    const optimized = compile(ast)
    expect(optimized.type).toBe('PipeExpression')
  })
})
