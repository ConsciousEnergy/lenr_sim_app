import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  Grid, 
  CircularProgress, 
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  useTheme
} from '@mui/material';
import { RealTimeLineChart } from './';
import { useSimulationResults } from '../../api/physics/hooks';
// Type definitions
interface SimulationStatisticsPanelProps {
  simulationId: string | null;
  isCompact?: boolean;
  title?: string;
  height?: number | string;
  width?: number | string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}

// Define a more accurate structure for simulation results
interface SimulationData {
  id: string;
  status: string;
  progress: number;
  start_time: string;
  end_time?: string;
  results?: {
    energy_distribution?: number[];
    temperature_profile?: number[];
    reaction_rates?: Record<string, number>;
    power_density?: number;
    enhancement_factors?: Record<string, number>;
  }
}

/**
 * A card displaying a single metric value with optional trend indicator
 */
const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  trend = 'neutral',
  isLoading = false 
}) => {
  const theme = useTheme();
  
  // Determine color based on trend
  const trendColor = trend === 'up' 
    ? theme.palette.success.main
    : trend === 'down' 
      ? theme.palette.error.main
      : theme.palette.text.secondary;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading...</Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="h5" component="div" sx={{ color: trendColor }}>
              {value}{unit && <Typography variant="caption" sx={{ ml: 0.5 }}>{unit}</Typography>}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Simulation Statistics Panel Component
 * 
 * Displays statistical information about a simulation, including
 * key metrics, histograms, and data analysis.
 */
const SimulationStatisticsPanel: React.FC<SimulationStatisticsPanelProps> = ({
  simulationId,
  isCompact = false,
  title = 'Simulation Statistics',
  height = 'auto',
  width = '100%'
}) => {
  // Fetch simulation results
  const { results, isLoading, error: fetchError } = useSimulationResults(simulationId);
  const [error, setError] = useState<string | null>(null);
  
  // State for statistical data
  const [stats, setStats] = useState<any>({
    energy: { min: 0, max: 0, avg: 0, current: 0 },
    temperature: { min: 0, max: 0, avg: 0, current: 0 },
    reactionRate: { min: 0, max: 0, avg: 0, current: 0 },
    powerDensity: { value: 0, unit: 'W/cm³' },
    efficiencyFactor: { value: 0 },
    timeSteps: { completed: 0, total: 0 },
    convergenceRate: { value: 0, unit: '%' }
  });
  
  // Time series data for charts
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  
  // Process simulation results into statistical data
  useEffect(() => {
    if (!results) return;
    
    // Extract key data points for statistics
    try {
      // Basic statistics from results
      const newStats = { ...stats };
      const simData = results as unknown as SimulationData;
      
      // Energy statistics
      if (simData?.results?.energy_distribution) {
        const energyValues = simData.results.energy_distribution;
        newStats.energy = {
          min: Math.min(...energyValues),
          max: Math.max(...energyValues),
          avg: energyValues.reduce((sum: number, val: number) => sum + val, 0) / energyValues.length,
          current: energyValues[energyValues.length - 1]
        };
      }
      
      // Temperature statistics
      if (simData?.results?.temperature_profile) {
        const tempValues = simData.results.temperature_profile;
        newStats.temperature = {
          min: Math.min(...tempValues),
          max: Math.max(...tempValues),
          avg: tempValues.reduce((sum: number, val: number) => sum + val, 0) / tempValues.length,
          current: tempValues[tempValues.length - 1]
        };
      }
      
      // Reaction rate statistics
      if (simData?.results?.reaction_rates) {
        const rateValues = Object.values(simData.results.reaction_rates) as number[];
        newStats.reactionRate = {
          min: Math.min(...rateValues),
          max: Math.max(...rateValues),
          avg: rateValues.reduce((sum: number, val: number) => sum + val, 0) / rateValues.length,
          current: rateValues[rateValues.length - 1] || 0
        };
      }
      
      // Power density
      if (simData?.results?.power_density !== undefined) {
        newStats.powerDensity = {
          value: simData.results.power_density,
          unit: 'W/cm³'
        };
      }
      
      // Enhancement factors (efficiency)
      if (simData?.results?.enhancement_factors) {
        const enhancementFactors = Object.values(simData.results.enhancement_factors) as number[];
        newStats.efficiencyFactor = {
          value: enhancementFactors.reduce((sum: number, val: number) => sum + val, 0) / enhancementFactors.length
        };
      }
      
      // Time steps
      newStats.timeSteps = {
        completed: simData.progress || 0,
        total: 100  // Assuming progress is a percentage
      };
      
      // Convergence rate (made up example)
      newStats.convergenceRate = {
        value: (simData.progress || 0) > 0 ? 100 - (100 / (simData.progress || 1)) : 0,
        unit: '%'
      };
      
      setStats(newStats);
      
      // Generate time series data for charts
      if (simData?.results?.temperature_profile && simData?.results?.energy_distribution) {
        const tempSeries = {
          id: 'temperature',
          name: 'Temperature',
          unit: 'K',
          color: '#FF5722',
          data: simData.results.temperature_profile.map((value: number, index: number) => ({
            timestamp: index * 100, // Dummy timestamp
            value
          }))
        };
        
        const energySeries = {
          id: 'energy',
          name: 'Energy',
          unit: 'eV',
          color: '#2196F3',
          data: simData.results.energy_distribution.map((value: number, index: number) => ({
            timestamp: index * 100, // Dummy timestamp
            value
          }))
        };
        
        setTimeSeriesData([tempSeries, energySeries]);
      }
    } catch (err) {
      console.error('Error processing simulation statistics:', err);
      setError('Error processing simulation data');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
  
  // Render compact mode (for overview panel)
  if (isCompact) {
    return (
      <Box sx={{ 
        width, 
        height, 
        position: 'relative'
      }}>
        {isLoading && (
          <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
        )}
        
        <Grid container spacing={2}>
          <Grid sx={{ gridColumn: { xs: 'span 6', md: 'span 4' } }}>
            <MetricCard
              title="Avg. Temperature"
              value={stats.temperature.avg.toFixed(1)}
              unit="K"
              isLoading={isLoading}
              trend={stats.temperature.current > stats.temperature.avg ? 'up' : 'down'}
            />
          </Grid>
          
          <Grid sx={{ gridColumn: { xs: 'span 6', md: 'span 4' } }}>
            <MetricCard
              title="Power Density"
              value={stats.powerDensity.value.toFixed(3)}
              unit={stats.powerDensity.unit}
              isLoading={isLoading}
            />
          </Grid>
          
          <Grid sx={{ gridColumn: { xs: 'span 6', md: 'span 4' } }}>
            <MetricCard
              title="Efficiency Factor"
              value={stats.efficiencyFactor.value.toFixed(2)}
              isLoading={isLoading}
            />
          </Grid>
          
          <Grid sx={{ gridColumn: { xs: 'span 12' } }}>
            <Box sx={{ mt: 2, height: 150 }}>
              {timeSeriesData.length > 0 && (
                <RealTimeLineChart
                  dataSeries={timeSeriesData}
                  height={150}
                  allowZoom={false}
                  showLegend={false}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  }
  
  // Render full statistics panel
  return (
    <Paper
      elevation={2}
      sx={{
        width,
        height,
        overflow: 'auto',
        p: 3
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        {title}
      </Typography>
      
      {(error || fetchError) && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading simulation data: {error || (typeof fetchError === 'string' ? fetchError : fetchError instanceof Error ? fetchError.message : String(fetchError))}
        </Typography>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : !simulationId ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
          No simulation selected
        </Typography>
      ) : (
        <>
          {/* Key Performance Indicators */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Key Performance Indicators
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <MetricCard
                title="Power Density"
                value={stats.powerDensity.value.toFixed(3)}
                unit={stats.powerDensity.unit}
              />
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <MetricCard
                title="Efficiency Factor"
                value={stats.efficiencyFactor.value.toFixed(2)}
              />
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <MetricCard
                title="Convergence"
                value={stats.convergenceRate.value.toFixed(1)}
                unit="%"
                trend={stats.convergenceRate.value > 90 ? 'up' : 'neutral'}
              />
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <MetricCard
                title="Simulation Progress"
                value={stats.timeSteps.completed}
                unit="%"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Statistical Summary */}
          <Typography variant="h6" gutterBottom>
            Statistical Summary
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Temperature (K)
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Minimum</Typography>
                      <Typography variant="body2">{stats.temperature.min.toFixed(1)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Maximum</Typography>
                      <Typography variant="body2">{stats.temperature.max.toFixed(1)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Average</Typography>
                      <Typography variant="body2">{stats.temperature.avg.toFixed(1)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Current</Typography>
                      <Typography variant="body2">{stats.temperature.current.toFixed(1)}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Energy (eV)
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Minimum</Typography>
                      <Typography variant="body2">{stats.energy.min.toFixed(3)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Maximum</Typography>
                      <Typography variant="body2">{stats.energy.max.toFixed(3)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Average</Typography>
                      <Typography variant="body2">{stats.energy.avg.toFixed(3)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Current</Typography>
                      <Typography variant="body2">{stats.energy.current.toFixed(3)}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Reaction Rate
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Minimum</Typography>
                      <Typography variant="body2">{stats.reactionRate.min.toFixed(5)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Maximum</Typography>
                      <Typography variant="body2">{stats.reactionRate.max.toFixed(5)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Average</Typography>
                      <Typography variant="body2">{stats.reactionRate.avg.toFixed(5)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Current</Typography>
                      <Typography variant="body2">{stats.reactionRate.current.toFixed(5)}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Data Visualization */}
          <Typography variant="h6" gutterBottom>
            Data Trends
          </Typography>
          
          <Box sx={{ height: 300, mb: 4 }}>
            {timeSeriesData.length > 0 ? (
              <RealTimeLineChart
                dataSeries={timeSeriesData}
                title="Temperature and Energy"
                height={300}
                allowZoom={true}
              />
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
                No time series data available
              </Typography>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
};

export default SimulationStatisticsPanel; 