import { useState, useCallback, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
  IconButton,
  FormControlLabel,
  Checkbox,
  SelectChangeEvent,
  LinearProgress,
  Alert,
  Grid,
  Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useSimulationResults } from '../../api/physics/hooks';

// Export format options
type ExportFormat = 'csv' | 'json' | 'excel' | 'image';

interface DataExportPanelProps {
  simulationId: string | null;
  title?: string;
  height?: number | string;
  width?: number | string;
  onClose?: () => void;
}

/**
 * Data Export Panel Component
 * 
 * Provides functionality to export simulation data in various formats.
 * Supports selective export of specific data series and different file formats.
 */
const DataExportPanel: React.FC<DataExportPanelProps> = ({
  simulationId,
  title = "Export Simulation Data",
  height = 'auto',
  width = '100%',
  onClose
}) => {
  // Fetch simulation results
  const { results, isLoading, error, refetchResults } = useSimulationResults(simulationId);
  
  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [selectedDataSeries, setSelectedDataSeries] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Available data series for export
  const [availableDataSeries, setAvailableDataSeries] = useState<Array<{
    id: string;
    name: string;
    count: number;
    type: 'numeric' | 'temporal' | 'categorical';
  }>>([]);

  // Initialize available data series based on results
  useEffect(() => {
    if (!results) return;
    
    try {
      // Cast results to any to avoid type errors with dynamic properties
      const resultsData = results as any;
      
      // Extract available data series from results
      // This is a simplified example - in a real application, you would need to analyze
      // the structure of your simulation results to determine available series
      const seriesList = [];
      
      if (resultsData.energy_distribution) {
        seriesList.push({
          id: 'energy_distribution',
          name: 'Energy Distribution',
          count: Array.isArray(resultsData.energy_distribution) ? resultsData.energy_distribution.length : 0,
          type: 'numeric' as const
        });
      }
      
      if (resultsData.temperature_profile) {
        seriesList.push({
          id: 'temperature_profile',
          name: 'Temperature Profile',
          count: Array.isArray(resultsData.temperature_profile) ? resultsData.temperature_profile.length : 0,
          type: 'numeric' as const
        });
      }
      
      if (resultsData.reaction_rates) {
        seriesList.push({
          id: 'reaction_rates',
          name: 'Reaction Rates',
          count: typeof resultsData.reaction_rates === 'object' ? Object.keys(resultsData.reaction_rates).length : 0,
          type: 'numeric' as const
        });
      }
      
      if (resultsData.time_steps) {
        seriesList.push({
          id: 'time_steps',
          name: 'Time Steps',
          count: Array.isArray(resultsData.time_steps) ? resultsData.time_steps.length : 0,
          type: 'temporal' as const
        });
      }
      
      if (resultsData.lattice_states) {
        seriesList.push({
          id: 'lattice_states',
          name: 'Lattice States',
          count: Array.isArray(resultsData.lattice_states) ? resultsData.lattice_states.length : 0,
          type: 'categorical' as const
        });
      }
      
      setAvailableDataSeries(seriesList);
      
      // Default to selecting all series
      setSelectedDataSeries(seriesList.map(series => series.id));
      
    } catch (err) {
      console.error('Error processing simulation results for export:', err);
      setExportError('Failed to process simulation data for export');
    }
  }, [results]);
  
  // Handle export format change
  const handleFormatChange = useCallback((event: SelectChangeEvent) => {
    setExportFormat(event.target.value as ExportFormat);
  }, []);
  
  // Toggle data series selection
  const toggleDataSeries = useCallback((seriesId: string) => {
    setSelectedDataSeries(prev => {
      if (prev.includes(seriesId)) {
        return prev.filter(id => id !== seriesId);
      } else {
        return [...prev, seriesId];
      }
    });
  }, []);
  
  // Select all data series
  const selectAllSeries = useCallback(() => {
    setSelectedDataSeries(availableDataSeries.map(series => series.id));
  }, [availableDataSeries]);
  
  // Clear all data series selections
  const clearAllSeries = useCallback(() => {
    setSelectedDataSeries([]);
  }, []);
  
  // Handle export action
  const handleExport = useCallback(async () => {
    if (!simulationId || selectedDataSeries.length === 0) {
      setExportError('Please select at least one data series to export');
      return;
    }
    
    setIsExporting(true);
    setExportSuccess(null);
    setExportError(null);
    
    try {
      // In a real application, you would make an API call to generate the export
      // For this example, we'll simulate the export process
      
      // Build export data structure
      const exportData: Record<string, any> = {
        simulation_id: simulationId,
        timestamp: new Date().toISOString(),
        data: {}
      };
      
      // Include metadata if requested
      if (includeMetadata && results) {
        const resultsData = results as any;
        exportData.metadata = {
          name: resultsData.name || 'Unnamed Simulation',
          description: resultsData.description || '',
          created_at: resultsData.created_at || new Date().toISOString(),
          parameters: resultsData.parameters || {}
        };
      }
      
      // Add selected data series
      selectedDataSeries.forEach(seriesId => {
        if (results && results[seriesId]) {
          exportData.data[seriesId] = results[seriesId];
        }
      });
      
      // Format the data according to the selected format
      let exportedData: string | Blob;
      let filename = `simulation-${simulationId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`;
      let mimeType: string;
      
      switch (exportFormat) {
        case 'json':
          exportedData = JSON.stringify(exportData, null, 2);
          filename += '.json';
          mimeType = 'application/json';
          break;
          
        case 'csv':
          // Convert JSON to CSV (simplified approach)
          const csvRows = [];
          
          // Add headers
          const headers = ['timestamp'];
          selectedDataSeries.forEach(seriesId => {
            const series = availableDataSeries.find(s => s.id === seriesId);
            if (series) {
              headers.push(series.name);
            }
          });
          csvRows.push(headers.join(','));
          
          // Add data rows (this is a simplified example)
          // In a real application, you would need to handle different data structures
          for (let i = 0; i < 100; i++) {
            const row = [new Date(Date.now() - i * 1000).toISOString()];
            selectedDataSeries.forEach(seriesId => {
              if (results && results[seriesId] && Array.isArray(results[seriesId])) {
                row.push(results[seriesId][i] !== undefined ? String(results[seriesId][i]) : '');
              } else {
                row.push('');
              }
            });
            csvRows.push(row.join(','));
          }
          
          exportedData = csvRows.join('\n');
          filename += '.csv';
          mimeType = 'text/csv';
          break;
          
        case 'excel':
          // For Excel, in a real application you would use a library like xlsx
          // For this example, we'll just use CSV with an .xlsx extension
          exportedData = 'This would be Excel data in a real application';
          filename += '.xlsx';
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
          
        case 'image':
          // For image export, in a real application you would generate an image
          // from the visualization components
          exportedData = 'This would be image data in a real application';
          filename += '.png';
          mimeType = 'image/png';
          break;
          
        default:
          throw new Error(`Unsupported export format: ${exportFormat}`);
      }
      
      // Create and trigger download
      const blob = new Blob([exportedData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Simulate a delay for the export process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setExportSuccess(`Data exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (err) {
      console.error('Error exporting data:', err);
      setExportError(`Failed to export data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [simulationId, selectedDataSeries, exportFormat, includeMetadata, results, availableDataSeries]);
  
  // Copy data to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!simulationId || selectedDataSeries.length === 0 || !results) {
      setExportError('Please select at least one data series to copy');
      return;
    }
    
    try {
      const exportData: Record<string, any> = {
        simulation_id: simulationId,
        timestamp: new Date().toISOString(),
        data: {}
      };
      
      selectedDataSeries.forEach(seriesId => {
        if (results && results[seriesId]) {
          exportData.data[seriesId] = results[seriesId];
        }
      });
      
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setExportSuccess('Data copied to clipboard');
    } catch (err) {
      console.error('Error copying data to clipboard:', err);
      setExportError('Failed to copy data to clipboard');
    }
  }, [simulationId, selectedDataSeries, results]);
  
  // Preview the export data
  const handlePreview = useCallback(() => {
    if (!simulationId || selectedDataSeries.length === 0) {
      setExportError('Please select at least one data series to preview');
      return;
    }
    
    // In a real application, you would open a modal or navigate to a preview page
    console.log('Preview data:', { 
      format: exportFormat, 
      series: selectedDataSeries,
      includeMetadata 
    });
    
    setExportSuccess('Preview opened (check console)');
  }, [simulationId, selectedDataSeries, exportFormat, includeMetadata]);
  
  // Share data (simplified example)
  const handleShare = useCallback(() => {
    if (!simulationId) {
      setExportError('No simulation selected');
      return;
    }
    
    // In a real application, you would implement sharing functionality
    // For this example, we'll just simulate it
    const shareUrl = `https://lenr-sim.example.com/share/${simulationId}`;
    
    // Copy the share URL to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setExportSuccess('Share URL copied to clipboard');
      })
      .catch(err => {
        console.error('Error copying share URL to clipboard:', err);
        setExportError('Failed to copy share URL to clipboard');
      });
  }, [simulationId]);
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        width,
        height,
        overflow: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Error message */}
      {(error || exportError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : (error || exportError)}
        </Alert>
      )}
      
      {/* Success message */}
      {exportSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {exportSuccess}
        </Alert>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Loading simulation data...
          </Typography>
        </Box>
      )}
      
      {/* Simulation ID Display */}
      {simulationId && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Simulation ID:</Typography>
          <Chip 
            label={simulationId} 
            size="small" 
            variant="outlined"
          />
        </Box>
      )}
      
      {/* Export Format Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Export Format
        </Typography>
        
        <FormControl fullWidth size="small">
          <InputLabel id="export-format-label">Format</InputLabel>
          <Select
            labelId="export-format-label"
            id="export-format"
            value={exportFormat}
            label="Format"
            onChange={handleFormatChange}
          >
            <MenuItem value="csv">CSV (Comma Separated Values)</MenuItem>
            <MenuItem value="json">JSON (JavaScript Object Notation)</MenuItem>
            <MenuItem value="excel">Excel Spreadsheet</MenuItem>
            <MenuItem value="image">Image (PNG)</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Data Series Selection */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">
            Data Series Selection
          </Typography>
          
          <Box>
            <Button 
              size="small" 
              variant="text" 
              onClick={selectAllSeries}
              disabled={availableDataSeries.length === 0}
            >
              Select All
            </Button>
            <Button 
              size="small" 
              variant="text" 
              onClick={clearAllSeries}
              disabled={selectedDataSeries.length === 0}
            >
              Clear All
            </Button>
          </Box>
        </Box>
        
        {availableDataSeries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No data series available for export
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={1}>
              {availableDataSeries.map(series => (
                <Grid sx={{ gridColumn: 'span 1' }} key={series.id}>
                  <Chip
                    label={`${series.name} (${series.count})`}
                    color={selectedDataSeries.includes(series.id) ? 'primary' : 'default'}
                    variant={selectedDataSeries.includes(series.id) ? 'filled' : 'outlined'}
                    onClick={() => toggleDataSeries(series.id)}
                    size="medium"
                    sx={{ mb: 1 }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>
      
      {/* Export Options */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Export Options
        </Typography>
        
        <FormControlLabel
          control={
            <Checkbox
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
            />
          }
          label="Include Simulation Metadata"
        />
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={isExporting || isLoading || selectedDataSeries.length === 0}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          
          <Tooltip title="Copy to clipboard">
            <IconButton
              onClick={handleCopyToClipboard}
              disabled={isLoading || selectedDataSeries.length === 0}
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Preview data">
            <IconButton
              onClick={handlePreview}
              disabled={isLoading || selectedDataSeries.length === 0}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShare}
          disabled={isLoading}
        >
          Share
        </Button>
      </Box>
    </Paper>
  );
};

export default DataExportPanel; 