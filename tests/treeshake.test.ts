import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const tmpDir = join(rootDir, '.tmp-treeshake')

function bundleSize(code: string): number {
  mkdirSync(tmpDir, { recursive: true })
  const entry = join(tmpDir, 'entry.ts')
  writeFileSync(entry, code)
  const out = join(tmpDir, 'out.mjs')
  execFileSync('bun', ['build', entry, '--outfile', out, '--minify', '--target=browser'], { stdio: 'pipe' })
  const size = readFileSync(out).byteLength
  rmSync(tmpDir, { recursive: true, force: true })
  return size
}

describe('tree-shaking', () => {
  it('importing only evaluateExpression should be smaller than importing everything', () => {
    const minimal = bundleSize(`
      import { evaluateExpression } from '../src/index.js'
      console.log(evaluateExpression('1+2'))
    `)
    const full = bundleSize(`
      import { bonsai } from '../src/index.js'
      import { all } from '../src/stdlib/index.js'
      const e = bonsai(); e.use(all)
      console.log(e.evaluateSync('1+2'))
    `)
    // Full bundle with all stdlib should be larger than minimal
    expect(full).toBeGreaterThan(minimal)
  })

  it('importing individual stdlib modules should be smaller than importing all', () => {
    const stringsOnly = bundleSize(`
      import { bonsai } from '../src/index.js'
      import { strings } from '../src/stdlib/strings.js'
      const e = bonsai(); e.use(strings)
      console.log(e.evaluateSync('"hi" |> upper'))
    `)
    const allStdlib = bundleSize(`
      import { bonsai } from '../src/index.js'
      import { all } from '../src/stdlib/index.js'
      const e = bonsai(); e.use(all)
      console.log(e.evaluateSync('"hi" |> upper'))
    `)
    // strings-only should be smaller than all stdlib
    expect(allStdlib).toBeGreaterThan(stringsOnly)
  })

  it('sideEffects: false is set in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
    expect(pkg.sideEffects).toBe(false)
  })
})
