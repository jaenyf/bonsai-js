import type { BonsaiPlugin } from '../types.js'

export const types: BonsaiPlugin = (expr) => {
  expr.addTransform('isString', (val: unknown) => typeof val === 'string')
  expr.addTransform('isNumber', (val: unknown) => typeof val === 'number')
  expr.addTransform('isArray', (val: unknown) => Array.isArray(val))
  expr.addTransform('isNull', (val: unknown) => val === null)
  expr.addTransform('toBool', (val: unknown) => Boolean(val))
  expr.addTransform('toNumber', (val: unknown) => Number(val))
  expr.addTransform('toString', (val: unknown) => String(val))
}
