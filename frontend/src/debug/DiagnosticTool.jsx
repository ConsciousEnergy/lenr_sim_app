import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

/**
 * Diagnostic Tool Component
 * 
 * Helps debug issues with:
 * 1. Ant Design warnings
 * 2. 3D visualization loading problems
 */
const DiagnosticTool = () => {
  const [antdComponents, setAntdComponents] = useState([]);
  const [webSocketStatus, setWebSocketStatus] = useState('Not checked');
  const [threejsStatus, setThreejsStatus] = useState('Not checked');
  const [isChecking, setIsChecking] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState([]);
  
  // Function to detect Ant Design components with bodyStyle prop
  const detectAntdComponents = () => {
    setIsChecking(true);
    const results = [];
    
    // Get all elements in the document
    const allElements = document.querySelectorAll('*');
    
    // Look for components that might be Ant Design Cards
    // We're looking for elements that have class names containing 'ant-card'
    const possibleAntdCards = [];
    allElements.forEach(el => {
      if (el.className && typeof el.className === 'string' && el.className.includes('ant-card')) {
        possibleAntdCards.push({
          element: el,
          className: el.className
        });
        results.push(`Found potential Ant Design Card: ${el.className}`);
      }
    });
    
    setAntdComponents(possibleAntdCards);
    
    if (possibleAntdCards.length === 0) {
      results.push('No Ant Design Card components found in the current view');
    }
    
    setDiagnosticResults(prev => [...prev, ...results]);
    setIsChecking(false);
  };
  
  // Function to check WebSocket connections
  const checkWebSocketConnections = () => {
    setIsChecking(true);
    const results = [];
    
    // Look for established websocket connections
    const hasWSConnections = Object.keys(window).some(key => 
      window[key] instanceof WebSocket && 
      (window[key].readyState === WebSocket.CONNECTING || window[key].readyState === WebSocket.OPEN)
    );
    
    if (hasWSConnections) {
      setWebSocketStatus('Connected');
      results.push('Active WebSocket connections found');
    } else {
      setWebSocketStatus('Not connected');
      results.push('No active WebSocket connections found');
    }
    
    // Check API connectivity
    fetch('/api/health')
      .then(response => {
        if (response.ok) {
          results.push('Backend API is accessible');
        } else {
          results.push(`Backend API returned status: ${response.status}`);
        }
      })
      .catch(error => {
        results.push(`Error connecting to backend API: ${error.message}`);
      })
      .finally(() => {
        setDiagnosticResults(prev => [...prev, ...results]);
        setIsChecking(false);
      });
  };
  
  // Function to check Three.js initialization
  const checkThreeJsStatus = () => {
    setIsChecking(true);
    const results = [];
    
    // Check for THREE global or canvas elements
    const hasThreeCanvas = document.querySelectorAll('canvas').length > 0;
    
    if (hasThreeCanvas) {
      results.push('Found canvas elements - potential Three.js renderers');
      
      // Check if WebGL is supported
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
          results.push('WebGL is supported in this browser');
          setThreejsStatus('Supported');
        } else {
          results.push('WebGL is NOT supported in this browser - this will prevent Three.js from working');
          setThreejsStatus('Not supported');
        }
      } catch (e) {
        results.push(`Error checking WebGL support: ${e.message}`);
        setThreejsStatus('Error checking');
      }
    } else {
      results.push('No canvas elements found - Three.js may not be initialized');
      setThreejsStatus('Not initialized');
    }
    
    setDiagnosticResults(prev => [...prev, ...results]);
    setIsChecking(false);
  };
  
  // Function to run all diagnostics
  const runAllDiagnostics = () => {
    setDiagnosticResults([]);
    detectAntdComponents();
    checkWebSocketConnections();
    checkThreeJsStatus();
  };
  
  // Function to clear console warnings
  const clearConsoleWarnings = () => {
    console.clear();
    setDiagnosticResults(prev => [...prev, 'Console cleared']);
  };
  
  // Function to inject a fix for Ant Design Card bodyStyle warnings
  const fixAntdWarnings = () => {
    // Create and inject a script to monkey patch the Ant Design Card component
    const script = document.createElement('script');
    script.textContent = `
      // This script attempts to patch Ant Design Card components
      // to suppress bodyStyle warnings by intercepting the props
      if (window.antd && window.antd.Card) {
        const originalCard = window.antd.Card;
        window.antd.Card = function PatchedCard(props) {
          // If bodyStyle is used, convert it to styles.body
          const newProps = {...props};
          if (newProps.bodyStyle) {
            newProps.styles = newProps.styles || {};
            newProps.styles.body = newProps.bodyStyle;
            delete newProps.bodyStyle;
          }
          return originalCard(newProps);
        };
        console.log('Patched Ant Design Card component');
      } else {
        console.log('Could not find Ant Design Card component to patch');
      }
    `;
    document.head.appendChild(script);
    
    setDiagnosticResults(prev => [...prev, 'Attempted to patch Ant Design Card component']);
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        LENR Sim Diagnostic Tool
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Run Diagnostics
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button 
            variant="contained" 
            onClick={runAllDiagnostics}
            disabled={isChecking}
          >
            Run All Checks
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={detectAntdComponents}
            disabled={isChecking}
          >
            Check Ant Design
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={checkWebSocketConnections}
            disabled={isChecking}
          >
            Check WebSocket
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={checkThreeJsStatus}
            disabled={isChecking}
          >
            Check Three.js
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={fixAntdWarnings}
            disabled={isChecking}
          >
            Fix Ant Design Warnings
          </Button>
          
          <Button 
            variant="outlined" 
            color="warning"
            onClick={clearConsoleWarnings}
            disabled={isChecking}
          >
            Clear Console
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Diagnostic Status
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2">Ant Design Components</Typography>
            <Typography>{antdComponents.length > 0 ? `Found ${antdComponents.length}` : 'None detected'}</Typography>
          </Paper>
          
          <Paper variant="outlined" sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2">WebSocket Status</Typography>
            <Typography>{webSocketStatus}</Typography>
          </Paper>
          
          <Paper variant="outlined" sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2">Three.js Status</Typography>
            <Typography>{threejsStatus}</Typography>
          </Paper>
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Diagnostic Results
        </Typography>
        
        <List sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {diagnosticResults.length > 0 ? (
            diagnosticResults.map((result, index) => (
              <ListItem key={index} divider={index < diagnosticResults.length - 1}>
                <ListItemText primary={result} />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="No diagnostic results yet. Run checks to see results." />
            </ListItem>
          )}
        </List>
      </Box>
      
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          How to use this tool:
        </Typography>
        <Typography variant="body2">
          1. Run "Check Ant Design" to find components causing warnings<br />
          2. Run "Check WebSocket" to verify connection to the backend<br />
          3. Run "Check Three.js" to verify 3D rendering capability<br />
          4. Use "Fix Ant Design Warnings" to patch the Card component<br />
          5. Use "Clear Console" to clear browser console warnings
        </Typography>
      </Box>
    </Paper>
  );
};

export default DiagnosticTool; 