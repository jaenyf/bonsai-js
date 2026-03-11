import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'

describe('parser - literals', () => {
  it('should parse number literals', () => {
    const ast = parse('42')
    expect(ast).toMatchObject({ type: 'NumberLiteral', value: 42 })
  })

  it('should parse decimal numbers', () => {
    const ast = parse('3.14')
    expect(ast).toMatchObject({ type: 'NumberLiteral', value: 3.14 })
  })

  it('should parse string literals', () => {
    const ast = parse('"hello"')
    expect(ast).toMatchObject({ type: 'StringLiteral', value: 'hello' })
  })

  it('should parse boolean literals', () => {
    expect(parse('true')).toMatchObject({ type: 'BooleanLiteral', value: true })
    expect(parse('false')).toMatchObject({ type: 'BooleanLiteral', value: false })
  })

  it('should parse null', () => {
    expect(parse('null')).toMatchObject({ type: 'NullLiteral', value: null })
  })

  it('should parse undefined', () => {
    expect(parse('undefined')).toMatchObject({ type: 'UndefinedLiteral' })
  })

  it('should parse identifiers', () => {
    expect(parse('foo')).toMatchObject({ type: 'Identifier', name: 'foo' })
  })
})

describe('parser - arithmetic', () => {
  it('should parse addition', () => {
    const ast = parse('1 + 2')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'NumberLiteral', value: 1 },
      right: { type: 'NumberLiteral', value: 2 },
    })
  })

  it('should respect operator precedence (* before +)', () => {
    const ast = parse('1 + 2 * 3')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'NumberLiteral', value: 1 },
      right: {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'NumberLiteral', value: 2 },
        right: { type: 'NumberLiteral', value: 3 },
      },
    })
  })

  it('should parse exponentiation', () => {
    const ast = parse('2 ** 3')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '**',
    })
  })

  it('should parse parenthesized expressions', () => {
    const ast = parse('(1 + 2) * 3')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '*',
      left: {
        type: 'BinaryExpression',
        operator: '+',
      },
    })
  })
})

describe('parser - comparison and logical', () => {
  it('should parse comparison operators', () => {
    const ast = parse('a > 5')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '>',
    })
  })

  it('should parse logical AND', () => {
    const ast = parse('a && b')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '&&',
    })
  })

  it('should parse logical OR', () => {
    const ast = parse('a || b')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '||',
    })
  })

  it('should parse unary NOT', () => {
    const ast = parse('!a')
    expect(ast).toMatchObject({
      type: 'UnaryExpression',
      operator: '!',
      operand: { type: 'Identifier', name: 'a' },
    })
  })

  it('should parse unary negation', () => {
    const ast = parse('-5')
    expect(ast).toMatchObject({
      type: 'UnaryExpression',
      operator: '-',
    })
  })
})

describe('parser - ternary', () => {
  it('should parse ternary expression', () => {
    const ast = parse('a ? b : c')
    expect(ast).toMatchObject({
      type: 'ConditionalExpression',
      test: { type: 'Identifier', name: 'a' },
      consequent: { type: 'Identifier', name: 'b' },
      alternate: { type: 'Identifier', name: 'c' },
    })
  })
})

describe('parser - nullish coalescing', () => {
  it('should parse ?? operator', () => {
    const ast = parse('a ?? b')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: '??',
    })
  })
})

describe('parser - in operator', () => {
  it('should parse in operator', () => {
    const ast = parse('"a" in arr')
    expect(ast).toMatchObject({
      type: 'BinaryExpression',
      operator: 'in',
    })
  })
})

describe('trailing commas', () => {
  it('allows trailing comma in arrays', () => {
    const ast = parse('[1, 2, 3,]')
    expect(ast.type).toBe('ArrayLiteral')
    expect(ast.type === 'ArrayLiteral' && ast.elements).toHaveLength(3)
  })

  it('allows trailing comma in objects', () => {
    const ast = parse('{ a: 1, b: 2, }')
    expect(ast.type).toBe('ObjectLiteral')
    expect(ast.type === 'ObjectLiteral' && ast.properties).toHaveLength(2)
  })

  it('allows trailing comma in function args', () => {
    const ast = parse('fn(a, b,)')
    expect(ast.type).toBe('CallExpression')
    expect(ast.type === 'CallExpression' && ast.args).toHaveLength(2)
  })
})

describe('shorthand object properties', () => {
  it('parses { name } as { name: name }', () => {
    const ast = parse('{ name }')
    expect(ast.type).toBe('ObjectLiteral')
    if (ast.type !== 'ObjectLiteral') throw new Error('Expected ObjectLiteral')
    const prop = ast.properties[0]
    if (prop.key.type !== 'Identifier') throw new Error('Expected Identifier key')
    expect(prop.key.name).toBe('name')
    if (prop.value.type !== 'Identifier') throw new Error('Expected Identifier value')
    expect(prop.value.name).toBe('name')
  })

  it('parses { name, age }', () => {
    const ast = parse('{ name, age }')
    expect(ast.type === 'ObjectLiteral' && ast.properties).toHaveLength(2)
  })
})

describe('parser - template literal depth guard', () => {
  it('throws on deeply nested template literals', () => {
    let expr = '1'
    for (let i = 0; i < 35; i++) {
      expr = `\`\${${expr}}\``
    }
    expect(() => parse(expr)).toThrow('Maximum template nesting depth exceeded')
  })

  it('allows reasonable template nesting', () => {
    const result = parse('`hello ${`world ${name}`}`')
    expect(result.type).toBe('TemplateLiteral')
  })
})

describe('parser - lambda ternary expressions', () => {
  it('wraps simple lambda ternary in LambdaExpression', () => {
    const ast = parse('.active ? .name : "unknown"')
    expect(ast.type).toBe('LambdaExpression')
    if (ast.type === 'LambdaExpression') {
      expect(ast.body.type).toBe('ConditionalExpression')
    }
  })

  it('wraps compound lambda ternary in LambdaExpression', () => {
    const ast = parse('.age >= 18 ? "adult" : "minor"')
    expect(ast.type).toBe('LambdaExpression')
    if (ast.type === 'LambdaExpression') {
      expect(ast.body.type).toBe('ConditionalExpression')
      if (ast.body.type === 'ConditionalExpression') {
        expect(ast.body.test.type).toBe('BinaryExpression')
      }
    }
  })
})
