import type { BonsaiPlugin } from '../types.js'
import { BonsaiTypeError } from '../errors.js'

function expectNumber(val: unknown, name: string): number {
  if (typeof val !== 'number') throw new BonsaiTypeError(name, 'a number', val)
  return val
}

function expectNumberArray(val: unknown, name: string): number[] {
  if (!Array.isArray(val)) throw new BonsaiTypeError(name, 'an array of numbers', val)
  for (const item of val) {
    if (typeof item !== 'number') throw new BonsaiTypeError(name, 'an array of numbers (all elements must be numbers)', item)
  }
  return val as number[]
}

export const math: BonsaiPlugin = (expr) => {
  expr.addTransform('round', (val: unknown) => Math.round(expectNumber(val, 'round')))
  expr.addTransform('floor', (val: unknown) => Math.floor(expectNumber(val, 'floor')))
  expr.addTransform('ceil', (val: unknown) => Math.ceil(expectNumber(val, 'ceil')))
  expr.addTransform('abs', (val: unknown) => Math.abs(expectNumber(val, 'abs')))
  expr.addTransform('sum', (val: unknown) => expectNumberArray(val, 'sum').reduce((a, b) => a + b, 0))
  expr.addTransform('avg', (val: unknown) => {
    const arr = expectNumberArray(val, 'avg')
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  })
  expr.addTransform('clamp', (val: unknown, min: unknown, max: unknown) =>
    Math.min(Math.max(expectNumber(val, 'clamp'), expectNumber(min, 'clamp'), ), expectNumber(max, 'clamp')))

  expr.addFunction('min', (...args: unknown[]) => Math.min(...(args as number[])))
  expr.addFunction('max', (...args: unknown[]) => Math.max(...(args as number[])))
}
