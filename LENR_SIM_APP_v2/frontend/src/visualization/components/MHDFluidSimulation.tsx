import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import ThreeJsLoader from './ThreeJsLoader';
import { Box, CircularProgress, Typography, Slider, FormControlLabel, Switch, Paper, Button } from '@mui/material';

// Simulation parameters interface
interface MHDFluidSimulationProps {
  width?: number | string;
  height?: number | string;
  simulationId?: string;
  conductivity?: number;
  viscosity?: number;
  magneticField?: [number, number, number];
  density?: number;
  temperature?: number;
  initialFlowVelocity?: [number, number, number];
  resolution?: number;
  quality?: 'low' | 'medium' | 'high';
  showVectors?: boolean;
  showStreamlines?: boolean;
  showTemperature?: boolean;
  showPressure?: boolean;
  colorMap?: 'viridis' | 'plasma' | 'magma' | 'inferno' | 'rainbow';
  timeScale?: number;
  onDataUpdate?: (_data: any) => void;
}

/**
 * MHD and Fluid Dynamics Simulation Visualization
 * 
 * This component visualizes MHD (Magnetohydrodynamics) and fluid dynamics simulations
 * with vector fields, streamlines, and other visualization techniques.
 */
const MHDFluidSimulation: React.FC<MHDFluidSimulationProps> = ({
  width = '100%',
  height = 600,
  simulationId,
  conductivity: _conductivity = 5.0,
  viscosity: _viscosity = 1.0,
  magneticField = [0, 0, 1],
  density = 1.0,
  temperature = 300,
  initialFlowVelocity: _initialFlowVelocity = [0, 0, 0],
  resolution = 32,
  quality: _quality = 'medium',
  showVectors = true,
  showStreamlines = true,
  showTemperature = true,
  showPressure = false,
  colorMap = 'viridis',
  timeScale = 1.0,
  onDataUpdate
}) => {
  // State for simulation data
  const [simData, setSimData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false); // Debug mode state
  
  // References for animation and scene objects
  const vectorFieldRef = useRef<THREE.InstancedMesh | null>(null);
  const streamlinesRef = useRef<THREE.LineSegments | null>(null);
  const temperatureMapRef = useRef<THREE.Mesh | null>(null);
  const pressureMapRef = useRef<THREE.Mesh | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  // Color maps for visualization
  const colorMaps = {
    viridis: [
      [0.267, 0.005, 0.329],
      [0.283, 0.141, 0.458],
      [0.255, 0.267, 0.530],
      [0.207, 0.372, 0.553],
      [0.164, 0.471, 0.558],
      [0.128, 0.567, 0.551],
      [0.135, 0.659, 0.518],
      [0.267, 0.749, 0.441],
      [0.478, 0.821, 0.318],
      [0.741, 0.873, 0.150]
    ],
    plasma: [
      [0.050, 0.029, 0.527],
      [0.258, 0.026, 0.634],
      [0.427, 0.069, 0.680],
      [0.579, 0.118, 0.673],
      [0.720, 0.162, 0.599],
      [0.848, 0.213, 0.473],
      [0.950, 0.286, 0.327],
      [0.992, 0.404, 0.168],
      [0.964, 0.580, 0.072],
      [0.940, 0.780, 0.180]
    ],
    rainbow: [
      [0.500, 0.000, 1.000],
      [0.000, 0.000, 1.000],
      [0.000, 0.500, 1.000],
      [0.000, 1.000, 1.000],
      [0.000, 1.000, 0.500],
      [0.000, 1.000, 0.000],
      [0.500, 1.000, 0.000],
      [1.000, 1.000, 0.000],
      [1.000, 0.500, 0.000],
      [1.000, 0.000, 0.000]
    ]
  };
  
  // Generate test data for visualization
  const generateTestData = () => {
    const size = resolution;
    const gridSpacing = 1.0;
    const gridSize = size * gridSpacing;
    const halfGrid = gridSize / 2;
    
    // Generate points
    const points = [];
    const velocities = [];
    const temperatures = [];
    const pressures = [];
    const magneticFields = [];
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        for (let k = 0; k < size; k++) {
          const x = (i * gridSpacing) - halfGrid;
          const y = (j * gridSpacing) - halfGrid;
          const z = (k * gridSpacing) - halfGrid;
          
          // Distance from center
          const r = Math.sqrt(x*x + y*y + z*z);
          const theta = Math.atan2(y, x);
          
          // Generate test velocity field (rotating vortex)
          const vx = -Math.sin(theta) * Math.exp(-r/10);
          const vy = Math.cos(theta) * Math.exp(-r/10);
          const vz = Math.sin(r/5) * 0.1;
          
          // Generate temperature gradient from center
          const temp = temperature * (1 - r/(2*halfGrid));
          
          // Generate pressure field
          const pressure = density * (1 - r/(3*halfGrid));
          
          // Generate magnetic field (aligned with z-axis by default)
          const mx = magneticField[0] + Math.sin(y/5) * 0.1;
          const my = magneticField[1] + Math.sin(x/5) * 0.1;
          const mz = magneticField[2];
          
          points.push([x, y, z]);
          velocities.push([vx, vy, vz]);
          temperatures.push(temp);
          pressures.push(pressure);
          magneticFields.push([mx, my, mz]);
        }
      }
    }
    
    // Generate streamlines
    const numStreamlines = 50;
    const streamlines = [];
    
    for (let i = 0; i < numStreamlines; i++) {
      // Random starting point
      const startPoint = [
        (Math.random() - 0.5) * gridSize * 0.8,
        (Math.random() - 0.5) * gridSize * 0.8,
        (Math.random() - 0.5) * gridSize * 0.8
      ];
      
      const streamline = [startPoint];
      let currentPoint = [...startPoint];
      
      // Generate points along the streamline
      for (let step = 0; step < 100; step++) {
        const [x, y, z] = currentPoint;
        
        // Find grid cell
        const i = Math.floor((x + halfGrid) / gridSpacing);
        const j = Math.floor((y + halfGrid) / gridSpacing);
        const k = Math.floor((z + halfGrid) / gridSpacing);
        
        if (i < 0 || i >= size || j < 0 || j >= size || k < 0 || k >= size) {
          break; // Out of bounds
        }
        
        // Get velocity at point
        const index = i + j * size + k * size * size;
        const [vx, vy, vz] = velocities[index];
        
        // Update point using velocity
        currentPoint = [
          x + vx * 0.5,
          y + vy * 0.5,
          z + vz * 0.5
        ];
        
        streamline.push([...currentPoint]);
      }
      
      streamlines.push(streamline);
    }
    
    return {
      step: currentStep,
      time: currentStep * 0.1,
      grid: {
        size: size,
        spacing: gridSpacing
      },
      points,
      velocities,
      temperatures,
      pressures,
      magneticFields,
      streamlines
    };
  };
  
  // Initialize data - would be replaced with actual API call in production
  useEffect(() => {
    console.log("MHDFluidSimulation: Initializing simulation data");
    if (simulationId) {
      // In production, we would fetch data from API here
      // For now, generate test data
      setIsLoading(true);
      
      setTimeout(() => {
        try {
          console.log("MHDFluidSimulation: Generating test data");
          const data = generateTestData();
          setSimData(data);
          if (onDataUpdate) onDataUpdate(data);
          setIsLoading(false);
        } catch (err) {
          console.error("MHDFluidSimulation: Failed to generate simulation data", err);
          setError('Failed to generate simulation data');
          setIsLoading(false);
        }
      }, 1000);
    } else {
      setIsLoading(true);
      try {
        console.log("MHDFluidSimulation: Generating test data (no simulationId)");
        const data = generateTestData();
        setSimData(data);
        if (onDataUpdate) onDataUpdate(data);
        setIsLoading(false);
      } catch (err) {
        console.error("MHDFluidSimulation: Failed to generate simulation data", err);
        setError('Failed to generate simulation data');
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId, resolution, onDataUpdate]);
  
  // Update simulation data on parameter changes
  useEffect(() => {
    if (!isPaused && simData) {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          const newStep = prev + 1;
          const newData = generateTestData();
          setSimData(newData);
          if (onDataUpdate) onDataUpdate(newData);
          return newStep;
        });
      }, 1000 / timeScale);
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, simData, timeScale, onDataUpdate]);
  
  // Handle Three.js initialization with improved logging
  const handleThreeJsReady = (_: any, renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
    console.log("MHDFluidSimulation: ThreeJs initialized successfully, setting up scene");
    if (!simData) {
      console.warn("MHDFluidSimulation: No simulation data available during ThreeJs initialization");
      return;
    }
    
    // Set up camera position
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(20);
    scene.add(axesHelper);
    
    // Add bounding box
    const gridSize = simData.grid.size * simData.grid.spacing;
    const _halfGrid = gridSize / 2;
    const boxGeometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
    const _boxMaterial = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.2 });
    const box = new THREE.LineSegments(new THREE.WireframeGeometry(boxGeometry));
    box.position.set(0, 0, 0);
    scene.add(box);
    
    // Create vector field
    if (showVectors) {
      const arrowLength = 0.8 * simData.grid.spacing;
      const instanceCount = simData.velocities.length;
      
      // Create arrow geometry
      const arrowGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
      arrowGeo.translate(0, 0.25, 0);
      
      // Create line geometry
      const lineGeo = new THREE.BoxGeometry(0.05, 0.5, 0.05);
      lineGeo.translate(0, -0.25, 0);
      
      // Combine geometries
      const arrowWithLine = new THREE.BufferGeometry();
      const arrowPositions = arrowGeo.getAttribute('position').array;
      const linePositions = lineGeo.getAttribute('position').array;
      
      const combinedPositions = new Float32Array(arrowPositions.length + linePositions.length);
      combinedPositions.set(arrowPositions, 0);
      combinedPositions.set(linePositions, arrowPositions.length);
      
      arrowWithLine.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
      
      // Create instanced mesh
      const arrowMaterial = new THREE.MeshPhongMaterial({ color: 0x4488ff });
      const instances = new THREE.InstancedMesh(arrowWithLine, arrowMaterial, instanceCount);
      
      // Set instance matrices
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      
      simData.velocities.forEach((velocity, i) => {
        const [vx, vy, vz] = velocity;
        const position = new THREE.Vector3(...simData.points[i]);
        
        // Get velocity magnitude for scaling
        const vMag = Math.sqrt(vx*vx + vy*vy + vz*vz);
        const scale = Math.min(Math.max(vMag * 2, 0.2), 1.0) * arrowLength;
        
        // Create direction vector and quaternion
        const dir = new THREE.Vector3(vx, vy, vz).normalize();
        quaternion.setFromUnitVectors(up, dir);
        
        // Apply transformations
        matrix.makeRotationFromQuaternion(quaternion);
        matrix.scale(new THREE.Vector3(scale, scale, scale));
        matrix.setPosition(position);
        
        instances.setMatrixAt(i, matrix);
      });
      
      instances.instanceMatrix.needsUpdate = true;
      scene.add(instances);
      vectorFieldRef.current = instances;
    }
    
    // Create streamlines
    if (showStreamlines && simData.streamlines) {
      const streamlineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.7,
        linewidth: 2
      });
      
      const streamlinesGroup = new THREE.Group();
      
      simData.streamlines.forEach(streamline => {
        const points = streamline.map(p => new THREE.Vector3(...p));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, streamlineMaterial);
        streamlinesGroup.add(line);
      });
      
      scene.add(streamlinesGroup);
      streamlinesRef.current = streamlinesGroup as unknown as THREE.LineSegments;
    }
    
    // Create temperature visualization
    if (showTemperature && simData.temperatures) {
      const gridSize = simData.grid.size;
      const _spacing = simData.grid.spacing;
      
      // Create a 3D texture from temperature data
      const size = gridSize;
      const data = new Uint8Array(size * size * size * 4);
      
      const getIndex = (i, j, k) => (i + j * size + k * size * size);
      
      // Find min/max temperature for normalization
      const temps = simData.temperatures;
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      const tempRange = maxTemp - minTemp;
      
      // Fill the texture data
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          for (let k = 0; k < size; k++) {
            const index = getIndex(i, j, k);
            const idx = index * 4;
            
            // Normalize temperature and get color
            const t = (temps[index] - minTemp) / tempRange;
            const colorIdx = Math.min(Math.floor(t * 9), 9);
            
            const colors = colorMaps[colorMap] || colorMaps.viridis;
            const [r, g, b] = colors[colorIdx];
            
            // Set RGBA values
            data[idx] = r * 255;
            data[idx + 1] = g * 255;
            data[idx + 2] = b * 255;
            data[idx + 3] = Math.min(t * 200, 150); // Alpha for better visibility
          }
        }
      }
      
      // Create 3D texture
      const texture = new THREE.Data3DTexture(data, size, size, size);
      texture.format = THREE.RGBAFormat;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.flipY = false;
      texture.needsUpdate = true;
      
      // Create volume rendering material
      const volMaterial = new THREE.ShaderMaterial({
        uniforms: {
          diffuse: { value: new THREE.Color(0xffffff) },
          opacity: { value: 0.2 },
          volume: { value: texture }
        },
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler3D volume;
          uniform float opacity;
          uniform vec3 diffuse;
          varying vec3 vPosition;
          
          void main() {
            // Convert position to texture coordinates (0-1)
            vec3 texCoord = vPosition * 0.5 + 0.5;
            
            // Sample the volume texture
            vec4 color = texture(volume, texCoord);
            
            // Apply opacity
            color.a *= opacity;
            
            gl_FragColor = color;
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // Create cube for volume rendering
      const volGeometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
      const volMesh = new THREE.Mesh(volGeometry, volMaterial);
      scene.add(volMesh);
      
      temperatureMapRef.current = volMesh;
    }
    
    // Create pressure visualization (as a series of isosurfaces)
    if (showPressure && simData.pressures) {
      // For a simple implementation, we'll use sphere instances of varying sizes
      const pressures = simData.pressures;
      const minPressure = Math.min(...pressures);
      const maxPressure = Math.max(...pressures);
      const pressureRange = maxPressure - minPressure;
      
      const sphereGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.6
      });
      
      const instances = new THREE.InstancedMesh(
        sphereGeometry,
        sphereMaterial,
        simData.points.length
      );
      
      const matrix = new THREE.Matrix4();
      
      simData.points.forEach((point, i) => {
        const pressure = (pressures[i] - minPressure) / pressureRange;
        const scale = pressure * 0.8 + 0.2;
        
        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(new THREE.Vector3(...point));
        
        instances.setMatrixAt(i, matrix);
      });
      
      instances.instanceMatrix.needsUpdate = true;
      scene.add(instances);
      
      pressureMapRef.current = instances;
    }
    
    // Create orbit controls for camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      
      // Rotate vector field arrows slightly for fluid motion appearance
      if (vectorFieldRef.current && !isPaused) {
        const time = clockRef.current.getElapsedTime() * 0.2 * timeScale;
        
        // Slightly rotate instancedMesh for fluid appearance
        vectorFieldRef.current.rotation.y = Math.sin(time * 0.2) * 0.05;
      }
      
      // Animate streamlines
      if (streamlinesRef.current && !isPaused) {
        // Pulse opacity for streamlines
        const time = clockRef.current.getElapsedTime() * timeScale;
        const opacity = 0.5 + Math.sin(time) * 0.3;
        
        if (streamlinesRef.current.material instanceof THREE.LineBasicMaterial) {
          (streamlinesRef.current.material as THREE.LineBasicMaterial).opacity = opacity;
        } else if (streamlinesRef.current.children) {
          streamlinesRef.current.children.forEach(child => {
            if (child instanceof THREE.Line && (child as any).material instanceof THREE.LineBasicMaterial) {
              ((child as any).material as THREE.LineBasicMaterial).opacity = opacity;
            }
          });
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
  };
  
  // Handle errors with more detailed information
  const handleError = (error: Error) => {
    console.error("MHDFluidSimulation: Error in Three.js initialization:", error);
    setError(`Error in 3D visualization: ${error.message}`);
  };

  // Toggle debug mode
  const toggleDebugMode = () => {
    setIsDebugMode(!isDebugMode);
    console.log(`MHDFluidSimulation: Debug mode ${!isDebugMode ? 'enabled' : 'disabled'}`);
  };
  
  // Control panel component
  const ControlPanel = () => (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Simulation Controls</Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={!isPaused}
            onChange={() => setIsPaused(!isPaused)}
            color="primary"
          />
        }
        label={isPaused ? "Resume" : "Pause"}
      />
      
      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>Time Scale: {timeScale.toFixed(1)}x</Typography>
        <Slider
          value={timeScale}
          onChange={(_, newValue) => setCurrentStep(newValue as number)}
          min={0.1}
          max={5.0}
          step={0.1}
          marks
          valueLabelDisplay="auto"
        />
      </Box>
      
      <Typography sx={{ mt: 2, fontSize: '0.9rem' }}>
        Step: {currentStep} | Time: {(currentStep * 0.1).toFixed(1)}s
      </Typography>

      {/* Debug mode toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={isDebugMode}
            onChange={toggleDebugMode}
            color="secondary"
            size="small"
          />
        }
        label={<Typography variant="caption">Debug Mode</Typography>}
        sx={{ mt: 1 }}
      />
    </Paper>
  );
  
  // Provide a fallback visualization
  const FallbackVisualization = () => (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        p: 3,
        borderRadius: 2
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
        2D Fallback Visualization
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#aaa', textAlign: 'center' }}>
        3D visualization couldn't be loaded. Here's a simplified 2D view.
      </Typography>
      
      <Box 
        sx={{ 
          width: '100%', 
          height: 300,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '1px solid #444',
          borderRadius: 1,
          backgroundColor: '#111'
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#0088ff" strokeWidth="2" fill="none" />
          <path d="M30,50 Q 50,30 70,50 Q 50,70 30,50" stroke="#ff4400" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="5" fill="#ff4400" />
          <text x="50" y="20" fontSize="5" textAnchor="middle" fill="#fff">Magnetic Field</text>
          <text x="50" y="85" fontSize="5" textAnchor="middle" fill="#fff">Simulation Data Not Available in 3D</text>
        </svg>
      </Box>
      
      <Button 
        variant="outlined"
        color="primary"
        sx={{ mt: 3 }}
        onClick={() => window.location.href = '/three-test'}
      >
        Run Diagnostic Test
      </Button>
    </Box>
  );
  
  // Loading state
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: '#1a1a1a',
          color: 'white'
        }}
      >
        <CircularProgress color="primary" size={60} thickness={4} sx={{ mb: 2 }} />
        <Typography variant="h6">Loading MHD Simulation</Typography>
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box 
        sx={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: '#1a1a1a',
          color: 'white',
          p: 3
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          Simulation Error
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width, height: typeof height === 'number' ? height : undefined }}>
      <ControlPanel />
      
      <ThreeJsLoader
        width={width}
        height={typeof height === 'number' ? height - 100 : 500}
        onThreeJsReady={handleThreeJsReady}
        onError={handleError}
        backgroundColor="#1a1a1a"
        debugMode={isDebugMode}
        fallback={<FallbackVisualization />}
      />
    </Box>
  );
};

export default MHDFluidSimulation; 