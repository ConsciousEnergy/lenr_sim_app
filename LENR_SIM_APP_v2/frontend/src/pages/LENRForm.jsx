import React, { useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Tabs, Tab, Divider } from '@mui/material';
import SimulationForm from '../components/SimulationForm';
import SimpleSimulationForm from '../components/SimpleSimulationForm';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`lenr-tabpanel-${index}`}
      aria-labelledby={`lenr-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `lenr-tab-${index}`,
    'aria-controls': `lenr-tabpanel-${index}`,
  };
}

/**
 * LENRForm Component
 * Main page for LENR simulation form with visualization area
 */
const LENRForm = () => {
  const [tabValue, setTabValue] = useState(0);
  const [simulationData, setSimulationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSubmitSimple = (formData) => {
    setIsLoading(true);
    // Simulate sending form data to API and receiving visualization data
    setTimeout(() => {
      setSimulationData({
        id: `sim-${Date.now()}`,
        parameters: formData,
        status: 'initialized',
        createdAt: new Date().toISOString(),
        visualizationData: {
          type: '3d',
          nodes: 1000,
          renderTime: 0.5
        }
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmitAdvanced = (formData) => {
    setIsLoading(true);
    // Simulate sending form data to API and receiving visualization data
    setTimeout(() => {
      setSimulationData({
        id: `sim-${Date.now()}`,
        parameters: formData,
        status: 'initialized',
        createdAt: new Date().toISOString(),
        visualizationData: {
          type: '3d',
          nodes: 2000,
          renderTime: 0.8
        }
      });
      setIsLoading(false);
    }, 2000);
  };

  return (
    <Container maxWidth="lg">
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Paper elevation={2}>
            <Box>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="LENR simulation form tabs"
                variant="fullWidth"
              >
                <Tab label="New Simulation" {...a11yProps(0)} />
                <Tab label="Simulation Visualization" {...a11yProps(1)} />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <SimpleSimulationForm onSubmit={handleSubmitSimple} />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '400px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1
                }}
              >
                {isLoading ? (
                  <Typography variant="h6">Loading Visualization...</Typography>
                ) : simulationData ? (
                  <Typography variant="h6">
                    Visualization loaded for simulation ID: {simulationData.id}
                  </Typography>
                ) : (
                  <Typography variant="h6">
                    Select "Show 2D Charts" to view visualization data
                  </Typography>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ height: '100%', minHeight: '500px' }}>
            <Box p={3}>
              <Typography variant="h5" gutterBottom id="visualization-info-title">
                Visualization Info
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Simulation ID</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    {simulationData?.id || '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Current Stage</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    {simulationData?.status || '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Created At</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    {simulationData?.createdAt ? new Date(simulationData.createdAt).toLocaleString() : '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Duration</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    {simulationData?.parameters?.duration ? `${simulationData.parameters.duration}s` : '-'}
                  </Typography>
                </Grid>
              </Grid>
              
              {simulationData && (
                <Box mt={4}>
                  <Typography variant="h6" gutterBottom>
                    Simulation Parameters
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Temperature</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography>
                        {simulationData.parameters.temperature}K
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Pressure</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography>
                        {simulationData.parameters.pressure}Pa
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Material</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography>
                        {simulationData.parameters.material.charAt(0).toUpperCase() + 
                          simulationData.parameters.material.slice(1)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LENRForm; 