import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Paper, Typography, Tabs, Tab, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import ParameterPanel from '../components/ParameterPanel';
import Uploader from '../components/Uploader';
import SimulationControls from '../components/SimulationControls';
import ResultsPanel from '../components/ResultsPanel';
import LatticeVisualization from '../components/visualization/LatticeVisualization';
import axios from 'axios';

// Styled components
const StyledTab = styled(Tab)(({ theme }) => ({
  fontWeight: 'bold',
  minWidth: 120,
}));

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [parameters, setParameters] = useState(null);
  const [experimentalData, setExperimentalData] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle parameter updates from ParameterPanel
  const handleParameterChange = (newParameters) => {
    setParameters(newParameters);
  };
  
  // Handle file upload from Uploader
  const handleUpload = async (formData) => {
    try {
      setIsLoading(true);
      setError('');
      
      // In a production app, this would be a real API call
      // Simulating API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If we were making a real API call:
      // const response = await axios.post('/api/upload-data', formData);
      // setExperimentalData(response.data);
      
      // For now, let's create mock data
      const mockData = {
        headers: ['Temperature', 'Power', 'Time'],
        data: Array(20).fill().map((_, i) => ({
          Temperature: 20 + i * 2,
          Power: 50 + Math.random() * 30,
          Time: i * 10
        }))
      };
      
      setExperimentalData(mockData);
      setIsLoading(false);
      
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      setIsLoading(false);
    }
  };
  
  // Handle data parsed from uploaded CSV
  const handleDataParsed = (parsedData) => {
    setExperimentalData(parsedData);
  };
  
  // Start simulation
  const startSimulation = useCallback(async (simulationParams) => {
    try {
      setIsLoading(true);
      setError('');
      
      // In a production app, this would be a real API call
      // Simulating API call for now
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // If we were making a real API call:
      // const response = await axios.post('/api/run-simulation', simulationParams);
      // setSimulationResults(response.data);
      
      // Create mock simulation results
      const mockResults = {
        metrics: {
          peakEnergy: 0.78 + Math.random() * 0.5,
          excessHeat: 1.45 + Math.random() * 1.2,
          phononGeneration: 8.32 + Math.random() * 2,
          runTime: 2.56 + Math.random() * 2
        },
        parameters: simulationParams,
        data: Array(50).fill().map((_, i) => ({
          Time: i * 0.1,
          Temperature: simulationParams.temperature + (Math.random() * 0.5 - 0.25),
          Energy: 0.1 + (i * 0.02) + (Math.random() * 0.1),
          PhononDensity: 0.2 + (i * 0.03) * (1 + Math.sin(i * 0.2)) + (Math.random() * 0.05),
          LatticePotential: 0.5 - (i * 0.005) + (Math.random() * 0.02)
        })),
        analysis: {
          summary: "Simulation shows significant phonon-mediated energy transfer within the lattice structure. Excess heat generation is consistent with tunneling parameters.",
          matchScore: experimentalData ? 75 + Math.random() * 15 : null,
          findings: [
            "Energy transfer peaks at expected temperature range",
            "Phonon generation increases with tunneling parameter",
            "Lattice deformation follows expected patterns"
          ],
          recommendations: [
            "Increase temperature parameter for optimal energy output",
            "Adjust spring constant to enhance phonon coupling",
            "Modify potential model for better accuracy"
          ]
        }
      };
      
      setSimulationResults(mockResults);
      setIsLoading(false);
      
    } catch (err) {
      setError(`Simulation failed: ${err.message}`);
      setIsLoading(false);
    }
  }, [experimentalData]);
  
  // Pause simulation
  const pauseSimulation = () => {
    // In a real app, this would send a pause request to the server
    console.log('Simulation paused');
  };
  
  // Stop simulation
  const stopSimulation = () => {
    // In a real app, this would send a stop request to the server
    console.log('Simulation stopped');
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setSimulationResults(null);
  };
  
  // Load data on component mount
  useEffect(() => {
    // In a production app, this would fetch initial data from the server
    // For now, just set default parameters
    setParameters({
      temperature: 300,
      tunnelingParameter: 0.5,
      equilibriumSeparation: 0.74,
      springConstant: 15,
      potentialModelType: 'morse',
      impactTemperature: 450,
      impactDuration: 5
    });
  }, []);
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>LENR Simulation Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Configure parameters, upload experimental data, run simulations, and visualize results.
        </Typography>
      </Paper>
      
      <Grid container spacing={3}>
        {/* Left Panel - Parameters and Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <StyledTab label="Parameters" />
              <StyledTab label="Experimental Data" />
            </Tabs>
            
            <Box sx={{ p: 3 }}>
              {activeTab === 0 ? (
                <ParameterPanel 
                  onParametersChange={handleParameterChange} 
                  initialParameters={parameters}
                />
              ) : (
                <Uploader 
                  onUpload={handleUpload}
                  onDataParsed={handleDataParsed}
                />
              )}
            </Box>
          </Paper>
          
          <SimulationControls
            parameters={parameters}
            onStart={startSimulation}
            onPause={pauseSimulation}
            onStop={stopSimulation}
            onReset={resetSimulation}
          />
        </Grid>
        
        {/* Right Panel - Visualization and Results */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 3, p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Lattice Visualization
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <LatticeVisualization
              simulationData={simulationResults}
            />
          </Paper>
          
          <ResultsPanel 
            simulationResults={simulationResults}
            experimentalData={experimentalData}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;