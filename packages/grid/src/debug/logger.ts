/** Logger interface for debug output. */
export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
}

const noop = () => {};

/** Create a logger. Returns noop functions by default. */
export function createLogger(_namespace?: string): Logger {
  return {
    log: noop,
    warn: noop,
    error: noop,
    group: noop,
    groupEnd: noop,
  };
}
