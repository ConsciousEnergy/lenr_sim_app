import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DataObjectIcon from '@mui/icons-material/DataObject';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteIcon from '@mui/icons-material/Delete';
import { Line } from 'react-chartjs-2';
import { 
  parseCSVToDataPoints, 
  validateExperimentalData, 
  fitExperimentalData,
  calculateFitMetrics
} from '../api/dataFitting';
import { ExportButton } from './common/ExportButton';

const ExperimentalDataPanel = ({ simulationResults, simulationParams, simulationType, isLoading }) => {
  const [experimentalData, setExperimentalData] = useState(null);
  const [dataPreview, setDataPreview] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [isFitting, setIsFitting] = useState(false);
  const [fitResults, setFitResults] = useState(null);
  const [fitError, setFitError] = useState(null);
  const [chartData, setChartData] = useState(null);

  // Process simulation results for the chart
  useEffect(() => {
    if (simulationResults && experimentalData) {
      updateChartData();
    }
  }, [simulationResults, experimentalData, fitResults]);

  const updateChartData = () => {
    const simData = simulationResults.energy_levels || simulationResults.results || [];
    
    const datasets = [
      {
        label: 'Simulation Results',
        data: simData.map(point => ({ x: point.time || point.x, y: point.energy || point.y })),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        pointRadius: 2,
        tension: 0.1
      }
    ];
    
    if (experimentalData) {
      datasets.push({
        label: 'Experimental Data',
        data: experimentalData,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        pointRadius: 3,
        tension: 0
      });
    }
    
    if (fitResults && fitResults.fitted_simulation) {
      datasets.push({
        label: 'Fitted Simulation',
        data: fitResults.fitted_simulation.map(point => ({ x: point.time || point.x, y: point.energy || point.y })),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        pointRadius: 2,
        tension: 0.1,
        borderDash: [5, 5]
      });
    }
    
    setChartData({
      datasets
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setUploadError(null);
    
    // Check file extension
    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const dataPoints = parseCSVToDataPoints(csvContent);
        
        // Validate the data
        const validation = validateExperimentalData(dataPoints);
        if (!validation.isValid) {
          setUploadError(validation.errors.join(', '));
          return;
        }
        
        // Set the experimental data and preview
        setExperimentalData(dataPoints);
        setDataPreview(dataPoints.slice(0, 5));
        
        // Reset any fit results when new data is uploaded
        setFitResults(null);
        setFitError(null);
      } catch (error) {
        setUploadError(`Error parsing CSV file: ${error.message}`);
      }
    };
    
    reader.onerror = () => {
      setUploadError('Error reading the file');
    };
    
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setExperimentalData(null);
    setDataPreview([]);
    setFitResults(null);
    setFitError(null);
    setUploadError(null);
  };

  const handleFitData = async () => {
    if (!experimentalData || !simulationParams || !simulationType) {
      setFitError('Missing data required for fitting');
      return;
    }
    
    try {
      setIsFitting(true);
      setFitError(null);
      
      // Call the API to perform the fitting
      const results = await fitExperimentalData(
        experimentalData,
        simulationParams,
        simulationType
      );
      
      setFitResults(results);
      
      // If we don't get fitted_simulation from the API, we can calculate fit metrics ourselves
      if (!results.metrics && simulationResults) {
        const simData = simulationResults.energy_levels || simulationResults.results || [];
        const simPoints = simData.map(point => ({
          x: point.time || point.x,
          y: point.energy || point.y
        }));
        
        const metrics = calculateFitMetrics(experimentalData, simPoints);
        results.metrics = metrics;
      }
    } catch (error) {
      setFitError(`Error fitting data: ${error.message}`);
    } finally {
      setIsFitting(false);
    }
  };

  const renderMetricsTable = () => {
    if (!fitResults || !fitResults.metrics) return null;
    
    const { metrics } = fitResults;
    
    return (
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>R² (Coefficient of Determination)</TableCell>
              <TableCell align="right">{metrics.r_squared.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>RMSE (Root Mean Square Error)</TableCell>
              <TableCell align="right">{metrics.rmse.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Mean Absolute Error</TableCell>
              <TableCell align="right">{metrics.mean_absolute_error.toFixed(4)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Data Points Compared</TableCell>
              <TableCell align="right">{metrics.data_points_compared}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderOptimizedParams = () => {
    if (!fitResults || !fitResults.optimized_params) return null;
    
    const { optimized_params, initial_params } = fitResults;
    
    return (
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Parameter</TableCell>
              <TableCell align="right">Initial Value</TableCell>
              <TableCell align="right">Optimized Value</TableCell>
              <TableCell align="right">Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(optimized_params).map(param => {
              const initialValue = initial_params[param] || 0;
              const optimizedValue = optimized_params[param];
              const percentChange = ((optimizedValue - initialValue) / initialValue) * 100;
              
              return (
                <TableRow key={param}>
                  <TableCell>{param}</TableCell>
                  <TableCell align="right">{initialValue.toFixed(4)}</TableCell>
                  <TableCell align="right">{optimizedValue.toFixed(4)}</TableCell>
                  <TableCell align="right">
                    <Chip 
                      size="small"
                      label={`${percentChange.toFixed(2)}%`}
                      color={Math.abs(percentChange) > 20 ? "warning" : "default"}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Experimental Data Fitting</Typography>
        {experimentalData && (
          <ExportButton 
            data={experimentalData} 
            buttonText="Export Experimental Data" 
            fileName="experimental_data"
            showCSV={true} 
            showJSON={true}
          />
        )}
      </Box>
      
      {uploadError && (
        <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>
      )}
      
      {fitError && (
        <Alert severity="error" sx={{ mb: 2 }}>{fitError}</Alert>
      )}
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <input
              accept=".csv"
              id="csv-upload"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="csv-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadFileIcon />}
                sx={{ mr: 1 }}
              >
                Upload CSV
              </Button>
            </label>
            
            {experimentalData && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearData}
                  sx={{ mr: 1 }}
                >
                  Clear Data
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CompareArrowsIcon />}
                  onClick={handleFitData}
                  disabled={isFitting || isLoading || !simulationResults}
                >
                  {isFitting ? 'Fitting...' : 'Fit Data'}
                </Button>
              </>
            )}
          </Box>
          
          {dataPreview.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Data Preview ({experimentalData?.length} points)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>X</TableCell>
                      <TableCell>Y</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataPreview.map((point, index) => (
                      <TableRow key={index}>
                        <TableCell>{point.x}</TableCell>
                        <TableCell>{point.y}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Grid>
        
        <Grid item xs={12} md={6}>
          {fitResults && renderMetricsTable()}
          {fitResults && renderOptimizedParams()}
        </Grid>
      </Grid>
      
      <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 300 }}>
        {(isLoading || isFitting) && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}>
            <CircularProgress />
          </Box>
        )}
        
        {chartData ? (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  type: 'linear',
                  position: 'bottom',
                  title: {
                    display: true,
                    text: 'X Axis'
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: 'Y Axis'
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top',
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return `${context.dataset.label}: (${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)})`;
                    }
                  }
                }
              }
            }}
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            flexDirection: 'column'
          }}>
            <DataObjectIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              Upload experimental data and run a simulation to compare results
            </Typography>
          </Box>
        )}
      </Box>
      
      {fitResults && fitResults.fitted_simulation && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <ExportButton 
            data={{
              experimental: experimentalData,
              simulation: simulationResults.energy_levels || simulationResults.results,
              fitted: fitResults.fitted_simulation,
              metrics: fitResults.metrics,
              optimized_params: fitResults.optimized_params
            }} 
            buttonText="Export All Fitting Data" 
            fileName={`fitting_results_${simulationType}`}
            showCSV={false} 
            showJSON={true}
          />
        </Box>
      )}
    </Paper>
  );
};

export default ExperimentalDataPanel; 