export interface Logger {
  debug(obj: unknown, msg?: string): void
  info(obj: unknown, msg?: string): void
  warn(obj: unknown, msg?: string): void
  error(obj: unknown, msg?: string): void
}

export const consoleLogger: Logger = {
  debug: (obj, msg) => {
    if (msg) {
      console.debug(msg, obj)
    } else {
      console.debug(obj)
    }
  },
  info: (obj, msg) => {
    if (msg) {
      console.info(msg, obj)
    } else {
      console.info(obj)
    }
  },
  warn: (obj, msg) => {
    if (msg) {
      console.warn(msg, obj)
    } else {
      console.warn(obj)
    }
  },
  error: (obj, msg) => {
    if (msg) {
      console.error(msg, obj)
    } else {
      console.error(obj)
    }
  },
}

export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
