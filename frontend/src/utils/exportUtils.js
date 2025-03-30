/**
 * Utility functions for exporting data from the application
 */

import * as XLSX from 'xlsx';

/**
 * Convert an object to CSV string
 * @param {Object} data - The data object to convert
 * @returns {string} CSV formatted string
 */
export const objectToCSV = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid data format: expected a non-array object');
  }

  const headers = Object.keys(data);
  let csv = headers.join(',') + '\n';
  csv += headers.map(key => {
    const value = data[key];
    // Handle string values with commas by wrapping in quotes
    if (typeof value === 'string' && value.includes(',')) {
      return `"${value}"`;
    }
    return value;
  }).join(',');
  
  return csv;
};

/**
 * Convert array of objects to CSV string
 * @param {Array} dataArray - Array of data objects
 * @returns {string} CSV formatted string
 */
export const arrayToCSV = (dataArray) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    throw new Error('Invalid data format: expected a non-empty array');
  }
  
  const headers = Object.keys(dataArray[0]);
  let csv = headers.join(',') + '\n';
  
  csv += dataArray.map(row => {
    return headers.map(key => {
      const value = row[key];
      // Handle string values with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
  }).join('\n');
  
  return csv;
};

/**
 * Export simulation results to CSV file
 * @param {Object} simulationResults - The simulation results object
 * @param {string} simulationType - Type of simulation (thermal, impact)
 * @returns {void}
 */
export const exportSimulationToCSV = (simulationResults, simulationType) => {
  if (!simulationResults) {
    console.error('No simulation results to export');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${simulationType}_simulation_${timestamp}.csv`;
  
  let csvContent = "# Simulation Results Summary\n";
  csvContent += `# Simulation Type: ${simulationType}\n`;
  csvContent += `# Timestamp: ${new Date().toISOString()}\n`;
  
  // Add metadata/parameters if available
  if (simulationResults.parameters) {
    csvContent += "\n# Parameters\n";
    Object.entries(simulationResults.parameters).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
  }
  
  // Add summary metrics if available
  if (simulationResults.summary) {
    csvContent += "\n# Summary Metrics\n";
    Object.entries(simulationResults.summary).forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
  }
  
  // Add energy levels if available
  if (simulationResults.energyLevels && Array.isArray(simulationResults.energyLevels)) {
    csvContent += "\n# Energy Levels\n";
    csvContent += "level,energy,probability\n";
    simulationResults.energyLevels.forEach((level, index) => {
      csvContent += `${index},${level.energy},${level.probability}\n`;
    });
  }
  
  // Add time series data if available
  if (simulationResults.timeSeries && Array.isArray(simulationResults.timeSeries)) {
    csvContent += "\n# Time Series Data\n";
    csvContent += arrayToCSV(simulationResults.timeSeries);
  }
  
  // Create a blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export heatmap data to CSV file
 * @param {Object} heatmapData - The heatmap data object
 * @returns {void}
 */
export const exportHeatmapToCSV = (heatmapData) => {
  if (!heatmapData || !heatmapData.data) {
    console.error('No heatmap data to export');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `heatmap_data_${timestamp}.csv`;
  
  let csvContent = "# Heatmap Data\n";
  csvContent += `# X Label: ${heatmapData.xLabel}\n`;
  csvContent += `# Y Label: ${heatmapData.yLabel}\n`;
  csvContent += `# Timestamp: ${new Date().toISOString()}\n`;
  
  // Add metadata if available
  if (heatmapData.metadata) {
    csvContent += "\n# Metadata\n";
    Object.entries(heatmapData.metadata).forEach(([key, value]) => {
      csvContent += `# ${key}: ${value}\n`;
    });
  }
  
  // Add data points
  csvContent += "\n# Data Points\n";
  csvContent += "x,y,z,value\n";
  heatmapData.data.forEach(point => {
    csvContent += `${point.x},${point.y},${point.z},${point.value}\n`;
  });
  
  // Create a blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports data to Excel format
 * @param {Object} data - The data to export
 * @param {string} filename - The name of the output file (without extension)
 * @param {Object} options - Additional options like sheetNames
 */
export const exportToExcel = (data, filename, options = {}) => {
  if (!data) {
    console.error('No data to export');
    return;
  }
  
  try {
    const workbook = XLSX.utils.book_new();
    
    // If data is an object with multiple sections
    if (!Array.isArray(data) && typeof data === 'object' && Object.keys(data).length > 0) {
      // Add sheets for each data section
      Object.entries(data).forEach(([key, value], index) => {
        const sheetName = options.sheetNames?.[index] || key.substring(0, 31); // Excel has 31 char limit for sheet names
        
        if (Array.isArray(value)) {
          // Data is an array of objects
          const worksheet = XLSX.utils.json_to_sheet(value);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        } else if (typeof value === 'object') {
          // Data is a single object, convert to array first
          const worksheet = XLSX.utils.json_to_sheet([value]);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });
    } else if (Array.isArray(data)) {
      // If data is just an array
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    }
    
    // Add a timestamp to filename if not present
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = filename.includes(timestamp) 
      ? `${filename}.xlsx`
      : `${filename}_${timestamp}.xlsx`;
    
    // Write and download
    XLSX.writeFile(workbook, fullFilename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error(`Failed to export to Excel: ${error.message}`);
  }
};

/**
 * Exports simulation results to Excel format
 * @param {Object} simulationResults - The simulation results to export
 * @param {string} simulationType - The type of simulation
 */
export const exportSimulationToExcel = (simulationResults, simulationType) => {
  if (!simulationResults) {
    console.error('No simulation results to export');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${simulationType}_simulation_${timestamp}`;
  
  // Prepare data for Excel export
  const excelData = {};
  
  // Add parameters if available
  if (simulationResults.parameters) {
    // Convert parameters object to array of objects for Excel
    excelData.Parameters = Object.entries(simulationResults.parameters).map(([key, value]) => ({
      Parameter: key,
      Value: value
    }));
  }
  
  // Add summary metrics if available
  if (simulationResults.summary) {
    excelData.Summary = Object.entries(simulationResults.summary).map(([key, value]) => ({
      Metric: key,
      Value: value
    }));
  }
  
  // Add energy levels if available
  if (simulationResults.energyLevels && Array.isArray(simulationResults.energyLevels)) {
    excelData.EnergyLevels = simulationResults.energyLevels.map((level, index) => ({
      Level: index,
      Energy: level.energy,
      Probability: level.probability
    }));
  }
  
  // Add time series data if available
  if (simulationResults.timeSeries && Array.isArray(simulationResults.timeSeries)) {
    excelData.TimeSeries = simulationResults.timeSeries;
  }
  
  // Export using the general Excel export function
  exportToExcel(excelData, filename, {
    sheetNames: ['Parameters', 'Summary', 'EnergyLevels', 'TimeSeries']
  });
};

/**
 * Exports heatmap data to Excel format
 * @param {Object} heatmapData - The heatmap data to export
 */
export const exportHeatmapToExcel = (heatmapData) => {
  if (!heatmapData || !heatmapData.data) {
    console.error('No heatmap data to export');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `heatmap_data_${timestamp}`;
  
  // Prepare data for Excel export
  const excelData = {};
  
  // Add metadata if available
  if (heatmapData.metadata) {
    excelData.Metadata = Object.entries(heatmapData.metadata).map(([key, value]) => ({
      Property: key,
      Value: value
    }));
  }
  
  // Add heatmap points
  excelData.DataPoints = heatmapData.data.map(point => ({
    X: point.x,
    Y: point.y,
    Z: point.z,
    Value: point.value
  }));
  
  // Export using the general Excel export function
  exportToExcel(excelData, filename, {
    sheetNames: ['Metadata', 'DataPoints']
  });
};

/**
 * Exports particle data to Excel format
 * @param {Object} particleData - The particle data to export
 * @param {string} simulationType - The type of simulation
 */
export const exportParticleDataToExcel = (particleData, simulationType) => {
  if (!particleData || !particleData.particles) {
    console.error('No particle data to export');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `particle_data_${simulationType}_${timestamp}`;
  
  // Prepare data for Excel export
  const excelData = {};
  
  // Add metadata if available
  if (particleData.metadata) {
    excelData.Metadata = Object.entries(particleData.metadata).map(([key, value]) => ({
      Property: key,
      Value: value
    }));
  }
  
  // Add simulation info
  excelData.SimulationInfo = [{
    Property: 'Simulation Type',
    Value: simulationType
  }, {
    Property: 'Total Particles',
    Value: particleData.particles.length
  }, {
    Property: 'Export Date',
    Value: new Date().toISOString()
  }];
  
  // Add particle data
  excelData.Particles = particleData.particles;
  
  // Export using the general Excel export function
  exportToExcel(excelData, filename, {
    sheetNames: ['SimulationInfo', 'Metadata', 'Particles']
  });
}; 