import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Tabs,
  Tab,
  Button,
  Stack,
  Typography,
  Tooltip,
  Alert,
  AlertTitle,
  CircularProgress,
  Select,
  MenuItem,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import DownloadIcon from '@mui/icons-material/Download';
import AreaChartIcon from '@mui/icons-material/AreaChart';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import SyncIcon from '@mui/icons-material/Sync';
import ApiIcon from '@mui/icons-material/Api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { createVisualizationWebSocket, registerVisualizationListener, unregisterVisualizationListener } from '../utils/visualizationWebSocket';

/**
 * Component for displaying simulation results with real-time updates
 *
 * @param {Object} props Component props
 * @param {string} props.simulationId The ID of the simulation
 * @param {string} props.apiBaseUrl Base URL for the API
 * @param {boolean} props.autoUpdate Whether to automatically update
 * @param {number} props.updateInterval Update interval in milliseconds
 * @param {Object} props.initialData Initial data to display
 */
const SimulationResults = ({
  simulationId,
  apiBaseUrl = '',
  autoUpdate = true,
  updateInterval = 5000,
  initialData = null
}) => {
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData || {
    timeSeriesData: [],
    tableData: [],
    statistics: {}
  });
  const [isUpdating, setIsUpdating] = useState(autoUpdate);
  const [selectedVariable, setSelectedVariable] = useState('temperature');
  const [chartType, setChartType] = useState('line');
  const [usingWebSocket, setUsingWebSocket] = useState(false);
  const [activeTab, setActiveTab] = useState('charts');

  // Table sorting/pagination state
  const [orderBy, setOrderBy] = useState('time');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // References
  const updateTimerRef = useRef(null);
  const dataFetchCountRef = useRef(0);
  const webSocketRef = useRef(null);

  // Define available variables for visualization
  const variables = [
    { key: 'temperature', label: 'Temperature (K)', color: '#ff7300' },
    { key: 'pressure', label: 'Pressure (atm)', color: '#00bcd4' },
    { key: 'energy', label: 'Energy (eV)', color: '#8884d8' },
    { key: 'reactionRate', label: 'Reaction Rate', color: '#82ca9d' },
    { key: 'neutronCount', label: 'Neutron Count', color: '#ff5252' },
    { key: 'deuteriumConcentration', label: 'Deuterium Concentration', color: '#9c27b0' }
  ];

  // Generate mock data for demonstration
  const generateMockData = () => {
    const mockTimeSeriesData = [];
    const now = new Date();

    // Generate more data points for continuous data display
    for (let i = 0; i < 100; i++) {
      const time = i * 0.5; // Time in seconds
      const timestamp = new Date(now.getTime() - (100 - i) * 500).toISOString();

      // Base values with some natural-looking fluctuations
      const baseTemp = 300 + Math.sin(i / 10) * 20;
      const basePressure = 1 + Math.cos(i / 15) * 0.2;
      const baseEnergy = 0.1 + Math.sin(i / 5) * 0.05;

      // Add some noise and trends
      const temperatureNoise = Math.random() * 5 - 2.5;
      const pressureNoise = Math.random() * 0.1 - 0.05;
      const energyNoise = Math.random() * 0.02 - 0.01;

      // Include some threshold-triggered events
      const temperatureSpike = i > 50 && i < 60 ? 30 : 0;
      const energySpike = i > 70 && i < 75 ? 0.2 : 0;

      // Calculate final values
      const temperature = baseTemp + temperatureNoise + temperatureSpike + (i > 20 ? i * 0.1 : 0);
      const pressure = basePressure + pressureNoise + (i > 30 ? i * 0.005 : 0);
      const energy = baseEnergy + energyNoise + energySpike;
      const reactionRate = Math.max(0, (energy * temperature) / (1000 * pressure) + Math.random() * 0.1);
      const neutronCount = Math.floor(reactionRate * 100) + Math.floor(Math.random() * 5);
      const deuteriumConcentration = 0.8 - i * 0.001 - Math.random() * 0.02;

      mockTimeSeriesData.push({
        time,
        timestamp,
        temperature,
        pressure,
        energy,
        reactionRate,
        neutronCount,
        deuteriumConcentration
      });
    }

    return {
      timeSeriesData: mockTimeSeriesData,
      tableData: mockTimeSeriesData.filter((_, i) => i % 10 === 0), // Subset for table display
      statistics: {
        maxTemperature: Math.max(...mockTimeSeriesData.map(d => d.temperature)),
        minTemperature: Math.min(...mockTimeSeriesData.map(d => d.temperature)),
        avgTemperature: mockTimeSeriesData.reduce((sum, d) => sum + d.temperature, 0) / mockTimeSeriesData.length,
        maxEnergy: Math.max(...mockTimeSeriesData.map(d => d.energy)),
        totalNeutrons: mockTimeSeriesData.reduce((sum, d) => sum + d.neutronCount, 0),
        peakReactionRate: Math.max(...mockTimeSeriesData.map(d => d.reactionRate))
      }
    };
  };

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    if (!simulationId) return false;

    try {
      // Get or create the WebSocket connection
      const wsInstance = createVisualizationWebSocket(apiBaseUrl);

      // Store reference
      webSocketRef.current = wsInstance;

      // Setup event handlers
      wsInstance.onConnected(() => {
        console.log('WebSocket connected for simulation results');
        setUsingWebSocket(true);

        // Subscribe to simulation events
        wsInstance.subscribeToSimulation(simulationId);
      });

      wsInstance.onDisconnected(() => {
        console.log('WebSocket disconnected for simulation results');
        setUsingWebSocket(false);

        // Fall back to polling if auto-update is enabled
        if (isUpdating) {
          startPolling();
        }
      });

      wsInstance.onError((err) => {
        console.error('WebSocket error for simulation results:', err);
        setUsingWebSocket(false);

        // Fall back to polling if auto-update is enabled
        if (isUpdating) {
          startPolling();
        }
      });

      // Register visualization event listener
      registerVisualizationListener(simulationId, handleWebSocketEvent);

      // Connect if not already connected
      if (!wsInstance.getConnectionStatus()) {
        wsInstance.connect();
      } else {
        setUsingWebSocket(true);
        // Subscribe to simulation events
        wsInstance.subscribeToSimulation(simulationId);
      }

      return true;
    } catch (err) {
      console.error('Failed to initialize WebSocket for simulation results:', err);
      return false;
    }
  };

  // Handle incoming WebSocket events
  const handleWebSocketEvent = (event) => {
    // Only process data update events
    if (event.type === 'data_update' || event.type === 'simulation_data') {
      dataFetchCountRef.current += 1;

      // Process the data from the event
      if (event.data) {
        processSimulationData(event.data);
      }
    }
  };

  // Process simulation data (used for both WebSocket and API responses)
  const processSimulationData = (newData) => {
    if (!newData) return;

    try {
      // Check if this is just new points or a complete dataset
      if (Array.isArray(newData.timeSeriesData) && newData.timeSeriesData.length > 0) {
        // Full dataset
        setData(newData);
      } else if (Array.isArray(newData) && newData.length > 0) {
        // Just new data points to append
        setData(prevData => {
          // Keep a maximum of 100 points to avoid performance issues
          const updatedTimeSeries = [...prevData.timeSeriesData, ...newData].slice(-100);

          // Update statistics
          const statistics = {
            maxTemperature: Math.max(...updatedTimeSeries.map(d => d.temperature)),
            minTemperature: Math.min(...updatedTimeSeries.map(d => d.temperature)),
            avgTemperature: updatedTimeSeries.reduce((sum, d) => sum + d.temperature, 0) / updatedTimeSeries.length,
            maxEnergy: Math.max(...updatedTimeSeries.map(d => d.energy)),
            totalNeutrons: updatedTimeSeries.reduce((sum, d) => sum + d.neutronCount, 0),
            peakReactionRate: Math.max(...updatedTimeSeries.map(d => d.reactionRate))
          };

          return {
            timeSeriesData: updatedTimeSeries,
            tableData: updatedTimeSeries.filter((_, i) => i % 10 === 0), // Update table data too
            statistics
          };
        });
      }
    } catch (err) {
      console.error('Error processing simulation data:', err);
    }
  };

  // Start polling mechanism
  const startPolling = () => {
    // Clear any existing timer
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    // Set up a new polling interval
    updateTimerRef.current = setInterval(fetchData, updateInterval);
  };

  // Stop polling mechanism
  const stopPolling = () => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  };

  // Fetch data from the API (mock implementation)
  const fetchData = async () => {
    try {
      setError(null);

      // In a real implementation, this would make an API call
      // For now, we'll generate mock data with some random variations for real-time simulation

      // Increment the fetch counter
      dataFetchCountRef.current += 1;

      // If we have existing data, append some new points
      if (data.timeSeriesData.length > 0) {
        // Generate some new data points
        const newDataPoints = [];
        const lastTime = data.timeSeriesData[data.timeSeriesData.length - 1].time;
        const now = new Date();

        for (let i = 1; i <= 5; i++) {
          const time = lastTime + i * 0.5;
          const timestamp = new Date(now.getTime() + i * 500).toISOString();

          // Base the new values partially on the most recent values for continuity
          const lastPoint = data.timeSeriesData[data.timeSeriesData.length - 1];
          const randomFactor = 0.05; // 5% random variation

          const temperature = lastPoint.temperature * (1 + (Math.random() - 0.5) * randomFactor) + 0.1;
          const pressure = lastPoint.pressure * (1 + (Math.random() - 0.5) * randomFactor);
          const energy = lastPoint.energy * (1 + (Math.random() - 0.5) * randomFactor) + 0.001;
          const reactionRate = Math.max(0, (energy * temperature) / (1000 * pressure) + Math.random() * 0.1);
          const neutronCount = Math.floor(reactionRate * 100) + Math.floor(Math.random() * 5);
          const deuteriumConcentration = lastPoint.deuteriumConcentration - 0.001 * Math.random();

          newDataPoints.push({
            time,
            timestamp,
            temperature,
            pressure,
            energy,
            reactionRate,
            neutronCount,
            deuteriumConcentration
          });
        }

        // Process the new data points
        processSimulationData(newDataPoints);
      } else {
        // Generate initial mock data
        const mockData = generateMockData();
        setData(mockData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching simulation results:', err);
      setError('Failed to fetch simulation results. Please try again.');
      setLoading(false);
    }
  };

  // Set up data fetching on mount
  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Try to establish WebSocket connection
    const webSocketInitialized = initializeWebSocket();

    // Fall back to polling if WebSocket initialization fails
    if (!webSocketInitialized && isUpdating) {
      startPolling();
    }

    // Cleanup on unmount
    return () => {
      // Stop polling
      stopPolling();

      // Cleanup WebSocket
      if (webSocketRef.current) {
        const ws = webSocketRef.current;
        // Unsubscribe from simulation
        ws.unsubscribeFromSimulation(simulationId);
        // Unregister event listener
        unregisterVisualizationListener(simulationId, handleWebSocketEvent);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  // Handle changes to isUpdating state
  useEffect(() => {
    if (isUpdating) {
      // Try WebSocket first, fall back to polling
      if (!usingWebSocket && !initializeWebSocket()) {
        startPolling();
      }
    } else {
      // Stop all update mechanisms
      stopPolling();

      // We don't disconnect WebSocket - just unsubscribe if needed
      if (webSocketRef.current) {
        webSocketRef.current.unsubscribeFromSimulation(simulationId);
      }
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpdating, simulationId]);

  // Toggle auto-updating
  const toggleAutoUpdate = () => {
    setIsUpdating(prev => !prev);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const handleSort = (columnKey) => {
    if (orderBy === columnKey) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(columnKey);
      setOrder('asc');
    }
  };

  // Sorted + paginated rows for the data table
  const sortedTableData = useMemo(() => {
    const rows = [...data.tableData];
    rows.sort((a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return order === 'asc' ? -1 : 1;
      if (av > bv) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data.tableData, orderBy, order]);

  const paginatedTableData = sortedTableData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Render the appropriate chart based on the selected chart type
  const renderChart = () => {
    const chartData = data.timeSeriesData;
    const variable = variables.find(v => v.key === selectedVariable);

    if (!chartData || chartData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="body2">No data available</Typography>
        </Box>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{ value: 'Time (seconds)', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                label={{
                  value: variable.label,
                  angle: -90,
                  position: 'insideLeft'
                }}
              />
              <RechartsTooltip
                formatter={(value) => [value.toFixed(4), variable.label]}
                labelFormatter={(time) => `Time: ${time.toFixed(2)}s`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedVariable}
                stroke={variable.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{ value: 'Time (seconds)', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                label={{
                  value: variable.label,
                  angle: -90,
                  position: 'insideLeft'
                }}
              />
              <RechartsTooltip
                formatter={(value) => [value.toFixed(4), variable.label]}
                labelFormatter={(time) => `Time: ${time.toFixed(2)}s`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={selectedVariable}
                stroke={variable.color}
                fill={variable.color}
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar': {
        // For bar chart, we'll use a subset of the data to avoid overcrowding
        const barChartData = chartData.filter((_, index) => index % 10 === 0);

        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{ value: 'Time (seconds)', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                label={{
                  value: variable.label,
                  angle: -90,
                  position: 'insideLeft'
                }}
              />
              <RechartsTooltip
                formatter={(value) => [value.toFixed(4), variable.label]}
                labelFormatter={(time) => `Time: ${time.toFixed(2)}s`}
              />
              <Legend />
              <Bar
                dataKey={selectedVariable}
                fill={variable.color}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'scatter': {
        // For scatter plot, we'll plot the selected variable against temperature (or another variable)
        const yAxis = selectedVariable === 'temperature' ? 'energy' : 'temperature';
        const yAxisLabel = selectedVariable === 'temperature'
          ? variables.find(v => v.key === 'energy').label
          : variables.find(v => v.key === 'temperature').label;

        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={selectedVariable}
                name={variable.label}
                label={{ value: variable.label, position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                dataKey={yAxis}
                name={yAxisLabel}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft'
                }}
              />
              <ZAxis dataKey="time" range={[50, 200]} name="Time" unit="s" />
              <RechartsTooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [value.toFixed(4), name]}
              />
              <Legend />
              <Scatter
                name="Simulation Data"
                data={chartData}
                fill={variable.color}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
      }

      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedVariable}
                stroke={variable.color}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card>
      <CardHeader
        avatar={<ShowChartIcon />}
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <span>Simulation Results</span>
            {isUpdating && <SyncIcon fontSize="small" sx={{ color: 'primary.main', animation: 'spin 1.5s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />}
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 1 }}>
            {usingWebSocket && (
              <Chip size="small" color="success" label="Real-time" />
            )}

            <Tooltip title={isUpdating ? 'Pause Auto-update' : 'Enable Auto-update'}>
              <Button
                variant={isUpdating ? 'contained' : 'outlined'}
                size="small"
                startIcon={<SyncIcon />}
                onClick={toggleAutoUpdate}
              >
                {isUpdating ? 'Auto-updating' : 'Auto-update'}
              </Button>
            </Tooltip>

            <Tooltip title="Refresh Data">
              <Button
                variant="outlined"
                size="small"
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </Tooltip>

            <Tooltip title="Download Data">
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  // In a real application, this would download the data
                  console.log('Download data:', data);
                }}
              >
                Export
              </Button>
            </Tooltip>
          </Stack>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab value="charts" icon={<ShowChartIcon />} iconPosition="start" label="Charts" />
          <Tab value="table" icon={<TableChartIcon />} iconPosition="start" label="Data Table" />
        </Tabs>

        {activeTab === 'charts' && (
          loading && !data.timeSeriesData.length ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={48} />
              <Typography sx={{ mt: 2 }}>Loading simulation data...</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">Variable:</Typography>
                  <Select
                    size="small"
                    value={selectedVariable}
                    onChange={(e) => setSelectedVariable(e.target.value)}
                    sx={{ width: 240 }}
                  >
                    {variables.map(variable => (
                      <MenuItem key={variable.key} value={variable.key}>
                        {variable.label}
                      </MenuItem>
                    ))}
                  </Select>

                  <Divider orientation="vertical" flexItem />

                  <Typography variant="body2" fontWeight="bold">Chart Type:</Typography>
                  <ToggleButtonGroup
                    value={chartType}
                    exclusive
                    size="small"
                    onChange={(e, val) => { if (val) setChartType(val); }}
                  >
                    <ToggleButton value="line"><ShowChartIcon fontSize="small" sx={{ mr: 0.5 }} /> Line</ToggleButton>
                    <ToggleButton value="area"><AreaChartIcon fontSize="small" sx={{ mr: 0.5 }} /> Area</ToggleButton>
                    <ToggleButton value="bar"><BarChartIcon fontSize="small" sx={{ mr: 0.5 }} /> Bar</ToggleButton>
                    <ToggleButton value="scatter"><ScatterPlotIcon fontSize="small" sx={{ mr: 0.5 }} /> Scatter</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1.25, borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" component="div">
                    <strong>Data points:</strong> {data.timeSeriesData.length} &nbsp;&nbsp;|&nbsp;&nbsp;
                    <strong>Last update:</strong> {new Date().toLocaleTimeString()} &nbsp;&nbsp;|&nbsp;&nbsp;
                    <strong>Updates:</strong> {dataFetchCountRef.current} &nbsp;&nbsp;|&nbsp;&nbsp;
                    <strong>Source:</strong>{' '}
                    {usingWebSocket ? (
                      <Box component="span" sx={{ color: 'success.main', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        WebSocket <ApiIcon fontSize="inherit" />
                      </Box>
                    ) : (
                      <Box component="span" sx={{ color: 'warning.main' }}>Polling</Box>
                    )}
                  </Typography>
                </Box>
              </Box>

              {renderChart()}

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>Key Statistics</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.entries(data.statistics).map(([key, value]) => (
                    <Paper
                      key={key}
                      variant="outlined"
                      sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, minWidth: 200 }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </Typography>
                      <Typography variant="h6" component="div" sx={{ fontSize: 16, fontWeight: 'bold' }}>
                        {typeof value === 'number' ? value.toFixed(4) : value}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </>
          )
        )}

        {activeTab === 'table' && (
          <Box sx={{ position: 'relative' }}>
            {loading && (
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={orderBy === 'time' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'time'}
                        direction={orderBy === 'time' ? order : 'asc'}
                        onClick={() => handleSort('time')}
                      >
                        Time (s)
                      </TableSortLabel>
                    </TableCell>
                    {variables.map(variable => (
                      <TableCell key={variable.key} align="right" sortDirection={orderBy === variable.key ? order : false}>
                        <TableSortLabel
                          active={orderBy === variable.key}
                          direction={orderBy === variable.key ? order : 'asc'}
                          onClick={() => handleSort(variable.key)}
                        >
                          {variable.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTableData.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.time}</TableCell>
                      {variables.map(variable => (
                        <TableCell key={variable.key} align="right">
                          {item[variable.key] != null ? item[variable.key].toFixed(4) : 'N/A'}
                        </TableCell>
                      ))}
                      <TableCell>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedTableData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={variables.length + 2} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sortedTableData.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SimulationResults;
