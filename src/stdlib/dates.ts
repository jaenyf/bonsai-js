import type { BonsaiPlugin } from '../types.js'
import { BonsaiTypeError } from '../errors.js'

function expectNumber(val: unknown, name: string): number {
  if (typeof val !== 'number') throw new BonsaiTypeError(name, 'a number (timestamp)', val)
  return val
}

function expectString(val: unknown, name: string): string {
  if (typeof val !== 'string') throw new BonsaiTypeError(name, 'a string', val)
  return val
}

export const dates: BonsaiPlugin = (expr) => {
  expr.addFunction('now', () => Date.now())

  expr.addTransform('formatDate', (val: unknown, format: unknown) => {
    const ts = expectNumber(val, 'formatDate')
    const date = new Date(ts)
    if (isNaN(date.getTime())) throw new BonsaiTypeError('formatDate', 'a valid timestamp', ts)
    const fmt = expectString(format, 'formatDate')
    const PAD_WIDTH = 2
    const pad = (n: number) => String(n).padStart(PAD_WIDTH, '0')

    return fmt
      .replace('YYYY', String(date.getUTCFullYear()))
      .replace('MM', pad(date.getUTCMonth() + 1))
      .replace('DD', pad(date.getUTCDate()))
      .replace('HH', pad(date.getUTCHours()))
      .replace('mm', pad(date.getUTCMinutes()))
      .replace('ss', pad(date.getUTCSeconds()))
  })

  expr.addTransform('diffDays', (val: unknown, other: unknown) => {
    const msPerDay = 86_400_000
    return Math.abs(Math.round((expectNumber(val, 'diffDays') - expectNumber(other, 'diffDays')) / msPerDay))
  })
}
