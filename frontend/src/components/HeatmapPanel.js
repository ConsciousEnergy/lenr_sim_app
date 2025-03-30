import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button, 
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider
} from '@mui/material';
import { getHeatmap } from '../api/api';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExportButton from './common/ExportButton';
import { exportHeatmapAsCSV } from '../api/export';

const HeatmapPanel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [params, setParams] = useState({
    T_min: 100,
    T_max: 1000,
    lambda_min: 1e-11,
    lambda_max: 1e-9,
    r0: 1e-10,
    k_spring: 1000,
    potential: 'harmonic',
    resolution: 20
  });

  const handleChange = (param) => (event) => {
    const value = event.target.value;
    setParams({
      ...params,
      [param]: value
    });
  };
  
  const handleSliderChange = (param) => (event, newValue) => {
    setParams({
      ...params,
      [param]: newValue
    });
  };
  
  const handleGenerateHeatmap = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getHeatmap(params);
      
      // Transform data for Recharts
      const formattedData = [];
      
      for (let i = 0; i < response.y_values.length; i++) {
        for (let j = 0; j < response.x_values.length; j++) {
          formattedData.push({
            x: response.x_values[j],
            y: response.y_values[i],
            z: response.grid_values[i][j],
            value: Math.pow(10, response.grid_values[i][j]) // Convert log back to probability
          });
        }
      }
      
      setHeatmapData({
        data: formattedData,
        xLabel: response.x_label,
        yLabel: response.y_label,
        metadata: response.metadata,
        rawResponse: response // Keep the raw response for CSV export
      });
    } catch (error) {
      console.error('Error generating heatmap:', error);
      setError('Failed to generate heatmap. Please try different parameters.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportCSV = () => {
    if (heatmapData) {
      exportHeatmapAsCSV(heatmapData, `heatmap_${params.potential}_${params.resolution}`);
    }
  };
  
  // Format a number to scientific notation
  const formatScientific = (value) => {
    return value.toExponential(2);
  };
  
  // Custom tooltip for the heatmap
  const HeatmapTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1 }}>
          <Typography variant="body2">λ: {formatScientific(data.x)} m</Typography>
          <Typography variant="body2">T: {data.y} K</Typography>
          <Typography variant="body2">
            Probability: {formatScientific(data.value)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Tunneling Probability Heatmap
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Parameter Range Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Temperature Range (K)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="T Min"
                  type="number"
                  value={params.T_min}
                  onChange={handleChange('T_min')}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="T Max"
                  type="number"
                  value={params.T_max}
                  onChange={handleChange('T_max')}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Lambda Range (m)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="λ Min"
                  value={formatScientific(params.lambda_min)}
                  onChange={handleChange('lambda_min')}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="λ Max"
                  value={formatScientific(params.lambda_max)}
                  onChange={handleChange('lambda_max')}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Resolution: {params.resolution}</Typography>
            <Slider
              value={params.resolution}
              onChange={handleSliderChange('resolution')}
              min={10}
              max={50}
              step={5}
              marks={[
                { value: 10, label: '10' },
                { value: 30, label: '30' },
                { value: 50, label: '50' }
              ]}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Potential Type</InputLabel>
              <Select
                value={params.potential}
                onChange={handleChange('potential')}
                label="Potential Type"
              >
                <MenuItem value="harmonic">Harmonic</MenuItem>
                <MenuItem value="morse">Morse</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleGenerateHeatmap}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Generating...' : 'Generate Heatmap'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, height: 500 }}>
        {heatmapData && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ExportButton 
              data={heatmapData} 
              buttonText="Export Heatmap" 
              fileName={`heatmap_${params.potential}_${params.resolution}`}
            />
          </Box>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : heatmapData ? (
          <Box height="100%">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{
                  top: 20,
                  right: 20,
                  bottom: 40,
                  left: 80,
                }}
              >
                <CartesianGrid />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={heatmapData.xLabel}
                  tickFormatter={formatScientific}
                  label={{ 
                    value: heatmapData.xLabel, 
                    position: 'bottom', 
                    offset: 10 
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={heatmapData.yLabel}
                  label={{ 
                    value: heatmapData.yLabel, 
                    angle: -90, 
                    position: 'left', 
                    offset: -60 
                  }}
                />
                <ZAxis 
                  type="number" 
                  dataKey="z" 
                  range={[-30, 0]} 
                />
                <Tooltip content={<HeatmapTooltip />} />
                <Scatter 
                  name="Tunneling Probability" 
                  data={heatmapData.data} 
                  fill="#8884d8"
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography color="text.secondary">
              Set parameters and generate a heatmap to visualize
            </Typography>
          </Box>
        )}
      </Paper>
      
      {heatmapData && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Computation Metadata
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(heatmapData.metadata).map(([key, value]) => (
              <Grid item xs={6} md={4} key={key}>
                <Typography variant="body2" color="text.secondary">
                  {key.replace(/_/g, ' ').toUpperCase()}:
                </Typography>
                <Typography variant="body2">
                  {typeof value === 'number' && key.includes('time') 
                    ? value.toFixed(2) + 's' 
                    : String(value)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default HeatmapPanel; 