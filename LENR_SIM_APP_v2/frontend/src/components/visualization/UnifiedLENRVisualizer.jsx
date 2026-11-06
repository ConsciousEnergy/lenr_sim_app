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
  useContext,
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
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { InfoOutlined } from '@mui/icons-material';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { usePhysics } from "../../contexts/PhysicsContext";
import { useStableThreeTimer } from "../../visualization/utils/threeTimer";
import { ErrorBoundary } from "../ErrorBoundary";

// Use antd Typography components
const { Title, Text } = Typography;

// Performance optimization - throttle function
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
  borderRadius: "3px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
}));

const ControlsPanel = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 10,
  right: 10,
  padding: theme.spacing(2),
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  color: "#fff",
  borderRadius: 4,
  zIndex: 5,
  width: "250px",
}));

// Material properties and colors
const MATERIAL_PROPERTIES = {
  palladium: {
    color: 0xb9b8b8, // Silver-gray
    name: 'Palladium',
    latticeConstant: 3.89, // in Angstroms
    structure: 'FCC',
    atomicRadius: 1.37,
  },
  nickel: {
    color: 0xc9c6c2, // Nickel color
    name: 'Nickel',
    latticeConstant: 3.52, // in Angstroms
    structure: 'FCC',
    atomicRadius: 1.24,
  },
  titanium: {
    color: 0x878681, // Titanium color
    name: 'Titanium',
    latticeConstant: 2.95, // in Angstroms (for hexagonal close-packed)
    structure: 'HCP',
    atomicRadius: 1.47,
  },
  deuterium: {
    color: 0x0088cc, // Blue
    name: 'Deuterium',
    atomicRadius: 0.6,
  },
  fusion: {
    color: 0xffcc00, // Yellow
    name: 'Fusion Event',
    atomicRadius: 0.8,
  },
};

// Add this utility function near the top of the file, after imports
const detectWebGLCapabilities = () => {
  const canvas = document.createElement('canvas');
  let gl;
  let result = {
    supported: false,
    hardwareAccelerated: false,
    webgl2: false,
    renderer: 'not available',
    vendor: 'not available',
    maxTextureSize: 0,
    maxCubeMapSize: 0,
    maxViewportDims: [0, 0],
    maxRenderbufferSize: 0,
    precision: 'unknown',
    extensions: [],
    version: '1.0'
  };

  try {
    // Try WebGL2 first
    gl = canvas.getContext('webgl2');
    if (gl) {
      result.webgl2 = true;
      result.version = '2.0';
    } else {
      // Fall back to WebGL1
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }

    if (!gl) {
      return result;
    }

    result.supported = true;
    
    // Get renderer information
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    }
    
    // Get maximum texture sizes
    result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    result.maxCubeMapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    result.maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    result.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    
    // Get precision
    const highpSupported = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (highpSupported && highpSupported.precision > 0) {
      result.precision = 'high';
    } else {
      const mediumpSupported = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
      result.precision = mediumpSupported && mediumpSupported.precision > 0 ? 'medium' : 'low';
    }
    
    // Get supported extensions
    result.extensions = gl.getSupportedExtensions();
    
    // Check if we're using software rendering
    const isSwiftShader = result.renderer.includes('SwiftShader');
    const isLLVMPipe = result.renderer.includes('llvmpipe');
    const isSoftware = 
      isSwiftShader || 
      isLLVMPipe || 
      result.renderer.includes('software') || 
      result.renderer.includes('Software') ||
      result.renderer.includes('Mesa') ||
      result.renderer.includes('ANGLE');
    
    result.hardwareAccelerated = !isSoftware;
    
    // Detect performance tier based on GPU info and capabilities
    if (result.hardwareAccelerated) {
      const isHighEnd = 
        result.maxTextureSize >= 16384 || 
        result.renderer.includes('RTX') || 
        result.renderer.includes('Quadro') || 
        result.renderer.includes('Radeon Pro');
        
      const isMidRange = 
        result.maxTextureSize >= 8192 || 
        result.renderer.includes('GTX') || 
        result.renderer.includes('Radeon');
        
      if (isHighEnd) {
        result.tier = 'high';
      } else if (isMidRange) {
        result.tier = 'medium';
      } else {
        result.tier = 'low';
      }
    } else {
      result.tier = 'low';
    }
    
    return result;
  } catch (e) {
    console.error('Error detecting WebGL capabilities:', e);
    return result;
  } finally {
    // Clean up resources
    if (gl) {
      const extension = gl.getExtension('WEBGL_lose_context');
      if (extension) extension.loseContext();
    }
  }
};

// Get optimal rendering settings based on device capabilities
const getOptimalRenderingSettings = (capabilities) => {
  const settings = {
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    shadowMapType: THREE.PCFSoftShadowMap,
    shadowMapEnabled: true,
    gammaCorrection: true,
    physicallyCorrectLights: true,
    toneMappingExposure: 1.0,
    toneMapping: THREE.ACESFilmicToneMapping,
    maxLights: 4,
    useHDR: false,
    useSoftParticles: false,
    useHighQualityBloom: false
  };

  // Adjust settings based on device capabilities
  if (!capabilities.supported) {
    // Fallback settings for unsupported devices
    settings.antialias = false;
    settings.pixelRatio = 1;
    settings.shadowMapEnabled = false;
    settings.gammaCorrection = false;
    settings.physicallyCorrectLights = false;
    settings.toneMapping = THREE.NoToneMapping;
    settings.maxLights = 2;
    return settings;
  }

  // Low tier settings
  if (capabilities.tier === 'low' || !capabilities.hardwareAccelerated) {
    settings.antialias = false;
    settings.pixelRatio = 1;
    settings.shadowMapEnabled = false;
    settings.shadowMapType = THREE.BasicShadowMap;
    settings.maxLights = 2;
    settings.toneMapping = THREE.ReinhardToneMapping;
    return settings;
  }

  // Medium tier settings
  if (capabilities.tier === 'medium') {
    settings.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    settings.shadowMapType = THREE.PCFShadowMap;
    settings.maxLights = 4;
    return settings;
  }

  // High tier settings
  if (capabilities.tier === 'high') {
    settings.useSoftParticles = true;
    settings.useHighQualityBloom = true;
    settings.useHDR = capabilities.webgl2;
    settings.maxLights = 8;
    return settings;
  }

  return settings;
};

/**
 * Unified LENR Visualizer component
 * @param {Object} props - Component props
 * @param {boolean} props.showLattice - Whether to show lattice visualization
 * @param {boolean} props.showFusion - Whether to show fusion visualization
 * @param {boolean} props.showEnhancement - Whether to show enhancement visualization
 * @param {Object} props.visualizationData - Visualization data
 * @param {boolean} props.loading - Whether visualization is loading
 */
const UnifiedLENRVisualizer = ({
  visualizationData,
  showLattice: initialShowLattice = true,
  showFusion: initialShowFusion = true,
  showEnhancement: initialShowEnhancement = true,
  loading = false,
}) => {
  // Use the PhysicsContext via the usePhysics hook
  const physicsData = usePhysics();

  // REF DECLARATIONS - keep all refs at the top
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });
  const objectsRef = useRef([]);
  const timerRef = useStableThreeTimer();
  const frameCountRef = useRef(0);
  const timeSinceLastFpsRef = useRef(0);
  const animationRef = useRef(null);
  const timeseriesDataRef = useRef(null);
  const atomsRef = useRef([]);
  const edgesRef = useRef([]);
  const latticeMeshRef = useRef(null);
  const glowTextureRef = useRef(null);
  const glowSpritesRef = useRef([]);
  const fusionEffectsRef = useRef([]);
  const deviceCapabilitiesRef = useRef({});
  // Add post-processing refs
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);

  // STATE DECLARATIONS - keep all state declarations together
  // State for visualization objects
  const [latticeObjects, setLatticeObjects] = useState([]);
  const [fusionObjects, setFusionObjects] = useState([]);
  const [enhancementObjects, setEnhancementObjects] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackControls, setPlaybackControls] = useState({
    totalFrames: 0,
    startTime: 0,
    endTime: 0,
    timeUnit: 'ns',
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('light');
  const [debugMode, setDebugMode] = useState(false);

  // State for rendering info
  const [fps, setFps] = useState(0);
  const [particleCount, setParticleCount] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [legendItems, setLegendItems] = useState([]);
  const [visualizationInfo, setVisualizationInfo] = useState({
    totalAtoms: 0,
    latticeType: '',
    temperature: 0,
    fusionEvents: 0,
  });

  // UI Controls - visualization options
  const [showLattice, setShowLattice] = useState(initialShowLattice);
  const [showFusion, setShowFusion] = useState(initialShowFusion);
  const [showEnhancement, setShowEnhancement] = useState(
    initialShowEnhancement,
  );
  const [showControls, setShowControls] = useState(true);

  // UI Controls - other parameters
  const [latticeSize, setLatticeSize] = useState(1.0);
  const [reactionIntensity, setReactionIntensity] = useState(1.0);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [latticeType, setLatticeType] = useState('FCC');
  const [temperature, setTemperature] = useState(300);
  const [latticeMetalType, setLatticeMetalType] = useState('palladium');
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState(true);

  // Performance optimization - device capability detection
  const [devicePerformance, setDevicePerformance] = useState("medium");
  
  // Add state for help dialog
  const [showWebGLHelp, setShowWebGLHelp] = useState(false);
  
  // UI Controls - visualization quality
  const [visualizationQuality, setVisualizationQuality] = useState(() => {
    // Detect capabilities at initialization time
    const caps = detectWebGLCapabilities();
    return caps.hardwareAccelerated ? "auto" : "low";
  });
  
  // Add state for render settings that can be used by visualization functions
  const [renderSettings, setRenderSettings] = useState({
    particleMultiplier: 1.0,
    useShadows: false,
    useHighDetail: true,
    qualityName: 'auto'
  });
  
  // State for internal visualization data
  const [internalVisualizationData, setInternalVisualizationData] = useState(null);

  // Use physics data from the PhysicsContext
  const {
    simulationData,
    advancedPhysicsData,
    getVisualizationData,
    isRunning,
  } = physicsData;

  // Move these hook-based functions inside the component
  // Add lighting to scene
  const addLighting = useCallback((scene, isDarkMode) => {
    // Remove any existing lights
    scene.children.forEach(child => {
      if (child.isLight) {
        scene.remove(child);
      }
    });
    
    // Create ambient light
    const ambientIntensity = isDarkMode ? 0.2 : 0.4;
    const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
    scene.add(ambientLight);
    
    // Create directional lights
    const mainLight = new THREE.DirectionalLight(0xffffff, isDarkMode ? 0.8 : 0.6);
    mainLight.position.set(5, 10, 7.5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    // Configure shadow properties
    if (mainLight.castShadow) {
      // Optimize shadow map settings based on device capabilities
      const shadowMapSize = deviceCapabilitiesRef.current.highEnd ? 2048 : 1024;
      mainLight.shadow.mapSize.width = shadowMapSize;
      mainLight.shadow.mapSize.height = shadowMapSize;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -10;
      mainLight.shadow.camera.right = 10;
      mainLight.shadow.camera.top = 10;
      mainLight.shadow.camera.bottom = -10;
      mainLight.shadow.bias = -0.0005;
    }
    
    // Create fill light (opposite to main light)
    const fillLight = new THREE.DirectionalLight(0xffffff, isDarkMode ? 0.4 : 0.3);
    fillLight.position.set(-5, 5, -7.5);
    scene.add(fillLight);
    
    // Add rim light for better object definition
    const rimLight = new THREE.DirectionalLight(isDarkMode ? 0x6495ED : 0xffffff, 0.3);
    rimLight.position.set(0, -10, -15);
    scene.add(rimLight);
    
    return { ambientLight, mainLight, fillLight, rimLight };
  }, []);

  // Setup post-processing for high-end devices
  const setupPostProcessing = useCallback((renderer, scene, camera, isDarkMode) => {
    // Create EffectComposer
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    
    // Add render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add bloom pass with appropriate settings
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      ),
      0.8,  // strength
      0.3,  // radius
      0.7   // threshold
    );
    
    // Adjust bloom settings based on theme
    if (isDarkMode) {
      bloomPass.threshold = 0.2;
      bloomPass.strength = 1.0;
      bloomPass.radius = 0.5;
    } else {
      bloomPass.threshold = 0.3;
      bloomPass.strength = 0.6;
      bloomPass.radius = 0.3;
    }
    
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;
    
    // Add FXAA pass for anti-aliasing
    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    
    fxaaPass.material.uniforms.resolution.value.x = 1 / (
      containerRef.current.clientWidth * pixelRatio
    );
    fxaaPass.material.uniforms.resolution.value.y = 1 / (
      containerRef.current.clientHeight * pixelRatio
    );
    
    composer.addPass(fxaaPass);
    
    return composer;
  }, []);

  // Update bloom settings based on current theme
  const updateBloomSettings = useCallback((isDarkMode) => {
    if (!bloomPassRef.current) return;
    
    if (isDarkMode) {
      // Stronger bloom in dark mode for better visibility
      bloomPassRef.current.strength = 0.7;
      bloomPassRef.current.radius = 0.5;
      bloomPassRef.current.threshold = 0.2;
    } else {
      // Subtle bloom in light mode
      bloomPassRef.current.strength = 0.4;
      bloomPassRef.current.radius = 0.3;
      bloomPassRef.current.threshold = 0.4;
    }
  }, []);

  // Optimize renderer based on device capabilities
  const optimizeRenderer = useCallback((renderer, capabilities) => {
    if (!renderer) return;
    
    // Enable shadows if device can handle them
    renderer.shadowMap.enabled = capabilities.shadows;
    renderer.shadowMap.type = capabilities.highEnd 
      ? THREE.PCFSoftShadowMap
      : THREE.BasicShadowMap;
    
    // Set pixel ratio based on device capabilities
    const pixelRatio = window.devicePixelRatio || 1;
    const limitedPixelRatio = capabilities.highEnd 
      ? Math.min(pixelRatio, 2) // Limit to 2x for high-end devices
      : Math.min(pixelRatio, 1.5); // Limit to 1.5x for mid-range
    renderer.setPixelRatio(limitedPixelRatio);
    
    // Configure additional renderer properties
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = capabilities.highEnd 
      ? THREE.ACESFilmicToneMapping
      : THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Enable physical properties for better realism on high-end devices
    if (capabilities.highEnd) {
      renderer.physicallyCorrectLights = true;
    }
    
    // Set default clear color (will be overridden by scene background)
    const clearColor = isDarkMode => isDarkMode 
      ? new THREE.Color(0x111827) 
      : new THREE.Color(0xf3f4f6);
    renderer.setClearColor(clearColor(theme === 'dark'));
    
    return renderer;
  }, [theme]);

  // UTILITY FUNCTIONS - these should be defined before they're used in other functions
  // Function to update legend items
  const updateLegendItems = useCallback(() => {
    const items = [
      {
        color: "#" + LENR_COLORS.elementColors.palladium.toString(16).padStart(6, '0'),
        label: "Lattice atoms (Pd, Ni, Ti)",
      },
      {
        color: "#" + LENR_COLORS.elementColors.deuterium.toString(16).padStart(6, '0'),
        label: "Deuterium/Hydrogen atoms",
      },
      {
        color: "#" + LENR_COLORS.elementColors.energy.toString(16).padStart(6, '0'),
        label: "Energy production/reaction",
      },
    ];

    // Add enhanced items if enhancement is shown
    if (showEnhancement) {
      items.push(
        {
          color: "#" + LENR_COLORS.primary.light.toString(16).padStart(6, '0'),
          label: "Quantum coherence",
        },
        {
          color: "#" + LENR_COLORS.secondary.main.toString(16).padStart(6, '0'),
          label: "Phonon coupling",
        },
      );
    }

    setLegendItems(items);

    // Update particle count for info overlay
    let count = 0;
    if (sceneRef.current) {
      sceneRef.current.traverse((object) => {
        if (object.userData && object.userData.type === "particle") {
          count++;
        }
      });
    }
    setParticleCount(count);
  }, [showEnhancement]);

  // Function to clear visualization
  const clearVisualization = useCallback(() => {
    if (!sceneRef.current) return;

    // Find and remove objects by type
    const objectsToRemove = [];
    sceneRef.current.traverse((object) => {
      if (object.userData && (
        object.userData.type === 'lattice' || 
        object.userData.type === 'fusion' || 
        object.userData.type === 'enhancement' ||
        object.userData.type === 'particle'
      )) {
        objectsToRemove.push(object);
      }
    });

    // Remove objects from scene
    objectsToRemove.forEach((object) => {
      if (object.parent) {
        object.parent.remove(object);

        // Dispose geometries and materials
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    // Clear the objects array
    objectsRef.current = [];

    // Clear atom references
    atomsRef.current = [];

    // Update state
    setLatticeObjects([]);
    setFusionObjects([]);
    setEnhancementObjects([]);
    setParticleCount(0);
  }, []);

  // Function to create a glow texture
  const createGlowTexture = useCallback(() => {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    // Get the 2D context
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Create a radial gradient for the glow effect
    const gradient = context.createRadialGradient(
      canvas.width / 2, 
      canvas.height / 2, 
      0, 
      canvas.width / 2, 
      canvas.height / 2, 
      canvas.width / 2
    );
    
    // Add color stops to the gradient
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    // Fill the canvas with the gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create a Three.js texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Assign to the ref
    glowTextureRef.current = texture;
  }, []);

  // Initialize Three.js scene and renderer
  const initThreeScene = useCallback(() => {
    if (containerRef.current === null) return;
    
    try {
      // Detect WebGL capabilities
      const capabilities = detectWebGLCapabilities();
      deviceCapabilitiesRef.current = capabilities;
      
      // Check if WebGL is supported
      if (!capabilities.supported) {
        setError('WebGL is not supported in your browser. Please try a different browser or device.');
        setShowWebGLHelp(true);
        return;
      }
      
      // Check if hardware acceleration is disabled
      if (!capabilities.hardwareAccelerated) {
        console.warn('Hardware acceleration is disabled. Visualization performance may be reduced.');
        // We don't automatically show the WebGL help dialog here, just set a warning
        // that we can display in the UI
      }
      
      // Get optimal rendering settings based on device capabilities
      const settings = getOptimalRenderingSettings(capabilities);
      setRenderSettings(settings);
      
      // Clear previous scene if it exists
      if (sceneRef.current) {
        if (rendererRef.current) {
          try {
            rendererRef.current.dispose();
          } catch (err) {
            console.warn('Error disposing renderer:', err);
          }
        }
        
        // Clear all children from the scene
        try {
          while (sceneRef.current.children.length > 0) {
            const object = sceneRef.current.children[0];
            sceneRef.current.remove(object);
          }
        } catch (err) {
          console.warn('Error clearing scene:', err);
        }
      }
      
      // Create new scene
      try {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(theme === 'dark' ? 0x111111 : 0xf0f0f0);
        sceneRef.current = scene;
      } catch (err) {
        setError(`Error creating Three.js scene: ${err.message}`);
        return;
      }
      
      // Create camera
      try {
        const aspectRatio = containerRef.current.clientWidth / containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;
      } catch (err) {
        setError(`Error creating camera: ${err.message}`);
        return;
      }
      
      // Create renderer with error handling
      try {
        const renderer = new THREE.WebGLRenderer({ 
          antialias: settings.antialias,
          alpha: true,
          powerPreference: 'high-performance',
        });
        
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio || 1.5));
        
        if (settings.shadowMapEnabled) {
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = settings.shadowMapType;
        }
        
        // Clear container and append renderer
        if (containerRef.current.querySelector('canvas')) {
          containerRef.current.removeChild(containerRef.current.querySelector('canvas'));
        }
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
      } catch (err) {
        setError(`Error creating WebGL renderer: ${err.message}`);
        console.error('WebGL Renderer Error:', err);
        return;
      }
      
      // Add controls with error handling
      try {
        const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controlsRef.current = controls;
      } catch (err) {
        setError(`Error creating controls: ${err.message}`);
        return;
      }
      
      // Add lighting with error handling
      try {
        addLighting(sceneRef.current, theme === 'dark');
      } catch (err) {
        console.warn('Error adding lighting:', err);
        // Continue even if lighting fails
      }
      
      // Setup post-processing with error handling
      try {
        if (capabilities.webgl2 && settings.useHighQualityBloom) {
          setupPostProcessing(rendererRef.current, sceneRef.current, cameraRef.current, theme === 'dark');
        }
      } catch (err) {
        console.warn('Error setting up post-processing:', err);
        // Continue even if post-processing fails
      }
      
      // Add coordinate axes for reference
      try {
        const axesHelper = new THREE.AxesHelper(2);
        sceneRef.current.add(axesHelper);
      } catch (err) {
        console.warn('Error adding axes helper:', err);
        // Continue even if axes helper fails
      }
      
      // Add grid for reference
      try {
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
        sceneRef.current.add(gridHelper);
      } catch (err) {
        console.warn('Error adding grid helper:', err);
        // Continue even if grid helper fails
      }
      
      // Animation loop with performance monitoring
      let animationActive = true;
      let lastFrameTime = performance.now();
      let frameSkipCounter = 0;
      const maxFrameSkip = 3; // Prevent UI freezing
      
      const animate = (currentTime) => {
        try {
          if (!animationActive) return;
          
          // Calculate delta time
          const deltaTime = currentTime - lastFrameTime;
          const targetFrameTime = 1000 / (settings.targetFps || 60);
          
          // Skip frame if too early, but prevent excessive skipping
          if (deltaTime < targetFrameTime) {
            frameSkipCounter++;
            if (frameSkipCounter < maxFrameSkip) {
          animationFrameRef.current = requestAnimationFrame(animate);
              return;
            }
          }
          
          frameSkipCounter = 0; // Reset skip counter
          lastFrameTime = currentTime;
          
          // Skip rendering when tab is not visible
          if (document.hidden || !containerRef.current) {
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
          }
          
          // Update controls
          if (controlsRef.current) {
            controlsRef.current.update();
          }
          
          // Render scene
          if (composerRef.current && capabilities.webgl2 && settings.useHighQualityBloom) {
            composerRef.current.render();
          } else if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          
          animationFrameRef.current = requestAnimationFrame(animate);
        } catch (err) {
          console.error('Error in animation loop:', err);
          // Prevent continuous errors from freezing the browser
          animationActive = false;
        }
      };
      
      // Start animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Handle window resize
      const handleResize = () => {
        if (containerRef.current && cameraRef.current && rendererRef.current) {
          try {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            
            rendererRef.current.setSize(width, height);
            
            if (composerRef.current) {
              composerRef.current.setSize(width, height);
              const fxaaPass = composerRef.current.passes.find(pass => pass.material && pass.material.uniforms.resolution);
              if (fxaaPass) {
                fxaaPass.material.uniforms.resolution.value.x = 1 / width;
                fxaaPass.material.uniforms.resolution.value.y = 1 / height;
              }
            }
          } catch (err) {
            console.warn('Error handling resize:', err);
          }
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Cleanup function
      return () => {
        try {
          // Stop animation
          animationActive = false;
          
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          
          window.removeEventListener('resize', handleResize);
          
          // Clean up renderer
          if (rendererRef.current) {
            rendererRef.current.dispose();
            // Remove DOM element
            if (containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
              containerRef.current.removeChild(rendererRef.current.domElement);
            }
          }
          
          // Clean up post-processing
          if (composerRef.current) {
            composerRef.current.passes.forEach(pass => {
              if (pass.dispose) {
                pass.dispose();
              }
            });
          }
          
          // Clean up controls
          if (controlsRef.current) {
            controlsRef.current.dispose();
          }
          
          // Dispose geometries and materials
          if (sceneRef.current) {
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
            
            // Clear the scene
            while(sceneRef.current.children.length > 0) {
              sceneRef.current.remove(sceneRef.current.children[0]);
            }
          }
          
          // Clear refs
          sceneRef.current = null;
          rendererRef.current = null;
          cameraRef.current = null;
          controlsRef.current = null;
          composerRef.current = null;
        } catch (err) {
          console.warn('Error in cleanup function:', err);
        }
      };
    } catch (error) {
      console.error('Error initializing Three.js scene:', error);
      setError(`Error initializing 3D visualization: ${error.message}`);
      
      if (debugMode) {
        alert(`Three.js initialization error: ${error.message}`);
      }
      
      return () => {};
    }
  }, [theme, debugMode, addLighting, setupPostProcessing]);

  // Function to create basic visualization
  const createBasicVisualization = useCallback(() => {
    if (!sceneRef.current) return;

    try {
      // Create a simple sphere to represent the core of the system
      const coreGeometry = new THREE.SphereGeometry(1, 32, 32);
      const coreMaterial = new THREE.MeshPhongMaterial({
        color: LENR_COLORS.primary.main,
        emissive: LENR_COLORS.primary.light,
        emissiveIntensity: 0.2,
        shininess: 30,
      });

      const coreSphere = new THREE.Mesh(coreGeometry, coreMaterial);
      sceneRef.current.add(coreSphere);

      // Add metadata
      coreSphere.userData = {
        type: "basic",
        description: "Core visualization element",
      };
    } catch (err) {
      console.error("Error creating basic visualization:", err);
    }
  }, []);
  
  // Detect device performance function
  const detectDevicePerformance = useCallback(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (!gl) {
        setDevicePerformance("low");
        return;
      }

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : "";

      // Check for mobile GPU patterns
      const isMobileGPU = /(adreno|mali|powervr)/i.test(renderer);

      // Check for performance.memory if available (Chrome only)
      const memoryInfo =
        window.performance && window.performance.memory
          ? window.performance.memory.jsHeapSizeLimit
          : 0;

      if (isMobileGPU || memoryInfo < 100000000) {
        setDevicePerformance("low");
      } else if (memoryInfo < 500000000) {
        setDevicePerformance("medium");
      } else {
        setDevicePerformance("high");
      }
    } catch (err) {
      console.warn(
        "Could not detect GPU performance, defaulting to medium",
        err,
      );
      setDevicePerformance("medium");
    }
  }, []);

  // Helper function to get particle count based on device performance
  const getParticleCountForDevice = useCallback((performance, type) => {
    const counts = {
      lattice: {
        low: 3,
        medium: 4,
        high: 5,
      },
      deuterium: {
        low: 15,
        medium: 30,
        high: 60,
      },
      phonons: {
        low: 5,
        medium: 15,
        high: 30,
      },
    };

    return counts[type]?.[performance] || counts[type]?.medium || 4;
  }, []);
  
  // Function for thermal displacement calculation
  const getThermalDisplacement = useCallback((temp) => {
    // Simple model: displacement increases with temperature
    const maxDisplacement = 0.05 * Math.sqrt(temp / 300);
    return (Math.random() * 2 - 1) * maxDisplacement;
  }, []);

  // Function to generate a default lattice visualization when no specific data is available
  const generateLatticeVisualization = useCallback((material = 'palladium', options = {}) => {
    console.log(`Generating default lattice visualization for ${material}`);
    
    // Clear existing visualization
    clearVisualization();
    
    const scene = sceneRef.current;
    if (!scene) return;
    
    // Get properties for the specified material
    const materialProps = MATERIAL_PROPERTIES[material.toLowerCase()] || MATERIAL_PROPERTIES.palladium;
    const latticeConstant = materialProps.latticeConstant;
    const temperature = options.temperature || 300; // Default to room temperature (K)
    const deuteriumLoading = options.loading_ratio || 0.6; // Default loading ratio
    
    // Create material for host lattice atoms
    const hostMaterial = new THREE.MeshStandardMaterial({
      color: materialProps.color,
      metalness: 0.8,
      roughness: 0.2,
    });
    
    // Create material for deuterium atoms
    const deuteriumMaterial = new THREE.MeshStandardMaterial({
      color: MATERIAL_PROPERTIES.deuterium.color,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.8,
    });
    
    // Create geometry for host lattice atoms
    const hostGeometry = new THREE.SphereGeometry(
      materialProps.atomicRadius * 0.4, // Scale down to better visualize
      32, 
      32
    );
    
    // Create geometry for deuterium atoms
    const deuteriumGeometry = new THREE.SphereGeometry(
      MATERIAL_PROPERTIES.deuterium.atomicRadius * 0.4,
      32,
      32
    );
    
    // Generate a 3x3x3 FCC lattice
    const latticeSize = 3;
    const latticeAtoms = [];
    
    // For FCC lattice, create the unit cell and repeat it
    // FCC has atoms at corners and face centers
    const fccPositions = [
      [0, 0, 0], // Corner
      [0.5, 0.5, 0], // Face center (xy)
      [0.5, 0, 0.5], // Face center (xz)
      [0, 0.5, 0.5], // Face center (yz)
    ];
    
    let atomCount = 0;
    
    // Create the lattice by repeating the unit cell
    for (let x = 0; x < latticeSize; x++) {
      for (let y = 0; y < latticeSize; y++) {
        for (let z = 0; z < latticeSize; z++) {
          // Place atoms at each position of the FCC unit cell
          fccPositions.forEach(([dx, dy, dz]) => {
            // Calculate position
            const posX = (x + dx) * latticeConstant;
            const posY = (y + dy) * latticeConstant;
            const posZ = (z + dz) * latticeConstant;
            
            // Add thermal displacement
            const thermalX = getThermalDisplacement(temperature);
            const thermalY = getThermalDisplacement(temperature);
            const thermalZ = getThermalDisplacement(temperature);
            
            // Create atom mesh
            const atomMesh = new THREE.Mesh(hostGeometry, hostMaterial);
            atomMesh.position.set(
              posX + thermalX, 
              posY + thermalY, 
              posZ + thermalZ
            );
            
            // Add to scene
            scene.add(atomMesh);
            objectsRef.current.push(atomMesh);
            atomCount++;
            
            // Store reference to the atom mesh for enhancement effects
            atomsRef.current.push(atomMesh);
            
            // Add to lattice atoms array for reference
            latticeAtoms.push({
              x: posX, 
              y: posY, 
              z: posZ,
              type: 'host'
            });
          });
        }
      }
    }
    
    console.log(`Created ${atomCount} lattice atoms for ${material} visualization`);
    
    // Add deuterium atoms randomly within the lattice
    const numDeuterium = Math.round(atomCount * deuteriumLoading * 0.5);
    let deuteriumCount = 0;
    
    for (let i = 0; i < numDeuterium; i++) {
      // Choose random position within the lattice boundaries
      const x = Math.random() * latticeSize * latticeConstant;
      const y = Math.random() * latticeSize * latticeConstant;
      const z = Math.random() * latticeSize * latticeConstant;
      
      // Add the deuterium atom
      const deuteriumMesh = new THREE.Mesh(deuteriumGeometry, deuteriumMaterial);
      deuteriumMesh.position.set(x, y, z);
      
      scene.add(deuteriumMesh);
      objectsRef.current.push(deuteriumMesh);
      deuteriumCount++;
      
      // Store reference to the deuterium atom mesh for enhancement effects
      atomsRef.current.push(deuteriumMesh);
      
      // Add to lattice atoms array
      latticeAtoms.push({
        x, y, z,
        type: 'deuterium'
      });
    }
    
    console.log(`Added ${deuteriumCount} deuterium atoms`);
    
    // Add fusion events if provided
    if (options.fusionEvents && options.fusionEvents.length > 0) {
      const fusionGeometry = new THREE.SphereGeometry(
        MATERIAL_PROPERTIES.fusion.atomicRadius * 0.6,
        32,
        32
      );
      
      const fusionMaterial = new THREE.MeshStandardMaterial({
        color: MATERIAL_PROPERTIES.fusion.color,
        emissive: MATERIAL_PROPERTIES.fusion.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9,
      });
      
      options.fusionEvents.forEach(event => {
        if (!event.position) return;
        
        const fusionMesh = new THREE.Mesh(fusionGeometry, fusionMaterial);
        fusionMesh.position.set(
          event.position.x * latticeConstant, 
          event.position.y * latticeConstant, 
          event.position.z * latticeConstant
        );
        
        scene.add(fusionMesh);
        objectsRef.current.push(fusionMesh);
      });
      
      console.log(`Added ${options.fusionEvents.length} fusion events`);
    }
    
    // Center the camera on the lattice
    const center = new THREE.Vector3(
      latticeSize * latticeConstant * 0.5,
      latticeSize * latticeConstant * 0.5,
      latticeSize * latticeConstant * 0.5
    );
    
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
    
    // Update visualization info
    setVisualizationInfo({
      totalAtoms: atomCount + deuteriumCount,
      latticeType: materialProps.structure,
      material: materialProps.name,
      temperature: temperature,
      fusionEvents: options.fusionEvents?.length || 0,
    });
    
    // Update legend items
    setLegendItems([
      {
        color: materialProps.color,
        label: `${materialProps.name} (Host Lattice)`,
      },
      {
        color: MATERIAL_PROPERTIES.deuterium.color,
        label: 'Deuterium',
      },
      ...(options.fusionEvents && options.fusionEvents.length > 0 
        ? [{ color: MATERIAL_PROPERTIES.fusion.color, label: 'Fusion Event' }] 
        : []),
    ]);
    
    console.log(`Lattice visualization complete with ${objectsRef.current.length} objects`);
  }, [clearVisualization, getThermalDisplacement]);

  /* VISUALIZATION HELPERS */

  const addGlowEffect = useCallback((position, color, size = 0.5) => {
    if (!glowTextureRef.current || !sceneRef.current) {
      // Create glow texture if it doesn't exist
      createGlowTexture();
      if (!glowTextureRef.current) return null;
    }
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: glowTextureRef.current,
      color: new THREE.Color(color),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(size, size, 1);
    sceneRef.current.add(sprite);
    glowSpritesRef.current.push(sprite);
    
    // Add to objects ref for cleanup
    objectsRef.current.push(sprite);
    
    return sprite;
  }, [createGlowTexture]);

  const addFusionEffect = useCallback((position, color = 0xffaa00, duration = 2.0) => {
    if (!sceneRef.current) return null;
    
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sceneRef.current.add(sphere);
    
    // Add to objects ref for cleanup
    objectsRef.current.push(sphere);
    
    timerRef.current.update();
    const startTime = timerRef.current.getElapsed();
    const fusionEffect = {
      mesh: sphere,
      startTime,
      duration,
      updateEffect: (currentTime) => {
        const elapsed = currentTime - startTime;
        if (elapsed > duration) {
          if (sceneRef.current) {
            sceneRef.current.remove(sphere);
          }
          // Clean up resources
          geometry.dispose();
          material.dispose();
          return false;
        }
        
        const scale = 1 + (elapsed / duration) * 2;
        sphere.scale.set(scale, scale, scale);
        
        material.opacity = 0.8 * (1 - (elapsed / duration));
        
        return true;
      }
    };
    
    fusionEffectsRef.current.push(fusionEffect);
    return fusionEffect;
  }, []);

  /* MAIN VISUALIZATION GENERATOR */
  const generateVisualizationFromData = useCallback((data, options = {}) => {
    if (!data) {
      console.warn("No data provided to generateVisualizationFromData");
      return generateLatticeVisualization(); // Fall back to default
    }
    
    console.log("Processing visualization data:", data);
    
    try {
      // Extract components from the data
      const {
        latticeData = {},
        fusionEvents = [],
        enhancementData = {}
      } = data;
      
      // Update lattice parameters based on data
      if (latticeData) {
        // Update lattice type if provided
        if (latticeData.type) {
          setLatticeType(latticeData.type);
        }
        
        // Update temperature if provided
        if (latticeData.temperature !== undefined) {
          setTemperature(latticeData.temperature);
        }
        
        // Update material if provided
        if (latticeData.material) {
          setLatticeMetalType(latticeData.material);
        }
      }
      
      // Generate base lattice visualization with the lattice data
      generateLatticeVisualization(latticeData.material || latticeMetalType, {
        temperature: latticeData.temperature || temperature,
        loading_ratio: latticeData.loading_ratio || 0.6,
        fusionEvents: fusionEvents
      });
      
      // Process enhancement data to update atom properties
      if (enhancementData && enhancementData.regions && enhancementData.regions.length > 0) {
        enhancementData.regions.forEach(region => {
          // Apply enhancement effects to the specified region
          if (region.coordinates && atomsRef.current) {
            const { x, y, z } = region.coordinates;
            
            // Find atoms in this region and enhance them
            atomsRef.current.forEach(atom => {
              // Simple distance check (can be improved for more complex regions)
              const distance = Math.sqrt(
                Math.pow(atom.position.x - x, 2) + 
                Math.pow(atom.position.y - y, 2) + 
                Math.pow(atom.position.z - z, 2)
              );
              
              if (distance < (region.radius || 2)) {
                // Enhance atom properties
                if (atom.material) {
                  atom.material.emissive = new THREE.Color(0x00ff00);
                  atom.material.emissiveIntensity = 0.5;
                  atom.scale.set(1.2, 1.2, 1.2);
                  
                  // Add glow effect if enabled
                  if (visualEffectsEnabled) {
                    addGlowEffect(atom.position, 0x00ff00, 0.5);
                  }
                }
              }
            });
          }
        });
      }
      
      // Process fusion events if not already processed in the lattice visualization
      if (fusionEvents && fusionEvents.length > 0 && !options.fusionEventsProcessed) {
        fusionEvents.forEach(event => {
          if (event.position || event.coordinates) {
            // Add fusion effect at the specified coordinates
            const position = event.position || event.coordinates;
            const fusionPosition = new THREE.Vector3(position.x, position.y, position.z);
            addFusionEffect(fusionPosition, 0xffaa00, 2.0);
          }
        });
      }
      
      // Update visualization information
      setVisualizationInfo({
        latticeType: latticeData.type || latticeType,
        material: latticeData.material || latticeMetalType,
        temperature: latticeData.temperature || temperature,
        totalAtoms: atomsRef.current.length,
        fusionEvents: fusionEvents?.length || 0,
        enhancedRegions: enhancementData.regions?.length || 0,
        timestamp: new Date().toLocaleTimeString()
      });
      
    } catch (error) {
      console.error("Error in generateVisualizationFromData:", error);
      setErrorMessage(`Error generating visualization: ${error.message}`);
      
      // Fall back to default visualization
      generateLatticeVisualization();
    }
  }, [
    addGlowEffect,
    addFusionEffect,
    generateLatticeVisualization, 
    setLatticeType, 
    setTemperature, 
    setLatticeMetalType, 
    latticeType, 
    latticeMetalType, 
    temperature,
    visualEffectsEnabled
  ]);

  // Process visualization data when it changes
  useEffect(() => {
    if (visualizationData) {
      console.log("Visualization data updated:", visualizationData);
      
      // Ensure data has the expected structure
      const formattedData = {
        latticeData: visualizationData.latticeData || {},
        fusionEvents: visualizationData.fusionEvents || visualizationData.fusionData?.events || [],
        enhancementData: visualizationData.enhancementData || {}
      };
      
      // Process data to generate visualization
      generateVisualizationFromData(formattedData);
    }
  }, [visualizationData, generateVisualizationFromData]);
  
  // WebGL Help Dialog - Provides guidance on enabling hardware acceleration
  const WebGLHelpDialog = ({ onClose }) => {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}
      >
        <Paper
          sx={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            p: 3,
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: 5
          }}
        >
          <Typography variant="h4" sx={{ mb: 2, color: 'primary.main' }}>
            Improving Visualization Performance
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your browser is using software rendering for WebGL, which can reduce performance and visual quality of the 3D visualization.
          </Typography>
          
          <Typography variant="h5" sx={{ mt: 3, mb: 1 }}>How to Enable Hardware Acceleration</Typography>
          
          <Typography variant="h6" sx={{ mt: 2 }}>Chrome</Typography>
          <ol>
            <li>Type <Typography component="span" fontWeight="bold">chrome://settings</Typography> in the address bar</li>
            <li>Scroll down and click <Typography component="span" fontWeight="bold">Advanced</Typography></li>
            <li>Under "System", make sure <Typography component="span" fontWeight="bold">Use hardware acceleration when available</Typography> is enabled</li>
            <li>Restart Chrome for changes to take effect</li>
          </ol>
          
          <Typography variant="h6" sx={{ mt: 2 }}>Firefox</Typography>
          <ol>
            <li>Type <Typography component="span" fontWeight="bold">about:preferences</Typography> in the address bar</li>
            <li>Scroll down to "Performance"</li>
            <li>Uncheck <Typography component="span" fontWeight="bold">Use recommended performance settings</Typography></li>
            <li>Check <Typography component="span" fontWeight="bold">Use hardware acceleration when available</Typography></li>
            <li>Restart Firefox for changes to take effect</li>
          </ol>
          
          <Typography variant="h6" sx={{ mt: 2 }}>Edge</Typography>
          <ol>
            <li>Type <Typography component="span" fontWeight="bold">edge://settings/system</Typography> in the address bar</li>
            <li>Make sure <Typography component="span" fontWeight="bold">Use hardware acceleration when available</Typography> is enabled</li>
            <li>Restart Edge for changes to take effect</li>
          </ol>
          
          <Typography variant="h5" sx={{ mt: 3, mb: 1 }}>Graphics Driver Issues</Typography>
          <Typography variant="body1" paragraph>
            If hardware acceleration is enabled but you're still seeing this warning, you may need to update your graphics drivers.
          </Typography>
          
          <Typography variant="h6" sx={{ mt: 2 }}>For Windows:</Typography>
          <ol>
            <li>Right-click on desktop and select "Display settings"</li>
            <li>Scroll down and click "Advanced display settings"</li>
            <li>Click "Display adapter properties"</li>
            <li>In the new window, click the "Properties" button</li>
            <li>Go to the "Driver" tab and click "Update Driver"</li>
          </ol>
          
          <Typography variant="h6" sx={{ mt: 2 }}>For Mac:</Typography>
          <Typography variant="body1" paragraph>
            macOS automatically updates graphics drivers with system updates. Ensure your macOS is up to date.
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Box
              component="button"
              onClick={onClose}
              sx={{
                py: 1,
                px: 2,
                backgroundColor: 'primary.main',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
              }}
            >
              Close
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Effect to handle quality changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    let particleMultiplier = 1.0;
    let useShadows = false;
    let useHighDetail = false;
    
    switch (visualizationQuality) {
      case "ultra":
        particleMultiplier = 2.0;
        useShadows = true;
        useHighDetail = true;
        break;
      case "high":
        particleMultiplier = 1.5;
        useShadows = true;
        useHighDetail = true;
        break;
      case "medium":
        particleMultiplier = 1.0;
        useShadows = false;
        useHighDetail = true;
        break;
      case "low":
        particleMultiplier = 0.5;
        useShadows = false;
        useHighDetail = false;
        break;
      case "auto":
      default:
        // Use settings based on detected performance
        const webGLCapabilities = detectWebGLCapabilities();
        const renderSettings = getOptimalRenderingSettings(webGLCapabilities);
        particleMultiplier = renderSettings.resolution === 'high' ? 1.5 : 
                             renderSettings.resolution === 'medium' ? 1.0 : 0.5;
        useShadows = renderSettings.useShadows;
        useHighDetail = renderSettings.resolution !== 'low';
        break;
    }
    
    // Update settings globally
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = useShadows;
      
      // Update light shadows
      sceneRef.current.traverse((object) => {
        if (object.isLight && object.shadow) {
          object.castShadow = useShadows;
        }
      });
    }
    
    // Store the current settings for other components to use
    const newRenderSettings = {
      particleMultiplier,
      useShadows,
      useHighDetail,
      qualityName: visualizationQuality
    };
    
    // Update state with new settings
    setRenderSettings(newRenderSettings);
    
    // If we have a current visualization, regenerate it with the new settings
    if (visualizationData || getVisualizationData) {
      // Clear existing visualization
      clearVisualization();
      
      // Regenerate with current data and new settings
      const currentData = visualizationData || getVisualizationData();
      if (currentData) {
        generateVisualizationFromData(currentData);
      } else {
        generateLatticeVisualization();
      }
    }
  }, [visualizationQuality, clearVisualization, generateVisualizationFromData, generateLatticeVisualization, getVisualizationData, visualizationData]);

  // Function to handle color formatting safely
  const formatColor = (color) => {
    if (typeof color === 'string') {
      // If it's already a hex string with #, return it
      if (color.startsWith('#')) {
        return color;
      }
      // Otherwise convert it to a proper hex color with #
      return `#${color}`;
    } else if (typeof color === 'number') {
      // Convert numeric color to hex string
      return `#${color.toString(16).padStart(6, '0')}`;
    }
    // Fallback for undefined or invalid colors
    return '#CCCCCC';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', position: 'relative' }}>
      {/* Main content container with visualization and info panel */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, flex: 1 }}>
        <Box sx={{ flex: '1 1 700px', minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <div
              ref={containerRef}
              style={{ width: '100%', height: '100%', minHeight: '400px', borderRadius: '8px', position: 'relative' }}
            />
            
            {/* Show error message if there's an error */}
            {error && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '80%',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  p: 3,
                  borderRadius: 2,
                  textAlign: 'center',
                  zIndex: 10,
                }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>Visualization Error</Typography>
                <Typography variant="body2">{error}</Typography>
                <Box sx={{ mt: 2 }}>
                  <Box
                    component="button"
                    onClick={() => setShowWebGLHelp(true)}
                    sx={{
                      py: 1,
                      px: 2,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      }
                    }}
                  >
                    Help & Troubleshooting
                  </Box>
                </Box>
              </Box>
            )}
            
            {/* Loading overlay */}
            {loading && (
              <LoadingOverlay>
                <CircularProgress color="primary" />
                <Typography sx={{ mt: 2, color: "white" }}>
                  Loading Visualization...
                </Typography>
              </LoadingOverlay>
            )}
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader title="Visualization Info" />
            <CardContent sx={{ overflowY: 'auto', flex: 1 }}>
              <List>
                <ListItem>
                  <ListItemText primary="Material" secondary={visualizationInfo.material || 'Unknown'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Lattice Structure" secondary={visualizationInfo.latticeType || 'Unknown'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Total Atoms" secondary={visualizationInfo.totalAtoms || 0} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Temperature" secondary={`${visualizationInfo.temperature || 0} K`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Fusion Events" secondary={visualizationInfo.fusionEvents || 0} />
                </ListItem>
              </List>
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Legend</Typography>
              <List>
                {legendItems.map((item, index) => (
                  <ListItem key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: formatColor(item.color),
                          marginRight: '8px',
                          border: '1px solid rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Typography variant="body2">{item.label}</Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoOutlined sx={{ mr: 1, fontSize: 'small' }} />
                  Use mouse to rotate, scroll to zoom, and right-click to pan
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      {/* Visualization quality and footer section */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          <Box sx={{ flex: '1 1 auto', maxWidth: '400px' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Visualization Quality</Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="visualization-quality-label" htmlFor="visualization-quality-select-input">Quality</InputLabel>
              <Select
                labelId="visualization-quality-label"
                id="visualization-quality-select"
                name="visualization-quality"
                value={visualizationQuality}
                label="Quality"
                onChange={(e) => setVisualizationQuality(e.target.value)}
                aria-label="Select visualization quality"
                inputProps={{
                  id: 'visualization-quality-select-input',
                  name: 'visualization-quality-input'
                }}
              >
                <MenuItem value="auto" id="quality-option-auto">Auto (based on your device)</MenuItem>
                <MenuItem value="ultra" id="quality-option-ultra">Ultra (highest quality, may be slow)</MenuItem>
                <MenuItem value="high" id="quality-option-high">High (better quality)</MenuItem>
                <MenuItem value="medium" id="quality-option-medium">Medium (balanced)</MenuItem>
                <MenuItem value="low" id="quality-option-low">Low (fastest performance)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
              Lower quality improves performance on slower devices
            </Typography>
          </Box>
        </Box>
      </Card>
      
      {/* WebGL Help Dialog */}
      {showWebGLHelp && <WebGLHelpDialog onClose={() => setShowWebGLHelp(false)} />}
    </Box>
  );
};

UnifiedLENRVisualizer.propTypes = {
  visualizationData: PropTypes.shape({
    latticeData: PropTypes.object,
    fusionData: PropTypes.object,
    enhancementData: PropTypes.object,
  }),
  showLattice: PropTypes.bool,
  showFusion: PropTypes.bool,
  showEnhancement: PropTypes.bool,
  loading: PropTypes.bool,
};

// Export the component wrapped with the ErrorBoundary
export default function WrappedUnifiedLENRVisualizer(props) {
  return (
    <ErrorBoundary fallback={<div>Failed to load LENR visualization. There was an error initializing the physics visualizer.</div>}>
      <UnifiedLENRVisualizer {...props} />
    </ErrorBoundary>
  );
}
