/** Logger interface for debug output. */
export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
}

const noop = () => {};

function isDebugEnabled(namespace: string): boolean {
  if (typeof localStorage === "undefined") return false;
  const debug = localStorage.getItem("debug");
  if (!debug) return false;
  if (debug === "*") return true;
  return debug.split(",").some((pattern) => {
    const re = new RegExp(`^${pattern.trim().replace(/\*/g, ".*")}$`);
    return re.test(namespace);
  });
}

/**
 * Create a logger. Enabled when localStorage "debug" matches the namespace.
 * Usage: `localStorage.setItem("debug", "grid")` to enable, or `"*"` for all namespaces.
 */
export function createLogger(namespace = "grid"): Logger {
  if (isDebugEnabled(namespace)) {
    const prefix = `[${namespace}]`;
    return {
      log: console.log.bind(console, prefix),
      warn: console.warn.bind(console, prefix),
      error: console.error.bind(console, prefix),
      group: (label: string) => console.group(`${prefix} ${label}`),
      groupEnd: console.groupEnd.bind(console),
    };
  }

  return {
    log: noop,
    warn: noop,
    error: noop,
    group: noop,
    groupEnd: noop,
  };
}
