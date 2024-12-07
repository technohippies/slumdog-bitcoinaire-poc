export const logger = {
  log: (...args: any[]) => console.log('[Orbis]', ...args),
  error: (...args: any[]) => console.error('[Orbis]', ...args),
  warn: (...args: any[]) => console.warn('[Orbis]', ...args)
}; 