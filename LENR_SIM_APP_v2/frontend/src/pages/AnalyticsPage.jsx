import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  Tooltip,
  Alert,
  AlertTitle,
  Divider,
  Stack,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Download as DownloadIcon,
  Compare as CompareIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Stat Card Component
const StatCard = ({ title, value, unit, icon: Icon, color, trend }) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
              {value}
              {unit && <Typography component="span" variant="body1" color="text.secondary"> {unit}</Typography>}
            </Typography>
            {trend && (
              <Chip
                size="small"
                icon={<TrendingUpIcon />}
                label={trend}
                color="success"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color || theme.palette.primary.main, 0.1),
            }}
          >
            <Icon sx={{ color: color || theme.palette.primary.main, fontSize: 28 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const AnalyticsPage = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedSimulations, setSelectedSimulations] = useState([]);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load simulation history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('lenr_simulation_history');
        if (stored) {
          setSimulationHistory(JSON.parse(stored));
        } else {
          // Generate sample data for demo
          const sampleData = generateSampleHistory();
          setSimulationHistory(sampleData);
          localStorage.setItem('lenr_simulation_history', JSON.stringify(sampleData));
        }
      } catch (error) {
        console.error('Error loading simulation history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, []);
  
  // Generate sample simulation history for demonstration
  const generateSampleHistory = () => {
    const types = ['Quantum Tunneling', 'Fusion', 'LENR', 'Bubble Fusion'];
    const statuses = ['completed', 'completed', 'completed', 'failed'];
    const materials = ['Palladium', 'Nickel', 'Titanium', 'Platinum'];
    
    return Array.from({ length: 25 }, (_, i) => ({
      id: `sim-${Date.now() - i * 86400000}`,
      type: types[i % types.length],
      status: statuses[Math.floor(Math.random() * 10) > 1 ? 0 : 3],
      material: materials[i % materials.length],
      temperature: 300 + Math.random() * 500,
      pressure: 1 + Math.random() * 10,
      enhancementFactor: Math.random() * 100 + 1,
      fusionRate: Math.random() * 1e-15,
      energyOutput: Math.random() * 100,
      duration: Math.random() * 10 + 1,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      parameters: {
        loadingRatio: 0.5 + Math.random() * 0.5,
        defectDensity: Math.random() * 0.2
      }
    }));
  };
  
  // Aggregate statistics
  const stats = useMemo(() => {
    if (!simulationHistory.length) return null;
    
    const completed = simulationHistory.filter(s => s.status === 'completed');
    const totalSimulations = simulationHistory.length;
    const successRate = (completed.length / totalSimulations * 100).toFixed(1);
    const avgEnhancement = completed.reduce((acc, s) => acc + s.enhancementFactor, 0) / completed.length;
    const avgFusionRate = completed.reduce((acc, s) => acc + s.fusionRate, 0) / completed.length;
    const totalEnergy = completed.reduce((acc, s) => acc + s.energyOutput, 0);
    
    // Type distribution
    const typeDistribution = simulationHistory.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalSimulations,
      successRate,
      avgEnhancement: avgEnhancement.toFixed(2),
      avgFusionRate: avgFusionRate.toExponential(2),
      totalEnergy: totalEnergy.toFixed(2),
      typeDistribution
    };
  }, [simulationHistory]);
  
  // Chart data for time series
  const chartData = useMemo(() => {
    return simulationHistory
      .filter(s => s.status === 'completed')
      .slice(0, 20)
      .reverse()
      .map((s, i) => ({
        name: `Sim ${i + 1}`,
        enhancement: s.enhancementFactor,
        energy: s.energyOutput,
        temperature: s.temperature
      }));
  }, [simulationHistory]);
  
  // Pie chart data
  const pieData = useMemo(() => {
    if (!stats?.typeDistribution) return [];
    return Object.entries(stats.typeDistribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [stats]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSelectSimulation = (id) => {
    setSelectedSimulations(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };
  
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Status', 'Material', 'Temperature (K)', 'Pressure (atm)', 'Enhancement Factor', 'Fusion Rate', 'Energy Output (keV)', 'Timestamp'];
    const rows = simulationHistory.map(s => [
      s.id,
      s.type,
      s.status,
      s.material,
      s.temperature.toFixed(2),
      s.pressure.toFixed(2),
      s.enhancementFactor.toFixed(4),
      s.fusionRate.toExponential(4),
      s.energyOutput.toFixed(4),
      s.timestamp
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lenr_simulations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleExportJSON = () => {
    const dataToExport = selectedSimulations.length > 0
      ? simulationHistory.filter(s => selectedSimulations.includes(s.id))
      : simulationHistory;
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lenr_simulations_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all simulation history?')) {
      localStorage.removeItem('lenr_simulation_history');
      setSimulationHistory([]);
    }
  };
  
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const stored = localStorage.getItem('lenr_simulation_history');
      if (stored) {
        setSimulationHistory(JSON.parse(stored));
      }
      setLoading(false);
    }, 500);
  };
  
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading analytics...</Typography>
      </Container>
    );
  }
  
  if (!simulationHistory.length) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>No Simulation Data</AlertTitle>
          Run some simulations first to see analytics data here. Visit the simulation pages to get started.
        </Alert>
        <Button variant="contained" href="/dashboard">
          Go to Dashboard
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analyze simulation results, compare experiments, and export data
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Simulations"
            value={stats?.totalSimulations || 0}
            icon={ScienceIcon}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Success Rate"
            value={stats?.successRate || 0}
            unit="%"
            icon={TrendingUpIcon}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Enhancement"
            value={stats?.avgEnhancement || 0}
            unit="×"
            icon={AssessmentIcon}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Energy Output"
            value={stats?.totalEnergy || 0}
            unit="keV"
            icon={TimelineIcon}
            color={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" />
          <Tab label="Simulation History" />
          <Tab label="Comparison" />
          <Tab label="Export" />
        </Tabs>
      </Paper>
      
      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Enhancement Factor Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Enhancement Factor Over Time</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="enhancement" stroke="#8884d8" name="Enhancement Factor" />
                  <Line type="monotone" dataKey="energy" stroke="#82ca9d" name="Energy Output (keV)" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Type Distribution Pie Chart */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>Simulation Types</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [`${value} simulations`, name]} />
                  <Legend 
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Temperature vs Enhancement Bar Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, height: 350 }}>
              <Typography variant="h6" gutterBottom>Temperature Distribution</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="temperature" fill="#8884d8" name="Temperature (K)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Simulation History Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Simulation History</Typography>
            <Stack direction="row" spacing={1}>
              <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button startIcon={<DeleteIcon />} color="error" onClick={handleClearHistory}>
                Clear History
              </Button>
            </Stack>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSimulations(simulationHistory.map(s => s.id));
                        } else {
                          setSelectedSimulations([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Temp (K)</TableCell>
                  <TableCell align="right">Enhancement</TableCell>
                  <TableCell align="right">Energy (keV)</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {simulationHistory
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <TableRow key={row.id} hover selected={selectedSimulations.includes(row.id)}>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedSimulations.includes(row.id)}
                          onChange={() => handleSelectSimulation(row.id)}
                        />
                      </TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status}
                          color={row.status === 'completed' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{row.material}</TableCell>
                      <TableCell align="right">{row.temperature.toFixed(1)}</TableCell>
                      <TableCell align="right">{row.enhancementFactor.toFixed(2)}×</TableCell>
                      <TableCell align="right">{row.energyOutput.toFixed(3)}</TableCell>
                      <TableCell>{new Date(row.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={simulationHistory.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </TabPanel>
      
      {/* Comparison Tab */}
      <TabPanel value={activeTab} index={2}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Select 2 or more simulations from the History tab to compare them side by side.
        </Alert>
        
        {selectedSimulations.length >= 2 ? (
          <Grid container spacing={3}>
            {selectedSimulations.slice(0, 4).map(id => {
              const sim = simulationHistory.find(s => s.id === id);
              if (!sim) return null;
              
              return (
                <Grid item xs={12} md={6} lg={3} key={id}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      {sim.type}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Material:</Typography>
                        <Typography variant="body2">{sim.material}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Temperature:</Typography>
                        <Typography variant="body2">{sim.temperature.toFixed(1)} K</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Pressure:</Typography>
                        <Typography variant="body2">{sim.pressure.toFixed(2)} atm</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Enhancement:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {sim.enhancementFactor.toFixed(2)}×
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Energy Output:</Typography>
                        <Typography variant="body2">{sim.energyOutput.toFixed(3)} keV</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Fusion Rate:</Typography>
                        <Typography variant="body2">{sim.fusionRate.toExponential(2)}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CompareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select simulations to compare
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Go to the History tab and check at least 2 simulations
            </Typography>
          </Paper>
        )}
      </TabPanel>
      
      {/* Export Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Export as CSV</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export all simulation data as a comma-separated values file for use in spreadsheet applications.
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
              >
                Download CSV
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Export as JSON</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export simulation data as JSON with full parameter details.
                {selectedSimulations.length > 0 && ` (${selectedSimulations.length} selected)`}
              </Typography>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportJSON}
              >
                Download JSON
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Alert severity="info">
              <AlertTitle>Tip</AlertTitle>
              Select specific simulations from the History tab to export only those results.
              Otherwise, all simulation data will be exported.
            </Alert>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default AnalyticsPage;

