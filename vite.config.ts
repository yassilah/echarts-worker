import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ECharts Web Worker',
      fileName: 'echarts-web-worker'
    },
    
  },
  worker: {
    format: 'es',
  }
})