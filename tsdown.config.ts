import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/stdlib/index.ts'],
  format: 'esm',
  dts: true,
  clean: true,
})
