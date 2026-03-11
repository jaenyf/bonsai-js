import type { TransformFn, FunctionFn } from './types.js'

export interface PluginRegistry {
  addTransform(name: string, fn: TransformFn): void
  addFunction(name: string, fn: FunctionFn): void
  removeTransform(name: string): boolean
  removeFunction(name: string): boolean
  getTransform(name: string): TransformFn | undefined
  getFunction(name: string): FunctionFn | undefined
  getTransformNames(): string[]
  getFunctionNames(): string[]
  use(plugin: (registry: PluginRegistry) => void): void
  readonly transforms: Record<string, TransformFn>
  readonly functions: Record<string, FunctionFn>
}

export function createPluginRegistry(): PluginRegistry {
  const transformMap = new Map<string, TransformFn>()
  const functionMap = new Map<string, FunctionFn>()

  // Cached snapshots — rebuilt only when registry changes
  let transformsCache: Record<string, TransformFn> = {}
  let functionsCache: Record<string, FunctionFn> = {}
  let transformsDirty = false
  let functionsDirty = false

  const registry: PluginRegistry = {
    addTransform(name, fn) { transformMap.set(name, fn); transformsDirty = true },
    addFunction(name, fn) { functionMap.set(name, fn); functionsDirty = true },
    removeTransform(name) { const r = transformMap.delete(name); if (r) transformsDirty = true; return r },
    removeFunction(name) { const r = functionMap.delete(name); if (r) functionsDirty = true; return r },
    getTransform(name) { return transformMap.get(name) },
    getFunction(name) { return functionMap.get(name) },
    getTransformNames() { return [...transformMap.keys()] },
    getFunctionNames() { return [...functionMap.keys()] },
    use(plugin) { plugin(registry) },
    get transforms() {
      if (transformsDirty) {
        transformsCache = Object.fromEntries(transformMap)
        transformsDirty = false
      }
      return transformsCache
    },
    get functions() {
      if (functionsDirty) {
        functionsCache = Object.fromEntries(functionMap)
        functionsDirty = false
      }
      return functionsCache
    },
  }

  return registry
}
