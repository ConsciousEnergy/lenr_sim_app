import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Tabs, 
  Tab, 
  Divider, 
  IconButton, 
  Button,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { RealTimeDataDashboard, DashboardLatticeVisualization, SimulationStatisticsPanel } from '../visualizations';
import { simulationApi } from '../../api/simulation';

// Theoretical Enhancement Components (Sections 2.3.1, 2.8.1, 3.3, 5.1.1)
import QEDVisualization from '../physics/QEDVisualization';
import PhononNuclearPanel from '../physics/PhononNuclearPanel';
import ThermodynamicsPanel from '../physics/ThermodynamicsPanel';
import StatisticalAnalysisPanel from '../physics/StatisticalAnalysisPanel';

// Interface for the TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// TabPanel component for switching between different dashboard views
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%', pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Helper function for tab accessibility
const a11yProps = (index: number) => {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
};

// Main props interface for the dashboard
interface PhysicsSimulationDashboardProps {
  simulationId: string | null;
  title?: string;
  height?: number | string;
  width?: number | string;
}

/**
 * Physics Simulation Results Dashboard
 * 
 * A comprehensive dashboard for displaying simulation results, including
 * visualizations, charts, statistics, and control panels.
 */
const PhysicsSimulationDashboard: React.FC<PhysicsSimulationDashboardProps> = ({
  simulationId,
  title = 'Physics Simulation Results',
  height = '80vh',
  width = '100%'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for tab navigation
  const [tabIndex, setTabIndex] = useState(0);
  
  // State for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // State for simulation data
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch simulation data
  useEffect(() => {
    const fetchSimulationData = async () => {
      if (!simulationId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch simulation results
        const results = await simulationApi.getSimulationResults(simulationId);
        setSimulationData(results);
      } catch (err) {
        console.error('Error fetching simulation data:', err);
        setError('Failed to load simulation data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSimulationData();
  }, [simulationId]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Refresh data
  const refreshData = async () => {
    if (!simulationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch simulation results
      const results = await simulationApi.getSimulationResults(simulationId);
      setSimulationData(results);
    } catch (err) {
      console.error('Error refreshing simulation data:', err);
      setError('Failed to refresh simulation data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Export simulation data
  const exportData = async () => {
    if (!simulationId) return;
    
    try {
      await simulationApi.exportSimulation(simulationId, 'json');
    } catch (err) {
      console.error('Error exporting simulation data:', err);
      setError('Failed to export simulation data. Please try again.');
    }
  };
  
  return (
    <Paper
      elevation={3}
      sx={{
        width,
        height: isFullscreen ? '100vh' : height,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 1300 : 1,
        m: isFullscreen ? 0 : undefined,
        p: 2
      }}
    >
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">{title}</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isLoading && <CircularProgress size={24} />}
          
          <IconButton onClick={refreshData} disabled={isLoading || !simulationId}>
            <RefreshIcon />
          </IconButton>
          
          <IconButton onClick={exportData} disabled={!simulationData}>
            <DownloadIcon />
          </IconButton>
          
          <IconButton onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>
      </Box>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading or no data message */}
      {(!simulationData && !isLoading && !error) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No simulation data available. {simulationId ? 'Please refresh to try again.' : 'Please select a simulation.'}
        </Alert>
      )}
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="dashboard tabs"
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab label="Overview" {...a11yProps(0)} />
          <Tab label="Time Series" {...a11yProps(1)} />
          <Tab label="Lattice" {...a11yProps(2)} />
          <Tab label="Statistics" {...a11yProps(3)} />
          <Tab label="Parameters" {...a11yProps(4)} />
          <Tab label="QED Theory" {...a11yProps(5)} />
          <Tab label="Phonon-Nuclear" {...a11yProps(6)} />
          <Tab label="Thermodynamics" {...a11yProps(7)} />
          <Tab label="Statistical Analysis" {...a11yProps(8)} />
        </Tabs>
      </Box>
      
      {/* Dashboard Content */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Overview Tab */}
        <TabPanel value={tabIndex} index={0}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid sx={{ gridColumn: 'span 12', gridRow: 'span 1' }}>
              <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Simulation Summary</Typography>
                {simulationData ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Paper elevation={1} sx={{ p: 2, flex: '1 1 200px' }}>
                      <Typography variant="subtitle2">Status</Typography>
                      <Typography variant="body1">{simulationData.status}</Typography>
                    </Paper>
                    
                    <Paper elevation={1} sx={{ p: 2, flex: '1 1 200px' }}>
                      <Typography variant="subtitle2">Progress</Typography>
                      <Typography variant="body1">{simulationData.progress}%</Typography>
                    </Paper>
                    
                    <Paper elevation={1} sx={{ p: 2, flex: '1 1 200px' }}>
                      <Typography variant="subtitle2">Duration</Typography>
                      <Typography variant="body1">
                        {simulationData.end_time && simulationData.start_time 
                          ? `${Math.round((new Date(simulationData.end_time).getTime() - new Date(simulationData.start_time).getTime()) / 1000)} seconds` 
                          : 'Running...'}
                      </Typography>
                    </Paper>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {isLoading ? 'Loading...' : 'No data available'}
                  </Typography>
                )}
              </Paper>
            </Grid>
            
            <Grid sx={{ gridColumn: 'span 6', gridRow: 'span 3' }}>
              <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Key Metrics</Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  <SimulationStatisticsPanel
                    simulationId={simulationId}
                    isCompact={true}
                    height="100%"
                  />
                </Box>
              </Paper>
            </Grid>
            
            {/* Lattice Preview */}
            <Grid sx={{ gridColumn: 'span 12', gridRow: 'span 6' }}>
              <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Lattice Preview</Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  <DashboardLatticeVisualization
                    simulationId={simulationId}
                    title="Lattice Structure"
                    isPreview={true}
                    height="100%"
                    onFullscreenClick={() => setTabIndex(2)} // Navigate to Lattice tab
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Time Series Tab */}
        <TabPanel value={tabIndex} index={1}>
          <Box sx={{ height: '100%' }}>
            {simulationId ? (
              <RealTimeDataDashboard
                simulationId={simulationId}
                title="Time Series Data"
                height="100%"
              />
            ) : (
              <Paper elevation={1} sx={{ p: 4, textAlign: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                  No simulation selected
                </Typography>
              </Paper>
            )}
          </Box>
        </TabPanel>
        
        {/* Lattice Tab */}
        <TabPanel value={tabIndex} index={2}>
          <Box sx={{ height: '100%', p: 1 }}>
            <DashboardLatticeVisualization
              simulationId={simulationId}
              title="Lattice Structure Analysis"
              height="100%"
            />
          </Box>
        </TabPanel>
        
        {/* Statistics Tab */}
        <TabPanel value={tabIndex} index={3}>
          <Box sx={{ height: '100%' }}>
            <SimulationStatisticsPanel
              simulationId={simulationId}
              title="Simulation Statistics and Analysis"
              height="100%"
            />
          </Box>
        </TabPanel>
        
        {/* Parameters Tab */}
        <TabPanel value={tabIndex} index={4}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Simulation Parameters</Typography>
            {simulationData?.parameters ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(simulationData.parameters).map(([key, value]: [string, any]) => (
                  <Paper key={key} elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle2">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Typography>
                    <Typography variant="body1">
                      {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {isLoading ? 'Loading parameters...' : 'No parameter data available'}
              </Typography>
            )}
          </Paper>
        </TabPanel>
        
        {/* QED Theory Tab - Section 2.3.1 */}
        <TabPanel value={tabIndex} index={5}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <QEDVisualization />
          </Box>
        </TabPanel>
        
        {/* Phonon-Nuclear Coupling Tab - Section 2.8.1 */}
        <TabPanel value={tabIndex} index={6}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <PhononNuclearPanel />
          </Box>
        </TabPanel>
        
        {/* Thermodynamics Tab - Section 3.3 */}
        <TabPanel value={tabIndex} index={7}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <ThermodynamicsPanel />
          </Box>
        </TabPanel>
        
        {/* Statistical Analysis Tab - Section 5.1.1 */}
        <TabPanel value={tabIndex} index={8}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <StatisticalAnalysisPanel />
          </Box>
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default PhysicsSimulationDashboard; 