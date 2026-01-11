/**
 * Logger utility for the LENR Simulation Application
 * Provides consistent logging across the application with different log levels
 * and ability to enable/disable logs based on environment
 */

// Log levels with numeric values for comparison
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Default configuration
const DEFAULT_CONFIG = {
  level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
  enableTimestamps: true,
  enableNamespaces: true
};

// Determine current log level from environment or default
const getCurrentLevel = () => {
  const envLevel = process.env.REACT_APP_LOG_LEVEL;
  if (!envLevel) return DEFAULT_CONFIG.level;
  
  const levelName = envLevel.toUpperCase();
  return LOG_LEVELS[levelName] !== undefined ? LOG_LEVELS[levelName] : DEFAULT_CONFIG.level;
};

/**
 * Creates a logger instance with an optional namespace
 * 
 * @param {string} namespace - Optional namespace for the logger
 * @returns {Object} Logger instance with log methods
 */
const createLogger = (namespace = '') => {
  const config = {
    ...DEFAULT_CONFIG,
    level: getCurrentLevel()
  };

  /**
   * Format log message with optional timestamp and namespace
   * 
   * @param {string} level - Log level
   * @param {Array} args - Arguments to log
   * @returns {Array} Formatted log arguments
   */
  const formatLog = (level, args) => {
    const parts = [];
    
    // Add timestamp if enabled
    if (config.enableTimestamps) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }
    
    // Add level
    parts.push(`[${level}]`);
    
    // Add namespace if enabled and provided
    if (config.enableNamespaces && namespace) {
      parts.push(`[${namespace}]`);
    }
    
    // Combine prefix
    const prefix = parts.join(' ');
    
    // Return formatted arguments
    return [prefix, ...args];
  };
  
  /**
   * Log with specified level if current level allows
   * 
   * @param {number} levelValue - Numeric level value
   * @param {string} levelName - Level name for display
   * @param {Array} args - Arguments to log
   */
  const log = (levelValue, levelName, ...args) => {
    if (levelValue >= config.level) {
      const formattedArgs = formatLog(levelName, args);
      
      switch (levelValue) {
        case LOG_LEVELS.DEBUG:
          console.debug(...formattedArgs);
          break;
        case LOG_LEVELS.INFO:
          console.info(...formattedArgs);
          break;
        case LOG_LEVELS.WARN:
          console.warn(...formattedArgs);
          break;
        case LOG_LEVELS.ERROR:
          console.error(...formattedArgs);
          break;
        default:
          console.log(...formattedArgs);
      }
    }
  };
  
  // Return logger instance with method for each level
  return {
    debug: (...args) => log(LOG_LEVELS.DEBUG, 'DEBUG', ...args),
    info: (...args) => log(LOG_LEVELS.INFO, 'INFO', ...args),
    warn: (...args) => log(LOG_LEVELS.WARN, 'WARN', ...args),
    error: (...args) => log(LOG_LEVELS.ERROR, 'ERROR', ...args),
    
    // Allow changing config at runtime
    setLevel: (level) => {
      if (typeof level === 'string') {
        const levelName = level.toUpperCase();
        config.level = LOG_LEVELS[levelName] !== undefined ? LOG_LEVELS[levelName] : config.level;
      } else if (typeof level === 'number') {
        config.level = level;
      }
      return config.level;
    },
    
    getLevel: () => config.level,
    
    // Expose config options
    enableTimestamps: (enable = true) => {
      config.enableTimestamps = enable;
    },
    
    enableNamespaces: (enable = true) => {
      config.enableNamespaces = enable;
    }
  };
};

// Create default logger
const defaultLogger = createLogger('app');

// Export the default logger, create function and levels
const logger = {
  ...defaultLogger,
  create: createLogger,
  levels: LOG_LEVELS
};

export default logger; 