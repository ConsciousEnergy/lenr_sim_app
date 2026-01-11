/**
 * Utility functions for visualization components
 */

/**
 * Get minimum value for current visualization type
 * These are default values when actual data is not available
 */
export const getMinValue = (): number => {
  return 0;
};

/**
 * Get maximum value for current visualization type
 * These are default values when actual data is not available
 */
export const getMaxValue = (): number => {
  return 100;
};

/**
 * Get average value for current visualization type
 * These are default values when actual data is not available
 */
export const getAvgValue = (): number => {
  return 50;
}; 