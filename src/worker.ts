importScripts('https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js')

import type { ECharts, EChartsOption, init, zrender } from 'echarts'
import { parse } from 'telejson'

type InitOption = Parameters<typeof init>[2]

type EventType = Parameters<zrender.ZRenderType['handler']['dispatch']>[0]

type Message =
    | {
          type: 'init'
          canvas: OffscreenCanvas
          theme: string | EChartsOption
          option: InitOption
      }
    | {
          type: 'resize'
          args: Parameters<ECharts['resize']>
      }
    | {
          type: 'render'
          args: Parameters<ECharts['setOption']>
      }
    | {
          type: 'event'
          event: MouseEvent
      }
    | {
          type: 'dispose'
      }
    | {
          type: 'addEventListener'
          event: string
      }
    | {
          type: 'removeEventListener'
          event: string
      }
    | {
          type: 'showLoading'
          args: Parameters<ECharts['showLoading']>
      }
    | {
          type: 'hideLoading'
          args: Parameters<ECharts['hideLoading']>
      }

let instance: ECharts | null = null

self.echarts.setPlatformAPI({
    createCanvas() {
        return new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement
    }
})

/**
 * Resize the chart with the given width and height.
 */
function resize(...args: Parameters<ECharts['resize']>) {
    instance?.resize(...args)
}

/**
 * Render the chart with the given option.
 */
function render(...args: Parameters<ECharts['setOption']>) {
    instance?.setOption(...args)
}

/**
 * Dispose of the chart instance
 * and stop the worker.
 */
function dispose() {
    instance?.dispose()
    close()
}

/**
 * Initialize the chart instance.
 */
function initialize(
    canvas: OffscreenCanvas,
    theme: string | EChartsOption,
    option: InitOption = {}
) {
    instance?.dispose()

    const devicePixelRatio = option.devicePixelRatio ?? 1
    option.width ??= canvas.width / devicePixelRatio
    option.height ??= canvas.height / devicePixelRatio

    instance = self.echarts.init(
        canvas as unknown as HTMLDivElement,
        theme,
        option
    )
}

/**
 * Register events to the main thread.
 */
function addEventListener(type: string) {
    instance?.on(type, event => {
        postMessage({
            type: `echarts:${type}`,
            data: {
                ...(event as Record<string, unknown>),
                event: null
            }
        })
    })
}

/**
 * Remove events to the main thread.
 */
function removeEventListener(type: string) {
    instance?.off(type)
}

/**
 * Handle mouse events from the main thread.
 */
function handleEvent(event: MouseEvent) {
    const newEvent = Object.assign(new Event(event.type, event), {
        zrX: event.offsetX,
        zrY: event.offsetY
    })

    instance?.getZr().handler.dispatch(newEvent.type as EventType, newEvent)
}

/**
 * Handle the message from the main thread.
 */
function onMessageHandler({ data }: MessageEvent<Message>) {
    console.log('received message', data)
    switch (data.type) {
        case 'init':
            return initialize(data.canvas, data.theme, data.option)
        case 'resize':
            return resize(...data.args)
        case 'render':
            return render(
                ...(parse(data.args as unknown as string) as Parameters<
                    ECharts['setOption']
                >)
            )
        case 'event':
            return handleEvent(data.event)
        case 'dispose':
            return dispose()
        case 'addEventListener':
            return addEventListener(data.event)
        case 'removeEventListener':
            return removeEventListener(data.event)
        case 'showLoading':
            return instance?.showLoading(...data.args)
        case 'hideLoading':
            return instance?.hideLoading(...data.args)
    }
}

onmessage = onMessageHandler.bind(self)
