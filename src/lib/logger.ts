/**
 * Dev-only logging. Never pass tokens, passwords or PII — log shapes and codes instead.
 * In release builds every call is a no-op.
 */
type Details = Readonly<Record<string, unknown>>;

function write(level: 'warn' | 'info', message: string, details?: Details): void {
  if (!__DEV__) return;
  const line = `[turbotaxi] ${message}`;
  if (details) console[level](line, details);
  else console[level](line);
}

export const logger = {
  warn: (message: string, details?: Details) => write('warn', message, details),
  info: (message: string, details?: Details) => write('info', message, details),
};

/** Structure of a JSON value without its contents: `{ success: 'boolean', data: { user: 'object' } }`. */
export function describeShape(value: unknown, depth = 2): unknown {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value !== 'object') return typeof value;
  if (depth === 0) return 'object';
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, describeShape(inner, depth - 1)]),
  );
}
