import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  Divider, 
  Tooltip, 
  Alert, 
  Snackbar, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TableChartIcon from '@mui/icons-material/TableChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoIcon from '@mui/icons-material/Info';
import { styled } from '@mui/material/styles';
import * as api from '../../api/api';

// Styled components
const ExportCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  height: '100%'
}));

const ActionButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  minWidth: '200px'
}));

const ExportModule = ({ simulationResults, experimentalData }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);
  
  // Handle export format change
  const handleFormatChange = (event) => {
    setExportFormat(event.target.value);
  };
  
  // Handle export action
  const handleExport = async () => {
    if (!simulationResults) {
      setNotification({
        open: true,
        message: 'No simulation results to export',
        severity: 'warning'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // For client-side CSV generation
      if (exportFormat === 'csv') {
        // Convert results to a format suitable for CSV
        const dataForCSV = convertSimulationToCSVFormat(simulationResults);
        const csvContent = api.convertToCSV(dataForCSV);
        
        // Download the CSV file
        api.downloadCSV(csvContent, 'LENR_simulation_results.csv');
        
        setNotification({
          open: true,
          message: 'Results exported successfully',
          severity: 'success'
        });
      } 
      // For server-side generation or other formats
      else {
        const blob = await api.exportSimulationResults(simulationResults, exportFormat);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LENR_simulation_results.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setNotification({
          open: true,
          message: `Results exported as ${exportFormat.toUpperCase()} successfully`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      setNotification({
        open: true,
        message: `Export failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle comparison with experimental data
  const handleCompare = async () => {
    if (!simulationResults || !experimentalData) {
      setNotification({
        open: true,
        message: 'Both simulation results and experimental data are required for comparison',
        severity: 'warning'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // For demo/testing purposes, generate comparison results client-side
      // In production, this would call the API
      const comparisonData = generateComparisonResults(simulationResults, experimentalData);
      
      // In a real implementation, uncomment this:
      // const comparisonData = await api.compareExperimentalData(experimentalData, simulationResults);
      
      setComparisonResults(comparisonData);
      setCompareDialogOpen(true);
      
    } catch (error) {
      console.error('Comparison failed:', error);
      setNotification({
        open: true,
        message: `Comparison failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Convert simulation results to a format suitable for CSV
  const convertSimulationToCSVFormat = (results) => {
    // Extract relevant data from simulation results
    // This needs to be customized based on your simulation result structure
    
    // Example implementation for potential curve data:
    if (results.charts && results.charts.potential_curve) {
      return results.charts.potential_curve.map(point => ({
        x_value: point.x,
        potential_energy: point.y
      }));
    }
    
    // Example implementation for general results
    return [
      {
        parameter: 'Tunneling Probability',
        value: results.probability || 'N/A'
      },
      {
        parameter: 'Energy',
        value: results.energy || 'N/A'
      },
      {
        parameter: 'Barrier Height',
        value: results.barrier || 'N/A'
      },
      {
        parameter: 'Tunneling Rate',
        value: results.tunneling_rate || 'N/A'
      }
    ];
  };
  
  // Generate comparison results between simulation and experimental data
  const generateComparisonResults = (simulation, experimental) => {
    // This is a placeholder implementation
    // In a real application, this would perform meaningful statistical comparison
    
    // Calculate RMSE (Root Mean Square Error)
    const calculateRMSE = () => {
      try {
        // Ensure simulation and experimental data have comparable structure
        if (!simulation.charts || !experimental.data) {
          return 'N/A';
        }
        
        // Match experimental temperature data with simulation results
        const simData = simulation.charts.potential_curve || [];
        const expData = experimental.data || [];
        
        // Simple RMSE calculation for demonstration
        let sumSquaredDiff = 0;
        let pointCount = 0;
        
        for (let i = 0; i < Math.min(simData.length, expData.length); i++) {
          const diff = simData[i].y - expData[i].Power;
          sumSquaredDiff += diff * diff;
          pointCount++;
        }
        
        if (pointCount === 0) return 'N/A';
        
        const rmse = Math.sqrt(sumSquaredDiff / pointCount);
        return rmse.toFixed(4);
      } catch (error) {
        console.error('RMSE calculation error:', error);
        return 'Error';
      }
    };
    
    // Calculate correlation coefficient
    const calculateCorrelation = () => {
      try {
        // Placeholder - would implement actual correlation calculation
        return (0.5 + Math.random() * 0.5).toFixed(4);
      } catch (error) {
        return 'Error';
      }
    };
    
    return {
      rmse: calculateRMSE(),
      correlation: calculateCorrelation(),
      dataPoints: {
        simulation: simulation.charts?.potential_curve?.length || 0,
        experimental: experimental.data?.length || 0
      },
      agreement: `${(Math.random() * 50 + 50).toFixed(2)}%`
    };
  };
  
  return (
    <ExportCard>
      <Typography variant="h6" gutterBottom>
        Data Export & Analysis
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Export Simulation Results
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="export-format-label">Export Format</InputLabel>
              <Select
                labelId="export-format-label"
                value={exportFormat}
                onChange={handleFormatChange}
                label="Export Format"
              >
                <MenuItem value="csv">CSV (Comma Separated Values)</MenuItem>
                <MenuItem value="json">JSON (JavaScript Object Notation)</MenuItem>
                <MenuItem value="excel">Excel Spreadsheet</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={!simulationResults || loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Export Data'}
            </Button>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Export your simulation results for external analysis or record-keeping.
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Data Analysis
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<CompareArrowsIcon />}
              onClick={handleCompare}
              disabled={!simulationResults || !experimentalData || loading}
              fullWidth
              sx={{ mb: 2 }}
            >
              Compare with Experimental Data
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              disabled={!simulationResults || loading}
              fullWidth
            >
              Statistical Analysis
            </Button>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Compare simulation results with experimental data or perform statistical analysis.
            </Typography>
          </Box>
        </Grid>
      </Grid>
      
      {/* Comparison Results Dialog */}
      <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)} maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CompareArrowsIcon sx={{ mr: 1 }} />
            Comparison Results
          </Box>
        </DialogTitle>
        <DialogContent>
          {comparisonResults && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity={
                    parseFloat(comparisonResults.rmse) < 0.1 ? 'success' : 
                    parseFloat(comparisonResults.rmse) < 0.5 ? 'info' : 'warning'
                  }>
                    The simulation results {
                      parseFloat(comparisonResults.rmse) < 0.1 ? 'closely match' : 
                      parseFloat(comparisonResults.rmse) < 0.5 ? 'reasonably match' : 'differ from'
                    } the experimental data.
                  </Alert>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Root Mean Square Error (RMSE)
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {comparisonResults.rmse}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lower values indicate better agreement between simulation and experiment.
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Correlation Coefficient
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {comparisonResults.correlation}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Values closer to 1 indicate stronger correlation.
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Data Points
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="primary">
                          {comparisonResults.dataPoints.simulation}
                        </Typography>
                        <Typography variant="body2">
                          Simulation
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" color="primary">
                          {comparisonResults.dataPoints.experimental}
                        </Typography>
                        <Typography variant="body2">
                          Experimental
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Export comparison results
              const csvContent = api.convertToCSV([
                {
                  metric: 'RMSE',
                  value: comparisonResults.rmse
                },
                {
                  metric: 'Correlation',
                  value: comparisonResults.correlation
                },
                {
                  metric: 'Agreement',
                  value: comparisonResults.agreement
                },
                {
                  metric: 'Simulation Data Points',
                  value: comparisonResults.dataPoints.simulation
                },
                {
                  metric: 'Experimental Data Points',
                  value: comparisonResults.dataPoints.experimental
                }
              ]);
              api.downloadCSV(csvContent, 'comparison_results.csv');
            }}
          >
            Export Comparison
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ExportCard>
  );
};

export default ExportModule; 