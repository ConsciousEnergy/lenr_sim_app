/**
 * useLogger Hook
 * Provides consistent logging functionality across components
 */

import { useCallback } from 'react';

const useLogger = (componentName = 'Component') => {
  const log = useCallback((level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${componentName}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR:`, message, ...args);
        break;
      case 'warn':
        console.warn(`${prefix} WARN:`, message, ...args);
        break;
      case 'info':
        console.info(`${prefix} INFO:`, message, ...args);
        break;
      case 'debug':
        console.debug(`${prefix} DEBUG:`, message, ...args);
        break;
      default:
        console.log(`${prefix}:`, message, ...args);
    }
  }, [componentName]);

  const error = useCallback((message, ...args) => log('error', message, ...args), [log]);
  const warn = useCallback((message, ...args) => log('warn', message, ...args), [log]);
  const info = useCallback((message, ...args) => log('info', message, ...args), [log]);
  const debug = useCallback((message, ...args) => log('debug', message, ...args), [log]);

  return {
    log,
    error,
    warn,
    info,
    debug
  };
};

export { useLogger };
export default useLogger;

