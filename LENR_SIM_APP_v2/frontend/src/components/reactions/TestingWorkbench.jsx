import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Button,
  TextField,
  InputAdornment,
  Slider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Science as ScienceIcon,
  PlayArrow as PlayArrowIcon,
  RestartAlt as RestartAltIcon,
  CloudDownload as CloudDownloadIcon,
  Compare as CompareIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

import { formatReactionEquation } from '../../services';
import TestResultsPanel from './TestResultsPanel';
import { ReactionDynamicsVisualization, ReactionEnergyDynamicsChart } from '../visualizations';

/**
 * Reaction Testing Workbench
 * 
 * Provides an interface for testing custom fusion reactions under various conditions,
 * running simulations, and analyzing results.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.reaction - The reaction to test
 * @param {Function} props.onRunTest - Callback when test is run
 * @param {Function} props.onCompare - Callback to compare with other reactions
 * @param {Object} props.testResults - Test results data
 * @param {boolean} props.loading - Whether a test is currently running
 * @returns {JSX.Element} Reaction Testing Workbench component
 */
const TestingWorkbench = ({
  reaction,
  onRunTest,
  onCompare,
  testResults,
  loading = false
}) => {
  // Test parameters
  const [testParams, setTestParams] = useState({
    // Basic parameters
    temperature: 10, // keV
    density: 1.0e14, // particles/cm³
    duration: 1.0, // seconds
    initialEnergy: 5.0, // keV
    confinementTime: 0.1, // seconds
    magneticField: 5.0, // Tesla
    plasmaVolume: 1.0, // m³

    // Advanced parameters
    pressure: 1.0, // atmospheres
    electricField: 0, // V/m
    catalystPresent: false,
    catalystType: 'none',
    catalystConcentration: 0, // ppm
    
    // Environmental parameters
    ambientTemperature: 300, // K
    externalNeutronFlux: 0, // n/cm²/s
    backgroundRadiation: 0.1, // μSv/h
    
    // Lattice parameters (for solid-state LENR)
    latticeType: 'none', // none, fcc, bcc, etc.
    loadingRatio: 0.0, // D:Pd ratio or similar
    
    // Sweep parameters
    parameterSweep: false,
    sweepParameter: 'temperature',
    sweepStart: 1,
    sweepEnd: 100,
    sweepSteps: 10
  });
  
  // Available catalyst types
  const catalystOptions = [
    { value: 'none', label: 'None' },
    { value: 'pd', label: 'Palladium' },
    { value: 'ni', label: 'Nickel' },
    { value: 'pt', label: 'Platinum' },
    { value: 'ti', label: 'Titanium' },
    { value: 'custom', label: 'Custom...' }
  ];

  // Available lattice types
  const latticeOptions = [
    { value: 'none', label: 'None (Plasma/Gas Phase)' },
    { value: 'fcc', label: 'Face-Centered Cubic (FCC)' },
    { value: 'bcc', label: 'Body-Centered Cubic (BCC)' },
    { value: 'hcp', label: 'Hexagonal Close-Packed (HCP)' },
    { value: 'custom', label: 'Custom Structure...' }
  ];
  
  // Available sweep parameters
  const sweepParameterOptions = [
    { value: 'temperature', label: 'Temperature (keV)' },
    { value: 'density', label: 'Density (particles/cm³)' },
    { value: 'initialEnergy', label: 'Initial Energy (keV)' },
    { value: 'pressure', label: 'Pressure (atm)' },
    { value: 'electricField', label: 'Electric Field (V/m)' },
    { value: 'catalystConcentration', label: 'Catalyst Concentration (ppm)' },
    { value: 'loadingRatio', label: 'Loading Ratio' },
    { value: 'magneticField', label: 'Magnetic Field (Tesla)' }
  ];
  
  // UI state
  const [activeResultsTab, setActiveResultsTab] = useState(0);
  const [activeTabView, setActiveTabView] = useState(0);
  const [error, setError] = useState(null);
  
  // Update test parameter
  const handleParameterChange = (param, value) => {
    setTestParams(prevParams => ({
      ...prevParams,
      [param]: value
    }));
  };
  
  // Reset test parameters to defaults
  const handleReset = () => {
    setTestParams({
      // Basic parameters
      temperature: 10,
      density: 1.0e14,
      duration: 1.0,
      initialEnergy: 5.0,
      confinementTime: 0.1,
      magneticField: 5.0,
      plasmaVolume: 1.0,

      // Advanced parameters
      pressure: 1.0,
      electricField: 0,
      catalystPresent: false,
      catalystType: 'none',
      catalystConcentration: 0,
      
      // Environmental parameters
      ambientTemperature: 300,
      externalNeutronFlux: 0,
      backgroundRadiation: 0.1,
      
      // Lattice parameters
      latticeType: 'none',
      loadingRatio: 0.0,
      
      // Sweep parameters
      parameterSweep: false,
      sweepParameter: 'temperature',
      sweepStart: 1,
      sweepEnd: 100,
      sweepSteps: 10
    });
  };
  
  // Run the test with current parameters
  const handleRunTest = () => {
    try {
      if (!reaction) {
        setError('No reaction selected for testing');
        return;
      }
      
      // Validate parameters
      if (testParams.temperature <= 0) {
        setError('Temperature must be greater than zero');
        return;
      }
      
      if (testParams.density <= 0) {
        setError('Density must be greater than zero');
        return;
      }
      
      // Validate catalyst parameters if catalyst is present
      if (testParams.catalystPresent && testParams.catalystType === 'none') {
        setError('Please select a catalyst type');
        return;
      }
      
      if (testParams.catalystPresent && testParams.catalystConcentration <= 0) {
        setError('Catalyst concentration must be greater than zero');
        return;
      }
      
      // Validate lattice parameters if a lattice type is selected
      if (testParams.latticeType !== 'none' && testParams.loadingRatio <= 0) {
        setError('Loading ratio must be greater than zero for lattice simulations');
        return;
      }
      
      // If doing a parameter sweep, validate sweep parameters
      if (testParams.parameterSweep) {
        if (testParams.sweepStart >= testParams.sweepEnd) {
          setError('Sweep start value must be less than end value');
          return;
        }
        
        if (testParams.sweepSteps < 2) {
          setError('Must have at least 2 steps in a parameter sweep');
          return;
        }
      }
      
      setError(null);
      
      // Call the parent's test runner with the current parameters
      onRunTest && onRunTest({
        reaction,
        params: testParams
      });
    } catch (err) {
      setError(`Error running test: ${err.message}`);
    }
  };
  
  // Handle export of test results
  const handleExportResults = () => {
    if (!testResults) return;
    
    // Create a JSON blob with test data
    const testData = {
      reaction: {
        name: reaction.name,
        equation: formatReactionEquation(reaction),
        reactant1_z: reaction.reactant1_z,
        reactant1_a: reaction.reactant1_a,
        reactant2_z: reaction.reactant2_z,
        reactant2_a: reaction.reactant2_a,
        q_value: reaction.q_value
      },
      testParameters: testParams,
      results: testResults,
      timestamp: new Date().toISOString()
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(testData, null, 2);
    
    // Create blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reaction.name}-test-results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Handle comparison with standard reactions
  const handleCompare = () => {
    onCompare && onCompare(reaction, testParams);
  };
  
  // Handle tab change in results panel
  const handleTabChange = (event, newValue) => {
    setActiveResultsTab(newValue);
  };
  
  // Handle main tab view change
  const handleMainTabChange = (event, newValue) => {
    setActiveTabView(newValue);
  };
  
  // Format scientific notation nicely
  const formatScientific = (value) => {
    if (value === 0) return '0';
    
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);
    
    return `${mantissa.toFixed(2)}×10^${exponent}`;
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {/* Reaction Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Testing Reaction: {reaction?.name || 'No reaction selected'}
            </Typography>
            {reaction && (
              <Typography variant="body1" fontFamily="monospace">
                {formatReactionEquation(reaction)}
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Main Tabs */}
        <Grid item xs={12}>
          <Tabs 
            value={activeTabView} 
            onChange={handleMainTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Test Parameters" />
            <Tab label="Test Results" />
            <Tab label="Reaction Dynamics" />
          </Tabs>
        </Grid>
        
        {/* Test Parameters */}
        {activeTabView === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Test Parameters</Typography>
                <Button 
                  startIcon={<RestartAltIcon />} 
                  onClick={handleReset}
                  variant="outlined"
                  color="secondary"
                >
                  Reset to Defaults
                </Button>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {/* Main Parameter Controls */}
              <Grid container spacing={3}>
                {/* Basic Parameters Section */}
                <Grid item xs={12}>
                  <Accordion defaultExpanded>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="basic-parameters-content"
                      id="basic-parameters-header"
                    >
                      <Typography variant="subtitle1" fontWeight="bold">Basic Parameters</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        {/* Temperature */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Temperature"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">keV</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.temperature}
                            onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                            helperText="Plasma or reaction temperature in kiloelectronvolts"
                          />
                        </Grid>
                        
                        {/* Density */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Density"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">cm⁻³</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.density}
                            onChange={(e) => handleParameterChange('density', parseFloat(e.target.value))}
                            helperText="Particle density in particles per cubic centimeter"
                          />
                        </Grid>
                        
                        {/* Duration */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Duration"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">s</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.duration}
                            onChange={(e) => handleParameterChange('duration', parseFloat(e.target.value))}
                            helperText="Simulation duration in seconds"
                          />
                        </Grid>
                        
                        {/* Initial Energy */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Initial Energy"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">keV</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.initialEnergy}
                            onChange={(e) => handleParameterChange('initialEnergy', parseFloat(e.target.value))}
                            helperText="Initial particle energy in kiloelectronvolts"
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Advanced Parameters Section */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="advanced-parameters-content"
                      id="advanced-parameters-header"
                    >
                      <Typography variant="subtitle1" fontWeight="bold">Advanced Parameters</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        {/* Pressure */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Pressure"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">atm</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.pressure}
                            onChange={(e) => handleParameterChange('pressure', parseFloat(e.target.value))}
                            helperText="Environmental pressure in atmospheres"
                          />
                        </Grid>
                        
                        {/* Electric Field */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Electric Field"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">V/m</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.electricField}
                            onChange={(e) => handleParameterChange('electricField', parseFloat(e.target.value))}
                            helperText="Applied electric field in volts per meter"
                          />
                        </Grid>
                        
                        {/* Magnetic Field */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Magnetic Field"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">T</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.magneticField}
                            onChange={(e) => handleParameterChange('magneticField', parseFloat(e.target.value))}
                            helperText="Applied magnetic field in tesla"
                          />
                        </Grid>
                        
                        {/* Plasma Volume */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Plasma Volume"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">m³</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.plasmaVolume}
                            onChange={(e) => handleParameterChange('plasmaVolume', parseFloat(e.target.value))}
                            helperText="Reaction volume in cubic meters"
                          />
                        </Grid>

                        {/* Catalyst Toggle */}
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={testParams.catalystPresent} 
                                onChange={(e) => handleParameterChange('catalystPresent', e.target.checked)}
                              />
                            }
                            label="Use Catalyst"
                          />
                        </Grid>
                        
                        {/* Catalyst Type (only shown if catalyst is enabled) */}
                        {testParams.catalystPresent && (
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Catalyst Type</InputLabel>
                              <Select
                                value={testParams.catalystType}
                                label="Catalyst Type"
                                onChange={(e) => handleParameterChange('catalystType', e.target.value)}
                              >
                                {catalystOptions.map(option => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}
                        
                        {/* Catalyst Concentration (only shown if catalyst is enabled) */}
                        {testParams.catalystPresent && (
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Catalyst Concentration"
                              type="number"
                              InputProps={{
                                endAdornment: <InputAdornment position="end">ppm</InputAdornment>
                              }}
                              fullWidth
                              value={testParams.catalystConcentration}
                              onChange={(e) => handleParameterChange('catalystConcentration', parseFloat(e.target.value))}
                              helperText="Catalyst concentration in parts per million"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Environmental Parameters Section */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="environmental-parameters-content"
                      id="environmental-parameters-header"
                    >
                      <Typography variant="subtitle1" fontWeight="bold">Environmental Parameters</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        {/* Ambient Temperature */}
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Ambient Temperature"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">K</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.ambientTemperature}
                            onChange={(e) => handleParameterChange('ambientTemperature', parseFloat(e.target.value))}
                            helperText="Environmental temperature in kelvin"
                          />
                        </Grid>
                        
                        {/* External Neutron Flux */}
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="External Neutron Flux"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">n/cm²/s</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.externalNeutronFlux}
                            onChange={(e) => handleParameterChange('externalNeutronFlux', parseFloat(e.target.value))}
                            helperText="Background neutron flux"
                          />
                        </Grid>
                        
                        {/* Background Radiation */}
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Background Radiation"
                            type="number"
                            InputProps={{
                              endAdornment: <InputAdornment position="end">μSv/h</InputAdornment>
                            }}
                            fullWidth
                            value={testParams.backgroundRadiation}
                            onChange={(e) => handleParameterChange('backgroundRadiation', parseFloat(e.target.value))}
                            helperText="Background radiation level"
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Lattice Parameters Section */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="lattice-parameters-content"
                      id="lattice-parameters-header"
                    >
                      <Typography variant="subtitle1" fontWeight="bold">Lattice Parameters</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        {/* Lattice Type */}
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Lattice Type</InputLabel>
                            <Select
                              value={testParams.latticeType}
                              label="Lattice Type"
                              onChange={(e) => handleParameterChange('latticeType', e.target.value)}
                            >
                              {latticeOptions.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                              Select lattice structure for solid-state LENR simulations
                            </Typography>
                          </FormControl>
                        </Grid>
                        
                        {/* Loading Ratio (only shown if lattice type is not 'none') */}
                        {testParams.latticeType !== 'none' && (
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Loading Ratio"
                              type="number"
                              InputProps={{
                                inputProps: { min: 0, max: 1, step: 0.01 }
                              }}
                              fullWidth
                              value={testParams.loadingRatio}
                              onChange={(e) => handleParameterChange('loadingRatio', parseFloat(e.target.value))}
                              helperText="Ratio of absorbed atoms to lattice atoms (e.g., D:Pd ratio)"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Parameter Sweep Section */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls="sweep-parameters-content"
                      id="sweep-parameters-header"
                    >
                      <Typography variant="subtitle1" fontWeight="bold">Parameter Sweep</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={3}>
                        {/* Parameter Sweep Toggle */}
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={testParams.parameterSweep} 
                                onChange={(e) => handleParameterChange('parameterSweep', e.target.checked)}
                              />
                            }
                            label="Enable Parameter Sweep"
                          />
                          <Typography variant="caption" color="textSecondary" display="block">
                            Run multiple simulations by varying a single parameter within a range
                          </Typography>
                        </Grid>
                        
                        {/* Parameter to Sweep (only shown if parameter sweep is enabled) */}
                        {testParams.parameterSweep && (
                          <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                              <InputLabel>Parameter to Sweep</InputLabel>
                              <Select
                                value={testParams.sweepParameter}
                                label="Parameter to Sweep"
                                onChange={(e) => handleParameterChange('sweepParameter', e.target.value)}
                              >
                                {sweepParameterOptions.map(option => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}
                        
                        {/* Sweep Start Value (only shown if parameter sweep is enabled) */}
                        {testParams.parameterSweep && (
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Start Value"
                              type="number"
                              fullWidth
                              value={testParams.sweepStart}
                              onChange={(e) => handleParameterChange('sweepStart', parseFloat(e.target.value))}
                            />
                          </Grid>
                        )}
                        
                        {/* Sweep End Value (only shown if parameter sweep is enabled) */}
                        {testParams.parameterSweep && (
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="End Value"
                              type="number"
                              fullWidth
                              value={testParams.sweepEnd}
                              onChange={(e) => handleParameterChange('sweepEnd', parseFloat(e.target.value))}
                            />
                          </Grid>
                        )}
                        
                        {/* Sweep Steps (only shown if parameter sweep is enabled) */}
                        {testParams.parameterSweep && (
                          <Grid item xs={12}>
                            <Typography id="sweep-steps-slider" gutterBottom>
                              Number of Steps: {testParams.sweepSteps}
                            </Typography>
                            <Slider
                              value={testParams.sweepSteps}
                              onChange={(e, newValue) => handleParameterChange('sweepSteps', newValue)}
                              aria-labelledby="sweep-steps-slider"
                              valueLabelDisplay="auto"
                              step={1}
                              marks
                              min={2}
                              max={20}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleRunTest}
                  disabled={loading || !reaction}
                >
                  {loading ? 'Running...' : 'Run Test'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CompareIcon />}
                  onClick={handleCompare}
                  disabled={loading || !reaction}
                >
                  Compare with Standard Reactions
                </Button>
                {testResults && (
                  <Button
                    variant="outlined"
                    startIcon={<CloudDownloadIcon />}
                    onClick={handleExportResults}
                  >
                    Export Results
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
        
        {/* Test Results Tab */}
        {activeTabView === 1 && (
          <Grid item xs={12}>
            {testResults ? (
              <TestResultsPanel 
                results={testResults}
                reaction={reaction}
                parameters={testParams}
              />
            ) : (
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  No test results available. Run a test to see results here.
                </Typography>
              </Paper>
            )}
          </Grid>
        )}
        
        {/* Reaction Dynamics Tab */}
        {activeTabView === 2 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              {testResults ? (
                <Box>
                  <ReactionDynamicsVisualization
                    data={testResults.dynamics || {}}
                    reaction={reaction}
                    parameters={testParams}
                  />
                  
                  <Divider sx={{ my: 4 }} />
                  
                  <ReactionEnergyDynamicsChart
                    reaction={reaction}
                    parameters={testParams}
                    dataType="cross-section"
                  />
                </Box>
              ) : (
                <Typography variant="body1" color="textSecondary" textAlign="center">
                  No reaction dynamics data available. Run a test to visualize reaction dynamics.
                </Typography>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default TestingWorkbench; 