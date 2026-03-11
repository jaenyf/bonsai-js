export class LRUCache<K, V> {
  private readonly max: number
  private readonly map = new Map<K, V>()

  constructor(max: number) {
    this.max = max > 0 ? max : 0
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key) as V
    // Move to end (most recent)
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.max === 0) return

    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.max) {
      // Evict oldest (first key)
      const oldest = this.map.keys().next().value!
      this.map.delete(oldest)
    }
    this.map.set(key, value)
  }

  get size(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }
}
