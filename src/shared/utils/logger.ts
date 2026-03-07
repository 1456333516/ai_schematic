const IS_DEV = import.meta.env.DEV

type LogFn = (tag: string, ...args: unknown[]) => void

const noop: LogFn = () => {}

const createDevLog = (level: string, consoleFn: (...args: unknown[]) => void): LogFn =>
  (tag: string, ...args: unknown[]) => {
    consoleFn(`%c[${level}][${tag}]`, 'color: gray; font-weight: bold', ...args)
  }

export const logger = {
  debug: IS_DEV ? createDevLog('DBG', console.log) : noop,
  info: IS_DEV ? createDevLog('INF', console.info) : noop,
  warn: (tag: string, ...args: unknown[]) => console.warn(`[WARN][${tag}]`, ...args),
  error: (tag: string, ...args: unknown[]) => console.error(`[ERR][${tag}]`, ...args)
} as const
