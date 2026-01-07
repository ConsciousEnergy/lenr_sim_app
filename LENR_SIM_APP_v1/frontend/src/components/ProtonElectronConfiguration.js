import React, { useState, useEffect } from 'react';
import {
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Slider, 
  FormControlLabel, 
  Switch, 
  Divider, 
  Paper, 
  Grid, 
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useLogger } from '../contexts/LogContext';
import { 
  calculateRydbergEnergy,
  calculateRydbergRadius,
  calculateElectricField,
  calculateOverlapProbability,
  calculateCoulombPenetration,
  generateRydbergSimulationParams
} from '../models/RydbergMatterModel';

const ProtonElectronConfiguration = ({ initialConfig = {}, onConfigChange = () => {} }) => {
  const { logDebug } = useLogger();
  
  const [config, setConfig] = useState({
    nucleusElement: 'deuterium',
    nucleusIsotope: 2,
    targetElement: 'palladium',
    targetIsotope: 106,
    electronConfiguration: 'ground',
    principalQuantumNumber: 4,
    collisionEnergy: 0.1,
    screeningFactor: 0.25,
    includeQuantumEffects: true,
    includeTunneling: true,
    ...initialConfig
  });

  const elementsData = {
    hydrogen: { name: 'Hydrogen', symbol: 'H', isotopes: [1, 2, 3], z: 1 },
    deuterium: { name: 'Deuterium', symbol: 'D', isotopes: [2], z: 1 },
    helium: { name: 'Helium', symbol: 'He', isotopes: [3, 4], z: 2 },
    lithium: { name: 'Lithium', symbol: 'Li', isotopes: [6, 7], z: 3 },
    palladium: { name: 'Palladium', symbol: 'Pd', isotopes: [102, 104, 105, 106, 108, 110], z: 46 },
    nickel: { name: 'Nickel', symbol: 'Ni', isotopes: [58, 60, 61, 62, 64], z: 28 },
    platinum: { name: 'Platinum', symbol: 'Pt', isotopes: [190, 192, 194, 195, 196, 198], z: 78 }
  };

  const electronConfigurations = [
    { value: 'ground', label: 'Ground State' },
    { value: 'excited', label: 'Excited State' },
    { value: 'rydberg', label: 'Rydberg State' },
    { value: 'custom', label: 'Custom Configuration' }
  ];

  useEffect(() => {
    // Calculate derived values when configuration changes
    try {
      const params = generateRydbergSimulationParams(config);
      logDebug('Generated Rydberg parameters:', params);
      onConfigChange({ ...config, params });
    } catch (error) {
      logDebug('Error generating Rydberg parameters:', error);
    }
  }, [config, logDebug, onConfigChange]);

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Proton-Electron Configuration
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Nuclear Configuration */}
      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        Nuclear Configuration
        <Tooltip title="Configure the nuclear species involved in the LENR reaction">
          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
        </Tooltip>
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="nucleus-element-label">Nucleus Element</InputLabel>
            <Select
              labelId="nucleus-element-label"
              value={config.nucleusElement}
              label="Nucleus Element"
              onChange={(e) => handleChange('nucleusElement', e.target.value)}
            >
              {Object.entries(elementsData).map(([key, element]) => (
                <MenuItem key={key} value={key}>
                  {element.name} ({element.symbol})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="nucleus-isotope-label">Nucleus Isotope</InputLabel>
            <Select
              labelId="nucleus-isotope-label"
              value={config.nucleusIsotope}
              label="Nucleus Isotope"
              onChange={(e) => handleChange('nucleusIsotope', e.target.value)}
            >
              {elementsData[config.nucleusElement]?.isotopes.map(isotope => (
                <MenuItem key={isotope} value={isotope}>
                  {elementsData[config.nucleusElement].symbol}-{isotope}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="target-element-label">Target Element</InputLabel>
            <Select
              labelId="target-element-label"
              value={config.targetElement}
              label="Target Element"
              onChange={(e) => handleChange('targetElement', e.target.value)}
            >
              {Object.entries(elementsData).map(([key, element]) => (
                <MenuItem key={key} value={key}>
                  {element.name} ({element.symbol})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="target-isotope-label">Target Isotope</InputLabel>
            <Select
              labelId="target-isotope-label"
              value={config.targetIsotope}
              label="Target Isotope"
              onChange={(e) => handleChange('targetIsotope', e.target.value)}
            >
              {elementsData[config.targetElement]?.isotopes.map(isotope => (
                <MenuItem key={isotope} value={isotope}>
                  {elementsData[config.targetElement].symbol}-{isotope}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Electron Configuration */}
      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        Electron Configuration
        <Tooltip title="Set up the electron configuration parameters which affect quantum screening and tunneling">
          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
        </Tooltip>
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel id="electron-config-label">Electron Configuration</InputLabel>
            <Select
              labelId="electron-config-label"
              value={config.electronConfiguration}
              label="Electron Configuration"
              onChange={(e) => handleChange('electronConfiguration', e.target.value)}
            >
              {electronConfigurations.map(conf => (
                <MenuItem key={conf.value} value={conf.value}>
                  {conf.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ width: '100%' }}>
            <Typography id="quantum-number-slider" gutterBottom>
              Principal Quantum Number (n):
            </Typography>
            <Slider
              disabled={config.electronConfiguration === 'ground'}
              value={config.principalQuantumNumber}
              onChange={(e, value) => handleChange('principalQuantumNumber', value)}
              step={1}
              marks
              min={1}
              max={12}
              valueLabelDisplay="auto"
              aria-labelledby="quantum-number-slider"
            />
          </Box>
        </Grid>
      </Grid>
      
      {/* Interaction Parameters */}
      <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        Interaction Parameters
        <Tooltip title="Configure the physical parameters that govern the nuclear interaction">
          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
        </Tooltip>
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ width: '100%' }}>
            <Typography gutterBottom>
              Collision Energy:
            </Typography>
            <Slider
              value={config.collisionEnergy}
              onChange={(e, value) => handleChange('collisionEnergy', value)}
              step={0.01}
              min={0.01}
              max={1}
              valueLabelDisplay="auto"
              valueLabelFormat={value => `${value} eV`}
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ width: '100%' }}>
            <Typography gutterBottom>
              Screening Factor:
            </Typography>
            <Slider
              value={config.screeningFactor}
              onChange={(e, value) => handleChange('screeningFactor', value)}
              step={0.01}
              min={0}
              max={1}
              valueLabelDisplay="auto"
            />
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={config.includeQuantumEffects}
                onChange={e => handleChange('includeQuantumEffects', e.target.checked)}
              />
            }
            label="Include Quantum Effects"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={config.includeTunneling}
                onChange={e => handleChange('includeTunneling', e.target.checked)}
              />
            }
            label="Include Tunneling"
          />
        </Grid>
      </Grid>
      
      {/* Calculated Parameter Display */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Calculated Parameters:
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Rydberg Energy: {calculateRydbergEnergy(config.principalQuantumNumber).toExponential(3)} eV
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Rydberg Radius: {calculateRydbergRadius(config.principalQuantumNumber).toExponential(3)} nm
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Electric Field: {calculateElectricField(config.principalQuantumNumber, elementsData[config.targetElement]?.z).toExponential(3)} V/m
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Tunneling Enhancement: {(config.includeTunneling ? calculateCoulombPenetration({
                principalQuantumNumber: config.principalQuantumNumber,
                screeningFactor: config.screeningFactor
              }) : 1).toExponential(3)}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default ProtonElectronConfiguration; 