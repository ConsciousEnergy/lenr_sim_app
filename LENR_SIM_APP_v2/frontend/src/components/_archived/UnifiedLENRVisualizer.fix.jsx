/**
 * Unified LENR Visualizer
 * Combines lattice visualization, fusion processes, and quantum effects
 * into a single interactive 3D visualization
 */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControlLabel,
  Switch,
  Slider,
  Card,
  CardContent,
  CardHeader,
  Grid,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { InfoCircleOutlined } from '@mui/icons-material';
import { usePhysics } from "../../contexts/PhysicsContext";
import { ErrorBoundary } from "../ErrorBoundary";

// Use performance optimization - throttle function
const throttle = (func, limit) => {
  let inThrottle;
  let lastResult;

  return function (...args) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  };
};

// Define LENR color theme (from v1)
const LENR_COLORS = {
  primary: {
    main: 0x3f51b5,
    light: 0x757de8,
  },
  secondary: {
    main: 0xff9800,
  },
  elementColors: {
    palladium: 0xb0b0b0,
    nickel: 0xa0a0a0,
    titanium: 0x909090,
    deuterium: 0x5555ff,
    energy: 0xff8844,
  },
  visualization: {
    background: 0xf0f0f0,
  },
};

// Styled components
const VisualizerContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "400px",
}));

const CanvasContainer = styled(Box)({
  width: "100%",
  height: "100%",
  minHeight: "400px",
});

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  zIndex: 10,
}));

const InfoOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 10,
  left: 10,
  padding: theme.spacing(1),
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  borderRadius: 4,
  zIndex: 5,
}));

const VisualizationLegend = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: 20,
  right: 20,
  padding: theme.spacing(2),
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  color: "#fff",
  borderRadius: 6,
  maxWidth: "280px",
  zIndex: 10,
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
}));

const LegendItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(1),
  "&:last-child": {
    marginBottom: 0,
  },
}));

const LegendColor = styled(Box)(({ color }) => ({
  width: "16px",
  height: "16px",
  backgroundColor: color,
  marginRight: "10px",
}));

// Main visualization component
const UnifiedLENRVisualizer = (props) => {
  // Use the PhysicsContext via the usePhysics hook
  const physicsData = usePhysics();
  
  // State for handling active tab
  const [activeTab, setActiveTab] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [webGLCapabilities, setWebGLCapabilities] = useState(null);
  const [renderSettings, setRenderSettings] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugMode, setDebugMode] = useState(props.debugMode || false);
  
  // Three.js references
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  
  // Initialize Three.js scene
  const initThreeScene = useCallback(() => {
    if (!containerRef.current) return;
    
    // Check WebGL capabilities first
    const capabilities = detectWebGLCapabilities();
    setWebGLCapabilities(capabilities);
    
    // Set optimal rendering settings based on capabilities
    const settings = getOptimalRenderingSettings(capabilities);
    setRenderSettings(settings);
    
    // Cleanup any existing scene
    if (rendererRef.current) {
      if (rendererRef.current.dispose) {
        rendererRef.current.dispose();
      }
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    }
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(LENR_COLORS.visualization.background);
    sceneRef.current = scene;
    
    // Create camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;
    
    // Create renderer with appropriate settings
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: settings.antialias,
        alpha: true,
        powerPreference: settings.powerPreference,
        precision: settings.precision,
      });
      
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.maxPixelRatio));
      
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Create controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7.5);
      scene.add(directionalLight);
      
      // Start render loop
      renderLoop();
      
      // Add resize handler
      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      setIsInitialized(true);
      
      // Initial visualization update
      updateVisualization(physicsData.getVisualizationData());
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (rendererRef.current && rendererRef.current.dispose) {
          rendererRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing WebGL renderer:', error);
      if (debugMode) {
        alert(`WebGL Error: ${error.message}`);
      }
      return null;
    }
  }, [debugMode, physicsData]);
  
  // Main render loop function
  const renderLoop = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    requestAnimationFrame(renderLoop);
    
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);
  
  // Initialize the scene on component mount
  useEffect(() => {
    const cleanup = initThreeScene();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [initThreeScene]);
  
  // Update visualization when physics data changes
  useEffect(() => {
    if (!sceneRef.current || !isInitialized) return;
    
    // Get visualization data from physics context
    const visualizationData = physicsData.getVisualizationData();
    updateVisualization(visualizationData);
    
  }, [physicsData, isInitialized]);
  
  // Function to update visualization based on data
  const updateVisualization = useCallback((data) => {
    if (!sceneRef.current) return;
    
    // Clear existing objects except lights
    const scene = sceneRef.current;
    const toRemove = [];
    scene.traverse(object => {
      if (object instanceof THREE.Light) return;
      if (object !== scene) toRemove.push(object);
    });
    toRemove.forEach(object => scene.remove(object));
    
    // If no data, show placeholder
    if (!data || !data.latticeData) {
      const geometry = new THREE.BoxGeometry(5, 5, 5);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x888888, 
        wireframe: true 
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const textGeometry = new THREE.TextBufferGeometry("No Data", {
        font: new THREE.Font(),
        size: 0.5,
        height: 0.1,
      });
      const text = new THREE.Mesh(textGeometry, textMaterial);
      text.position.set(-2, 0, 0);
      scene.add(text);
      return;
    }
    
    // Destructure data components
    const { latticeData, fusionData, enhancementData } = data;
    
    // Create the base lattice structure
    if (latticeData) {
      const material = latticeData.material || 'palladium';
      const atomColor = LENR_COLORS.elementColors[material.toLowerCase()] || 0xb0b0b0;
      
      // Create lattice
      const latticeSizeFactor = Math.min(10, Math.max(3, Math.ceil((latticeData.temperature || 300) / 100)));
      const latticeSize = latticeSizeFactor / 2;
      const latticeSpacing = latticeData.lattice_constant ? 
        latticeData.lattice_constant * 1e10 : 
        (material === 'palladium' ? 3.89 : 3.52);
      
      const pdGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const pdMaterial = new THREE.MeshStandardMaterial({ 
        color: atomColor,
        metalness: 0.8,
        roughness: 0.2
      });
      
      // Create the lattice with appropriate size
      const latticeGroup = new THREE.Group();
      for (let x = -latticeSize; x <= latticeSize; x++) {
        for (let y = -latticeSize; y <= latticeSize; y++) {
          for (let z = -latticeSize; z <= latticeSize; z++) {
            const pdAtom = new THREE.Mesh(pdGeometry, pdMaterial);
            pdAtom.position.set(
              x * latticeSpacing,
              y * latticeSpacing,
              z * latticeSpacing
            );
            latticeGroup.add(pdAtom);
          }
        }
      }
      scene.add(latticeGroup);
    }
    
    // Add fusion events
    if (fusionData && fusionData.events && fusionData.events.length > 0) {
      const fusionGeometry = new THREE.SphereGeometry(0.4, 16, 16);
      const fusionGroup = new THREE.Group();
      
      fusionData.events.forEach(event => {
        const intensity = Math.min(1.0, Math.max(0.2, event.intensity / 100));
        const fusionMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xff4500,
          emissive: 0xff8c00,
          emissiveIntensity: intensity,
          transparent: true,
          opacity: 0.8
        });
        
        const fusionPoint = new THREE.Mesh(fusionGeometry, fusionMaterial);
        fusionPoint.position.set(...event.pos);
        
        // Add energy wave effect
        const waveGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const waveMaterial = new THREE.MeshBasicMaterial({
          color: 0xffdd00,
          transparent: true,
          opacity: 0.3,
          wireframe: true
        });
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.copy(fusionPoint.position);
        
        fusionGroup.add(fusionPoint);
        fusionGroup.add(wave);
      });
      
      scene.add(fusionGroup);
    }
    
    // Add enhancement visualization if data is available
    if (enhancementData) {
      const enhancementFactor = enhancementData.enhancementFactor || 1.0;
      
      if (enhancementFactor > 1.0) {
        // Visualize tunneling enhancement
        const tunnelingStrength = Math.min(1.0, (enhancementFactor - 1) / 10);
        
        const tunnelGeometry = new THREE.TorusGeometry(
          5,
          0.05 + tunnelingStrength * 0.3,
          8,
          50
        );
        const tunnelMaterial = new THREE.MeshStandardMaterial({
          color: 0xff5722,
          transparent: true,
          opacity: 0.3 + tunnelingStrength * 0.4
        });
        
        const tunnelRing = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
        tunnelRing.rotation.x = Math.PI / 2;
        scene.add(tunnelRing);
      }
    }
  }, []);
  
  // Return the component JSX
  return (
    <ErrorBoundary fallback={<div>Error loading visualization component</div>}>
      <VisualizerContainer>
        {!isInitialized && (
          <LoadingOverlay>
            <CircularProgress color="primary" />
            <Typography sx={{ mt: 2, color: "white" }}>
              Initializing Visualization...
            </Typography>
          </LoadingOverlay>
        )}
        
        {debugMode && (
          <InfoOverlay>
            <Typography variant="caption" sx={{ display: 'block' }}>
              WebGL Info: 
              {webGLCapabilities ? 
                `${webGLCapabilities.vendor} - ${webGLCapabilities.renderer}` : 
                'Not available'}
            </Typography>
            <Typography variant="caption">
              Render Quality: {renderSettings?.quality || 'Unknown'}
            </Typography>
          </InfoOverlay>
        )}
        
        <CanvasContainer ref={containerRef} />
        
        <VisualizationLegend>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Visualization Legend
          </Typography>
          <LegendItem>
            <LegendColor color="#b0b0b0" />
            <Typography variant="caption">Lattice Atoms</Typography>
          </LegendItem>
          <LegendItem>
            <LegendColor color="#ff4500" />
            <Typography variant="caption">Fusion Events</Typography>
          </LegendItem>
          <LegendItem>
            <LegendColor color="#ff5722" />
            <Typography variant="caption">Quantum Effects</Typography>
          </LegendItem>
        </VisualizationLegend>
      </VisualizerContainer>
    </ErrorBoundary>
  );
};

UnifiedLENRVisualizer.propTypes = {
  debugMode: PropTypes.bool,
};

UnifiedLENRVisualizer.defaultProps = {
  debugMode: false,
};

// WebGL capability detection
const detectWebGLCapabilities = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { supported: false };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let vendor = 'unknown';
    let renderer = 'unknown';
    
    if (debugInfo) {
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
    }
    
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const extensions = gl.getSupportedExtensions();
    
    return {
      supported: true,
      vendor,
      renderer,
      maxTextureSize,
      hasFloat: extensions.includes('OES_texture_float'),
      hasHalfFloat: extensions.includes('OES_texture_half_float'),
      hasDepthTexture: extensions.includes('WEBGL_depth_texture'),
      hasVertexArrayObject: extensions.includes('OES_vertex_array_object'),
      hasInstancedArrays: extensions.includes('ANGLE_instanced_arrays'),
      webgl2: !!canvas.getContext('webgl2'),
    };
  } catch (e) {
    console.error('Error detecting WebGL capabilities:', e);
    return { supported: false, error: e.message };
  }
};

// Get optimal rendering settings based on capabilities
const getOptimalRenderingSettings = (capabilities) => {
  if (!capabilities || !capabilities.supported) {
    return {
      quality: 'low',
      antialias: false,
      precision: 'lowp',
      maxPixelRatio: 1,
      powerPreference: 'low-power',
    };
  }
  
  // Check for high-end GPU indicators
  const isHighEnd = capabilities.renderer.includes('RTX') || 
                    capabilities.renderer.includes('Radeon Pro') ||
                    capabilities.maxTextureSize >= 16384;
  
  // Check for mid-range GPU indicators
  const isMidRange = capabilities.renderer.includes('GTX') ||
                     capabilities.renderer.includes('Radeon') ||
                     capabilities.maxTextureSize >= 8192;
  
  if (isHighEnd) {
    return {
      quality: 'high',
      antialias: true,
      precision: 'highp',
      maxPixelRatio: 2,
      powerPreference: 'high-performance',
    };
  } else if (isMidRange) {
    return {
      quality: 'medium',
      antialias: true,
      precision: 'mediump',
      maxPixelRatio: 1.5,
      powerPreference: 'default',
    };
  } else {
    return {
      quality: 'low',
      antialias: false,
      precision: 'lowp',
      maxPixelRatio: 1,
      powerPreference: 'low-power',
    };
  }
};

// Export wrapped with ErrorBoundary
export default function WrappedUnifiedLENRVisualizer(props) {
  return (
    <ErrorBoundary fallback={<div>Failed to load LENR Visualizer</div>}>
      <UnifiedLENRVisualizer {...props} />
    </ErrorBoundary>
  );
} 