import type { ECharts, init as baseInit } from 'echarts'

import EChartsWorker from './worker?worker&inline'

type Theme = Parameters<typeof baseInit>[1]
type InitOption = Parameters<typeof baseInit>[2]

const instanceMap = new Map<HTMLCanvasElement, Worker>()

const mousevents = [
    'click',
    'dblclick',
    'mousedown',
    'mouseup',
    'mouseover',
    'mouseout',
    'mousemove',
    'contextmenu'
] as const

/**
 * Initialize an ECharts instance in the worker.
 */
export function init(
    canvas: HTMLCanvasElement,
    theme: Theme = undefined,
    option: InitOption = {}
) {
    const worker = getWorker(canvas)
    const offscreen = canvas.transferControlToOffscreen()

    option.devicePixelRatio ??= window.devicePixelRatio ?? 1

    const { width, height } = canvas.getBoundingClientRect()

    offscreen.width = width * devicePixelRatio
    offscreen.height = height * devicePixelRatio

    worker.postMessage(
        {
            type: 'init',
            canvas: offscreen,
            theme,
            option
        },
        [offscreen]
    )

    registerMouseEvents(worker, canvas)

    return {
        resize: resize.bind(worker),
        setOption: setOption.bind(worker),
        dispose: dispose.bind(worker),
        showLoading: showLoading.bind(worker),
        hideLoading: hideLoading.bind(worker),
        ...getEventBinders(worker)
    }
}

/**
 * Get or create a worker for the given canvas.
 */
function getWorker(canvas: HTMLCanvasElement) {
    if (!instanceMap.has(canvas)) {
        const worker = new EChartsWorker()
        instanceMap.set(canvas, worker)
    }

    const worker = instanceMap.get(canvas)

    if (!worker) throw new Error('No worker')

    return worker
}

/**
 * Add an event listener to the instance.
 */
function on(
    this: Worker,
    listenersMap: Map<string, ((...args: unknown[]) => void)[]>,
    type: string,
    listener: (...args: unknown[]) => void
) {
    const listeners = listenersMap.get(type)

    if (!listeners) {
        this.postMessage({
            type: 'addEventListener',
            event: type
        })
        listenersMap.set(type, [listener])
    } else {
        listeners.push(listener)
        listenersMap.set(type, listeners)
    }
}

/**
 * Remove an event listener from the instance.
 */
function off(
    this: Worker,
    listenersMap: Map<string, ((...args: unknown[]) => void)[]>,
    type: string,
    listener?: (...args: unknown[]) => void
) {
    const listeners = listenersMap.get(type)
    if (!listeners) return

    if (listener) {
        const index = listeners.indexOf(listener)
        if (index !== -1) listeners.splice(index, 1)
    }

    if (listeners.length === 0 || !listener) {
        listenersMap.delete(type)
        this.postMessage({
            type: 'removeEventListener',
            event: type
        })
    }
}

/**
 * Get event binders for the instance.
 */
function getEventBinders(worker: Worker) {
    const listenersMap = new Map<string, ((...args: unknown[]) => void)[]>()

    worker.addEventListener(
        'message',
        (event: MessageEvent<{ type: string; data: unknown }>) => {
            const scope = 'echarts:'
            const type = event.data.type

            if (type.startsWith(scope)) {
                const listeners = listenersMap.get(type.slice(scope.length))
                listeners?.forEach(listener => {
                    listener(event.data.data)
                })
            }
        }
    )

    return {
        on: on.bind(worker, listenersMap),
        off: off.bind(worker, listenersMap)
    }
}

/**
 * Register mouse events for the canvas.
 */
function registerMouseEvents(worker: Worker, canvas: HTMLCanvasElement) {
    mousevents.forEach(type => {
        canvas.addEventListener(type, event => {
            worker.postMessage({
                type: 'event',
                event: {
                    type: event.type,
                    offsetX: event.offsetX,
                    offsetY: event.offsetY
                }
            })
        })
    })
}

/**
 * Resize the canvas.
 */
function resize(this: Worker, width: number, height: number) {
    this.postMessage({
        type: 'resize',
        width,
        height
    })
}

/**
 * Set option for the instance.
 */
function setOption(this: Worker, ...args: Parameters<ECharts['setOption']>) {
    this.postMessage({
        type: 'render',
        args
    })
}

/**
 * Dispose the instance.
 */
function dispose(this: Worker) {
    this.postMessage({
        type: 'dispose'
    })
}

/**
 * Show loading.
 */
function showLoading(
    this: Worker,
    ...args: Parameters<ECharts['showLoading']>
) {
    this.postMessage({
        type: 'showLoading',
        args
    })
}

/**
 * Hide loading.
 */
function hideLoading(
    this: Worker,
    ...args: Parameters<ECharts['hideLoading']>
) {
    this.postMessage({
        type: 'hideLoading',
        args
    })
}

if (typeof window !== 'undefined') {
    window.echartsWebWorker = {
        init
    }
}

declare global {
    interface Window {
        echartsWebWorker: {
            init: typeof init
        }
    }
}
