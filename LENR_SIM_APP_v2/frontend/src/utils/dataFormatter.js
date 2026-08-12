/**
 * Data formatting utilities for the LENR Simulation Application
 * Provides consistent formatting for numbers, units, and data structures
 */

import { UNITS } from './constants';

/**
 * Format a number with specified precision
 * 
 * @param {number} value - The number to format
 * @param {number} precision - Number of decimal places
 * @param {boolean} useThousandsSeparator - Whether to use thousands separator
 * @returns {string} Formatted number
 */
export const formatNumber = (
  value, 
  precision = 2, 
  useThousandsSeparator = true
) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  // Handle very small numbers by switching to scientific notation
  if (Math.abs(value) < 0.001 && value !== 0) {
    return value.toExponential(precision);
  }
  
  // Handle very large numbers by switching to scientific notation
  if (Math.abs(value) >= 1e9) {
    return value.toExponential(precision);
  }
  
  // Format with specified precision
  const formatted = value.toFixed(precision);
  
  // Add thousands separator if requested
  if (useThousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  
  return formatted;
};

/**
 * Format energy value with appropriate unit
 * 
 * @param {number} value - Energy value
 * @param {string} fromUnit - Source unit (eV, keV, MeV, J)
 * @param {string} toUnit - Target unit (auto for automatic selection)
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted energy with unit
 */
export const formatEnergy = (
  value, 
  fromUnit = UNITS.ENERGY.EV, 
  toUnit = 'auto', 
  precision = 2
) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  // Convert to eV for consistent handling
  let valueInEv = value;
  
  switch (fromUnit) {
    case UNITS.ENERGY.KEV:
      valueInEv = value * 1000;
      break;
    case UNITS.ENERGY.MEV:
      valueInEv = value * 1000000;
      break;
    case UNITS.ENERGY.J:
      valueInEv = value * UNITS.CONVERSIONS.J_TO_EV;
      break;
    default:
      // Already in eV
      break;
  }
  
  // Auto-select unit if requested
  if (toUnit === 'auto') {
    if (valueInEv < 1000) {
      toUnit = UNITS.ENERGY.EV;
    } else if (valueInEv < 1000000) {
      toUnit = UNITS.ENERGY.KEV;
      valueInEv /= 1000;
    } else {
      toUnit = UNITS.ENERGY.MEV;
      valueInEv /= 1000000;
    }
  } else {
    // Convert to requested unit
    switch (toUnit) {
      case UNITS.ENERGY.KEV:
        valueInEv /= 1000;
        break;
      case UNITS.ENERGY.MEV:
        valueInEv /= 1000000;
        break;
      case UNITS.ENERGY.J:
        valueInEv *= UNITS.CONVERSIONS.EV_TO_J;
        break;
      default:
        // Keep in eV
        break;
    }
  }
  
  return `${formatNumber(valueInEv, precision)} ${toUnit}`;
};

/**
 * Format temperature value with appropriate unit
 * 
 * @param {number} value - Temperature value
 * @param {string} fromUnit - Source unit (K, C, F)
 * @param {string} toUnit - Target unit
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted temperature with unit
 */
export const formatTemperature = (
  value, 
  fromUnit = UNITS.TEMPERATURE.K, 
  toUnit = UNITS.TEMPERATURE.K, 
  precision = 2
) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  // Convert to Kelvin for consistent handling
  let valueInK = value;
  
  switch (fromUnit) {
    case UNITS.TEMPERATURE.C:
      valueInK = UNITS.CONVERSIONS.C_TO_K(value);
      break;
    case UNITS.TEMPERATURE.F:
      valueInK = UNITS.CONVERSIONS.F_TO_K(value);
      break;
    default:
      // Already in Kelvin
      break;
  }
  
  // Convert to target unit
  let formattedValue = valueInK;
  
  switch (toUnit) {
    case UNITS.TEMPERATURE.C:
      formattedValue = UNITS.CONVERSIONS.K_TO_C(valueInK);
      break;
    case UNITS.TEMPERATURE.F:
      formattedValue = UNITS.CONVERSIONS.K_TO_F(valueInK);
      break;
    default:
      // Keep in Kelvin
      break;
  }
  
  return `${formatNumber(formattedValue, precision)} ${toUnit}`;
};

/**
 * Format power value with appropriate unit
 * 
 * @param {number} value - Power value
 * @param {string} fromUnit - Source unit (W, kW, MW)
 * @param {string} toUnit - Target unit (auto for automatic selection)
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted power with unit
 */
export const formatPower = (
  value, 
  fromUnit = UNITS.POWER.W, 
  toUnit = 'auto', 
  precision = 2
) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  // Convert to Watts for consistent handling
  let valueInW = value;
  
  switch (fromUnit) {
    case UNITS.POWER.KW:
      valueInW = value * 1000;
      break;
    case UNITS.POWER.MW:
      valueInW = value * 1000000;
      break;
    default:
      // Already in Watts
      break;
  }
  
  // Auto-select unit if requested
  if (toUnit === 'auto') {
    if (valueInW < 1000) {
      toUnit = UNITS.POWER.W;
    } else if (valueInW < 1000000) {
      toUnit = UNITS.POWER.KW;
      valueInW /= 1000;
    } else {
      toUnit = UNITS.POWER.MW;
      valueInW /= 1000000;
    }
  } else {
    // Convert to requested unit
    switch (toUnit) {
      case UNITS.POWER.KW:
        valueInW /= 1000;
        break;
      case UNITS.POWER.MW:
        valueInW /= 1000000;
        break;
      default:
        // Keep in Watts
        break;
    }
  }
  
  return `${formatNumber(valueInW, precision)} ${toUnit}`;
};

/**
 * Format probability as percentage
 * 
 * @param {number} value - Probability value (0-1)
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatProbability = (value, precision = 2) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  // Ensure value is between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  
  const percent = clampedValue * 100;
  // Small but non-zero probabilities must not render as "0.00%": switch to
  // scientific notation when the percentage would round to zero.
  if (percent > 0 && percent < Math.pow(10, -precision)) {
    return `${percent.toExponential(precision)}%`;
  }
  return `${formatNumber(percent, precision)}%`;
};

/**
 * Format enhancement factor
 * 
 * @param {number} value - Enhancement factor value
 * @param {number} precision - Number of decimal places
 * @param {boolean} showMultiplier - Whether to show × symbol
 * @returns {string} Formatted enhancement factor
 */
export const formatEnhancementFactor = (
  value, 
  precision = 2, 
  showMultiplier = true
) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  // Format the number
  const formattedValue = formatNumber(value, precision);
  
  // Add multiplier symbol if requested
  return showMultiplier ? `${formattedValue}×` : formattedValue;
};

/**
 * Format time duration
 * 
 * @param {number} seconds - Time in seconds
 * @param {boolean} showMilliseconds - Whether to show milliseconds for short durations
 * @returns {string} Formatted time duration
 */
export const formatDuration = (seconds, showMilliseconds = true) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return 'N/A';
  }
  
  // Handle very short durations
  if (seconds < 1 && showMilliseconds) {
    return `${(seconds * 1000).toFixed(0)} ms`;
  }
  
  // Handle different duration ranges
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${hours}h ${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

/**
 * Format date and time
 * 
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) {
    return 'N/A';
  }
  
  const {
    showDate = true,
    showTime = true,
    showSeconds = false,
    use24HourFormat = true,
    useRelative = false,
    dateFormat = 'numeric', // 'numeric', '2-digit', 'long', 'short', 'narrow'
    monthFormat = 'short'   // 'numeric', '2-digit', 'long', 'short', 'narrow'
  } = options;
  
  // Convert to Date object if string or number
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  // For relative time formatting
  if (useRelative) {
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  }
  
  // Use Intl.DateTimeFormat for consistent formatting
  const dateTimeOptions = {};
  
  if (showDate) {
    dateTimeOptions.year = 'numeric';
    dateTimeOptions.month = monthFormat;
    dateTimeOptions.day = dateFormat;
  }
  
  if (showTime) {
    dateTimeOptions.hour = 'numeric';
    dateTimeOptions.minute = '2-digit';
    if (showSeconds) {
      dateTimeOptions.second = '2-digit';
    }
    dateTimeOptions.hour12 = !use24HourFormat;
  }
  
  return new Intl.DateTimeFormat('en-US', dateTimeOptions).format(dateObj);
};

/**
 * Format data rate (bytes per second)
 * 
 * @param {number} bytesPerSecond - Data rate in bytes per second
 * @param {number} precision - Number of decimal places
 * @returns {string} Formatted data rate
 */
export const formatDataRate = (bytesPerSecond, precision = 2) => {
  if (bytesPerSecond === undefined || bytesPerSecond === null || isNaN(bytesPerSecond)) {
    return 'N/A';
  }
  
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  let value = bytesPerSecond;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${formatNumber(value, precision)} ${units[unitIndex]}`;
};

// Export all formatting functions
const dataFormatter = {
  formatNumber,
  formatEnergy,
  formatTemperature,
  formatPower,
  formatProbability,
  formatEnhancementFactor,
  formatDuration,
  formatDateTime,
  formatDataRate
};

export default dataFormatter; 