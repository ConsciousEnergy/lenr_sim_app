// Enhanced test script for RydbergMatterModel
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, CircularProgress, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, TextField, Grid, Divider
} from '@mui/material';
import RydbergMatterModel from '../models/RydbergMatterModel';

const TestRydbergModel = () => {
  const [testResults, setTestResults] = useState({
    hasImport: false,
    hasFunction: false,
    canCallFunction: false,
    params: null,
    error: null,
    functionResults: null,
    testValues: null
  });

  const [customParams, setCustomParams] = useState({
    n: 10,
    Z: 1,
    T: 300
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    runTests();
  }, []);

  const handleParamChange = (param, value) => {
    setCustomParams(prev => ({
      ...prev,
      [param]: Number(value)
    }));
  };

  const runTests = (type = 'basic') => {
    setIsLoading(true);
    
    const results = {
      hasImport: false,
      hasFunction: false,
      canCallFunction: false,
      params: null,
      error: null,
      functionResults: {},
      testValues: {}
    };

    try {
      // Test 1: RydbergMatterModel is imported
      results.hasImport = !!RydbergMatterModel;
      console.log('RydbergMatterModel imported:', results.hasImport);

      // Test 2: Check for all expected functions
      const expectedFunctions = [
        'generateRydbergSimulationParams',
        'calculateRydbergEnergy',
        'calculateRydbergRadius',
        'calculateOverlapProbability',
        'calculateElectricField',
        'calculateCrossSection',
        'calculateCasimirForce',
        'calculateTunnelingEnhancement',
        'calculateBECTemperature',
        'calculateCoulombPenetration'
      ];
      
      const availableFunctions = [];
      const missingFunctions = [];
      
      expectedFunctions.forEach(funcName => {
        const hasFunction = typeof RydbergMatterModel[funcName] === 'function';
        if (hasFunction) {
          availableFunctions.push(funcName);
        } else {
          missingFunctions.push(funcName);
        }
      });
      
      results.hasFunction = availableFunctions.length === expectedFunctions.length;
      results.availableFunctions = availableFunctions;
      results.missingFunctions = missingFunctions;
      
      console.log('Available functions:', availableFunctions);
      console.log('Missing functions:', missingFunctions);

      // Test 3: Call and test core functions with default values
      if (availableFunctions.includes('generateRydbergSimulationParams')) {
        try {
          const params = RydbergMatterModel.generateRydbergSimulationParams();
          results.params = params;
          results.canCallFunction = true;
          console.log('Generated params:', params);
          
          // Now test individual functions with these parameters
          if (type === 'advanced') {
            // For more comprehensive testing, run calculations with custom values
            const testN = [1, 2, 3, 5, 10, 20, 50, 100];
            const testZ = [1, 2];
            const testT = [50, 100, 300, 1000];
            
            results.testValues = {
              energy: [],
              radius: [],
              overlap: [],
              field: [],
              crossSection: [],
              casimir: [],
              tunneling: [],
              bec: []
            };
            
            // Test energy calculation with different n values
            if (availableFunctions.includes('calculateRydbergEnergy')) {
              testN.forEach(n => {
                try {
                  const energy = RydbergMatterModel.calculateRydbergEnergy(n);
                  results.testValues.energy.push({ n, energy });
                } catch (err) {
                  results.testValues.energy.push({ 
                    n, 
                    error: err.message 
                  });
                }
              });
            }
            
            // Test radius calculation with different n values
            if (availableFunctions.includes('calculateRydbergRadius')) {
              testN.forEach(n => {
                try {
                  const radius = RydbergMatterModel.calculateRydbergRadius(n);
                  results.testValues.radius.push({ n, radius });
                } catch (err) {
                  results.testValues.radius.push({ 
                    n, 
                    error: err.message 
                  });
                }
              });
            }
            
            // Test overlap probability
            if (availableFunctions.includes('calculateOverlapProbability')) {
              testN.forEach(n => {
                try {
                  const overlap = RydbergMatterModel.calculateOverlapProbability(n, 300);
                  results.testValues.overlap.push({ n, T: 300, overlap });
                } catch (err) {
                  results.testValues.overlap.push({ 
                    n, 
                    T: 300,
                    error: err.message 
                  });
                }
              });
            }
            
            // Test electric field calculation
            if (availableFunctions.includes('calculateElectricField')) {
              testN.forEach(n => {
                testZ.forEach(Z => {
                  try {
                    const field = RydbergMatterModel.calculateElectricField(n, Z);
                    results.testValues.field.push({ n, Z, field });
                  } catch (err) {
                    results.testValues.field.push({ 
                      n, 
                      Z,
                      error: err.message 
                    });
                  }
                });
              });
            }
            
            // Test cross section
            if (availableFunctions.includes('calculateCrossSection')) {
              testN.forEach(n => {
                try {
                  const crossSection = RydbergMatterModel.calculateCrossSection(n);
                  results.testValues.crossSection.push({ n, crossSection });
                } catch (err) {
                  results.testValues.crossSection.push({ 
                    n, 
                    error: err.message 
                  });
                }
              });
            }
            
            // Test BEC temperature
            if (availableFunctions.includes('calculateBECTemperature')) {
              [1e19, 1e20, 1e21, 1e22].forEach(density => {
                try {
                  const criticalTemp = RydbergMatterModel.calculateBECTemperature(density);
                  results.testValues.bec.push({ density, criticalTemp });
                } catch (err) {
                  results.testValues.bec.push({ 
                    density, 
                    error: err.message 
                  });
                }
              });
            }
          } else {
            // For basic tests, just call each function once with standard values
            Object.keys(RydbergMatterModel).forEach(funcName => {
              if (typeof RydbergMatterModel[funcName] === 'function' && funcName !== 'generateRydbergSimulationParams') {
                try {
                  let result;
                  switch (funcName) {
                    case 'calculateRydbergEnergy':
                      result = RydbergMatterModel[funcName](10);
                      break;
                    case 'calculateRydbergRadius':
                      result = RydbergMatterModel[funcName](10);
                      break;
                    case 'calculateOverlapProbability':
                      result = RydbergMatterModel[funcName](10, 300);
                      break;
                    case 'calculateElectricField':
                      result = RydbergMatterModel[funcName](10, 1);
                      break;
                    case 'calculateCrossSection':
                      result = RydbergMatterModel[funcName](10);
                      break;
                    case 'calculateCasimirForce':
                      result = RydbergMatterModel[funcName](10, 1e-10);
                      break;
                    case 'calculateTunnelingEnhancement':
                      result = RydbergMatterModel[funcName](10, 0.5);
                      break;
                    case 'calculateBECTemperature':
                      result = RydbergMatterModel[funcName](1e20);
                      break;
                    default:
                      result = 'Function not tested';
                  }
                  results.functionResults[funcName] = result;
                } catch (err) {
                  results.functionResults[funcName] = `Error: ${err.message}`;
                }
              }
            });
          }
        } catch (error) {
          console.error('Error calling generateRydbergSimulationParams:', error);
          results.error = error.message;
        }
      }
      
      // Test custom parameter calculation if in custom mode
      if (type === 'custom' && availableFunctions.length > 0) {
        results.customResults = {};
        
        try {
          if (availableFunctions.includes('calculateRydbergEnergy')) {
            results.customResults.energy = RydbergMatterModel.calculateRydbergEnergy(customParams.n);
          }
          
          if (availableFunctions.includes('calculateRydbergRadius')) {
            results.customResults.radius = RydbergMatterModel.calculateRydbergRadius(customParams.n);
          }
          
          if (availableFunctions.includes('calculateOverlapProbability')) {
            results.customResults.overlap = RydbergMatterModel.calculateOverlapProbability(
              customParams.n, 
              customParams.T
            );
          }
          
          if (availableFunctions.includes('calculateElectricField')) {
            results.customResults.field = RydbergMatterModel.calculateElectricField(
              customParams.n, 
              customParams.Z
            );
          }
          
          if (availableFunctions.includes('calculateCrossSection')) {
            results.customResults.crossSection = RydbergMatterModel.calculateCrossSection(customParams.n);
          }
          
          if (availableFunctions.includes('calculateBECTemperature')) {
            // Assuming density of 1e20
            results.customResults.bec = RydbergMatterModel.calculateBECTemperature(1e20);
          }
        } catch (error) {
          console.error('Error with custom parameters:', error);
          results.customError = error.message;
        }
      }
    } catch (error) {
      console.error('General error in tests:', error);
      results.error = error.message;
    }

    setTestResults(results);
    setIsLoading(false);
    setActiveTab(type);
  };

  const renderBasicResults = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Model Import:</Typography>
      <Box sx={{ mb: 3 }}>
        <Typography color={testResults.hasImport ? 'success.main' : 'error.main'} variant="body1">
          Import check: {testResults.hasImport ? 'PASSED' : 'FAILED'}
        </Typography>
      </Box>
    
      <Typography variant="h6" gutterBottom>Function Availability:</Typography>
      <Box sx={{ mb: 3 }}>
        <Typography color={testResults.hasFunction ? 'success.main' : 'error.main'} variant="body1">
          Function check: {testResults.hasFunction ? 'All functions available' : 'Some functions missing'}
        </Typography>
        
        {testResults.missingFunctions && testResults.missingFunctions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography color="error.main" variant="body2">
              Missing: {testResults.missingFunctions.join(', ')}
            </Typography>
          </Box>
        )}
      </Box>
      
      <Typography variant="h6" gutterBottom>Function Results:</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Function</TableCell>
              <TableCell>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testResults.functionResults && Object.entries(testResults.functionResults).map(([funcName, result]) => (
              <TableRow key={funcName}>
                <TableCell>{funcName}</TableCell>
                <TableCell>
                  {typeof result === 'string' && result.startsWith('Error') ? (
                    <Typography color="error">{result}</Typography>
                  ) : typeof result === 'object' ? (
                    JSON.stringify(result)
                  ) : (
                    String(result)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {testResults.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error: {testResults.error}
        </Alert>
      )}
    </Paper>
  );

  const renderCustomParamTest = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Custom Parameter Testing</Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Principal Quantum Number (n)"
            type="number"
            fullWidth
            value={customParams.n}
            onChange={(e) => handleParamChange('n', e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Atomic Number (Z)"
            type="number"
            fullWidth
            value={customParams.Z}
            onChange={(e) => handleParamChange('Z', e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Temperature (K)"
            type="number"
            fullWidth
            value={customParams.T}
            onChange={(e) => handleParamChange('T', e.target.value)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
      </Grid>
      
      <Button 
        variant="contained" 
        onClick={() => runTests('custom')}
        sx={{ mb: 3 }}
      >
        Test with Custom Parameters
      </Button>
      
      {testResults.customResults && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(testResults.customResults).map(([property, value]) => (
                <TableRow key={property}>
                  <TableCell>{property}</TableCell>
                  <TableCell>{typeof value === 'object' ? JSON.stringify(value) : value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {testResults.customError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error: {testResults.customError}
        </Alert>
      )}
    </Paper>
  );

  const renderAdvancedResults = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Advanced Test Results</Typography>
      
      {testResults.testValues && Object.keys(testResults.testValues).map(category => (
        testResults.testValues[category].length > 0 && (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {category.charAt(0).toUpperCase() + category.slice(1)} Calculations
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(testResults.testValues[category][0]).map(key => (
                      <TableCell key={key}>{key}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResults.testValues[category].map((result, idx) => (
                    <TableRow key={idx}>
                      {Object.entries(result).map(([key, value]) => (
                        <TableCell key={key}>
                          {key === 'error' ? (
                            <Typography color="error">{value}</Typography>
                          ) : typeof value === 'object' ? (
                            JSON.stringify(value)
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )
      ))}
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        RydbergMatterModel Test Suite
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button 
          variant={activeTab === 'basic' ? 'contained' : 'outlined'}
          onClick={() => runTests('basic')}
          disabled={isLoading}
        >
          Basic Tests
        </Button>
        
        <Button 
          variant={activeTab === 'custom' ? 'contained' : 'outlined'}
          onClick={() => runTests('custom')}
          disabled={isLoading}
        >
          Custom Parameter Tests
        </Button>
        
        <Button 
          variant={activeTab === 'advanced' ? 'contained' : 'outlined'}
          onClick={() => runTests('advanced')}
          disabled={isLoading}
        >
          Advanced Analysis
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {activeTab === 'basic' && renderBasicResults()}
          {activeTab === 'custom' && renderCustomParamTest()}
          {activeTab === 'advanced' && renderAdvancedResults()}
          
          {testResults.params && activeTab === 'basic' && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Default Simulation Parameters:</Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: '300px'
                }}
              >
                {JSON.stringify(testResults.params, null, 2)}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TestRydbergModel; 