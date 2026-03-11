import { describe, it, expect } from 'vitest'
import {
  ExpressionError,
  BonsaiTypeError,
  BonsaiSecurityError,
  BonsaiReferenceError,
  attachLocation,
  formatError,
  formatBonsaiError,
  offsetToPosition,
  suggest,
} from '../src/errors.js'

describe('ExpressionError', () => {
  it('should include source position and formatted message', () => {
    const error = new ExpressionError('Unexpected token', {
      source: 'foo + * bar',
      start: 6,
      end: 7,
    })
    expect(error.message).toContain('Unexpected token')
    expect(error.rawMessage).toBe('Unexpected token')
    expect(error.start).toBe(6)
    expect(error.end).toBe(7)
  })
})

describe('formatError', () => {
  it('should highlight the error position in the source', () => {
    const formatted = formatError('Unexpected token "*"', {
      source: 'foo + * bar',
      start: 6,
      end: 7,
    })
    expect(formatted).toContain('foo + * bar')
    expect(formatted).toContain('^')
    expect(formatted).toContain('line 1, column 7')
  })

  it('formats multi-line errors against the correct line', () => {
    const source = 'total + 1\nsubtotal + * 2'
    const start = source.indexOf('*')
    const formatted = formatError('Unexpected token "*"', {
      source,
      start,
      end: start + 1,
    })

    expect(formatted).toContain('2 | subtotal + * 2')
    expect(formatted).toContain('line 2, column 12')
  })
})

describe('BonsaiTypeError', () => {
  it('should include transform name and types', () => {
    const error = new BonsaiTypeError('upper', 'a string', 42)
    expect(error.message).toBe('"upper" expects a string, got number')
    expect(error.name).toBe('BonsaiTypeError')
    expect(error.transform).toBe('upper')
    expect(error.expected).toBe('a string')
    expect(error.received).toBe('number')
  })

  it('should detect null', () => {
    const error = new BonsaiTypeError('count', 'an array', null)
    expect(error.received).toBe('null')
  })

  it('should detect arrays', () => {
    const error = new BonsaiTypeError('upper', 'a string', [1, 2])
    expect(error.received).toBe('array')
  })

  it('should detect promises', () => {
    const error = new BonsaiTypeError('slow', 'a synchronous function result', Promise.resolve(42))
    expect(error.received).toBe('Promise')
  })

  it('should be catchable by instanceof', () => {
    try {
      throw new BonsaiTypeError('upper', 'a string', 42)
    } catch (e) {
      expect(e).toBeInstanceOf(BonsaiTypeError)
      expect(e).toBeInstanceOf(Error)
    }
  })
})

describe('offsetToPosition', () => {
  it('maps offsets to 1-based line and column positions', () => {
    const source = 'first\nsecond line\nthird'
    const offset = source.indexOf('second')
    expect(offsetToPosition(source, offset)).toEqual({
      line: 2,
      column: 1,
      offset,
    })
  })
})

describe('formatBonsaiError', () => {
  it('formats runtime errors with attached source locations', () => {
    const error = new BonsaiTypeError('upper', 'a string', 42)
    attachLocation(error, 'x |> upper', 5, 10)

    expect(error.formatted).toContain('x |> upper')
    expect(formatBonsaiError(error)).toContain('line 1, column 6')
  })

  it('falls back to plain error messages when no location exists', () => {
    expect(formatBonsaiError(new Error('boom'))).toBe('boom')
  })
})

describe('BonsaiSecurityError', () => {
  it('should include error code', () => {
    const error = new BonsaiSecurityError('TIMEOUT', 'Expression timeout: exceeded 1000ms')
    expect(error.message).toBe('Expression timeout: exceeded 1000ms')
    expect(error.name).toBe('BonsaiSecurityError')
    expect(error.code).toBe('TIMEOUT')
  })

  it('should be catchable by instanceof', () => {
    try {
      throw new BonsaiSecurityError('MAX_DEPTH', 'Maximum expression depth exceeded')
    } catch (e) {
      expect(e).toBeInstanceOf(BonsaiSecurityError)
      expect(e).toBeInstanceOf(Error)
    }
  })
})

describe('BonsaiReferenceError', () => {
  it('should include kind and identifier', () => {
    const error = new BonsaiReferenceError('transform', 'uper', 'upper')
    expect(error.message).toBe('Unknown transform "uper". Did you mean "upper"?')
    expect(error.name).toBe('BonsaiReferenceError')
    expect(error.kind).toBe('transform')
    expect(error.identifier).toBe('uper')
    expect(error.suggestion).toBe('upper')
  })

  it('should work without suggestion', () => {
    const error = new BonsaiReferenceError('function', 'zzzzz')
    expect(error.message).toBe('Unknown function "zzzzz"')
    expect(error.suggestion).toBeUndefined()
  })

  it('should be catchable by instanceof', () => {
    try {
      throw new BonsaiReferenceError('method', 'foo')
    } catch (e) {
      expect(e).toBeInstanceOf(BonsaiReferenceError)
      expect(e).toBeInstanceOf(Error)
    }
  })
})

describe('suggest', () => {
  it('should find close matches for typos', () => {
    const known = ['upper', 'lower', 'trim', 'split']
    const result = suggest('uper', known)
    expect(result).toBe('upper')
  })

  it('should return undefined for no close match', () => {
    const known = ['upper', 'lower']
    const result = suggest('zzzzz', known)
    expect(result).toBeUndefined()
  })

  it('skips suggestion for very long inputs', () => {
    const known = ['upper', 'lower', 'trim']
    const longInput = 'x'.repeat(200)
    expect(suggest(longInput, known)).toBeUndefined()
  })
})
