/**
 * Utilities for exporting simulation data in various formats
 */

/**
 * Convert simulation results to CSV format
 * @param {Object} data - Simulation result data
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data) => {
  if (!data) return '';
  
  // Handle energy levels data
  const energyLevels = data.energyLevels || [];
  
  // Create header row
  let csvContent = 'Energy Level,Energy (eV)\n';
  
  // Add energy level data
  energyLevels.forEach((energy, index) => {
    csvContent += `${index},${energy}\n`;
  });
  
  // Add metadata section
  csvContent += '\nMetadata\n';
  if (data.metadata) {
    Object.entries(data.metadata).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
  }
  
  // Add tunneling probability
  csvContent += `\nTunneling Probability,${data.tunnelingProbability}\n`;
  
  return csvContent;
};

/**
 * Convert heatmap data to CSV format
 * @param {Object} data - Heatmap data
 * @returns {string} CSV formatted string
 */
export const convertHeatmapToCSV = (data) => {
  if (!data || !data.data || !data.data.length) return '';
  
  // Get unique x and y values
  const xValues = [...new Set(data.data.map(point => point.x))].sort((a, b) => a - b);
  const yValues = [...new Set(data.data.map(point => point.y))].sort((a, b) => a - b);
  
  // Create header row with x values
  let csvContent = 'Y / X,' + xValues.join(',') + '\n';
  
  // Create a 2D grid for the data
  const grid = {};
  yValues.forEach(y => {
    grid[y] = {};
    xValues.forEach(x => {
      grid[y][x] = null;
    });
  });
  
  // Fill the grid with data
  data.data.forEach(point => {
    grid[point.y][point.x] = point.value;
  });
  
  // Build CSV rows
  yValues.forEach(y => {
    let row = `${y}`;
    xValues.forEach(x => {
      row += `,${grid[y][x] !== null ? grid[y][x].toExponential(4) : ''}`;
    });
    csvContent += row + '\n';
  });
  
  // Add metadata
  if (data.metadata) {
    csvContent += '\nMetadata\n';
    Object.entries(data.metadata).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
  }
  
  return csvContent;
};

/**
 * Convert data to JSON format
 * @param {Object} data - Any data object
 * @returns {string} JSON formatted string
 */
export const convertToJSON = (data) => {
  if (!data) return '';
  return JSON.stringify(data, null, 2);
};

/**
 * Trigger a file download
 * @param {string} content - Content to download
 * @param {string} fileName - Name of the file
 * @param {string} contentType - MIME type of the content
 */
export const downloadFile = (content, fileName, contentType) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  
  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Export simulation results as CSV
 * @param {Object} data - Simulation result data
 * @param {string} fileName - Name of the file without extension
 */
export const exportAsCSV = (data, fileName = 'simulation_results') => {
  const csvContent = convertToCSV(data);
  downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
};

/**
 * Export heatmap data as CSV
 * @param {Object} data - Heatmap data
 * @param {string} fileName - Name of the file without extension
 */
export const exportHeatmapAsCSV = (data, fileName = 'heatmap_data') => {
  const csvContent = convertHeatmapToCSV(data);
  downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
};

/**
 * Export data as JSON
 * @param {Object} data - Any data object
 * @param {string} fileName - Name of the file without extension
 */
export const exportAsJSON = (data, fileName = 'simulation_data') => {
  const jsonContent = convertToJSON(data);
  downloadFile(jsonContent, `${fileName}.json`, 'application/json');
}; 