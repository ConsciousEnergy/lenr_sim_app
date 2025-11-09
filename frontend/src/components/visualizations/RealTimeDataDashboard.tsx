import React, { useState, useEffect, useCallback } from 'react';
import { useRealtimeData, DataSeries } from '../../api/realtime';
import RealTimeLineChart from './RealTimeLineChart';
import { Box, Paper, Typography, Stack, Chip, Button, CircularProgress, Alert, Switch, FormControlLabel, Grid, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DownloadIcon from '@mui/icons-material/Download';

interface RealTimeDataDashboardProps {
  simulationId: string | null;
  title?: string;
  height?: number | string;
  width?: number | string;
}

const RealTimeDataDashboard: React.FC<RealTimeDataDashboardProps> = ({
  simulationId,
  title = 'Real-Time Simulation Data',
  height = 600,
  width = '100%'
}) => {
  // Use the realtime data hook to connect to WebSocket
  const { isConnected, error, dataSeries, reconnect, clearData } = useRealtimeData(simulationId);
  
  // State for series visibility settings
  const [visibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
  
  // Handle visibility toggling for a specific series
  const toggleSeriesVisibility = useCallback((seriesId: string) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesId]: !prev[seriesId]
    }));
  }, []);
  
  // When dataSeries changes, initialize visibility for new series
  useEffect(() => {
    // For any series that doesn't have visibility set, default to visible
    const newVisibilityState = { ...visibleSeries };
    let hasChanges = false;
    
    dataSeries.forEach(series => {
      if (visibleSeries[series.id] === undefined) {
        newVisibilityState[series.id] = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setVisibleSeries(newVisibilityState);
    }
  }, [dataSeries, visibleSeries]);
  
  // Apply visibility settings to data series
  const visibleDataSeries = dataSeries.map(series => ({
    ...series,
    visible: visibleSeries[series.id] !== false // Default to true if not set
  }));
  
  // Download data as CSV
  const downloadCSV = useCallback(() => {
    if (dataSeries.length === 0) return;
    
    // Format the data for CSV export
    const timestamps = new Set<number>();
    
    // Collect all timestamps
    dataSeries.forEach(series => {
      series.data.forEach(point => {
        timestamps.add(point.timestamp);
      });
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
    
    // Create header row
    let csv = 'Timestamp,' + dataSeries.map(s => s.name).join(',') + '\n';
    
    // Add data rows
    sortedTimestamps.forEach(timestamp => {
      const date = new Date(timestamp).toISOString();
      
      // Find values for each series at this timestamp
      const values = dataSeries.map(series => {
        const point = series.data.find(p => p.timestamp === timestamp);
        return point ? point.value : '';
      });
      
      csv += `${date},${values.join(',')}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `simulation-data-${simulationId}-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [dataSeries, simulationId]);
  
  // Group data series by units for better visualization
  const seriesByUnit = dataSeries.reduce<Record<string, DataSeries[]>>((acc, series) => {
    const unit = series.unit || 'Unknown';
    if (!acc[unit]) {
      acc[unit] = [];
    }
    acc[unit].push(series);
    return acc;
  }, {});
  
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        width,
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'auto'
      }}
    >
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">{title}</Typography>
        
        <Stack direction="row" spacing={1}>
          <Chip 
            label={isConnected ? 'Connected' : 'Disconnected'} 
            color={isConnected ? 'success' : 'error'} 
          />
          
          <MuiTooltip title="Reconnect WebSocket">
            <IconButton
              onClick={reconnect}
              color="primary"
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </MuiTooltip>
          
          <MuiTooltip title="Download Data as CSV">
            <IconButton
              onClick={downloadCSV}
              color="primary"
              size="small"
              disabled={dataSeries.length === 0}
            >
              <DownloadIcon />
            </IconButton>
          </MuiTooltip>
          
          <Button 
            variant="outlined" 
            size="small" 
            onClick={clearData}
            disabled={dataSeries.length === 0}
          >
            Clear Data
          </Button>
        </Stack>
      </Box>
      
      {/* Show error if any */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}
      
      {/* Show connection status */}
      {!isConnected && !error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Waiting for connection...
          <CircularProgress size={20} sx={{ ml: 2 }} />
        </Alert>
      )}
      
      {/* No data message */}
      {isConnected && dataSeries.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No data received yet. Waiting for simulation to send data...
        </Alert>
      )}
      
      {/* Series visibility controls */}
      {dataSeries.length > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Data Series</Typography>
          <Grid container spacing={1}>
            {dataSeries.map(series => (
              <Grid sx={{ gridColumn: 'span 1' }} key={series.id}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={visibleSeries[series.id] !== false}
                      onChange={() => toggleSeriesVisibility(series.id)}
                      size="small"
                    />
                  }
                  label={
                    <Chip
                      size="small"
                      label={`${series.name}${series.unit ? ` (${series.unit})` : ''}`}
                      style={{ 
                        backgroundColor: visibleSeries[series.id] !== false 
                          ? (series.color || 'inherit') 
                          : '#f0f0f0',
                        color: visibleSeries[series.id] !== false && series.color 
                          ? getContrastTextColor(series.color) 
                          : 'inherit'
                      }}
                      icon={visibleSeries[series.id] !== false ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    />
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* Create a chart for each unit group */}
      {Object.entries(seriesByUnit).map(([unit, series]) => (
        <Box key={unit} sx={{ mb: 4 }}>
          <RealTimeLineChart
            dataSeries={series.filter(s => visibleSeries[s.id] !== false)}
            title={`${unit === 'Unknown' ? 'Data' : unit} Measurements`}
            height={350}
            yAxisLabel={unit === 'Unknown' ? undefined : unit}
            xAxisLabel="Time"
            allowZoom={true}
          />
        </Box>
      ))}
    </Paper>
  );
};

// Helper function to determine text color based on background color
const getContrastTextColor = (backgroundColor: string): string => {
  // Simple contrast calculation - for proper implementation use a more robust color utility
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? 'black' : 'white';
};

export default RealTimeDataDashboard; 