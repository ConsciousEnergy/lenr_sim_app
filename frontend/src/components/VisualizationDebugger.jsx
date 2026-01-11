import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Alert, 
  CircularProgress, 
  Divider, 
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * VisualizationDebugger Component
 * 
 * A debugging utility for Three.js/WebGL visualizations that:
 * 1. Tests WebGL compatibility
 * 2. Checks for common rendering issues
 * 3. Validates form accessibility 
 * 4. Provides diagnostic information for troubleshooting
 */
const VisualizationDebugger = () => {
  // State for test results
  const [webGLInfo, setWebGLInfo] = useState(null);
  const [webGLSupported, setWebGLSupported] = useState(null);
  const [webGLErrors, setWebGLErrors] = useState([]);
  const [threeJSErrors, setThreeJSErrors] = useState([]);
  const [accessibilityIssues, setAccessibilityIssues] = useState([]);
  const [performanceIssues, setPerformanceIssues] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [domIssues, setDomIssues] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Function to run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setWebGLErrors([]);
    setThreeJSErrors([]);
    setAccessibilityIssues([]);
    setPerformanceIssues([]);
    setDomIssues([]);
    setConsoleLogs([]);
    
    try {
      await testWebGLSupport();
      await testThreeJS();
      await checkAccessibility();
      await checkPerformance();
      await checkDOM();
      await collectConsoleLogs();
    } catch (error) {
      console.error("Error running tests:", error);
      setWebGLErrors(prev => [...prev, { message: error.message, critical: true }]);
    } finally {
      setIsRunningTests(false);
    }
  };
  
  // Test WebGL support and capabilities
  const testWebGLSupport = async () => {
    try {
      // Try to create a WebGL context
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        setWebGLSupported(false);
        setWebGLErrors(prev => [...prev, { 
          message: "WebGL is not supported in this browser.", 
          critical: true
        }]);
        return;
      }
      
      setWebGLSupported(true);
      
      // Get WebGL information
      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          
          setWebGLInfo({
            vendor,
            renderer,
            webglVersion: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            extensions: gl.getSupportedExtensions()
          });
          
          // Check for potential issues based on renderer
          const lowEndGPUs = ['swiftshader', 'mesa', 'llvmpipe', 'angle', 'intel'];
          if (lowEndGPUs.some(name => renderer.toLowerCase().includes(name))) {
            setPerformanceIssues(prev => [...prev, { 
              message: `Detected potentially low-performance GPU: ${renderer}. This may affect visualization quality.`,
              critical: false
            }]);
          }
        }
      } catch (e) {
        console.warn("Couldn't get WebGL debug info:", e);
      }
      
      // Test for depth and stencil buffer support
      const attributes = gl.getContextAttributes();
      if (!attributes.depth) {
        setWebGLErrors(prev => [...prev, { 
          message: "Depth buffer not available. 3D rendering will have z-fighting issues.", 
          critical: false
        }]);
      }
      
      // Test extension support needed for advanced rendering
      const requiredExtensions = ['OES_texture_float', 'OES_standard_derivatives'];
      for (const ext of requiredExtensions) {
        if (!gl.getExtension(ext)) {
          setWebGLErrors(prev => [...prev, { 
            message: `Required WebGL extension '${ext}' not supported.`, 
            critical: false
          }]);
        }
      }
      
    } catch (e) {
      setWebGLSupported(false);
      setWebGLErrors(prev => [...prev, { 
        message: `Error testing WebGL: ${e.message}`, 
        critical: true
      }]);
    }
  };
  
  // Test Three.js functionality
  const testThreeJS = async () => {
    try {
      // Dynamically import Three.js
      const THREE = await import('three');
      
      // Create a minimal scene to test Three.js
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 128;
      testCanvas.height = 128;
      
      try {
        // Try to create renderer
        const renderer = new THREE.WebGLRenderer({ 
          canvas: testCanvas, 
          antialias: false,
          alpha: true
        });
        
        // Create a simple scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 5;
        
        // Add a simple mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        // Try to render
        renderer.render(scene, camera);
        
        // Clean up resources
        renderer.dispose();
        geometry.dispose();
        material.dispose();
        
      } catch (e) {
        setThreeJSErrors(prev => [...prev, { 
          message: `Three.js rendering failed: ${e.message}`, 
          critical: true 
        }]);
      }
      
    } catch (e) {
      setThreeJSErrors(prev => [...prev, { 
        message: `Failed to load Three.js: ${e.message}`, 
        critical: true 
      }]);
    }
  };
  
  // Check for accessibility issues in visualization-related elements
  const checkAccessibility = async () => {
    const issues = [];
    
    // Find form elements
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      // Check form ID
      if (!form.id) {
        issues.push({
          element: 'form',
          message: 'Form is missing an ID attribute',
          fix: 'Add id="simulation-form" or similar unique ID'
        });
      }
      
      // Check input elements
      form.querySelectorAll('input, select, textarea').forEach(input => {
        if (!input.id) {
          issues.push({
            element: input.nodeName.toLowerCase(),
            message: `${input.nodeName} is missing ID attribute`,
            fix: `Add id="${input.name || 'input'}-id"`
          });
        }
        
        if (!input.name) {
          issues.push({
            element: input.nodeName.toLowerCase(),
            message: `${input.nodeName} is missing name attribute`,
            fix: `Add name="${input.id || 'input'}-name"`
          });
        }
        
        // Check for associated labels
        const hasLabelAssociation = 
          document.querySelector(`label[for="${input.id}"]`) || 
          input.closest('label');
        
        if (!hasLabelAssociation) {
          issues.push({
            element: input.nodeName.toLowerCase(),
            message: `${input.nodeName} (id="${input.id || 'missing'}") is missing associated label`,
            fix: `Add <label for="${input.id || 'input-id'}">Label text</label>`
          });
        }
      });
      
      // Check labels
      form.querySelectorAll('label').forEach(label => {
        if (!label.htmlFor && !label.querySelector('input, select, textarea')) {
          issues.push({
            element: 'label',
            message: 'Label is not associated with any form control',
            fix: 'Add for="input-id" to the label'
          });
        }
      });
    });
    
    // Check accessibility of the visualization containers
    const vizContainers = document.querySelectorAll('[id*="visualization"], [class*="visualization"]');
    vizContainers.forEach(container => {
      // Check if container has aria-label for screen readers
      if (!container.getAttribute('aria-label') && !container.getAttribute('aria-labelledby')) {
        issues.push({
          element: 'visualization container',
          message: 'Visualization container missing accessible name',
          fix: 'Add aria-label="Visualization of LENR simulation" or aria-labelledby="title-id"'
        });
      }
      
      // Check interactive controls in visualizations
      container.querySelectorAll('button, [role="button"]').forEach(button => {
        if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
          issues.push({
            element: 'button',
            message: 'Button in visualization has no accessible name',
            fix: 'Add aria-label="Function description"'
          });
        }
      });
    });
    
    setAccessibilityIssues(issues);
  };
  
  // Check for performance issues
  const checkPerformance = async () => {
    const issues = [];
    
    // Check for too many DOM elements
    const totalElements = document.querySelectorAll('*').length;
    if (totalElements > 3000) {
      issues.push({
        message: `High DOM element count (${totalElements}). Consider reducing for better performance.`,
        critical: false
      });
    }
    
    // Check for canvas size
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width * rect.height > 1920 * 1080) {
        issues.push({
          message: `Canvas size (${rect.width}x${rect.height}) is very large. Consider reducing for better performance.`,
          critical: false
        });
      }
      
      if (canvas.width > rect.width * 2 || canvas.height > rect.height * 2) {
        issues.push({
          message: "Canvas resolution is significantly higher than display size (supersampling). This may affect performance.",
          critical: false
        });
      }
    });
    
    setPerformanceIssues(prev => [...prev, ...issues]);
  };
  
  // Check for DOM rendering issues
  const checkDOM = async () => {
    const issues = [];
    
    // Check for large images without dimensions
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.width && !img.height && !img.style.width && !img.style.height) {
        issues.push({
          message: 'Image without specified dimensions may cause layout shifts',
          element: img
        });
      }
    });
    
    // Check for canvas elements without dimensions
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      if (!canvas.style.width && !canvas.style.height) {
        issues.push({
          message: 'Canvas without CSS dimensions may render incorrectly',
          element: canvas
        });
      }
    });
    
    // Check for hidden Three.js errors (often in WebGL context)
    if (window.threeJSErrorsDetected) {
      issues.push({
        message: 'Hidden Three.js errors detected. Check console for details.',
        critical: true
      });
    }
    
    setDomIssues(issues);
  };
  
  // Collect any console errors that might be affecting visualizations
  const collectConsoleLogs = async () => {
    // Note: This is only a helper for current errors, not past errors
    // Normally we would use a console interceptor at app initialization
    
    setConsoleLogs([
      { type: 'info', message: 'Console logs must be collected with a global interceptor.' },
      { type: 'info', message: 'Please check browser console for any WebGL or Three.js errors.' }
    ]);
  };
  
  // Effect to run tests on initial load
  useEffect(() => {
    runAllTests();
  }, []);
  
  return (
    <Paper sx={{ p: 3, my: 2, maxWidth: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Visualization Debugging Tools
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          This utility diagnoses issues with 3D visualizations in the LENR Simulation App. 
          It checks WebGL compatibility, Three.js rendering, and accessibility issues.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={runAllTests}
            disabled={isRunningTests}
            startIcon={isRunningTests ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          <FormControlLabel
            control={
              <Switch
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                name="showAdvanced"
              />
            }
            label="Show Advanced Diagnostics"
          />
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* WebGL Support */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {webGLSupported === true && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
            {webGLSupported === false && <ErrorIcon color="error" sx={{ mr: 1 }} />}
            {webGLSupported === null && <InfoIcon color="info" sx={{ mr: 1 }} />}
            <Typography variant="h6">WebGL Support</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {webGLSupported === null && !isRunningTests && (
            <Alert severity="info">Run tests to check WebGL support</Alert>
          )}
          
          {isRunningTests && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography>Testing WebGL support...</Typography>
            </Box>
          )}
          
          {webGLSupported === true && (
            <Alert severity="success" sx={{ mb: 2 }}>
              WebGL is supported in your browser
            </Alert>
          )}
          
          {webGLSupported === false && (
            <Alert severity="error" sx={{ mb: 2 }}>
              WebGL is not supported in your browser. 3D visualizations will not work.
            </Alert>
          )}
          
          {webGLErrors.length > 0 && (
            <List dense>
              {webGLErrors.map((error, index) => (
                <ListItem key={index} sx={{ color: error.critical ? 'error.main' : 'warning.main' }}>
                  <ListItemText primary={error.message} />
                </ListItem>
              ))}
            </List>
          )}
          
          {webGLInfo && showAdvanced && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                WebGL Details:
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Vendor:</strong> {webGLInfo.vendor}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Renderer:</strong> {webGLInfo.renderer}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>WebGL Version:</strong> {webGLInfo.webglVersion}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>GLSL Version:</strong> {webGLInfo.shadingLanguageVersion}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Max Texture Size:</strong> {webGLInfo.maxTextureSize}px</Typography>
                </Grid>
              </Grid>
              
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>WebGL Extensions ({webGLInfo.extensions?.length || 0})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {webGLInfo.extensions?.map((ext, i) => (
                      <Typography key={i} variant="caption" component="div">{ext}</Typography>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Three.js Rendering */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {threeJSErrors.length > 0 && <ErrorIcon color="error" sx={{ mr: 1 }} />}
            {threeJSErrors.length === 0 && webGLSupported && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
            {threeJSErrors.length === 0 && !webGLSupported && <InfoIcon color="info" sx={{ mr: 1 }} />}
            <Typography variant="h6">Three.js Rendering</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {threeJSErrors.length > 0 ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              Three.js rendering issues detected
              <List dense>
                {threeJSErrors.map((error, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={error.message} />
                  </ListItem>
                ))}
              </List>
            </Alert>
          ) : webGLSupported ? (
            <Alert severity="success">
              Three.js rendering test passed
            </Alert>
          ) : (
            <Alert severity="info">
              Three.js test skipped due to WebGL support issues
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Accessibility Issues */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {accessibilityIssues.length > 0 && <WarningIcon color="warning" sx={{ mr: 1 }} />}
            {accessibilityIssues.length === 0 && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
            <Typography variant="h6">Accessibility Issues</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {accessibilityIssues.length > 0 ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {accessibilityIssues.length} accessibility issues
              </Alert>
              <List>
                {accessibilityIssues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={issue.message} 
                      secondary={
                        <>
                          <strong>Element:</strong> {issue.element}<br />
                          <strong>Fix:</strong> {issue.fix}
                        </>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Alert severity="success">
              No accessibility issues detected in visualization forms and controls
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Performance Issues */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {performanceIssues.length > 0 && <WarningIcon color="warning" sx={{ mr: 1 }} />}
            {performanceIssues.length === 0 && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
            <Typography variant="h6">Performance Issues</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {performanceIssues.length > 0 ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {performanceIssues.length} potential performance issues
              </Alert>
              <List>
                {performanceIssues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={issue.message} />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Alert severity="success">
              No significant performance issues detected
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* DOM Issues */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {domIssues.length > 0 && <WarningIcon color="warning" sx={{ mr: 1 }} />}
            {domIssues.length === 0 && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
            <Typography variant="h6">DOM Rendering Issues</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {domIssues.length > 0 ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {domIssues.length} DOM rendering issues
              </Alert>
              <List>
                {domIssues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={issue.message} />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Alert severity="success">
              No DOM rendering issues detected
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Recommendations */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Recommendations
        </Typography>
        
        <List>
          {webGLSupported === false && (
            <ListItem>
              <ListItemText 
                primary="Enable WebGL Support" 
                secondary="Update your browser or graphics drivers. Consider using Chrome or Firefox for best compatibility." 
              />
            </ListItem>
          )}
          
          {performanceIssues.length > 0 && (
            <ListItem>
              <ListItemText 
                primary="Improve Rendering Performance" 
                secondary="Lower visualization quality settings, reduce number of particles, or use simplified model view." 
              />
            </ListItem>
          )}
          
          {accessibilityIssues.length > 0 && (
            <ListItem>
              <ListItemText 
                primary="Fix Form Accessibility Issues" 
                secondary="Ensure all form controls have proper IDs and labels. This improves accessibility and autofill functionality." 
              />
            </ListItem>
          )}
          
          {threeJSErrors.length > 0 && (
            <ListItem>
              <ListItemText 
                primary="Fix Three.js Initialization Errors" 
                secondary="Ensure WebGL context is properly created and Three.js dependencies are loaded correctly." 
              />
            </ListItem>
          )}
          
          {/* Always show these general recommendations */}
          <ListItem>
            <ListItemText 
              primary="Use a Modern Browser" 
              secondary="Chrome, Firefox, Edge, or Safari provide the best WebGL support." 
            />
          </ListItem>
          
          <ListItem>
            <ListItemText 
              primary="Update Graphics Drivers" 
              secondary="Ensure your system has the latest graphics drivers installed." 
            />
          </ListItem>
        </List>
      </Box>
    </Paper>
  );
};

export default VisualizationDebugger; 