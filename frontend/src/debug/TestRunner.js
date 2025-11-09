import React from 'react';
import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Paper, 
  CircularProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseIcon from '@mui/icons-material/Pause';

/**
 * TestRunner component for running diagnostic tests
 */
const TestRunner = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  
  // Sample test cases
  const testCases = [
    { id: 1, name: 'API Connection Test', description: 'Verifies connection to backend API' },
    { id: 2, name: 'Three.js Rendering Test', description: 'Tests basic Three.js rendering capabilities' },
    { id: 3, name: 'WebGL Compatibility Test', description: 'Checks WebGL compatibility and features' },
    { id: 4, name: 'Data Processing Test', description: 'Tests data processing functions' },
    { id: 5, name: 'Performance Test', description: 'Benchmarks critical rendering operations' }
  ];
  
  const runTests = () => {
    setRunning(true);
    setResults([]);
    
    // Simulate test runs with setTimeout
    let completedTests = 0;
    
    testCases.forEach((test, index) => {
      setTimeout(() => {
        // Simulate random success/failure with about 80% pass rate
        const passed = Math.random() > 0.2;
        const duration = Math.floor(Math.random() * 500) + 100; // 100-600ms
        
        setResults(prev => [
          ...prev,
          {
            id: test.id,
            name: test.name,
            passed,
            duration,
            message: passed 
              ? 'Test completed successfully' 
              : 'Failed with error: Connection timeout'
          }
        ]);
        
        completedTests++;
        if (completedTests === testCases.length) {
          setRunning(false);
        }
      }, (index + 1) * 1000); // Run each test with a delay
    });
  };
  
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Diagnostic Test Runner
      </Typography>
      <Typography variant="body1" paragraph>
        Run diagnostic tests to verify system functionality.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={running ? <PauseIcon /> : <PlayArrowIcon />}
          onClick={runTests}
          disabled={running}
        >
          {running ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Available Tests
          </Typography>
          <List>
            {testCases.map((test) => (
              <React.Fragment key={test.id}>
                <ListItem>
                  <ListItemText primary={test.name} secondary={test.description} />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Paper>
        
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          {running && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}
          
          {results.length > 0 ? (
            <List>
              {results.map((result) => (
                <React.Fragment key={result.id}>
                  <ListItem>
                    <Box sx={{ mr: 1 }}>
                      {result.passed ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </Box>
                    <ListItemText 
                      primary={result.name} 
                      secondary={`${result.message} (${result.duration}ms)`} 
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : !running && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No tests have been run yet
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default TestRunner; 