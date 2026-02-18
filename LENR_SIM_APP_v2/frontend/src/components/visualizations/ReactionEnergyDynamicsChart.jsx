import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  ZoomOut as ZoomOutIcon,
  DownloadTwoTone as DownloadIcon,
  RestartAlt as ResetIcon,
  LineAxisTwoTone as ChartTypeIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Brush,
  ReferenceArea
} from 'recharts';

/**
 * Reaction Energy Dynamics Chart Component
 * 
 * Provides interactive visualization of reaction energy dynamics including
 * cross-sections, energy distributions, and reaction rates with zoom, pan,
 * and custom view capabilities.
 */
const ReactionEnergyDynamicsChart = ({ 
  reaction,
  parameters,
  dataType = 'cross-section' // 'cross-section', 'energy', 'rate'
}) => {
  const [chartType, setChartType] = useState('line'); // 'line', 'area', 'scatter'
  const [selectedDataType, setSelectedDataType] = useState(dataType);
  const [zoomState, setZoomState] = useState({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    top: 'dataMax+1',
    bottom: 'dataMin-1',
    animation: true,
  });
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // Generate data based on data type
  const generateData = () => {
    const data = [];
    
    // Simplified example data generation
    // In a real app, this would fetch data from the API
    switch (selectedDataType) {
      case 'cross-section':
        // Generate cross-section data
        for (let energy = 0.01; energy <= 100; energy *= 1.2) {
          // Simple cross-section model based on energy
          // σ ∝ 1/E * exp(-B/√E) where B is related to the Coulomb barrier
          const barrier = 1.44 * reaction.reactant1_z * reaction.reactant2_z / 
            (1.4 * (Math.pow(reaction.reactant1_a, 1/3) + Math.pow(reaction.reactant2_a, 1/3)));
          
          const crossSection = (1/energy) * Math.exp(-barrier/Math.sqrt(energy));
          
          data.push({
            energy,
            crossSection, 
            gamow: energy * Math.exp(-barrier/Math.sqrt(energy))
          });
        }
        break;
      
      case 'energy':
        // Generate energy distribution data
        for (let energy = 0; energy <= reaction.q_value * 1.5; energy += reaction.q_value / 30) {
          // Simple Maxwell-Boltzmann-like distribution
          const temperature = parameters?.temperature || 10; // keV
          const distribution = Math.sqrt(energy) * Math.exp(-energy/temperature);
          
          data.push({
            energy,
            distribution,
            cumulativeYield: energy/(reaction.q_value * 1.5)
          });
        }
        break;
      
      case 'rate':
        // Generate reaction rate vs time data
        for (let time = 0; time <= 10; time += 0.2) {
          // Simple time evolution of reaction rate
          const rate = (1 - Math.exp(-time/2)) * Math.exp(-time/parameters?.confinementTime || 5);
          const energy = reaction.q_value * rate;
          
          data.push({
            time,
            rate,
            energy,
            temperature: parameters?.temperature * (1 - 0.1 * Math.exp(-time/3))
          });
        }
        break;
      
      default:
        break;
    }
    
    return data;
  };
  
  const chartData = generateData();
  
  // Handle zooming functionality
  const handleZoomIn = () => {
    if (zoomState.refAreaLeft === zoomState.refAreaRight || !zoomState.refAreaRight) {
      setZoomState({
        ...zoomState,
        refAreaLeft: '',
        refAreaRight: '',
      });
      return;
    }

    // Ensure left is always less than right
    let left = Math.min(zoomState.refAreaLeft, zoomState.refAreaRight);
    let right = Math.max(zoomState.refAreaLeft, zoomState.refAreaRight);

    setZoomState({
      ...zoomState,
      refAreaLeft: '',
      refAreaRight: '',
      left: left,
      right: right,
    });
  };

  const handleZoomOut = () => {
    setZoomState({
      ...zoomState,
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'dataMax+1',
      bottom: 'dataMin-1',
    });
  };

  const handleMouseDown = (e) => {
    if (!e) return;
    setZoomState({
      ...zoomState,
      refAreaLeft: e.activeLabel,
    });
  };

  const handleMouseMove = (e) => {
    if (!e) return;
    if (zoomState.refAreaLeft) {
      setZoomState({
        ...zoomState,
        refAreaRight: e.activeLabel,
      });
    }
  };

  const handleMouseUp = () => {
    if (zoomState.refAreaLeft === zoomState.refAreaRight || !zoomState.refAreaRight) {
      setZoomState({
        ...zoomState,
        refAreaLeft: '',
        refAreaRight: '',
      });
      return;
    }

    handleZoomIn();
  };
  
  // Handle point selection
  const handlePointClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      setSelectedPoint(data.activePayload[0].payload);
    }
  };
  
  // Handle chart type change
  const handleChartTypeChange = (event, newChartType) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  };
  
  // Handle data type change
  const handleDataTypeChange = (event) => {
    setSelectedDataType(event.target.value);
    setSelectedPoint(null); // Reset selected point when changing data type
  };
  
  // Configure chart properties based on data type
  const getChartConfig = () => {
    switch (selectedDataType) {
      case 'cross-section':
        return {
          xAxisKey: 'energy',
          xAxisLabel: 'Energy (keV)',
          yAxisLabel: 'Cross-section (barns)',
          primaryDataKey: 'crossSection',
          primaryName: 'Cross-section',
          secondaryDataKey: 'gamow',
          secondaryName: 'Gamow Peak'
        };
      
      case 'energy':
        return {
          xAxisKey: 'energy',
          xAxisLabel: 'Energy (MeV)',
          yAxisLabel: 'Probability Density',
          primaryDataKey: 'distribution',
          primaryName: 'Energy Distribution',
          secondaryDataKey: 'cumulativeYield',
          secondaryName: 'Cumulative Yield'
        };
      
      case 'rate':
        return {
          xAxisKey: 'time',
          xAxisLabel: 'Time (s)',
          yAxisLabel: 'Reaction Rate (s⁻¹)',
          primaryDataKey: 'rate',
          primaryName: 'Reaction Rate',
          secondaryDataKey: 'energy',
          secondaryName: 'Energy Output'
        };
      
      default:
        return {
          xAxisKey: 'energy',
          xAxisLabel: 'Energy (keV)',
          yAxisLabel: 'Value',
          primaryDataKey: 'value',
          primaryName: 'Data',
          secondaryDataKey: null,
          secondaryName: null
        };
    }
  };
  
  const chartConfig = getChartConfig();
  
  // Generate appropriate chart based on type
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handlePointClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={chartConfig.xAxisKey} 
              label={{ value: chartConfig.xAxisLabel, position: 'insideBottomRight', offset: -5 }}
              allowDataOverflow
              domain={[zoomState.left, zoomState.right]}
              type="number"
            />
            <YAxis 
              label={{ value: chartConfig.yAxisLabel, angle: -90, position: 'insideLeft' }}
              allowDataOverflow
              domain={[zoomState.bottom, zoomState.top]}
            />
            <RechartsTooltip 
              formatter={(value, name) => {
                return [value.toExponential(4), name];
              }}
            />
            <Legend verticalAlign="top" />
            <Line 
              type="monotone" 
              dataKey={chartConfig.primaryDataKey} 
              name={chartConfig.primaryName} 
              stroke="#1976d2" 
              dot={{ r: 2 }}
              activeDot={{ r: 6, onClick: handlePointClick }}
            />
            {chartConfig.secondaryDataKey && (
              <Line 
                type="monotone" 
                dataKey={chartConfig.secondaryDataKey} 
                name={chartConfig.secondaryName} 
                stroke="#f44336" 
                dot={{ r: 2 }}
                activeDot={{ r: 6, onClick: handlePointClick }}
              />
            )}
            
            {zoomState.refAreaLeft && zoomState.refAreaRight ? (
              <ReferenceArea 
                x1={zoomState.refAreaLeft} 
                x2={zoomState.refAreaRight} 
                strokeOpacity={0.3} 
                fill="#1976d2" 
                fillOpacity={0.3} 
              />
            ) : null}
            
            <Brush 
              dataKey={chartConfig.xAxisKey} 
              height={30} 
              stroke="#8884d8"
              startIndex={0}
              endIndex={Math.min(20, chartData.length - 1)}
            />
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handlePointClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={chartConfig.xAxisKey} 
              label={{ value: chartConfig.xAxisLabel, position: 'insideBottomRight', offset: -5 }}
              allowDataOverflow
              domain={[zoomState.left, zoomState.right]}
              type="number"
            />
            <YAxis 
              label={{ value: chartConfig.yAxisLabel, angle: -90, position: 'insideLeft' }}
              allowDataOverflow
              domain={[zoomState.bottom, zoomState.top]}
            />
            <RechartsTooltip 
              formatter={(value, name) => {
                return [value.toExponential(4), name];
              }}
            />
            <Legend verticalAlign="top" />
            <Area 
              type="monotone" 
              dataKey={chartConfig.primaryDataKey} 
              name={chartConfig.primaryName} 
              fill="#1976d2" 
              stroke="#1976d2"
              fillOpacity={0.3}
            />
            {chartConfig.secondaryDataKey && (
              <Area 
                type="monotone" 
                dataKey={chartConfig.secondaryDataKey} 
                name={chartConfig.secondaryName} 
                fill="#f44336" 
                stroke="#f44336"
                fillOpacity={0.3}
              />
            )}
            
            {zoomState.refAreaLeft && zoomState.refAreaRight ? (
              <ReferenceArea 
                x1={zoomState.refAreaLeft} 
                x2={zoomState.refAreaRight} 
                strokeOpacity={0.3} 
                fill="#1976d2" 
                fillOpacity={0.3} 
              />
            ) : null}
            
            <Brush 
              dataKey={chartConfig.xAxisKey} 
              height={30} 
              stroke="#8884d8"
            />
          </AreaChart>
        );
      
      case 'scatter':
        return (
          <ScatterChart
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handlePointClick}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={chartConfig.xAxisKey} 
              type="number" 
              name={chartConfig.xAxisLabel} 
              allowDataOverflow
              domain={[zoomState.left, zoomState.right]}
              label={{ value: chartConfig.xAxisLabel, position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              dataKey={chartConfig.primaryDataKey} 
              type="number" 
              name={chartConfig.yAxisLabel} 
              allowDataOverflow
              domain={[zoomState.bottom, zoomState.top]}
              label={{ value: chartConfig.yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            {chartConfig.secondaryDataKey && (
              <ZAxis 
                dataKey={chartConfig.secondaryDataKey} 
                type="number" 
                range={[50, 400]} 
                name={chartConfig.secondaryName} 
              />
            )}
            <RechartsTooltip 
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                return [value.toExponential(4), name];
              }}
            />
            <Legend verticalAlign="top" />
            <Scatter 
              name={chartConfig.primaryName} 
              data={chartData} 
              fill="#1976d2" 
              shape="circle"
            />
            
            {zoomState.refAreaLeft && zoomState.refAreaRight ? (
              <ReferenceArea 
                x1={zoomState.refAreaLeft} 
                x2={zoomState.refAreaRight} 
                strokeOpacity={0.3} 
                fill="#1976d2" 
                fillOpacity={0.3} 
              />
            ) : null}
          </ScatterChart>
        );
      
      default:
        return null;
    }
  };
  
  // Generate detail card for selected point
  const renderDataDetails = () => {
    if (!selectedPoint) return null;
    
    return (
      <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Data Point Details</Typography>
          <Grid container spacing={2}>
            {/* X-Axis Value */}
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">{chartConfig.xAxisLabel}:</Typography>
              <Typography variant="body1">
                {selectedPoint[chartConfig.xAxisKey].toFixed(4)}
              </Typography>
            </Grid>
            
            {/* Primary Y-Axis Value */}
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">{chartConfig.primaryName}:</Typography>
              <Typography variant="body1">
                {selectedPoint[chartConfig.primaryDataKey].toExponential(4)}
              </Typography>
            </Grid>
            
            {/* Secondary Y-Axis Value (if available) */}
            {chartConfig.secondaryDataKey && selectedPoint[chartConfig.secondaryDataKey] !== undefined && (
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">{chartConfig.secondaryName}:</Typography>
                <Typography variant="body1">
                  {selectedPoint[chartConfig.secondaryDataKey].toExponential(4)}
                </Typography>
              </Grid>
            )}
            
            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {selectedDataType === 'cross-section' && 'At this energy, the probability of nuclear reaction is proportional to the cross-section.'}
                {selectedDataType === 'energy' && 'This shows the energy distribution of reaction products.'}
                {selectedDataType === 'rate' && 'The reaction rate indicates how many reactions occur per second at this time point.'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Reaction Energy Dynamics
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Chart Type Selection */}
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="small"
          >
            <ToggleButton value="line">
              <Tooltip title="Line Chart">
                <ChartTypeIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="area">
              <Tooltip title="Area Chart">
                <ChartTypeIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="scatter">
              <Tooltip title="Scatter Chart">
                <ChartTypeIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          {/* Data Type Selection */}
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel>Data Type</InputLabel>
            <Select
              value={selectedDataType}
              label="Data Type"
              onChange={handleDataTypeChange}
            >
              <MenuItem value="cross-section">Cross-section</MenuItem>
              <MenuItem value="energy">Energy Distribution</MenuItem>
              <MenuItem value="rate">Reaction Rate</MenuItem>
            </Select>
          </FormControl>
          
          {/* Zoom Controls */}
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={handleZoomOut}>
              <ResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download Chart">
            <IconButton size="small" onClick={() => alert('Chart download functionality would be implemented here')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Chart Container */}
      <Box sx={{ width: '100%', height: 400, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>
      
      {/* Data Point Details */}
      {selectedPoint && renderDataDetails()}
      
      {/* Instructions */}
      <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
        • Click and drag horizontally to zoom in on a specific region
        • Click a data point to view detailed information
        • Use the brush control at the bottom to navigate through the data
        • Change chart type or data type using the controls above
      </Typography>
    </Box>
  );
};

export default ReactionEnergyDynamicsChart; 