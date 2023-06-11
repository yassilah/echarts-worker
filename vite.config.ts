import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'ECharts Worker',
            fileName: 'echarts-worker'
        }
    },
    worker: {
        format: 'es'
    }
})
