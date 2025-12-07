import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScienceIcon from '@mui/icons-material/Science';
import SpeedIcon from '@mui/icons-material/Speed';
import BoltIcon from '@mui/icons-material/Bolt';

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Color palette for charts
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

const AnalyticsPage = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [stats, setStats] = useState({});

  // Load simulation history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('simulationHistory');
        if (stored) {
          setSimulationHistory(JSON.parse(stored));
        } else {
          // Generate sample data for demonstration
          setSimulationHistory(generateSampleHistory());
        }
      } catch (e) {
        console.error('Failed to load simulation history:', e);
        setSimulationHistory(generateSampleHistory());
      }
    };
    loadHistory();
  }, []);

  // Calculate statistics
  useEffect(() => {
    if (simulationHistory.length > 0) {
      const totalSimulations = simulationHistory.length;
      const completedSimulations = simulationHistory.filter(s => s.status === 'completed').length;
      const avgDuration = simulationHistory.reduce((acc, s) => acc + (s.duration || 0), 0) / totalSimulations;
      const totalEnergy = simulationHistory.reduce((acc, s) => acc + (s.energyOutput || 0), 0);

      setStats({
        totalSimulations,
        completedSimulations,
        avgDuration: avgDuration.toFixed(1),
        totalEnergy: totalEnergy.toFixed(2),
        successRate: ((completedSimulations / totalSimulations) * 100).toFixed(1)
      });
    }
  }, [simulationHistory]);

  // Generate sample history data
  const generateSampleHistory = () => {
    const types = ['lenr', 'fusion', 'tunneling', 'bubble'];
    const statuses = ['completed', 'completed', 'completed', 'failed', 'completed'];
    const history = [];

    for (let i = 0; i < 20; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      history.push({
        id: `sim-${Date.now() - i * 3600000}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Simulation ${i + 1}`,
        type,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        date: new Date(Date.now() - i * 3600000 * 24).toISOString(),
        duration: 10 + Math.random() * 50,
        energyOutput: Math.random() * 10,
        temperature: 273 + Math.random() * 500,
        reactionRate: Math.random() * 0.1
      });
    }
    return history;
  };

  // Prepare data for simulation type distribution pie chart
  const getSimulationTypeData = () => {
    const typeCounts = {};
    simulationHistory.forEach(sim => {
      typeCounts[sim.type] = (typeCounts[sim.type] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: ((value / simulationHistory.length) * 100).toFixed(1)
    }));
  };

  // Prepare data for energy over time chart
  const getEnergyTrendData = () => {
    return simulationHistory
      .slice(0, 10)
      .reverse()
      .map((sim, index) => ({
        index: index + 1,
        name: `Sim ${index + 1}`,
        energy: sim.energyOutput?.toFixed(2) || 0,
        temperature: sim.temperature?.toFixed(0) || 0
      }));
  };

  // Prepare data for status distribution
  const getStatusData = () => {
    const statusCounts = {};
    simulationHistory.forEach(sim => {
      statusCounts[sim.status] = (statusCounts[sim.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  // Export data as JSON
  const handleExportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      statistics: stats,
      history: simulationHistory
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export data as CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Type', 'Status', 'Date', 'Duration (s)', 'Energy Output', 'Temperature (K)', 'Reaction Rate'];
    const rows = simulationHistory.map(sim => [
      sim.id,
      sim.name,
      sim.type,
      sim.status,
      sim.date,
      sim.duration?.toFixed(1),
      sim.energyOutput?.toFixed(4),
      sim.temperature?.toFixed(1),
      sim.reactionRate?.toFixed(6)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track and analyze your simulation performance and trends
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Export as JSON">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportJSON}
            >
              JSON
            </Button>
          </Tooltip>
          <Tooltip title="Export as CSV">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => setSimulationHistory(generateSampleHistory())}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScienceIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Simulations
                </Typography>
              </Box>
              <Typography variant="h4">{stats.totalSimulations || 0}</Typography>
              <Chip 
                label={`${stats.successRate || 0}% success rate`}
                size="small" 
                color="success" 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SpeedIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Avg Duration
                </Typography>
              </Box>
              <Typography variant="h4">{stats.avgDuration || 0}s</Typography>
              <Typography variant="caption" color="text.secondary">
                Per simulation run
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BoltIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Energy Output
                </Typography>
              </Box>
              <Typography variant="h4">{stats.totalEnergy || 0}</Typography>
              <Typography variant="caption" color="text.secondary">
                MeV cumulative
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Completed
                </Typography>
              </Box>
              <Typography variant="h4">{stats.completedSimulations || 0}</Typography>
              <Typography variant="caption" color="text.secondary">
                Successful runs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Overview" />
          <Tab label="History" />
          <Tab label="Comparison" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Simulation Type Distribution - Pie Chart with Legend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Simulation Type Distribution
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getSimulationTypeData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getSimulationTypeData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name, props) => [
                        `${value} simulations (${props.payload.percentage}%)`,
                        name
                      ]}
                    />
                    <Legend 
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value, entry) => (
                        <span style={{ color: theme.palette.text.primary }}>
                          {value} ({entry.payload.percentage}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Status Distribution - Bar Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getStatusData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {getStatusData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'Completed' ? '#4caf50' : '#f44336'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Energy Trend Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Energy Output Trend (Last 10 Simulations)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getEnergyTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="energy"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Energy Output (MeV)"
                      dot={{ fill: '#8884d8' }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Temperature (K)"
                      dot={{ fill: '#82ca9d' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* History Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Simulation History
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Duration (s)</TableCell>
                  <TableCell align="right">Energy Output</TableCell>
                  <TableCell align="right">Temperature (K)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {simulationHistory.map((sim) => (
                  <TableRow key={sim.id} hover>
                    <TableCell>{sim.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={sim.type.toUpperCase()} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sim.status}
                        size="small"
                        color={sim.status === 'completed' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{new Date(sim.date).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{sim.duration?.toFixed(1)}</TableCell>
                    <TableCell align="right">{sim.energyOutput?.toFixed(4)}</TableCell>
                    <TableCell align="right">{sim.temperature?.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Comparison Tab */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CompareArrowsIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="h6">
              Simulation Comparison
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            {/* Comparison by Type */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Average Energy Output by Type
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(() => {
                      const typeAvg = {};
                      const typeCounts = {};
                      simulationHistory.forEach(sim => {
                        if (!typeAvg[sim.type]) {
                          typeAvg[sim.type] = 0;
                          typeCounts[sim.type] = 0;
                        }
                        typeAvg[sim.type] += sim.energyOutput || 0;
                        typeCounts[sim.type]++;
                      });
                      return Object.entries(typeAvg).map(([type, total]) => ({
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        avgEnergy: (total / typeCounts[type]).toFixed(3)
                      }));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="avgEnergy" fill="#8884d8" name="Avg Energy (MeV)" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>

            {/* Comparison by Temperature */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Average Temperature by Type
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(() => {
                      const typeAvg = {};
                      const typeCounts = {};
                      simulationHistory.forEach(sim => {
                        if (!typeAvg[sim.type]) {
                          typeAvg[sim.type] = 0;
                          typeCounts[sim.type] = 0;
                        }
                        typeAvg[sim.type] += sim.temperature || 0;
                        typeCounts[sim.type]++;
                      });
                      return Object.entries(typeAvg).map(([type, total]) => ({
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        avgTemp: (total / typeCounts[type]).toFixed(0)
                      }));
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="avgTemp" fill="#82ca9d" name="Avg Temperature (K)" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
    </Container>
  );
};

export default AnalyticsPage;
