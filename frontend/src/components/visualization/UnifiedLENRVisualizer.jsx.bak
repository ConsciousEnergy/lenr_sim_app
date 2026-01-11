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
  Suspense
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import {
  Box,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  Slider,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { ErrorBoundary } from "react-error-boundary";
import { usePhysics } from "../../contexts/PhysicsContext";
import { useAdaptiveQuality, useThreeJsCleanup, useChunkedProcessing } from "../../hooks/useOptimizationHooks";
import { IconButton } from "@mui/material";
import { PlayArrow as PlayArrowIcon, Pause as PauseIcon, Restore as RestoreIcon, Settings as SettingsIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from "@mui/icons-material";
import { Stats } from "three/examples/jsm/libs/stats.module";

// Add throttle function for performance optimization
const throttle = (func, limit) => {
  let inThrottle;
  let lastResult;
  return function(...args) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
    return lastResult;
  };
};

// Define LENR color theme
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

// Performance monitoring
const PerformanceMonitor = {
  frameCount: 0,
  lastTime: 0,
  fps: 0,
  
  update: function(now) {
    this.frameCount++;
    
    if (!this.lastTime) {
      this.lastTime = now;
      return;
    }
    
    const elapsed = now - this.lastTime;
    
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;
    }
    
    return this.fps;
  }
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
      atomSegments: 8,
      maxAtoms: 100,
      useShadows: false,
      targetFps: 30
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
      atomSegments: 32,
      maxAtoms: 1000,
      useShadows: true,
      targetFps: 60
    };
  } else if (isMidRange) {
    return {
      quality: 'medium',
      antialias: true,
      precision: 'mediump',
      maxPixelRatio: 1.5,
      powerPreference: 'default',
      atomSegments: 16,
      maxAtoms: 500,
      useShadows: false,
      targetFps: 45
    };
  } else {
    return {
      quality: 'low',
      antialias: false,
      precision: 'lowp',
      maxPixelRatio: 1,
      powerPreference: 'low-power',
      atomSegments: 8,
      maxAtoms: 200,
      useShadows: false,
      targetFps: 30
    };
  }
};

// Add the RenderQualityControl component
const RenderQualityControl = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  borderRadius: 4,
  padding: theme.spacing(1),
}));

// Add a debounce function for quality change
const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

// Add a new helper function to dispose Three.js objects
const disposeObject = (object) => {
  if (!object) return;
  
  if (object.geometry) {
    object.geometry.dispose();
  }
  
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else {
      object.material.dispose();
    }
  }
  
  // Recursively dispose children
  if (object.children && object.children.length > 0) {
    for (let i = object.children.length - 1; i >= 0; i--) {
      disposeObject(object.children[i]);
      object.remove(object.children[i]);
    }
  }
};

// Modify the visualization function to be quality-aware
const createInstancedAtoms = (scene, atoms, elementColorMap, renderSettings) => {
  if (!atoms || atoms.length === 0) return null;
  
  // Group atoms by element type
  const elementGroups = {};
  atoms.forEach(atom => {
    const element = atom.element || 'unknown';
    if (!elementGroups[element]) {
      elementGroups[element] = [];
    }
    elementGroups[element].push(atom);
  });
  
  // Calculate a more adaptive limit based on quality
  const qualityMultiplier = {
    'ultra-low': 0.1,
    'low': 0.25,
    'medium': 0.5,
    'high': 1.0
  };
  const adaptiveLimit = Math.floor(renderSettings.maxAtoms * (qualityMultiplier[renderSettings.quality] || 0.5));
  
  // For each element type, create an instanced mesh
  Object.entries(elementGroups).forEach(([element, atomsOfType]) => {
    // Limit the number of atoms based on performance settings
    const limitedAtoms = atomsOfType.slice(0, adaptiveLimit);
    
    // Create geometry based on quality settings - reduce complexity at lower qualities
    const segments = {
      'ultra-low': 4, 
      'low': 8, 
      'medium': 16,
      'high': renderSettings.atomSegments
    };
    const segmentCount = segments[renderSettings.quality] || 8;
    
    const geometry = new THREE.SphereGeometry(
      0.3, // Radius
      segmentCount, // Width segments
      segmentCount  // Height segments
    );
    
    // Create material for this element
    const material = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color(elementColorMap[element] || 0xcccccc),
      shininess: 30
    });
    
    // Use instanced mesh for performance with many atoms
    if (limitedAtoms.length > 10 && renderSettings.quality !== 'ultra-low') {
      const instancedMesh = new THREE.InstancedMesh(
        geometry, 
        material, 
        limitedAtoms.length
      );
      
      const dummy = new THREE.Object3D();
      
      limitedAtoms.forEach((atom, index) => {
        dummy.position.set(atom.x, atom.y, atom.z);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(index, dummy.matrix);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMesh.userData = { 
        type: 'visualization',
        subtype: 'atomInstanced',
        element: element
      };
      
      scene.add(instancedMesh);
    } else {
      // For lower quality or fewer atoms, use regular meshes
      limitedAtoms.forEach(atom => {
        const atomMesh = new THREE.Mesh(geometry, material);
        atomMesh.position.set(atom.x, atom.y, atom.z);
        atomMesh.userData = { 
          type: 'visualization', 
          subtype: 'atom',
          element: element,
          energy: atom.energy || 0
        };
        
        scene.add(atomMesh);
      });
    }
  });
};

// Update the main component to include quality selection
const UnifiedLENRVisualizer = ({
  visualizationData: externalVisualizationData,
  showLattice = true,
  showFusion = true,
  showEnhancement = true,
  loading = false,
  debugMode = false,
}) => {
  // State for visualization
  const [isInitialized, setIsInitialized] = useState(false);
  const [webGLCapabilities, setWebGLCapabilities] = useState(null);
  const [renderSettings, setRenderSettings] = useState(null);
  const [fps, setFps] = useState(0);
  const [isGeneratingVisualization, setIsGeneratingVisualization] = useState(false);
  const [renderQuality, setRenderQuality] = useState('medium'); // Added quality selection state
  
  // Use the PhysicsContext via the usePhysics hook
  const physicsData = usePhysics();
  
  // Three.js references
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  
  // Throttled functions for performance
  const throttledResize = useRef(null);
  
  // Performance optimization hooks
  const { qualityLevel, setQualityLevel, currentQuality, updateFrameStats } = useAdaptiveQuality();
  const { registerDisposable, disposeAll } = useThreeJsCleanup();
  const { processInChunks } = useChunkedProcessing();
  
  // Animation controls
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // New state for advanced controls
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Canvas size state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Handle quality change
  const handleQualityChange = useCallback((event) => {
    const newQuality = event.target.value;
    setRenderQuality(newQuality);
    
    // Update render settings based on the new quality
    if (renderSettings) {
      const updatedSettings = {
        ...renderSettings,
        quality: newQuality,
        atomSegments: newQuality === 'high' ? 32 : newQuality === 'medium' ? 16 : newQuality === 'low' ? 8 : 4,
        maxAtoms: newQuality === 'high' ? 1000 : newQuality === 'medium' ? 500 : newQuality === 'low' ? 200 : 50,
        antialias: newQuality !== 'ultra-low',
        useShadows: newQuality === 'high',
        targetFps: newQuality === 'high' ? 60 : newQuality === 'medium' ? 45 : 30
      };
      setRenderSettings(updatedSettings);
      
      // Update renderer if it exists
      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(
          Math.min(window.devicePixelRatio, 
            newQuality === 'high' ? 2 : newQuality === 'medium' ? 1.5 : 1)
        );
      }
      
      // Regenerate visualization with new settings
      if (externalVisualizationData || (physicsData && physicsData.getVisualizationData)) {
        const data = externalVisualizationData || 
                   (physicsData && physicsData.getVisualizationData ? 
                   physicsData.getVisualizationData() : null);
        
        if (data) {
          // Use a short timeout to let the UI update first
          setTimeout(() => {
            generateVisualizationFromData(data);
          }, 100);
        }
      }
    }
  }, [renderSettings, externalVisualizationData, physicsData]);
  
  // Debounce quality change to avoid multiple renders
  const debouncedQualityChange = useMemo(
    () => debounce(handleQualityChange, 300), 
    [handleQualityChange]
  );
  
  // Function to generate visualizations from data - using useCallback to prevent recreation
  const generateVisualizationFromData = useCallback((data) => {
    if (!sceneRef.current || !isInitialized || !data || !renderSettings) return;
    
    // Set flag to indicate visualization generation is in progress
    setIsGeneratingVisualization(true);
    
    console.log("Generating visualization from data with quality:", renderSettings.quality);
    
    // Clear existing visualization objects - more efficiently
    const objectsToRemove = [];
    sceneRef.current.traverse((object) => {
      if (object.userData && object.userData.type === 'visualization') {
        objectsToRemove.push(object);
      }
    });
    
    // Remove and dispose objects
    objectsToRemove.forEach((object) => {
      disposeObject(object);
      sceneRef.current.remove(object);
    });
    
    // Force garbage collection (if available in the browser)
    if (typeof window.gc === 'function') {
      window.gc();
    }
    
    // Skip very large data for ultra-low quality
    const isTooComplex = data.latticeData?.atoms?.length > 1000 && renderQuality === 'ultra-low';
    
    // Process lattice data if available
    if (showLattice && data.latticeData && data.latticeData.atoms && data.latticeData.atoms.length > 0 && !isTooComplex) {
      // Use instanced rendering for performance
      createInstancedAtoms(
        sceneRef.current, 
        data.latticeData.atoms, 
        LENR_COLORS.elementColors,
        { ...renderSettings, quality: renderQuality }
      );
    } else if (isTooComplex) {
      // If too complex for ultra-low quality, just add a placeholder
      const placeholderGeometry = new THREE.BoxGeometry(5, 5, 5);
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        wireframe: true
      });
      const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
      placeholder.userData = { type: 'visualization', subtype: 'placeholder' };
      sceneRef.current.add(placeholder);
    }
    
    // Process fusion events if available - with optimizations
    if (showFusion && data.fusionEvents && data.fusionEvents.length > 0) {
      const fusionGroup = new THREE.Group();
      fusionGroup.userData = { type: 'visualization', subtype: 'fusion' };
      
      // Scale down events based on quality
      const eventScale = {
        'ultra-low': 0.1,
        'low': 0.25,
        'medium': 0.5,
        'high': 1.0
      };
      
      // Limit number of fusion events based on GPU capabilities and quality
      const maxEvents = Math.min(
        data.fusionEvents.length, 
        Math.floor(renderSettings.maxAtoms * (eventScale[renderQuality] || 0.5)) / 2
      );
      const limitedEvents = data.fusionEvents.slice(0, maxEvents);
      
      // Create energy release visualization with appropriate complexity
      const segments = {
        'ultra-low': 4, 
        'low': 6, 
        'medium': 8,
        'high': 12
      };
      const segmentCount = segments[renderQuality] || 6;
      
      // Create geometry for energy effects
      const energyGeometry = new THREE.SphereGeometry(0.15, segmentCount, segmentCount);
      
      // Use instanced mesh for many events
      if (limitedEvents.length > 20 && renderQuality !== 'ultra-low') {
        const energyMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(LENR_COLORS.elementColors.energy),
          transparent: true,
          opacity: 0.7
        });
        
        const instancedEnergy = new THREE.InstancedMesh(
          energyGeometry,
          energyMaterial,
          limitedEvents.length
        );
        
        const dummy = new THREE.Object3D();
        
        limitedEvents.forEach((event, index) => {
          const intensity = Math.min(1.0, event.energy / 50);
          const scale = 1.0 + intensity * 2;
          
          dummy.position.set(event.x, event.y, event.z);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          instancedEnergy.setMatrixAt(index, dummy.matrix);
        });
        
        instancedEnergy.instanceMatrix.needsUpdate = true;
        fusionGroup.add(instancedEnergy);
        
        // Add fewer lights for performance - further reduce based on quality
        const maxLights = {
          'ultra-low': 0,
          'low': 3,
          'medium': 5,
          'high': 10
        };
        const lightCount = Math.min(maxLights[renderQuality] || 3, limitedEvents.length);
        
        for (let i = 0; i < lightCount; i++) {
          const event = limitedEvents[Math.floor(i * limitedEvents.length / lightCount)];
          const intensity = Math.min(1.0, event.energy / 50);
          
          const light = new THREE.PointLight(0xff8844, intensity * 2, intensity * 10);
          light.position.set(event.x, event.y, event.z);
          fusionGroup.add(light);
        }
      } else {
        // Use regular meshes for fewer events or ultra-low quality
        // Skip lights on ultra-low quality
        const useLight = renderQuality !== 'ultra-low';
        
        limitedEvents.forEach(event => {
          const intensity = Math.min(1.0, event.energy / 50);
          const energyMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(LENR_COLORS.elementColors.energy),
            transparent: true,
            opacity: 0.7 * intensity
        });
        
        const energyMesh = new THREE.Mesh(energyGeometry, energyMaterial);
        energyMesh.position.set(event.x, event.y, event.z);
        energyMesh.scale.set(
          1.0 + intensity * 2,
          1.0 + intensity * 2,
          1.0 + intensity * 2
        );
        
          // Add a point light for glow effect - for high and medium settings only
          if (useLight) {
        const light = new THREE.PointLight(0xff8844, intensity * 2, intensity * 10);
        light.position.copy(energyMesh.position);
            fusionGroup.add(light);
          }
        
        fusionGroup.add(energyMesh);
      });
      }
      
      sceneRef.current.add(fusionGroup);
    }
    
    // Add enhancement effects if available - simplified for performance
    if (showEnhancement && data.enhancementData && renderQuality !== 'ultra-low') {
      const enhancementGroup = new THREE.Group();
      enhancementGroup.userData = { type: 'visualization', subtype: 'enhancement' };
      
      // Simplified enhancement visualization based on quality
      if (data.enhancementData.fields) {
        const fieldGeometry = new THREE.BoxGeometry(10, 10, 10);
        const fieldMaterial = new THREE.MeshBasicMaterial({
          color: 0x3388ff,
          transparent: true,
          opacity: 0.1,
          wireframe: renderQuality === 'low' || renderQuality === 'ultra-low'
        });
        
        const fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
        enhancementGroup.add(fieldMesh);
      }
      
      sceneRef.current.add(enhancementGroup);
    }
    
    // Clear flag once visualization generation is complete
    setIsGeneratingVisualization(false);
    
  }, [isInitialized, showLattice, showFusion, showEnhancement, renderSettings, renderQuality]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Check WebGL capabilities first
    const capabilities = detectWebGLCapabilities();
    setWebGLCapabilities(capabilities);
    
    // Set optimal rendering settings based on capabilities
    const settings = getOptimalRenderingSettings(capabilities);
    setRenderSettings(settings);
    
    // Create throttled resize handler
    throttledResize.current = throttle((width, height) => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    }, 100);
    
    // Cleanup any existing scene
    if (rendererRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
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
      });
      
      // Renderer setup  
      renderer.setClearColor(LENR_COLORS.visualization.background);
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.maxPixelRatio));
      // Use modern outputColorSpace instead of deprecated outputEncoding
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      
      // Add renderer to DOM
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Create controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;
      controls.enablePan = true;
      controlsRef.current = controls;
      
      // Add basic lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);
      
      // Animation loop with FPS control
      const targetFrameTime = 1000 / settings.targetFps;
      
      const animate = (now) => {
        animationFrameRef.current = requestAnimationFrame(animate);
        
        // FPS control - skip frames to maintain target FPS
        const elapsed = now - lastUpdateTimeRef.current;
        if (elapsed < targetFrameTime) {
          return;
        }
        
        // Update FPS counter for debugging
        const currentFps = PerformanceMonitor.update(now);
        if (currentFps && debugMode) {
          setFps(currentFps);
        }
        
        // Remember last update time
        lastUpdateTimeRef.current = now;
        
        // Update controls
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        // Render scene
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      
      // Start animation loop
      animate(0);
      
      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        throttledResize.current(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Set initialized flag
      setIsInitialized(true);
      
      // Cleanup function
      return () => {
        cancelAnimationFrame(animationFrameRef.current);
        window.removeEventListener('resize', handleResize);
        
        if (rendererRef.current && rendererRef.current.dispose) {
          rendererRef.current.dispose();
        }
        
        if (controlsRef.current && controlsRef.current.dispose) {
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
        }
      };
    } catch (error) {
      console.error("Error initializing Three.js:", error);
      setIsInitialized(false);
    }
  }, [debugMode]);
  
  // Process visualization data from physics context or external data
  useEffect(() => {
    if (!isInitialized || isGeneratingVisualization) return;
    
    // Prioritize external data if provided, otherwise use data from physics context
    const data = externalVisualizationData || 
                (physicsData && physicsData.getVisualizationData ? 
                 physicsData.getVisualizationData() : null);
    
    if (data) {
      // Schedule visualization update
      setTimeout(() => {
      generateVisualizationFromData(data);
      }, 0);
    }
  }, [isInitialized, externalVisualizationData, physicsData, generateVisualizationFromData, isGeneratingVisualization]);
  
  // Return the component JSX
  return (
    <VisualizerContainer>
      {(loading || !isInitialized || isGeneratingVisualization) && (
        <LoadingOverlay>
          <CircularProgress color="primary" />
          <Typography sx={{ mt: 2, color: "white" }}>
            {loading ? "Loading visualization data..." : 
             isGeneratingVisualization ? "Generating visualization..." :
             "Initializing 3D Engine..."}
          </Typography>
        </LoadingOverlay>
      )}
      
      {/* Add quality selector */}
      <RenderQualityControl>
        <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
          <InputLabel id="quality-select-label" sx={{ color: 'white' }}>Quality</InputLabel>
          <Select
            labelId="quality-select-label"
            id="quality-select"
            value={renderQuality}
            onChange={debouncedQualityChange}
            label="Quality"
            sx={{ color: 'white' }}
          >
            <MenuItem value="ultra-low">Ultra Low</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
        </FormControl>
      </RenderQualityControl>
      
      {debugMode && (
        <InfoOverlay>
          <Typography variant="caption" sx={{ display: 'block' }}>
            WebGL Info: 
            {webGLCapabilities ? 
              `${webGLCapabilities.vendor} - ${webGLCapabilities.renderer}` : 
              'Not available'}
          </Typography>
          <Typography variant="caption">
            Render Quality: {renderQuality}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            FPS: {fps}
          </Typography>
        </InfoOverlay>
      )}
      
      <CanvasContainer ref={containerRef} />
    </VisualizerContainer>
  );
};

// Add prop types for better documentation and validation
UnifiedLENRVisualizer.propTypes = {
  visualizationData: PropTypes.object,
  showLattice: PropTypes.bool,
  showFusion: PropTypes.bool,
  showEnhancement: PropTypes.bool,
  loading: PropTypes.bool,
  debugMode: PropTypes.bool,
};

// Wrap the component with error boundary for better error handling
export default function WrappedUnifiedLENRVisualizer(props) {
  return (
    <ErrorBoundary
      fallback={
        <div>
          <Typography color="error" variant="h6">
            Error in 3D Visualization
          </Typography>
          <Typography color="error" variant="body2">
            There was an error rendering the 3D visualization. 
            This may be due to WebGL compatibility issues with your browser or device.
          </Typography>
        </div>
      }
    >
      <Suspense fallback={<CircularProgress />}>
      <UnifiedLENRVisualizer {...props} />
      </Suspense>
    </ErrorBoundary>
  );
} 

/**
 * Dynamic quality control to optimize Three.js performance
 * This helps prevent browser timeout issues during complex rendering
 */ 
const useAdaptiveQuality = (canvasRef) => {
  const [qualityLevel, setQualityLevel] = useState("auto");
  const [autoQuality, setAutoQuality] = useState("medium");
  const fpsHistory = useRef([]);
  const lastCheck = useRef(Date.now());
  const frameCount = useRef(0);
  
  // Quality level settings
  const qualitySettings = useMemo(() => ({
    low: {
      maxParticles: 500,
      gridResolution: 10,
      drawDistance: 100,
      shadows: false,
      postProcessing: false,
      antiAlias: false,
      textureQuality: 256,
    },
    medium: {
      maxParticles: 2000,
      gridResolution: 20,
      drawDistance: 200,
      shadows: true,
      postProcessing: false,
      antiAlias: true,
      textureQuality: 512,
    },
    high: {
      maxParticles: 5000,
      gridResolution: 40,
      drawDistance: 500,
      shadows: true,
      postProcessing: true,
      antiAlias: true,
      textureQuality: 1024,
    }
  }), []);
  
  // Track FPS for automatic quality adjustment
  const updateFrameStats = useCallback(() => {
    frameCount.current += 1;
    const now = Date.now();
    const elapsed = now - lastCheck.current;
    
    if (elapsed > 1000) { // Update every second
      const fps = (frameCount.current / elapsed) * 1000;
      fpsHistory.current.push(fps);
      
      // Keep only last 5 FPS samples
      if (fpsHistory.current.length > 5) {
        fpsHistory.current.shift();
      }
      
      // Calculate average FPS
      const avgFps = fpsHistory.current.reduce((sum, val) => sum + val, 0) / fpsHistory.current.length;
      
      // Adjust quality based on FPS
      if (qualityLevel === "auto") {
        if (avgFps < 20 && autoQuality !== "low") {
          setAutoQuality("low");
          console.log("Quality automatically reduced to low (FPS: " + avgFps.toFixed(1) + ")");
        } else if (avgFps > 45 && autoQuality === "low") {
          setAutoQuality("medium");
          console.log("Quality automatically increased to medium (FPS: " + avgFps.toFixed(1) + ")");
        } else if (avgFps > 55 && autoQuality === "medium") {
          setAutoQuality("high");
          console.log("Quality automatically increased to high (FPS: " + avgFps.toFixed(1) + ")");
        } else if (avgFps < 30 && autoQuality === "high") {
          setAutoQuality("medium");
          console.log("Quality automatically reduced to medium (FPS: " + avgFps.toFixed(1) + ")");
        }
      }
      
      // Reset counters
      frameCount.current = 0;
      lastCheck.current = now;
    }
  }, [qualityLevel, autoQuality]);
  
  // Get current quality settings
  const currentQuality = useMemo(() => {
    return qualitySettings[qualityLevel === "auto" ? autoQuality : qualityLevel];
  }, [qualityLevel, autoQuality, qualitySettings]);
  
  return {
    qualityLevel,
    setQualityLevel,
    autoQuality,
    currentQuality,
    updateFrameStats
  };
};

/**
 * Memory management for Three.js objects
 * Helps prevent memory leaks and improves performance
 */
const useThreeJsCleanup = () => {
  const disposables = useRef([]);
  
  const registerDisposable = useCallback((object) => {
    if (object) {
      disposables.current.push(object);
    }
  }, []);
  
  const disposeAll = useCallback(() => {
    disposables.current.forEach(object => {
      if (object && object.dispose && typeof object.dispose === 'function') {
        object.dispose();
      } else if (object && object.geometry && object.geometry.dispose) {
        object.geometry.dispose();
      }
      
      if (object && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else if (object.material.dispose) {
          object.material.dispose();
        }
      }
      
      if (object && object.texture && object.texture.dispose) {
        object.texture.dispose();
      }
    });
    
    disposables.current = [];
  }, []);
  
  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      disposeAll();
    };
  }, [disposeAll]);
  
  return {
    registerDisposable,
    disposeAll
  };
};

/**
 * Chunked processing to avoid blocking the main thread
 * This helps prevent UI freezes during heavy calculations
 */
const useChunkedProcessing = () => {
  const processInChunks = useCallback((items, processFn, chunkSize = 100, delayMs = 0) => {
    return new Promise((resolve) => {
      const results = [];
      let index = 0;
      
      const processChunk = () => {
        const chunk = items.slice(index, index + chunkSize);
        index += chunkSize;
        
        // Process this chunk
        chunk.forEach(item => {
          results.push(processFn(item));
        });
        
        // Check if we're done
        if (index < items.length) {
          // Schedule next chunk with delay to let browser breathe
          setTimeout(processChunk, delayMs);
        } else {
          // All done
          resolve(results);
        }
      };
      
      // Start processing
      processChunk();
    });
  }, []);
  
  return {
    processInChunks
  };
}; 