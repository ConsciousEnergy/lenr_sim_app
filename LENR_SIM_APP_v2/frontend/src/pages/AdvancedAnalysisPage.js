import React, { useState } from 'react';
import { 
  Grid,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import { usePhysics } from '../contexts/PhysicsContext';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdvancedAnalysisPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { 
    advancedPhysicsData, 
    simulationData, 
    fluidDynamicsData,
    isLoadingFluidData
  } = usePhysics();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderQuantumTunnelingSection = () => {
    if (!advancedPhysicsData?.quantumTunneling) {
      return (
        <Typography variant="body1" color="text.secondary">
          No quantum tunneling data available. Please run a simulation first.
        </Typography>
      );
    }

    const { 
      gamowFactor, 
      screeningFactor, 
      tunnelingProbability, 
      enhancementFactor 
    } = advancedPhysicsData.quantumTunneling;

    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Tunneling Parameters</Typography>
            <Typography variant="body1">
              Gamow Factor: {gamowFactor.toExponential(4)}
            </Typography>
            <Typography variant="body1">
              Screening Factor: {screeningFactor.toFixed(4)}
            </Typography>
            <Typography variant="body1">
              Tunneling Probability: {tunnelingProbability.toExponential(4)}
            </Typography>
            <Typography variant="body1">
              Total Enhancement: {enhancementFactor.toFixed(4)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2, minHeight: 200 }}>
            <Typography variant="h6" gutterBottom>Visualization Placeholder</Typography>
            <Typography variant="body2" color="text.secondary">
              Quantum tunneling visualization will be displayed here in future updates.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderLatticeSection = () => {
    if (!advancedPhysicsData?.latticeDynamics) {
      return (
        <Typography variant="body1" color="text.secondary">
          No lattice dynamics data available. Please run a simulation first.
        </Typography>
      );
    }

    const { 
      debyeTemperature,
      phononFrequency,
      phononAssistFactor,
      latticeConstant
    } = advancedPhysicsData.latticeDynamics;

    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Lattice Parameters</Typography>
            <Typography variant="body1">
              Debye Temperature: {debyeTemperature.toFixed(1)} K
            </Typography>
            <Typography variant="body1">
              Phonon Frequency: {phononFrequency.toExponential(4)} Hz
            </Typography>
            <Typography variant="body1">
              Phonon Assist Factor: {phononAssistFactor.toFixed(4)}
            </Typography>
            <Typography variant="body1">
              Lattice Constant: {latticeConstant.toExponential(4)} m
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 2, minHeight: 200 }}>
            <Typography variant="h6" gutterBottom>Visualization Placeholder</Typography>
            <Typography variant="body2" color="text.secondary">
              Lattice dynamics visualization will be displayed here in future updates.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderFluidDynamicsSection = () => {
    if (isLoadingFluidData) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!fluidDynamicsData) {
      return (
        <Typography variant="body1" color="text.secondary">
          No fluid dynamics data available. Please run a completed simulation first.
        </Typography>
      );
    }

    return (
      <Grid container spacing={3}>
        <Grid size={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Fluid Dynamics Data</Typography>
            <Typography variant="body1">
              Grid Size: {fluidDynamicsData.velocity?.x?.length || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Detailed fluid dynamics visualization will be implemented in future updates.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <AppLayout>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Advanced Physics Analysis
        </Typography>
        
        {!simulationData ? (
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No Simulation Data Available
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Please run a simulation first to see advanced physics analysis.
            </Typography>
          </Paper>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="analysis tabs">
                <Tab label="Quantum Tunneling" />
                <Tab label="Lattice Dynamics" />
                <Tab label="Fluid Dynamics" />
              </Tabs>
            </Box>
            
            <TabPanel value={activeTab} index={0}>
              {renderQuantumTunnelingSection()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              {renderLatticeSection()}
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              {renderFluidDynamicsSection()}
            </TabPanel>
          </>
        )}
      </Box>
    </AppLayout>
  );
};

export default AdvancedAnalysisPage; 