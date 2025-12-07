import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Tabs, Tab, Typography, FormGroup, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * LENR Visualization Component
 * 
 * Renders 3D visualization of the lattice and reaction sites,
 * plus charts showing energy output and other parameters over time
 */
const LENRVisualization = ({
  parameters,
  timeSeriesData,
  comparisonData
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [visOptions, setVisOptions] = useState({
    showLattice: parameters?.showLattice || true,
    showHotSpots: parameters?.showHotSpots || true,
    showEnergyFlow: parameters?.showEnergyFlow || true
  });
  
  const containerRef = useRef();
  const canvasRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const frameRef = useRef();
  const isInitializedRef = useRef(false);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle visualization options change
  const handleVisOptionChange = (option) => (event) => {
    setVisOptions({
      ...visOptions,
      [option]: event.target.checked
    });
  };
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Add ambient and directional lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create camera
    const aspectRatio = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Add coordinate axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    isInitializedRef.current = true;
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (sceneRef.current) {
        // Dispose of all geometries and materials
        sceneRef.current.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, []);
  
  // Generate fallback lattice data if none provided
  const generateFallbackLattice = () => {
    const dimension = 4;
    const points = [];
    const connections = [];
    let idx = 0;
    
    for (let x = 0; x < dimension; x++) {
      for (let y = 0; y < dimension; y++) {
        for (let z = 0; z < dimension; z++) {
          const isHost = (x + y + z) % 2 === 0;
          points.push({
            position: [(x - dimension/2) * 1.5, (y - dimension/2) * 1.5, (z - dimension/2) * 1.5],
            element: isHost ? 'nickel' : 'hydrogen',
            reaction_rate: Math.random() * 0.1
          });
          
          if (x > 0) connections.push([idx, idx - dimension * dimension]);
          if (y > 0) connections.push([idx, idx - dimension]);
          if (z > 0) connections.push([idx, idx - 1]);
          idx++;
        }
      }
    }
    
    return { points, connections, dimensions: [6, 6, 6] };
  };

  // Update visualization when data or options change
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const scene = sceneRef.current;
    
    // Clear previous visualization components
    scene.children = scene.children.filter(child => 
      child.type === 'AmbientLight' || 
      child.type === 'DirectionalLight' || 
      child.type === 'AxesHelper'
    );
    
    // Get the current lattice state (use fallback if not available)
    const latticeData = timeSeriesData?.lattice || generateFallbackLattice();
    
    if (visOptions.showLattice) {
      // Create lattice structure
      const latticeGroup = new THREE.Group();
      latticeGroup.name = 'lattice';
      
      // Material for lattice points based on material type
      const getMaterialColor = (element) => {
        switch(element.toLowerCase()) {
          case 'nickel': return 0x73c2fb; // Light blue
          case 'palladium': return 0xc0c0c0; // Silver
          case 'hydrogen': return 0xf5f5f5; // White
          case 'deuterium': return 0xccf5ff; // Light cyan
          case 'platinum': return 0xdedede; // Light gray
          case 'titanium': return 0xa9a9a9; // Dark gray
          case 'lithium': return 0xafeeee; // Pale turquoise
          default: return 0xffffff; // White
        }
      };
      
      // Add lattice points
      const pointGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      
      latticeData.points.forEach(point => {
        const material = new THREE.MeshPhongMaterial({ 
          color: getMaterialColor(point.element),
          shininess: 100
        });
        
        const sphere = new THREE.Mesh(pointGeometry, material);
        sphere.position.set(...point.position);
        latticeGroup.add(sphere);
      });
      
      // Add connections between points
      const connectionMaterial = new THREE.LineBasicMaterial({ color: 0x444444, opacity: 0.6, transparent: true });
      
      latticeData.connections.forEach(connection => {
        const [i, j] = connection;
        const start = latticeData.points[i].position;
        const end = latticeData.points[j].position;
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...start),
          new THREE.Vector3(...end)
        ]);
        
        const line = new THREE.Line(geometry, connectionMaterial);
        latticeGroup.add(line);
      });
      
      scene.add(latticeGroup);
    }
    
    if (visOptions.showHotSpots) {
      // Create hot spots based on reaction rates
      const hotSpotsGroup = new THREE.Group();
      hotSpotsGroup.name = 'hotSpots';
      
      const hotSpotGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const hotSpotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4500, 
        transparent: true,
        opacity: 0.7 
      });
      
      // Add hot spots at points with high reaction rates
      latticeData.points.forEach(point => {
        if (point.reaction_rate > 0.05) {
          const scale = 0.5 + (point.reaction_rate * 3); // Scale based on reaction rate
          
          const hotSpot = new THREE.Mesh(hotSpotGeometry, hotSpotMaterial);
          hotSpot.position.set(...point.position);
          hotSpot.scale.set(scale, scale, scale);
          
          // Add pulsing animation data
          hotSpot.userData = {
            originalScale: scale,
            pulsePhase: Math.random() * Math.PI * 2
          };
          
          hotSpotsGroup.add(hotSpot);
        }
      });
      
      scene.add(hotSpotsGroup);
      
      // Animate hot spots with pulsing effect
      const animateHotSpots = () => {
        const hotSpots = scene.getObjectByName('hotSpots');
        if (hotSpots) {
          const time = Date.now() * 0.001; // Convert to seconds
          
          hotSpots.children.forEach(hotSpot => {
            const { originalScale, pulsePhase } = hotSpot.userData;
            
            // Calculate pulsing scale factor
            const pulseFactor = Math.sin(time * 2 + pulsePhase) * 0.2 + 1;
            const newScale = originalScale * pulseFactor;
            
            hotSpot.scale.set(newScale, newScale, newScale);
          });
        }
        
        hotSpotsAnimationRef.current = requestAnimationFrame(animateHotSpots);
      };
      
      const hotSpotsAnimationRef = { current: null };
      hotSpotsAnimationRef.current = requestAnimationFrame(animateHotSpots);
      
      // Return cleanup function
      return () => {
        cancelAnimationFrame(hotSpotsAnimationRef.current);
      };
    }
    
    if (visOptions.showEnergyFlow) {
      // Create energy flow visualization
      const energyFlowGroup = new THREE.Group();
      energyFlowGroup.name = 'energyFlow';
      
      // Create energy particles based on temperature
      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 100;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      
      // Initialize particles with random positions
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = (Math.random() - 0.5) * latticeData.dimensions[0];
        particlePositions[i3 + 1] = (Math.random() - 0.5) * latticeData.dimensions[1];
        particlePositions[i3 + 2] = (Math.random() - 0.5) * latticeData.dimensions[2];
        
        particleSizes[i] = Math.random() * 2 + 0.5;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      
      // Shader material for energy particles
      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: new THREE.Color(0xffff00) },
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = vec3(1.0, 1.0, 0.5); // Light yellow
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying vec3 vColor;
          void main() {
            // Create a circular particle
            float r = 0.0;
            float delta = 0.0;
            float alpha = 1.0;
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            r = dot(cxy, cxy);
            if (r > 1.0) {
                discard;
            }
            // Fade out towards the edge
            alpha = 1.0 - smoothstep(0.8, 1.0, r);
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      energyFlowGroup.add(particles);
      
      scene.add(energyFlowGroup);
      
      // Animate energy particles
      const animateEnergyFlow = () => {
        const energyFlow = scene.getObjectByName('energyFlow');
        if (energyFlow) {
          const particles = energyFlow.children[0];
          const positions = particles.geometry.attributes.position.array;
          
          for (let i = 0; i < positions.length; i += 3) {
            // Move particles along small random paths
            positions[i] += (Math.random() - 0.5) * 0.1;
            positions[i + 1] += (Math.random() - 0.5) * 0.1;
            positions[i + 2] += (Math.random() - 0.5) * 0.1;
            
            // Keep particles within bounds
            const bounds = latticeData.dimensions.map(d => d / 2);
            positions[i] = Math.max(-bounds[0], Math.min(bounds[0], positions[i]));
            positions[i + 1] = Math.max(-bounds[1], Math.min(bounds[1], positions[i + 1]));
            positions[i + 2] = Math.max(-bounds[2], Math.min(bounds[2], positions[i + 2]));
          }
          
          particles.geometry.attributes.position.needsUpdate = true;
        }
        
        energyFlowAnimationRef.current = requestAnimationFrame(animateEnergyFlow);
      };
      
      const energyFlowAnimationRef = { current: null };
      energyFlowAnimationRef.current = requestAnimationFrame(animateEnergyFlow);
      
      // Return cleanup function
      return () => {
        cancelAnimationFrame(energyFlowAnimationRef.current);
      };
    }
  }, [timeSeriesData, visOptions]);
  
  // Prepare chart data
  const prepareChartData = () => {
    // Default values for chart generation
    const defaultSummary = {
      total_energy: 50,
      average_temperature: 400,
      reaction_rate: 0.05
    };
    
    const summary = timeSeriesData?.summary || defaultSummary;
    const totalTime = timeSeriesData?.time || 10;
    
    // Generate time points
    const timePoints = Array.from({ length: 50 }, (_, i) => i * (totalTime / 49));
    
    // Create chart data with main simulation series
    return timePoints.map((time, index) => {
      // Calculate values based on time progression (this would come from actual simulation data)
      const progress = index / 49;
      const energyOutput = (summary.total_energy || 50) * progress;
      const temperature = (summary.average_temperature || 400) + 
        (Math.random() - 0.5) * 5 * progress;
      const reactionRate = (summary.reaction_rate || 0.05) * progress + 
        (Math.random() - 0.5) * 0.01;
      
      // Get comparison values if available
      let comparisonEnergy, comparisonTemp, comparisonRate;
      
      if (comparisonData?.summary) {
        comparisonEnergy = comparisonData.summary.total_energy * progress;
        comparisonTemp = comparisonData.summary.average_temperature + 
          (Math.random() - 0.5) * 5 * progress;
        comparisonRate = (comparisonData.summary.reaction_rate || 0.05) * progress + 
          (Math.random() - 0.5) * 0.01;
      }
      
      return {
        time: Number(time.toFixed(2)),
        energyOutput: Number(energyOutput.toFixed(2)),
        temperature: Number(temperature.toFixed(2)),
        reactionRate: Number(reactionRate.toFixed(4)),
        comparisonEnergy: comparisonEnergy ? Number(comparisonEnergy.toFixed(2)) : undefined,
        comparisonTemp: comparisonTemp ? Number(comparisonTemp.toFixed(2)) : undefined,
        comparisonRate: comparisonRate ? Number(comparisonRate.toFixed(4)) : undefined
      };
    });
  };
  
  // Format chart data for display
  const chartData = prepareChartData();
  
  // Tab content components
  const renderTabs = () => {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Visualization tabs">
          <Tab label="3D Visualization" />
          <Tab label="Energy Output" />
          <Tab label="Temperature" />
          <Tab label="Reaction Rate" />
        </Tabs>
      </Box>
    );
  };
  
  const render3DVisualization = () => {
    return (
      <Box sx={{ position: 'relative', height: '100%' }}>
        <Box
          ref={containerRef}
          sx={{
            width: '100%',
            height: 'calc(100% - 50px)',
            position: 'relative'
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </Box>
        
        <Box sx={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.7)', padding: 1, borderRadius: 1 }}>
          <FormGroup row>
            <FormControlLabel
              control={
                <Switch
                  checked={visOptions.showLattice}
                  onChange={handleVisOptionChange('showLattice')}
                  size="small"
                />
              }
              label="Lattice"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={visOptions.showHotSpots}
                  onChange={handleVisOptionChange('showHotSpots')}
                  size="small"
                />
              }
              label="Hot Spots"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={visOptions.showEnergyFlow}
                  onChange={handleVisOptionChange('showEnergyFlow')}
                  size="small"
                />
              }
              label="Energy Flow"
            />
          </FormGroup>
        </Box>
      </Box>
    );
  };
  
  const renderEnergyChart = () => {
    return (
      <Box sx={{ width: '100%', height: 'calc(100% - 50px)', p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Energy Output Over Time
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Energy Output (J)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="energyOutput"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              name="Current Simulation"
            />
            {comparisonData && (
              <Line
                type="monotone"
                dataKey="comparisonEnergy"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
                name="Comparison Simulation"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  const renderTemperatureChart = () => {
    return (
      <Box sx={{ width: '100%', height: 'calc(100% - 50px)', p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Temperature Evolution
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Temperature (K)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#ff7300"
              activeDot={{ r: 8 }}
              name="Current Simulation"
            />
            {comparisonData && (
              <Line
                type="monotone"
                dataKey="comparisonTemp"
                stroke="#0088fe"
                activeDot={{ r: 8 }}
                name="Comparison Simulation"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  const renderReactionRateChart = () => {
    return (
      <Box sx={{ width: '100%', height: 'calc(100% - 50px)', p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Reaction Rate
        </Typography>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              label={{ value: 'Reaction Rate', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="reactionRate"
              stroke="#ff0000"
              activeDot={{ r: 8 }}
              name="Current Simulation"
            />
            {comparisonData && (
              <Line
                type="monotone"
                dataKey="comparisonRate"
                stroke="#00c49f"
                activeDot={{ r: 8 }}
                name="Comparison Simulation"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    );
  };
  
  // If no data is available, show a loading spinner
  if (!timeSeriesData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {renderTabs()}
      
      <Box sx={{ height: 'calc(100% - 48px)' }}>
        {activeTab === 0 && render3DVisualization()}
        {activeTab === 1 && renderEnergyChart()}
        {activeTab === 2 && renderTemperatureChart()}
        {activeTab === 3 && renderReactionRateChart()}
      </Box>
    </Box>
  );
};

LENRVisualization.propTypes = {
  parameters: PropTypes.object,
  timeSeriesData: PropTypes.object,
  comparisonData: PropTypes.object
};

export default LENRVisualization; 