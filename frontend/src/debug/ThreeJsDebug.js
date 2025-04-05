import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Grid, Alert, List, ListItem, ListItemText, Divider, IconButton, Tooltip, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import errorReporter from '../utils/errorReporter';
import threeCleanup from '../utils/threeCleanup';
import CodeIcon from '@mui/icons-material/Code';
import InfoIcon from '@mui/icons-material/Info';
import BarChartIcon from '@mui/icons-material/BarChart';
import MemoryIcon from '@mui/icons-material/Memory';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import { useLogger } from '../contexts/LogContext';

// Add memory monitoring class at the beginning
function MemoryMonitor(options = {}) {
  const { 
    warningThreshold = 70,
    criticalThreshold = 90,
    samplingInterval = 5000,
    onWarning = null,
    onCritical = null,
    onUpdate = null
  } = options;
  
  let intervalId = null;
  let lastUsage = null;
  let lastGcTime = 0;
  const GC_COOLDOWN = 30000; // minimum 30 seconds between forced GC attempts
  
  // Try to collect garbage when memory is high
  const tryForceGC = () => {
    const now = Date.now();
    if (now - lastGcTime < GC_COOLDOWN) return false;
    
    // Try common techniques to hint garbage collection
    if (window.gc) {
      try {
        window.gc();
        lastGcTime = now;
        return true;
      } catch (e) {
        // Ignore if gc doesn't work
      }
    }

    // Alternative approaches to encourage garbage collection
    try {
      // Clear memory-intensive object references
      const imageCaches = window.__THREE_IMAGE_CACHE__ || {};
      Object.keys(imageCaches).forEach(key => delete imageCaches[key]);
      
      // Empty any arrays that might hold references
      const objectStores = window.__THREE_OBJECT_REFS__ || [];
      while (objectStores.length) objectStores.pop();
      
      // Set large objects to null
      if (window.__LAST_LARGE_OBJECT__) {
        window.__LAST_LARGE_OBJECT__ = null;
      }
      
      lastGcTime = now;
      return true;
    } catch (e) {
      return false;
    }
  };

  const checkMemory = () => {
    if (!window.performance || !window.performance.memory) {
      return null;
    }
    
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = window.performance.memory;
    const usage = {
      used: usedJSHeapSize,
      total: totalJSHeapSize,
      limit: jsHeapSizeLimit,
      percentUsed: (usedJSHeapSize / totalJSHeapSize) * 100,
      percentOfLimit: (usedJSHeapSize / jsHeapSizeLimit) * 100,
      usedMB: usedJSHeapSize / (1024 * 1024),
      totalMB: totalJSHeapSize / (1024 * 1024),
      limitMB: jsHeapSizeLimit / (1024 * 1024)
    };
    
    lastUsage = usage;
    
    // Fire update callback
    if (onUpdate) {
      onUpdate(usage);
    }
    
    // Check thresholds
    if (usage.percentOfLimit > criticalThreshold) {
      if (onCritical) {
        onCritical(usage);
      }
      tryForceGC();
    } else if (usage.percentOfLimit > warningThreshold) {
      if (onWarning) {
        onWarning(usage);
      }
    }
    
    return usage;
  };
  
  const start = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    checkMemory(); // Initial check
    intervalId = setInterval(checkMemory, samplingInterval);
    return lastUsage;
  };
  
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  const getLastUsage = () => lastUsage;
  
  return {
    start,
    stop,
    checkMemory,
    getLastUsage,
    tryForceGC
  };
}

// Add Legend component before the main ThreeJsDebug component
const VisualizationLegend = ({ isExtendedTest, renderQuality }) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // Function to open source code in a new tab or dialog
  const handleViewCode = () => {
    // Use GitHub link to the repo or a direct link to the file
    window.open("https://github.com/yourusername/LENR_SIM_APP/blob/main/frontend/src/debug/ThreeJsDebug.js", "_blank");
  };
  
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Visualization Legend</Typography>
        <Box>
          <Tooltip title="View Implementation Code">
            <IconButton 
              size="small" 
              onClick={handleViewCode}
              color="primary"
              aria-label="view source code"
            >
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Visualization Info">
            <IconButton 
              size="small"
              onClick={() => setShowInfo(!showInfo)}
              color="info"
              aria-label="visualization info"
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {showInfo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>How This Works:</strong> This visualization uses Three.js to render 3D objects 
            and test WebGL performance. It monitors memory usage and automatically adjusts quality
            to prevent crashes. Mouse interactions: drag to rotate, scroll to zoom, right-click to pan.
          </Typography>
        </Alert>
      )}
      
      <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
        This visualization demonstrates Three.js rendering capabilities and memory management in the browser.
        {isExtendedTest ? ' Extended test includes advanced lighting and materials.' : ''}
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Scene Elements:</Typography>
          <List dense>
            <ListItem>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                bgcolor: '#00ff00', 
                mr: 1,
                border: '1px solid rgba(0,0,0,0.2)',
              }} />
              <ListItemText 
                primary="Green Wireframe Cube" 
                secondary="Basic Three.js object to test rendering capabilities" 
              />
            </ListItem>
            {isExtendedTest && (
              <>
                <ListItem>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    bgcolor: '#0000ff', 
                    mr: 1,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.2)',
                  }} />
                  <ListItemText 
                    primary="Blue Sphere (Left)" 
                    secondary="Tests Phong material with lighting and shininess" 
                  />
                </ListItem>
                <ListItem>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    bgcolor: '#ff00ff', 
                    mr: 1,
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: 8,
                  }} />
                  <ListItemText 
                    primary="Pink Torus (Right)" 
                    secondary="Tests Lambert material with complex geometry" 
                  />
                </ListItem>
              </>
            )}
          </List>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Environment:</Typography>
          <List dense>
            <ListItem>
              <Box sx={{ 
                width: 16, 
                height: 16, 
                background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)', 
                mr: 1,
                border: '1px solid rgba(0,0,0,0.2)',
              }} />
              <ListItemText 
                primary="Light Gray Background" 
                secondary="Scene background for better contrast" 
              />
            </ListItem>
            {isExtendedTest && (
              <>
                <ListItem>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    background: 'radial-gradient(circle, #ffff00 0%, rgba(255,255,0,0) 70%)', 
                    mr: 1,
                  }} />
                  <ListItemText 
                    primary="Lighting" 
                    secondary="Ambient, directional and point lights for realistic rendering" 
                  />
                </ListItem>
              </>
            )}
            <ListItem>
              <ListItemText 
                primary="Interaction" 
                secondary="Drag to rotate, scroll to zoom, right-click to pan" 
              />
            </ListItem>
          </List>
        </Grid>
      </Grid>
      
      {/* Add quality settings explanation */}
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Current Render Quality: <Box component="span" sx={{ 
            color: renderQuality === 'high' ? 'success.main' : 
                  renderQuality === 'medium' ? 'warning.main' : 'error.main'
          }}>
            {renderQuality.toUpperCase()}
          </Box>
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={4}>
            <Box sx={{ 
              p: 1, 
              border: '1px solid', 
              borderColor: renderQuality === 'high' ? 'success.main' : 'grey.300',
              borderRadius: 1,
              bgcolor: renderQuality === 'high' ? 'success.light' : 'transparent',
              opacity: renderQuality === 'high' ? 1 : 0.6,
            }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                High Quality
              </Typography>
              <Typography variant="caption">
                100% resolution, full pixel ratio, best visual fidelity
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ 
              p: 1, 
              border: '1px solid', 
              borderColor: renderQuality === 'medium' ? 'warning.main' : 'grey.300',
              borderRadius: 1,
              bgcolor: renderQuality === 'medium' ? 'warning.light' : 'transparent',
              opacity: renderQuality === 'medium' ? 1 : 0.6,
            }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Medium Quality
              </Typography>
              <Typography variant="caption">
                75% resolution, reduced pixel ratio, balanced performance
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box sx={{ 
              p: 1, 
              border: '1px solid', 
              borderColor: renderQuality === 'low' ? 'error.main' : 'grey.300',
              borderRadius: 1,
              bgcolor: renderQuality === 'low' ? 'error.light' : 'transparent',
              opacity: renderQuality === 'low' ? 1 : 0.6,
            }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Low Quality
              </Typography>
              <Typography variant="caption">
                50% resolution, minimal pixel ratio, optimized for memory
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          The quality automatically adjusts based on memory pressure to prevent WebGL context loss.
        </Typography>
      </Box>
    </Paper>
  );
};

// Add a new component for the visualization overlay
const VisualizationOverlay = ({ fps, memoryInfo, renderQuality }) => {
  return (
    <Box sx={{
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: 1,
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      pointerEvents: 'none', // Make sure it doesn't interfere with interaction
      maxWidth: '140px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'white' }}>FPS:</Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: fps > 40 ? '#4caf50' : fps > 20 ? '#ff9800' : '#f44336',
            fontWeight: 'bold'
          }}
        >
          {fps || 0}
        </Typography>
      </Box>
      
      {memoryInfo && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'white' }}>Triangles:</Typography>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
            {memoryInfo.render?.triangles.toLocaleString() || 0}
          </Typography>
        </Box>
      )}
      
      {memoryInfo && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'white' }}>Calls:</Typography>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
            {memoryInfo.render?.calls || 0}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ 
        width: '100%', 
        height: 4, 
        mt: 0.5, 
        bgcolor: renderQuality === 'high' ? '#4caf50' : 
                renderQuality === 'medium' ? '#ff9800' : '#f44336',
        borderRadius: 1
      }} />
    </Box>
  );
};

// Add a performance benchmark component 
const PerformanceBenchmark = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('init');
  const [results, setResults] = useState(null);
  
  useEffect(() => {
    const runBenchmark = async () => {
      try {
        setStage('geometry');
        setProgress(10);
        
        // Test 1: Geometry creation performance
        const geomStart = performance.now();
        const geometryResults = await testGeometryPerformance();
        const geomEnd = performance.now();
        
        setProgress(30);
        setStage('rendering');
        
        // Test 2: Rendering performance
        const renderStart = performance.now();
        const renderingResults = await testRenderingPerformance();
        const renderEnd = performance.now();
        
        setProgress(60);
        setStage('textures');
        
        // Test 3: Texture performance
        const texStart = performance.now();
        const textureResults = await testTexturePerformance();
        const texEnd = performance.now();
        
        setProgress(90);
        setStage('finalizing');
        
        // Calculate final benchmark score (higher is better)
        const geometryScore = Math.min(100, 10000 / (geomEnd - geomStart));
        const renderingScore = Math.min(100, 5000 / (renderEnd - renderStart));
        const textureScore = Math.min(100, 3000 / (texEnd - texStart));
        
        const totalScore = Math.round((geometryScore + renderingScore + textureScore) / 3);
        
        const benchmarkResults = {
          geometryTest: {
            timeMs: Math.round(geomEnd - geomStart),
            score: Math.round(geometryScore),
            details: geometryResults
          },
          renderingTest: {
            timeMs: Math.round(renderEnd - renderStart),
            score: Math.round(renderingScore),
            details: renderingResults
          },
          textureTest: {
            timeMs: Math.round(texEnd - texStart),
            score: Math.round(textureScore),
            details: textureResults
          },
          totalScore: totalScore,
          rating: totalScore > 80 ? "Excellent" : 
                 totalScore > 60 ? "Good" : 
                 totalScore > 40 ? "Average" : 
                 totalScore > 20 ? "Poor" : "Very Poor"
        };
        
        setResults(benchmarkResults);
        setProgress(100);
        setStage('complete');
        
        if (onComplete) {
          onComplete(benchmarkResults);
        }
      } catch (error) {
        console.error("Benchmark error:", error);
        setStage('error');
        setResults({ error: error.message });
        
        if (onComplete) {
          onComplete({ error: error.message });
        }
      }
    };
    
    runBenchmark();
  }, [onComplete]);
  
  // Test geometry creation performance
  const testGeometryPerformance = () => {
    return new Promise(resolve => {
      const results = { 
        boxCount: 0,
        sphereCount: 0,
        torusCount: 0
      };
      
      const startTime = performance.now();
      const timeLimit = 500; // ms
      
      // Create boxes until time limit
      while (performance.now() - startTime < timeLimit / 3) {
        new THREE.BoxGeometry(1, 1, 1, 8, 8, 8);
        results.boxCount++;
      }
      
      // Create spheres until time limit
      const sphereStart = performance.now();
      while (performance.now() - sphereStart < timeLimit / 3) {
        new THREE.SphereGeometry(1, 16, 16);
        results.sphereCount++;
      }
      
      // Create tori until time limit
      const torusStart = performance.now();
      while (performance.now() - torusStart < timeLimit / 3) {
        new THREE.TorusGeometry(1, 0.3, 16, 32);
        results.torusCount++;
      }
      
      setTimeout(() => resolve(results), 0);
    });
  };
  
  // Test rendering performance
  const testRenderingPerformance = () => {
    return new Promise(resolve => {
      try {
        // Setup temporary renderer and scene
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
        camera.position.z = 5;
        
        // Add test objects
        const objects = [];
        for (let i = 0; i < 50; i++) {
          const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
          const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
          const mesh = new THREE.Mesh(geometry, material);
          
          mesh.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          );
          
          mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          );
          
          scene.add(mesh);
          objects.push(mesh);
        }
        
        // Test render time for multiple frames
        const frameCount = 20;
        const results = { frameTimeMs: [], triangleCount: 0 };
        results.triangleCount = renderer.info.render.triangles;
        
        let frame = 0;
        
        const renderFrame = () => {
          if (frame >= frameCount) {
            // Cleanup
            objects.forEach(obj => {
              scene.remove(obj);
              obj.geometry.dispose();
              obj.material.dispose();
            });
            
            renderer.dispose();
            
            // Calculate average frame time
            const avgFrameTime = results.frameTimeMs.reduce((a, b) => a + b, 0) / frameTimeMs.length;
            results.averageFrameTimeMs = avgFrameTime;
            
            resolve(results);
            return;
          }
          
          // Rotate objects
          objects.forEach(obj => {
            obj.rotation.x += 0.01;
            obj.rotation.y += 0.01;
          });
          
          const frameStart = performance.now();
          renderer.render(scene, camera);
          const frameTime = performance.now() - frameStart;
          
          results.frameTimeMs.push(frameTime);
          frame++;
          
          setTimeout(renderFrame, 0);
        };
        
        renderFrame();
      } catch (error) {
        resolve({ error: error.message });
      }
    });
  };
  
  // Test texture loading and performance
  const testTexturePerformance = () => {
    return new Promise(resolve => {
      try {
        const results = { 
          textureCreationTimeMs: 0,
          textureUploadTimeMs: 0,
          maxTextureSize: 0
        };
        
        // Create a test texture at different sizes
        const createTestTexture = (size) => {
          const data = new Uint8Array(size * size * 4);
          
          // Fill with random data
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.floor(Math.random() * 256);    // R
            data[i+1] = Math.floor(Math.random() * 256);  // G
            data[i+2] = Math.floor(Math.random() * 256);  // B
            data[i+3] = 255;                              // A
          }
          
          return new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        };
        
        // Measure texture creation time
        const creationStart = performance.now();
        const textures = [];
        
        for (let i = 0; i < 10; i++) {
          textures.push(createTestTexture(256));
        }
        
        results.textureCreationTimeMs = performance.now() - creationStart;
        
        // Measure texture upload time
        const uploadStart = performance.now();
        textures.forEach(texture => {
          texture.needsUpdate = true; // This triggers the upload
        });
        
        results.textureUploadTimeMs = performance.now() - uploadStart;
        
        // Find maximum texture size
        const renderer = new THREE.WebGLRenderer();
        const gl = renderer.getContext();
        results.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        // Cleanup
        textures.forEach(texture => texture.dispose());
        renderer.dispose();
        
        setTimeout(() => resolve(results), 0);
      } catch (error) {
        resolve({ error: error.message });
      }
    });
  };
  
  return (
    <Box sx={{ width: '100%', position: 'relative', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        ThreeJS Performance Benchmark
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2">
          Stage: <b>{stage}</b>
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 1, height: 8, borderRadius: 4 }}
        />
      </Box>
      
      {results && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Overall Score: <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {results.totalScore || 0}/100
            </Box> - {results.rating || 'N/A'}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" gutterBottom>Geometry Test</Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" display="block">Score: {results.geometryTest?.score || 0}/100</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={results.geometryTest?.score || 0} 
                    color="success"
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
                <Typography variant="body2">
                  Created {results.geometryTest?.details?.boxCount || 0} boxes, {results.geometryTest?.details?.sphereCount || 0} spheres, 
                  and {results.geometryTest?.details?.torusCount || 0} tori
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" gutterBottom>Rendering Test</Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" display="block">Score: {results.renderingTest?.score || 0}/100</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={results.renderingTest?.score || 0} 
                    color="success"
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
                <Typography variant="body2">
                  Average frame time: {results.renderingTest?.details?.averageFrameTimeMs?.toFixed(2) || 0} ms
                  <br />
                  Triangles: {results.renderingTest?.details?.triangleCount || 0}
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle2" gutterBottom>Texture Test</Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" display="block">Score: {results.textureTest?.score || 0}/100</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={results.textureTest?.score || 0} 
                    color="success"
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
                <Typography variant="body2">
                  Max texture size: {results.textureTest?.details?.maxTextureSize || 0}px
                  <br />
                  Upload time: {results.textureTest?.details?.textureUploadTimeMs?.toFixed(2) || 0} ms
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

// Add a shader test component
const ShaderTestPanel = () => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    let renderer, scene, camera;
    let animationFrameId;
    
    try {
      // Create renderer
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      
      // Create scene
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      
      // Define a simple test shader
      const fragmentShader = `
        precision highp float;
        uniform float time;
        uniform vec2 resolution;
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          vec3 col = 0.5 + 0.5 * cos(time + uv.xyx + vec3(0, 2, 4));
          
          gl_FragColor = vec4(col, 1.0);
        }
      `;
      
      const vertexShader = `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      
      // Create shader material
      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          resolution: { value: new THREE.Vector2(
            canvasRef.current.width, 
            canvasRef.current.height
          )}
        },
        vertexShader,
        fragmentShader
      });
      
      // Create a full-screen quad
      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, shaderMaterial);
      scene.add(mesh);
      
      // Animation loop
      const animate = (time) => {
        animationFrameId = requestAnimationFrame(animate);
        
        shaderMaterial.uniforms.time.value = time * 0.001; // Convert to seconds
        renderer.render(scene, camera);
      };
      
      // Start animation
      animate(0);
      
      // Check shader compilation status
      const gl = renderer.getContext();
      const isFloatTextureSupported = !!gl.getExtension('OES_texture_float');
      const isHalfFloatTextureSupported = !!gl.getExtension('OES_texture_half_float');
      const isAnisotropicSupported = !!gl.getExtension('EXT_texture_filter_anisotropic');
      const isDepthTextureSupported = !!gl.getExtension('WEBGL_depth_texture');
      
      // Set test results
      setTestResults({
        shaderCompiled: true,
        extensions: {
          floatTextures: isFloatTextureSupported,
          halfFloatTextures: isHalfFloatTextureSupported,
          anisotropicFiltering: isAnisotropicSupported,
          depthTextures: isDepthTextureSupported
        },
        shaderPrecision: {
          vertex: {
            highp: gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT),
            mediump: gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
            lowp: gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.LOW_FLOAT)
          },
          fragment: {
            highp: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
            mediump: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
            lowp: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT)
          }
        }
      });
      
      setIsReady(true);
    } catch (error) {
      console.error("Shader test error:", error);
      setHasError(true);
      setTestResults({ error: error.message });
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, []);
  
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        WebGL Shader Test
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 0, height: 200, overflow: 'hidden', position: 'relative' }}>
            <canvas 
              ref={canvasRef} 
              style={{ width: '100%', height: '100%' }}
              width={400}
              height={200}
            />
            
            {!isReady && !hasError && (
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)'
              }}>
                <CircularProgress size={24} color="inherit" />
              </Box>
            )}
            
            {hasError && (
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)'
              }}>
                <Typography color="error">
                  Shader test failed
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 200, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>
              WebGL Shader Capabilities
            </Typography>
            
            {testResults && !testResults.error ? (
              <List dense disablePadding>
                <ListItem>
                  <ListItemText 
                    primary="Shader Compilation" 
                    secondary={testResults.shaderCompiled ? "Successful" : "Failed"}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 'medium'
                    }}
                    secondaryTypographyProps={{
                      color: testResults.shaderCompiled ? 'success.main' : 'error.main'
                    }}
                  />
                </ListItem>
                <Divider sx={{ my: 0.5 }} />
                <ListItem>
                  <ListItemText 
                    primary="Float Textures" 
                    secondary={testResults.extensions.floatTextures ? "Supported" : "Not Supported"}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 'medium'
                    }}
                    secondaryTypographyProps={{
                      color: testResults.extensions.floatTextures ? 'success.main' : 'text.secondary'
                    }}
                  />
                </ListItem>
                <Divider sx={{ my: 0.5 }} />
                <ListItem>
                  <ListItemText 
                    primary="Half-Float Textures" 
                    secondary={testResults.extensions.halfFloatTextures ? "Supported" : "Not Supported"}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 'medium'
                    }}
                    secondaryTypographyProps={{
                      color: testResults.extensions.halfFloatTextures ? 'success.main' : 'text.secondary'
                    }}
                  />
                </ListItem>
                <Divider sx={{ my: 0.5 }} />
                <ListItem>
                  <ListItemText 
                    primary="Anisotropic Filtering" 
                    secondary={testResults.extensions.anisotropicFiltering ? "Supported" : "Not Supported"}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 'medium'
                    }}
                    secondaryTypographyProps={{
                      color: testResults.extensions.anisotropicFiltering ? 'success.main' : 'text.secondary'
                    }}
                  />
                </ListItem>
                <Divider sx={{ my: 0.5 }} />
                <ListItem>
                  <ListItemText 
                    primary="Depth Textures" 
                    secondary={testResults.extensions.depthTextures ? "Supported" : "Not Supported"}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 'medium'
                    }}
                    secondaryTypographyProps={{
                      color: testResults.extensions.depthTextures ? 'success.main' : 'text.secondary'
                    }}
                  />
                </ListItem>
              </List>
            ) : testResults?.error ? (
              <Alert severity="error" sx={{ mt: 1 }}>{testResults.error}</Alert>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: 120
              }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Add a new AdvancedTestDialog component
const AdvancedTestDialog = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleBenchmarkComplete = (results) => {
    setBenchmarkResults(results);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Advanced Three.js Tests
      </DialogTitle>
      
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<SpeedIcon />} label="Benchmark" />
        <Tab icon={<MemoryIcon />} label="Shader Test" />
        <Tab icon={<SettingsIcon />} label="WebGL Info" />
      </Tabs>
      
      <DialogContent>
        {activeTab === 0 && (
          <PerformanceBenchmark onComplete={handleBenchmarkComplete} />
        )}
        
        {activeTab === 1 && (
          <ShaderTestPanel />
        )}
        
        {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              WebGL Detailed Information
            </Typography>
            
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                GPU & Driver Information
              </Typography>
              
              {/* We'll get this information dynamically */}
              <div id="webgl-info-container">
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading WebGL information...
                </Typography>
              </div>
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Supported Extensions
              </Typography>
              
              <div id="webgl-extensions-container">
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading WebGL extensions...
                </Typography>
              </div>
            </Paper>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const ThreeJsDebug = () => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const cleanupFunctionRef = useRef(null);
  const canvasParentRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const logger = useLogger();
  
  const [debugInfo, setDebugInfo] = useState({
    hasThree: false,
    threeVersion: null,
    hasOrbitControls: false,
    hasWebGL: false,
    webGLInfo: null,
    canRender: false,
    canAnimate: false,
    animationFps: 0,
    memoryUsage: null,
    rendererInfo: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExtendedTest, setIsExtendedTest] = useState(false);
  const [canvasElement, setCanvasElement] = useState(null);
  const [testResults, setTestResults] = useState(null);
  
  // Near the beginning of the component, add state for memory monitoring
  const [memoryMonitor, setMemoryMonitor] = useState(null);
  const [memoryWarnings, setMemoryWarnings] = useState([]);
  
  // Add quality management settings
  const [renderQuality, setRenderQuality] = useState('high'); // high, medium, low
  
  // Add state for the advanced test dialog
  const [showAdvancedTests, setShowAdvancedTests] = useState(false);
  
  // Create a new div for hosting the canvas that can be created/destroyed
  // without React lifecycle interference
  useLayoutEffect(() => {
    if (!containerRef.current) {
      logger.error('ThreeJsDebug: Container ref is not available');
      setIsLoading(false);
      setDebugInfo(prev => ({ 
        ...prev, 
        error: "Container reference not available" 
      }));
      return;
    }
    
    try {
      // Clear the container first
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      // Use our new utility to create the canvas container
      const canvasContainer = threeCleanup.createDetachedThreeContainer(
        containerRef.current,
        'ThreeJsDebug'
      );
      
      if (!canvasContainer) {
        throw new Error('Failed to create Three.js container');
      }
      
      // Store references
      canvasContainerRef.current = canvasContainer;
      canvasParentRef.current = containerRef.current;
      
      logger.info('ThreeJsDebug: Canvas container initialized successfully');
    } catch (error) {
      logger.error('ThreeJsDebug: Error initializing canvas container', error);
      setIsLoading(false);
      setDebugInfo(prev => ({ 
        ...prev, 
        error: error.message || "Error initializing Three.js container" 
      }));
      errorReporter.report(error, {
        component: 'ThreeJsDebug',
        function: 'canvasContainerInit'
      });
    }
    
    return () => {
      // This cleanup only handles our container removal
      if (canvasContainerRef.current && canvasParentRef.current) {
        try {
          if (canvasParentRef.current.contains(canvasContainerRef.current)) {
            canvasParentRef.current.removeChild(canvasContainerRef.current);
          }
          canvasContainerRef.current = null;
        } catch (e) {
          logger.error("Error cleaning up canvas container:", e);
          errorReporter.report(e, {
            component: 'ThreeJsDebug',
            function: 'canvasContainerCleanup'
          });
        }
      }
    };
  }, [logger]);
  
  const runTests = () => {
    // Clean up any existing three.js instance first
    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
    }
    
    setIsLoading(true);
    setDebugInfo(prev => ({ ...prev, error: null }));
    
    // Run the main Three.js test
    testThreeJs(isExtendedTest);
  };

  const testThreeJs = (runExtendedTests = false) => {
    if (!canvasContainerRef.current) {
      setDebugInfo(prev => ({ 
        ...prev, 
        error: "Canvas container reference not available" 
      }));
      setIsLoading(false);
      return;
    }

    const info = {
      hasThree: false,
      threeVersion: null,
      hasOrbitControls: false,
      hasWebGL: false,
      webGLInfo: null,
      canRender: false,
      canAnimate: false,
      animationFps: 0,
      memoryUsage: null,
      rendererInfo: null,
      error: null
    };

    try {
      // Test if Three.js is available
      if (typeof THREE !== 'undefined') {
        info.hasThree = true;
        info.threeVersion = THREE.REVISION;
        logger.info('THREE is available:', THREE.REVISION);
      } else {
        throw new Error('Three.js is not available');
      }

      // Test if OrbitControls is available
      if (typeof OrbitControls !== 'undefined') {
        info.hasOrbitControls = true;
        logger.info('OrbitControls is available');
      } else {
        logger.warn('OrbitControls is not available');
      }
      
      // Check WebGL support
      let hasWebGL = false;
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
          hasWebGL = true;
          info.hasWebGL = true;
          
          // Get WebGL info
          info.webGLInfo = {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            extensions: gl.getSupportedExtensions()
          };
        } else {
          throw new Error('WebGL is not supported in this browser');
        }
      } catch (webglError) {
        logger.error('WebGL test error:', webglError);
        info.error = 'WebGL test failed: ' + (webglError.message || 'Unknown error');
        setDebugInfo(info);
        setIsLoading(false);
        return;
      }

      // Setup Three.js scene
      const container = canvasContainerRef.current;
      
      // Verify container dimensions
      if (container.clientWidth <= 0 || container.clientHeight <= 0) {
        throw new Error('Container has invalid dimensions: ' + 
          `width=${container.clientWidth}, height=${container.clientHeight}`);
      }
      
      // Clear container before adding new content
      while(container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5;

      // Renderer with context loss handling
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: 'high-performance', // Request higher performance
        preserveDrawingBuffer: false // Better for performance
      });
      renderer.setSize(container.clientWidth, container.clientHeight);

      // Handle WebGL context loss
      const handleContextLoss = (event) => {
        event.preventDefault();
        logger.warn('WebGL context lost. Attempting recovery...');
        
        // Clear current animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Notify user via state update
        setDebugInfo(prev => ({
          ...prev,
          error: "WebGL context lost. Attempting recovery..."
        }));
        
        // Schedule recovery attempt
        setTimeout(() => {
          try {
            runTests();
          } catch (e) {
            logger.error("Context recovery failed:", e);
            setDebugInfo(prev => ({
              ...prev,
              error: "WebGL context recovery failed. Please reload the page."
            }));
          }
        }, 2000);
      };

      // Handle WebGL context restoration
      const handleContextRestored = () => {
        logger.info('WebGL context restored');
        
        setDebugInfo(prev => ({
          ...prev,
          error: null
        }));
        
        // Restart animation
        animate();
      };

      // Add event listeners for context loss/restore
      renderer.domElement.addEventListener('webglcontextlost', handleContextLoss, false);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Register the canvas element to protect it from React
      threeCleanup.registerThreeJsCanvas(renderer.domElement, 'ThreeJsDebug');
      
      // Store reference to the canvas
      setCanvasElement(renderer.domElement);
      
      // Get renderer info if available
      if (renderer.info) {
        info.rendererInfo = {
          memory: { ...renderer.info.memory },
          render: { ...renderer.info.render }
        };
      }

      // Add a cube
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        wireframe: true 
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      // Add lighting if extended test
      if (runExtendedTests) {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Add point light
        const pointLight = new THREE.PointLight(0xff0000, 1, 100);
        pointLight.position.set(2, 2, 2);
        scene.add(pointLight);
        
        // Add a textured sphere
        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({ 
          color: 0x0000ff,
          shininess: 30
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(-1.5, 0, 0);
        scene.add(sphere);
        
        // Add a torus
        const torusGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 100);
        const torusMaterial = new THREE.MeshLambertMaterial({ color: 0xff00ff });
        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        torus.position.set(1.5, 0, 0);
        scene.add(torus);
      }

      // Add controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      // Track FPS
      let frameCount = 0;
      let lastTime = performance.now();
      let frameRate = 0;
      
      // Animation function
      const animate = () => {
        // First check if we should continue animating
        if (!rendererRef.current || !sceneRef.current || !controlsRef.current) {
          logger.debug('Animation stopped - resources were cleaned up');
          return; // Stop animation if resources have been cleaned up
        }
        
        const animationId = requestAnimationFrame(animate);
        animationFrameRef.current = animationId;
        
        // Update FPS calculation every second
        frameCount++;
        const now = performance.now();
        const elapsed = now - lastTime;
        
        if (elapsed >= 1000) {
          frameRate = Math.round((frameCount * 1000) / elapsed);
          frameCount = 0;
          lastTime = now;
          
          // Update memory stats if available
          if (renderer.info) {
            setDebugInfo(prev => ({
              ...prev,
              animationFps: frameRate,
              memoryUsage: { ...renderer.info.memory },
              rendererInfo: {
                memory: { ...renderer.info.memory },
                render: { ...renderer.info.render }
              }
            }));
          } else {
            setDebugInfo(prev => ({
              ...prev,
              animationFps: frameRate
            }));
          }
        }
        
        // Animate objects
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        
        if (runExtendedTests) {
          // Rotate all objects in scene differently
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh && object !== cube) {
              if (object.position.x < 0) {
                // Left side objects
                object.rotation.y += 0.02;
                object.rotation.z += 0.01;
              } else if (object.position.x > 0) {
                // Right side objects
                object.rotation.x += 0.01;
                object.rotation.z += 0.02;
              }
            }
          });
        }
        
        controls.update();
        renderer.render(scene, camera);
      };

      // Start animation
      animate();
      info.canRender = true;
      info.canAnimate = true;
      
      // Initialize FPS
      info.animationFps = 0;
      
      // Set initial renderer info if available
      if (renderer.info) {
        info.rendererInfo = {
          memory: { ...renderer.info.memory },
          render: { ...renderer.info.render }
        };
      }

      // Define cleanup function and store in ref
      const cleanup = () => {
        logger.info("Starting Three.js cleanup...");
        
        // First cancel animation frame to stop any pending renders
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Use our safe cleanup utility with proper container references
        threeCleanup.reactSafeCleanupThreeJs({
          renderer: rendererRef.current,
          scene: sceneRef.current,
          controls: controlsRef.current,
          animationFrameId: animationFrameRef.current,
          container: canvasContainerRef.current,
          parentElement: canvasParentRef.current,
          componentName: 'ThreeJsDebug'
        });
        
        // Clear the canvas element state
        setCanvasElement(null);
        
        // Clear all refs
        rendererRef.current = null;
        sceneRef.current = null;
        controlsRef.current = null;
        animationFrameRef.current = null;
        cleanupFunctionRef.current = null;
        
        logger.info("Three.js cleanup complete");
      };
      
      // Store the cleanup function
      cleanupFunctionRef.current = cleanup;
      
      // Set state with info
      setDebugInfo(info);
      setIsLoading(false);
    } catch (error) {
      logger.error('Three.js error:', error);
      info.error = error.message || 'Unknown error occurred';
      setDebugInfo(info);
      setIsLoading(false);
      
      errorReporter.report(error, { 
        component: 'ThreeJsDebug',
        function: 'testThreeJs' 
      });
    }
  };

  const runCleanupTest = () => {
    setIsLoading(true);
    setDebugInfo(prev => ({ ...prev, error: null }));
    
    threeCleanup.testThreeJsCleanup({
      onMemoryUsage: (results) => {
        setTestResults(results);
        setIsLoading(false);
      },
      componentName: 'ThreeJsDebug'
    });
  };

  // Run tests when component mounts
  useEffect(() => {
    if (canvasContainerRef.current) {
      testThreeJs(isExtendedTest);
    }
    
    // Clean up on unmount
    return () => {
      logger.info("ThreeJsDebug component unmounting...");
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
      }
    };
  }, [isExtendedTest, logger]);

  // In the useEffect where you set up the component:
  useEffect(() => {
    // Set up memory monitor
    const monitor = MemoryMonitor({
      warningThreshold: 60,
      criticalThreshold: 80,
      samplingInterval: 3000,
      onWarning: (usage) => {
        setMemoryWarnings(prev => [
          ...prev, 
          { 
            time: new Date().toLocaleTimeString(), 
            level: 'warning',
            message: `Memory usage high: ${usage.percentOfLimit.toFixed(1)}% of limit (${usage.usedMB.toFixed(1)} MB)`
          }
        ]);
        
        // Reduce quality proactively
        adjustRenderingQuality(usage);
      },
      onCritical: (usage) => {
        setMemoryWarnings(prev => [
          ...prev, 
          { 
            time: new Date().toLocaleTimeString(), 
            level: 'critical',
            message: `Memory usage critical: ${usage.percentOfLimit.toFixed(1)}% of limit (${usage.usedMB.toFixed(1)} MB)`
          }
        ]);
        
        // Apply lowest quality immediately
        if (rendererRef.current) {
          setRenderQuality('low');
          rendererRef.current.setPixelRatio(window.devicePixelRatio * 0.5);
          rendererRef.current.setSize(
            canvasContainerRef.current?.clientWidth * 0.5 || 300, 
            canvasContainerRef.current?.clientHeight * 0.5 || 200
          );
        }
        
        // When critical, try extra cleanup measures
        if (rendererRef.current) {
          const gl = rendererRef.current.getContext();
          if (gl) {
            // Try WebGL context cleanup
            threeCleanup.forceReleaseWebGLResources(gl);
          }
        }
      },
      onUpdate: (usage) => {
        setDebugInfo(prev => ({
          ...prev,
          memoryUsage: usage
        }));
        
        // Regular quality adjustments based on all updates
        adjustRenderingQuality(usage);
      }
    });
    
    monitor.start();
    setMemoryMonitor(monitor);
    
    return () => {
      if (monitor) {
        monitor.stop();
      }
    };
  }, []);

  // Add function to adjust rendering quality based on memory pressure
  const adjustRenderingQuality = (memoryUsage) => {
    if (!rendererRef.current) return;
    
    // Calculate memory pressure percentage
    const memoryPressure = memoryUsage.percentOfLimit;
    
    // Adjust quality based on memory pressure thresholds
    if (memoryPressure > 80 && renderQuality !== 'low') {
      logger.info('Memory pressure high, reducing to low quality');
      setRenderQuality('low');
      
      // Apply low quality settings
      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(window.devicePixelRatio * 0.5);
        rendererRef.current.setSize(
          canvasContainerRef.current?.clientWidth * 0.75 || 300, 
          canvasContainerRef.current?.clientHeight * 0.75 || 200
        );
      }
      
    } else if (memoryPressure > 60 && memoryPressure <= 80 && renderQuality !== 'medium') {
      logger.info('Memory pressure moderate, reducing to medium quality');
      setRenderQuality('medium');
      
      // Apply medium quality settings
      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(window.devicePixelRatio * 0.75);
        rendererRef.current.setSize(
          canvasContainerRef.current?.clientWidth * 0.9 || 300, 
          canvasContainerRef.current?.clientHeight * 0.9 || 200
        );
      }
      
    } else if (memoryPressure < 60 && renderQuality !== 'high') {
      logger.info('Memory pressure low, restoring high quality');
      setRenderQuality('high');
      
      // Apply high quality settings
      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
        rendererRef.current.setSize(
          canvasContainerRef.current?.clientWidth || 300, 
          canvasContainerRef.current?.clientHeight || 200
        );
      }
    }
  };

  // Add this function to the component
  const openAdvancedTests = () => {
    setShowAdvancedTests(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Three.js Debug
      </Typography>
      
      {debugInfo.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {debugInfo.error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={runTests}
          disabled={isLoading}
        >
          {isLoading ? 'Running Tests...' : 'Run Tests'}
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setIsExtendedTest(!isExtendedTest)}
          disabled={isLoading}
        >
          {isExtendedTest ? 'Run Basic Test' : 'Run Extended Test'}
        </Button>
        
        <Button
          variant="outlined"
          color="warning"
          onClick={runCleanupTest}
          disabled={isLoading}
        >
          Test Cleanup
        </Button>
        
        <Button
          variant="outlined"
          color="info"
          onClick={openAdvancedTests}
          startIcon={<BarChartIcon />}
          disabled={isLoading}
        >
          Advanced Tests
        </Button>
      </Box>
      
      {testResults && (
        <Alert 
          severity={testResults.success ? "success" : "warning"}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">Cleanup Test Results:</Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Geometries"
                secondary={`Before: ${testResults.before.geometries}, After: ${testResults.after.geometries}, Diff: ${testResults.difference.geometries}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Textures"
                secondary={`Before: ${testResults.before.textures}, After: ${testResults.after.textures}, Diff: ${testResults.difference.textures}`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Status"
                secondary={testResults.success ? "Successful cleanup" : "Memory leak detected"}
                primaryTypographyProps={{
                  color: testResults.success ? 'success.main' : 'error.main',
                  fontWeight: 'medium'
                }}
              />
            </ListItem>
          </List>
        </Alert>
      )}
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>System Status:</Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Three.js" 
                    secondary={debugInfo.hasThree ? `v${debugInfo.threeVersion} ✓` : 'Not Available ✗'} 
                    primaryTypographyProps={{
                      color: debugInfo.hasThree ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="OrbitControls" 
                    secondary={debugInfo.hasOrbitControls ? 'Available ✓' : 'Not Available ✗'} 
                    primaryTypographyProps={{
                      color: debugInfo.hasOrbitControls ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="WebGL Support" 
                    secondary={debugInfo.hasWebGL ? 'Supported ✓' : 'Not Supported ✗'} 
                    primaryTypographyProps={{
                      color: debugInfo.hasWebGL ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Rendering" 
                    secondary={debugInfo.canRender ? 'Working ✓' : 'Not Working ✗'} 
                    primaryTypographyProps={{
                      color: debugInfo.canRender ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Animation" 
                    secondary={
                      debugInfo.canAnimate 
                        ? `Working (${debugInfo.animationFps} FPS) ✓` 
                        : 'Not Working ✗'
                    } 
                    primaryTypographyProps={{
                      color: debugInfo.canAnimate ? 'success.main' : 'error.main',
                      fontWeight: 'medium'
                    }}
                  />
                </ListItem>
              </List>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0, height: '300px' }}>
            <Box 
              ref={containerRef} 
              sx={{ 
                width: '100%', 
                height: '100%', 
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {isLoading ? (
                <Box sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading visualization...
                  </Typography>
                </Box>
              ) : debugInfo.error ? (
                <Box sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Error: {debugInfo.error}
                  </Alert>
                  <Button 
                    variant="contained" 
                    onClick={runTests}
                    size="small"
                  >
                    Retry
                  </Button>
                </Box>
              ) : debugInfo.canRender ? (
                <VisualizationOverlay 
                  fps={debugInfo.animationFps} 
                  memoryInfo={debugInfo.rendererInfo}
                  renderQuality={renderQuality}
                />
              ) : null}
            </Box>
          </Paper>
          
          {/* Add legend component below the Three.js canvas with render quality */}
          {debugInfo.canRender && <VisualizationLegend isExtendedTest={isExtendedTest} renderQuality={renderQuality} />}
          
          {debugInfo.rendererInfo && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>Renderer Statistics:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Memory:</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Geometries" secondary={debugInfo.rendererInfo.memory.geometries} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Textures" secondary={debugInfo.rendererInfo.memory.textures} />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Render:</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Frames" secondary={debugInfo.rendererInfo.render.frame} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Calls" secondary={debugInfo.rendererInfo.render.calls} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Triangles" secondary={debugInfo.rendererInfo.render.triangles} />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>
          )}
          
          {debugInfo.memoryUsage && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>Memory Status:</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">
                  JS Heap Usage: {debugInfo.memoryUsage.usedMB?.toFixed(1)} MB / {debugInfo.memoryUsage.totalMB?.toFixed(1)} MB
                  ({debugInfo.memoryUsage.percentUsed?.toFixed(1)}%)
                </Typography>
                
                <Box sx={{ 
                  mt: 0.5, 
                  width: '100%', 
                  height: 10, 
                  bgcolor: 'grey.300',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    width: `${debugInfo.memoryUsage.percentUsed}%`, 
                    height: '100%',
                    bgcolor: debugInfo.memoryUsage.percentUsed > 80 ? 'error.main' : 
                            debugInfo.memoryUsage.percentUsed > 60 ? 'warning.main' : 'success.main'
                  }} />
                </Box>
                
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Render Quality: <strong>{renderQuality.toUpperCase()}</strong>
                </Typography>
                
                {memoryWarnings.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Recent Memory Warnings:</Typography>
                    <List dense sx={{ maxHeight: 100, overflow: 'auto' }}>
                      {memoryWarnings.slice(-3).map((warning, idx) => (
                        <ListItem key={idx}>
                          <ListItemText 
                            primary={warning.message} 
                            secondary={warning.time}
                            primaryTypographyProps={{
                              color: warning.level === 'critical' ? 'error.main' : 'warning.main',
                              fontSize: '0.8rem'
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      <AdvancedTestDialog
        open={showAdvancedTests}
        onClose={() => setShowAdvancedTests(false)}
      />
    </Box>
  );
};

export default ThreeJsDebug; 