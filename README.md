# ECharts Worker

This package allows you to run your [Apache ECharts](https://echarts.apache.org/) instance inside a [web worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).


## Installation

```bash
npm install echarts-worker
yarn add echarts-worker
pnpm add echarts-worker
```

## Usage

The package does not include the `echarts` package as it is being imported from [jsdelivr](https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js) inside the Worker. Besides this, usage should be identical to the regular echarts package except that the first argument of the `init` function has to be an HTMLCanvasElement to transfer it off-screen;

```ts
import { init } from 'echarts-worker'

const canvas = document.querySelector('canvas')

const instance = init(canvas)

instance.setOption({ ...options })

instance.on('click', (event) => {
    // do something
})

instance.off('click')

instance.resize({ width: 100, height: 100 })
```


