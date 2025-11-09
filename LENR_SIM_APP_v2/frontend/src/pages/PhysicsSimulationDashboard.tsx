import { useState, useCallback, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Divider,
  Snackbar,
  Alert,
  Button,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  DashboardControlsPanel, 
  SimulationStatisticsPanel, 
  DashboardLatticeVisualization, 
  RealTimeDataDashboard,
  ReactionDynamicsVisualization,
  DataExportPanel
} from '../components/visualizations';
import { useSimulationStatus, useSimulationResults } from '../api/physics/hooks';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

/**
 * Physics Simulation Dashboard
 * 
 * A comprehensive dashboard for visualizing and analyzing physics simulation results.
 * Includes control panels, statistics, and various visualization components.
 */
const PhysicsSimulationDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Current simulation state
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [visualizationType, setVisualizationType] = useState<'energy' | 'temperature' | 'reaction_rate'>('energy');
  const [alert, setAlert] = useState<{ message: string; severity: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Fetch simulation data
  const { status, isLoading: statusLoading, refetchStatus } = useSimulationStatus(simulationId);
  const { results, isLoading: resultsLoading, refetchResults } = useSimulationResults(simulationId);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle filter changes from the controls panel
  const handleFilterChange = useCallback((filters: any) => {
    console.log('Filters changed:', filters);
    
    // Apply filters to the current view
    if (filters.visualizationType !== visualizationType) {
      setVisualizationType(filters.visualizationType);
    }
    
    // Additional filter handling logic would go here
  }, [visualizationType]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = useCallback((type: 'energy' | 'temperature' | 'reaction_rate') => {
    setVisualizationType(type);
  }, []);
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchStatus();
    refetchResults();
    setAlert({ message: 'Dashboard data refreshed', severity: 'success' });
  }, [refetchStatus, refetchResults]);
  
  // Handle fullscreen toggle for visualization
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  // Select a simulation when none is selected
  useEffect(() => {
    // For demo purposes, we'll just use a hardcoded ID
    // In a real app, this would come from a selector or URL parameter
    if (!simulationId) {
      setSimulationId('sim-12345');
    }
  }, [simulationId]);
  
  // Close alert after timeout
  const handleCloseAlert = () => {
    setAlert(null);
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dashboard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Physics Simulation Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Comprehensive visualization and analysis of LENR simulation results
        </Typography>
      </Box>
      
      <Grid container spacing={3} sx={{ flexGrow: 1, mb: 4 }}>
        {/* Controls Panel - Left Sidebar */}
        {!isFullscreen && (
          <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 3' } }}>
            <DashboardControlsPanel
              simulationId={simulationId}
              onFilterChange={handleFilterChange}
              onVisualizationTypeChange={handleVisualizationTypeChange}
              onRefresh={handleRefresh}
            />
          </Grid>
        )}
        
        {/* Main Dashboard Content */}
        <Grid sx={{ gridColumn: { xs: 'span 12', md: isFullscreen ? 'span 12' : 'span 9' }, display: 'flex', flexDirection: 'column' }}>
          {/* Statistics Overview */}
          {!isFullscreen && (
            <Grid sx={{ gridColumn: 'span 12', mb: 3 }}>
              <SimulationStatisticsPanel
                simulationId={simulationId}
                isCompact={true}
                height={200}
              />
            </Grid>
          )}
          
          {/* Main Visualization Area */}
          <Grid sx={{ gridColumn: 'span 12', flexGrow: 1 }}>
            <Paper sx={{ height: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  aria-label="dashboard tabs"
                  variant={isMobile ? 'scrollable' : 'fullWidth'}
                  scrollButtons={isMobile ? 'auto' : undefined}
                >
                  <Tab label="3D Visualization" {...a11yProps(0)} />
                  <Tab label="Real-time Data" {...a11yProps(1)} />
                  <Tab label="Reaction Dynamics" {...a11yProps(2)} />
                  <Tab label="Statistics" {...a11yProps(3)} />
                  <Tab label="Data Export" {...a11yProps(4)} />
                </Tabs>
              </Box>
              
              {/* Tab Panels */}
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                {/* 3D Visualization Tab */}
                <TabPanel value={activeTab} index={0}>
                  <DashboardLatticeVisualization
                    simulationId={simulationId}
                    onFullscreenClick={toggleFullscreen}
                    height={isFullscreen ? 'calc(100vh - 200px)' : 500}
                  />
                </TabPanel>
                
                {/* Real-time Data Tab */}
                <TabPanel value={activeTab} index={1}>
                  <RealTimeDataDashboard 
                    simulationId={simulationId}
                    height={isFullscreen ? 'calc(100vh - 200px)' : 500}
                  />
                </TabPanel>
                
                {/* Reaction Dynamics Tab */}
                <TabPanel value={activeTab} index={2}>
                  <ReactionDynamicsVisualization 
                    reaction={{
                      type: 'deuterium-deuterium',
                      elements: ['D', 'D'],
                      products: ['He-3', 'n'],
                      crossSection: 'baryon'
                    }}
                    parameters={{
                      temperature: 300,
                      pressure: 1.0,
                      latticeConstant: 4.05,
                      screening: 5.0
                    }}
                  />
                </TabPanel>
                
                {/* Statistics Tab - Detailed View */}
                <TabPanel value={activeTab} index={3}>
                  <SimulationStatisticsPanel
                    simulationId={simulationId}
                    height={isFullscreen ? 'calc(100vh - 200px)' : 500}
                  />
                </TabPanel>
                
                {/* Data Export Tab */}
                <TabPanel value={activeTab} index={4}>
                  <DataExportPanel
                    simulationId={simulationId}
                  />
                </TabPanel>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Alert/Notification */}
      <Snackbar 
        open={alert !== null} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {alert && (
          <Alert 
            onClose={handleCloseAlert} 
            severity={alert.severity} 
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
};

export default PhysicsSimulationDashboard; 