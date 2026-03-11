import { describe, bench } from 'vitest'
import { bonsai } from '../src/index.js'
import { parse } from '../src/parser.js'
import { compile } from '../src/compiler.js'
import { evaluate } from '../src/evaluator.js'
import { SecurityPolicy, ExecutionContext } from '../src/execution-context.js'

const ctx = { user: { name: 'Dan', age: 30, verified: true } }
const policy = new SecurityPolicy()

describe('compiled path: literal 42', () => {
  // Method 1: bonsai().compile().evaluateSync
  const expr = bonsai()
  const compiled = expr.compile('42')
  bench('compiled.evaluateSync({})', () => {
    compiled.evaluateSync({})
  })

  // Method 2: raw evaluate with new ExecutionContext
  const ast = compile(parse('42'))
  bench('raw evaluate (new EC)', () => {
    evaluate(ast, {}, {}, {}, new ExecutionContext(policy))
  })

  // Method 3: raw evaluate, no empty object allocation
  const empty = {}
  bench('raw evaluate (pre-allocated empty)', () => {
    evaluate(ast, empty, empty, empty, new ExecutionContext(policy))
  })

  // Method 4: like compiled but as plain function
  const ast2 = compile(parse('42'))
  const tr = {}
  const fn = {}
  const evalFn = () => {
    return evaluate(ast2, {}, tr, fn, new ExecutionContext(policy))
  }
  bench('closure function (like compiled)', () => {
    evalFn()
  })

  // Method 5: instance evaluateSync (full path with cache)
  bench('instance.evaluateSync("42")', () => {
    expr.evaluateSync('42')
  })
})
