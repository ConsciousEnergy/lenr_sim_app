import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Grid, 
  TextField, 
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RydbergMatterModel from '../models/RydbergMatterModel';
import { useLogger } from '../contexts/LogContext';

// Extract individual functions for testing
const { 
  calculateRydbergEnergy,
  calculateRydbergRadius,
  calculateOverlapProbability,
  calculateDoubleLayerField,
  calculateElectricField,
  calculateNeutronFormationCrossSection,
  calculateCrossSection,
  calculateCasimirForce,
  calculateTunnelingEnhancement,
  calculateBECCriticalTemperature,
  calculateBECTemperature,
  calculateCoulombPenetration
} = RydbergMatterModel;

const PhysicsModelTester = () => {
  const logger = useLogger();
  const [testResults, setTestResults] = useState([]);
  const [testError, setTestError] = useState(null);
  const [expanded, setExpanded] = useState('validation-tests');
  
  // Helper function for scientific notation formatting
  const formatScientific = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    // Format numbers in scientific notation for better readability
    if (Math.abs(value) < 0.001 || Math.abs(value) > 1000) {
      return value.toExponential(3);
    }
    return value.toFixed(4);
  };
  
  // Define test cases for each physics function
  const testCases = [
    {
      name: 'Rydberg Energy',
      function: calculateRydbergEnergy,
      params: [1, 2, 5, 10],
      units: 'eV',
      validator: (n, result) => result === -13.6 / (n * n),
      expectedValues: {
        1: -13.6,
        2: -3.4,
        5: -0.544,
        10: -0.136
      }
    },
    {
      name: 'Rydberg Radius',
      function: calculateRydbergRadius,
      params: [1, 2, 5, 10],
      units: 'nm',
      validator: (n, result) => Math.abs(result - 0.0529 * n * n) < 1e-4,
      expectedValues: {
        1: 0.0529,
        2: 0.2116,
        5: 1.3225,
        10: 5.29
      }
    },
    {
      name: 'Overlap Probability',
      function: calculateOverlapProbability,
      params: [[1, 0.1], [5, 0.1], [10, 0.1], [10, 0.5]],
      paramsLabels: ['a (Bohr radii)', 'r0 (nm)'],
      units: '',
      validator: null // Complex calculation, manual validation
    },
    {
      name: 'Double Layer Electric Field',
      function: calculateDoubleLayerField,
      params: [[0.1, 1], [0.5, 1], [1, 0.5], [2, 0.1]],
      paramsLabels: ['ΔV (V)', 'd (nm)'],
      units: 'V/m',
      validator: (params, result) => Math.abs(result - params[0] / (params[1] * 1e-9)) < 1e-6
    },
    {
      name: 'Electric Field Around Rydberg Atom',
      function: calculateElectricField,
      params: [[1, 1], [10, 1], [10, 2], [10, 10]],
      paramsLabels: ['n', 'Z'],
      units: 'V/m',
      validator: null // Complex calculation, manual validation
    },
    {
      name: 'Neutron Formation Cross-Section',
      function: calculateNeutronFormationCrossSection,
      params: [1e-1, 1e-3, 1e-5, 1e-10],
      units: 'm²',
      validator: (overlap, result) => Math.abs(result - 1e-21 * overlap) < 1e-30
    },
    {
      name: 'Cross-Section for Nuclear Reactions',
      function: calculateCrossSection,
      params: [1, 5, 10, 15],
      units: 'm²',
      validator: null // Complex calculation, manual validation
    },
    {
      name: 'Casimir Force',
      function: calculateCasimirForce,
      params: [[1, 1], [5, 1], [1, 0.5], [5, 0.5]],
      paramsLabels: ['Area (μm²)', 'Distance (nm)'],
      units: 'N',
      validator: null // Complex calculation, manual validation
    },
    {
      name: 'Tunneling Enhancement',
      function: calculateTunnelingEnhancement,
      params: [[1000, 500, 2, 1], [1000, 100, 2, 1], [500, 100, 2, 1], [1000, 500, 4, 1]],
      paramsLabels: ['Original Barrier (eV)', 'Reduced Barrier (eV)', 'Particle Mass (u)', 'Barrier Width (fm)'],
      units: '',
      validator: null // Complex calculation, manual validation
    },
    {
      name: 'BEC Critical Temperature',
      function: calculateBECCriticalTemperature,
      params: [[1e28, 2], [1e27, 2], [1e28, 4], [1e27, 4]],
      paramsLabels: ['Density (m⁻³)', 'Mass (u)'],
      units: 'K',
      validator: null // Complex calculation, manual validation
    },
    {
      name: 'BEC Temperature (Deuterium)',
      function: calculateBECTemperature,
      params: [1e28, 1e27, 1e26, 1e25],
      units: 'K',
      validator: (density, result) => {
        const expectedResult = calculateBECCriticalTemperature(density, 2.014);
        return Math.abs(result - expectedResult) < 1e-6;
      }
    },
    {
      name: 'Coulomb Barrier Penetration',
      function: calculateCoulombPenetration,
      params: [
        [1, 1, 0.5, 0.1, 1.0],   // H + H, low energy, no screening
        [1, 1, 0.5, 0.1, 5.0],   // H + H, low energy, high screening
        [1, 1, 0.5, 10, 1.0],    // H + H, high energy, no screening
        [2, 2, 1.0, 0.1, 1.0]    // He + He, low energy, no screening
      ],
      paramsLabels: ['Z1', 'Z2', 'Reduced Mass (u)', 'Energy (keV)', 'Screening'],
      units: '',
      validator: null // Complex calculation, manual validation
    }
  ];
  
  // Run validation tests for the physics functions
  const runValidationTests = () => {
    logger.info('Running physics model validation tests');
    setTestError(null);
    const results = [];
    
    try {
      // Test each function
      testCases.forEach(testCase => {
        const functionResults = [];
        
        if (Array.isArray(testCase.params[0])) {
          // Test with multiple parameter sets
          testCase.params.forEach(paramSet => {
            try {
              const result = testCase.function(...paramSet);
              const isValid = testCase.validator ? testCase.validator(paramSet, result) : null;
              
              functionResults.push({
                params: paramSet,
                result,
                isValid
              });
            } catch (err) {
              functionResults.push({
                params: paramSet,
                error: err.message,
                isValid: false
              });
            }
          });
        } else {
          // Test with single parameter
          testCase.params.forEach(param => {
            try {
              const result = testCase.function(param);
              const isValid = testCase.validator ? testCase.validator(param, result) : null;
              const expectedValue = testCase.expectedValues ? testCase.expectedValues[param] : null;
              
              functionResults.push({
                param,
                result,
                expectedValue,
                isValid,
                deviation: expectedValue ? Math.abs(result - expectedValue) / Math.abs(expectedValue) * 100 : null
              });
            } catch (err) {
              functionResults.push({
                param,
                error: err.message,
                isValid: false
              });
            }
          });
        }
        
        results.push({
          ...testCase,
          results: functionResults
        });
      });
      
      setTestResults(results);
    } catch (err) {
      logger.error('Error running physics validation tests', err);
      setTestError(err.message || 'Error running tests');
    }
  };
  
  // Run validation tests on component mount
  useEffect(() => {
    runValidationTests();
  }, []);
  
  // Handle accordion expansion
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };
  
  // Check if any test has an error
  const hasErrors = testResults.some(test => 
    test.results.some(result => result.error || (result.isValid === false))
  );
  
  // Add theory explanation section
  const renderTheoryExplanation = () => (
    <Accordion expanded={expanded === 'theory'} onChange={handleAccordionChange('theory')}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Physical Interpretation</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          <Typography variant="body1" paragraph>
            The Rydberg Matter model focuses on the enhanced nuclear reactions in highly excited atoms, where electrons occupy orbitals with large principal quantum numbers.
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Key Physical Concepts:
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>1. Rydberg Atoms:</strong> Atoms with electrons in high energy levels follow E = -13.6 eV/n², with orbital radius proportional to n². 
            This leads to extended electron distributions that can promote screening effects.
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>2. Electron Screening:</strong> Large orbital radii create electron clouds that can screen nuclear charges, reducing effective Coulomb barriers between nuclei.
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>3. Coulomb Barrier Penetration:</strong> The probability of nuclear tunneling is given by exp(-G), where G is the Gamow factor. 
            Enhanced screening decreases G, dramatically increasing penetration probability.
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>4. Collective Effects:</strong> BEC formation at critical temperatures can create coherent quantum states that potentially enhance nuclear reactions through collective tunneling.
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>5. Fusion Enhancement:</strong> The combined effects of screening, collectivity, and quantum tunneling in Rydberg matter may explain enhanced fusion rates at energies lower than conventional theory predicts.
          </Typography>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
  
  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5">Physics Model Validation</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Testing the Rydberg Matter model for LENR calculations
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Button 
          variant="contained" 
          startIcon={<PlayArrowIcon />}
          onClick={runValidationTests}
          sx={{ mb: 2 }}
        >
          Run Tests
        </Button>
        
        {testError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {testError}
          </Alert>
        )}
      </Paper>
      
      <Accordion 
        expanded={expanded === 'validation-tests'} 
        onChange={handleAccordionChange('validation-tests')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Validation Tests</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {testResults.map((test, index) => (
            <Paper key={index} sx={{ mb: 2, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {test.name}
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {Array.isArray(test.params[0]) ? (
                        test.paramsLabels.map((label, i) => (
                          <TableCell key={i}>{label}</TableCell>
                        ))
                      ) : (
                        <TableCell>Input Parameter</TableCell>
                      )}
                      <TableCell>Result ({test.units})</TableCell>
                      {test.expectedValues && <TableCell>Expected Value</TableCell>}
                      {test.expectedValues && <TableCell>Deviation (%)</TableCell>}
                      {test.validator && <TableCell>Valid</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {test.results.map((result, resultIndex) => (
                      <TableRow key={resultIndex}>
                        {Array.isArray(test.params[0]) ? (
                          result.params.map((param, paramIndex) => (
                            <TableCell key={paramIndex}>{formatScientific(param)}</TableCell>
                          ))
                        ) : (
                          <TableCell>{formatScientific(result.param)}</TableCell>
                        )}
                        
                        <TableCell>
                          {result.error ? (
                            <Typography color="error">{result.error}</Typography>
                          ) : (
                            formatScientific(result.result)
                          )}
                        </TableCell>
                        
                        {test.expectedValues && (
                          <TableCell>{formatScientific(result.expectedValue)}</TableCell>
                        )}
                        
                        {test.expectedValues && (
                          <TableCell>
                            {result.deviation !== null ? formatScientific(result.deviation) : 'N/A'}
                          </TableCell>
                        )}
                        
                        {test.validator && (
                          <TableCell>
                            {result.isValid === null ? (
                              'N/A'
                            ) : result.isValid ? (
                              <Typography color="success.main">Pass</Typography>
                            ) : (
                              <Typography color="error">Fail</Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </AccordionDetails>
      </Accordion>
      
      <Accordion 
        expanded={expanded === 'consistency-tests'} 
        onChange={handleAccordionChange('consistency-tests')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Cross-Function Consistency Tests</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Rydberg Model Consistency
                </Typography>
                
                <Typography paragraph>
                  Testing the relationship between Rydberg energy, radius, and electric field.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  For an electron in a Rydberg state, the energy scales as 1/n² while 
                  the radius scales as n², and the electric field at the orbital 
                  radius scales as 1/n⁴.
                </Alert>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>n</TableCell>
                        <TableCell>Energy (eV)</TableCell>
                        <TableCell>Radius (nm)</TableCell>
                        <TableCell>Electric Field (V/m)</TableCell>
                        <TableCell>Energy × n²</TableCell>
                        <TableCell>Radius / n²</TableCell>
                        <TableCell>E-Field × n⁴</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[1, 2, 5, 10, 20].map(n => {
                        const energy = calculateRydbergEnergy(n);
                        const radius = calculateRydbergRadius(n);
                        const efield = calculateElectricField(n, 1);
                        
                        return (
                          <TableRow key={n}>
                            <TableCell>{n}</TableCell>
                            <TableCell>{formatScientific(energy)}</TableCell>
                            <TableCell>{formatScientific(radius)}</TableCell>
                            <TableCell>{formatScientific(efield)}</TableCell>
                            <TableCell>{formatScientific(energy * n * n)}</TableCell>
                            <TableCell>{formatScientific(radius / (n * n))}</TableCell>
                            <TableCell>{formatScientific(efield * Math.pow(n, 4))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tunneling Enhancement vs. Barrier Reduction
                </Typography>
                
                <Typography paragraph>
                  Testing the tunneling probability enhancement as a function of barrier reduction.
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Original Barrier (eV)</TableCell>
                        <TableCell>Reduced Barrier (eV)</TableCell>
                        <TableCell>Reduction (%)</TableCell>
                        <TableCell>Enhancement Factor</TableCell>
                        <TableCell>Log₁₀(Enhancement)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        [1000, 900],
                        [1000, 750],
                        [1000, 500],
                        [1000, 250],
                        [1000, 100]
                      ].map(([original, reduced], index) => {
                        const enhancement = calculateTunnelingEnhancement(original, reduced, 2, 1);
                        const reduction = (original - reduced) / original * 100;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{original}</TableCell>
                            <TableCell>{reduced}</TableCell>
                            <TableCell>{formatScientific(reduction)}</TableCell>
                            <TableCell>{formatScientific(enhancement)}</TableCell>
                            <TableCell>{formatScientific(Math.log10(enhancement))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {renderTheoryExplanation()}
    </Box>
  );
};

export default PhysicsModelTester; 