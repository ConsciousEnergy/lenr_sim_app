import React, { useState, useCallback, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Alert,
  Divider,
  Chip,
  Button,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid';
import QuantumTunnelingVisualizer from '../components/visualization/QuantumTunnelingVisualizer';
import TunnelingParameterControls from '../components/controls/TunnelingParameterControls';
import EngineMaturityBadge from '../components/EngineMaturityBadge';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CallMadeIcon from '@mui/icons-material/CallMade';
import DownloadIcon from '@mui/icons-material/Download';
import tunnelingUtils from '../utils/quantumTunnelingUtils';

const QuantumTunnelingPage = () => {
  const _theme = useTheme();
  
  // State for tunneling parameters
  const [tunnelingParams, setTunnelingParams] = useState({
    potentialType: 'coulomb',
    z1: 1,
    z2: 1,
    temperature: 300,
    pressure: 1,
    electronScreeningFactor: 1.0,
    energyKeV: 0.1,
    showWaveFunction: true,
    showTunnelingProbability: true,
    showClassicalTurningPoint: true
  });
  
  // State for calculated probability
  const [probability, setProbability] = useState(null);
  
  // State for enhancement calculations
  const [enhancements, setEnhancements] = useState({
    baseline: null,
    electronScreening: null,
    temperature: null,
    total: null
  });
  
  // Calculate enhancement factors when probability changes
  useEffect(() => {
    if (probability === null) return;
    
    // Calculate enhancement factors
    let baselineProbability;
    try {
      baselineProbability = tunnelingUtils.calculateGamowFactor(
        tunnelingParams.z1,
        tunnelingParams.z2,
        tunnelingUtils.DEUTERON_MASS / 2,
        tunnelingParams.energyKeV
      );
    } catch (e) {
      baselineProbability = 0;
    }
    
    // Rough estimate of electron screening enhancement
    const screeningEnhancement = tunnelingParams.electronScreeningFactor || 1.0;
    
    // Rough estimate of temperature enhancement
    const temperatureEnhancement = Math.sqrt(Math.max(tunnelingParams.temperature, 1) / 300);
    
    // Calculate total enhancement with safety check
    let totalEnhancement = 1.0;
    if (baselineProbability && baselineProbability > 0 && !isNaN(baselineProbability)) {
      totalEnhancement = probability / baselineProbability;
      if (!isFinite(totalEnhancement) || isNaN(totalEnhancement)) {
        totalEnhancement = 1.0;
      }
    }
    
    // Store the enhancement calculations
    setEnhancements({
      baseline: baselineProbability || 0,
      electronScreening: screeningEnhancement,
      temperature: temperatureEnhancement,
      total: totalEnhancement
    });
    
  }, [probability, tunnelingParams]);
  
  // Handle parameter changes
  const handleParameterChange = useCallback((newParams) => {
    setTunnelingParams(newParams);
  }, []);
  
  // Handle probability calculation results
  const handleProbabilityCalculated = useCallback((newProbability) => {
    setProbability(newProbability);
  }, []);
  
  // Download data as JSON
  const handleDownloadData = () => {
    const data = {
      parameters: tunnelingParams,
      results: {
        tunnelingProbability: probability,
        enhancements: enhancements
      },
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-tunneling-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Quantum Tunneling Visualization
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Interactive visualization of quantum tunneling effects in LENR systems
        </Typography>
        <EngineMaturityBadge engineId="ENG-WKB-01" sx={{ mt: 1 }} />
        <Divider sx={{ my: 2 }} />
      </Box>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TunnelingParameterControls 
            initialValues={tunnelingParams}
            onChange={handleParameterChange}
          />
          
          {probability !== null && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Calculation Results
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Tunneling Probability:
                </Typography>
                <Typography variant="h5" color="primary" gutterBottom>
                  {probability.toExponential(4)}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Enhancement Factors:
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  <Chip 
                    label={`Electron Screening: ${tunnelingParams.electronScreeningFactor.toFixed(1)}x`} 
                    color="primary" 
                    size="small" 
                    variant="outlined"
                  />
                  {enhancements.temperature && (
                    <Chip 
                      label={`Temperature: ${enhancements.temperature.toFixed(2)}x`} 
                      color="secondary" 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {enhancements.total && (
                    <Chip 
                      label={`Total: ${enhancements.total.toExponential(2)}x`} 
                      color="success" 
                      size="small"
                    />
                  )}
                </Box>
              </Box>
              
              <Button 
                variant="outlined" 
                startIcon={<DownloadIcon />} 
                size="small"
                onClick={handleDownloadData}
                fullWidth
              >
                Download Data
              </Button>
            </Paper>
          )}
          
          <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InfoOutlinedIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="subtitle2">
                About Quantum Tunneling
              </Typography>
            </Box>
            <Typography variant="body2" paragraph>
              Quantum tunneling allows particles to penetrate energy barriers that would be 
              impossible to overcome in classical physics. In LENR systems, this effect is 
              crucial for enabling fusion at lower temperatures.
            </Typography>
            <Typography variant="body2">
              The WKB approximation is used to calculate the probability of tunneling through
              the Coulomb barrier between two nuclei. Electron screening can significantly 
              enhance this probability by reducing the effective barrier height.
            </Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <QuantumTunnelingVisualizer
              {...tunnelingParams}
              width={800}
              height={500}
              onProbabilityCalculated={handleProbabilityCalculated}
            />
            
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This visualization shows the potential barrier (blue curve), wave function (dashed line),
                  and tunneling probability (gradient area) for the selected parameters. The vertical red line
                  indicates the classical turning point where kinetic energy equals potential energy.
                </Typography>
              </Alert>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                  {`Z₁=${tunnelingParams.z1}, Z₂=${tunnelingParams.z2}, E=${tunnelingParams.energyKeV} keV`}
                </Typography>
                
                <Button 
                  size="small" 
                  endIcon={<CallMadeIcon />}
                  href="https://en.wikipedia.org/wiki/Quantum_tunnelling" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more about tunneling
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default QuantumTunnelingPage; 