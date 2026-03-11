import { describe, it, expect } from 'vitest'
import { createPluginRegistry } from '../src/plugins.js'

describe('plugin registry', () => {
  it('should register and retrieve transforms', () => {
    const registry = createPluginRegistry()
    registry.addTransform('upper', (val: unknown) => (val as string).toUpperCase())
    expect(registry.getTransform('upper')).toBeDefined()
  })

  it('should register and retrieve functions', () => {
    const registry = createPluginRegistry()
    registry.addFunction('now', () => Date.now())
    expect(registry.getFunction('now')).toBeDefined()
  })

  it('should apply plugins via use()', () => {
    const registry = createPluginRegistry()
    const myPlugin = (r: typeof registry) => {
      r.addTransform('double', (val: unknown) => (val as number) * 2)
      r.addFunction('greet', () => 'hello')
    }
    registry.use(myPlugin)
    expect(registry.getTransform('double')).toBeDefined()
    expect(registry.getFunction('greet')).toBeDefined()
  })

  it('should list all transform names', () => {
    const registry = createPluginRegistry()
    registry.addTransform('upper', (v: unknown) => v)
    registry.addTransform('lower', (v: unknown) => v)
    expect(registry.getTransformNames()).toEqual(['upper', 'lower'])
  })

  it('should list all function names', () => {
    const registry = createPluginRegistry()
    registry.addFunction('now', () => 0)
    expect(registry.getFunctionNames()).toEqual(['now'])
  })
})
