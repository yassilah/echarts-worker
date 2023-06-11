import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

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
    },
    plugins: [dts({
        insertTypesEntry: true,
    })]
})
