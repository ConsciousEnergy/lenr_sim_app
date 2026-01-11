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
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { InfoOutlined } from '@mui/icons-material';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { usePhysics } from "../../contexts/PhysicsContext";
import { ErrorBoundary } from "../ErrorBoundary";
import type {
  WebGLCapabilities,
  RenderSettings,
  MaterialProperties,
  LENRColors,
  LegendItem,
  VisualizationInfo,
  PlaybackControls,
  InternalRenderSettings,
  ReactionEvent,
  EnhancementRegion,
  EnhancementData,
  LatticeData,
  FusionData,
  VisualizationData,
  UnifiedLENRVisualizerProps,
  WebGLHelpDialogProps,
  FPSCounter,
  AnimationFrameRef,
  FusionEffect,
  ThreeScene,
  ThreeCamera,
  ThreeRenderer,
  ThreeControls,
  ThreeComposer,
  ThreeBloomPass,
  ThreeObject3D,
  ThreeMesh,
  ThreeLight,
  ThreeClock,
  ThreeTexture,
  ThreeSprite,
  ThreeVector3,
  ThreeColor,
  UnifiedLENRVisualizerState
} from "./interfaces";

// Remove references to non-existent Typography components
// Create styled Typography components instead
const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
}));

const StyledText = styled(Typography)({});

// Performance optimization - throttle function
const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): T => {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  } as T;
};

// Define LENR color theme (from v1)
const LENR_COLORS: LENRColors = {
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

const LegendItemContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(1),
  "&:last-child": {
    marginBottom: 0,
  },
}));

const LegendColor = styled(Box)<{ color: string }>(({ color }) => ({
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
const MATERIAL_PROPERTIES: MaterialProperties = {
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

// WebGL capability detection
const detectWebGLCapabilities = (): WebGLCapabilities => {
  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  
  const result: WebGLCapabilities = {
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
    version: '1.0',
    tier: 'low'
  };

  try {
    // Try WebGL2 first
    const gl2Context = canvas.getContext('webgl2');
    if (gl2Context) {
      gl = gl2Context;
      result.webgl2 = true;
      result.version = '2.0';
    } else {
      // Fall back to WebGL1
      const gl1Context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl1Context instanceof WebGLRenderingContext) {
        gl = gl1Context;
      }
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
    result.maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as [number, number];
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
    result.extensions = gl.getSupportedExtensions() || [];
    
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
const getOptimalRenderingSettings = (capabilities: WebGLCapabilities): RenderSettings => {
  const settings: RenderSettings = {
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
    useHighQualityBloom: false,
    useShadows: true,
    resolution: 'medium'
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
    settings.useShadows = false;
    settings.resolution = 'low';
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
    settings.useShadows = false;
    settings.resolution = 'low';
    return settings;
  }

  // Medium tier settings
  if (capabilities.tier === 'medium') {
    settings.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    settings.shadowMapType = THREE.PCFShadowMap;
    settings.maxLights = 4;
    settings.useShadows = true;
    settings.resolution = 'medium';
    return settings;
  }

  // High tier settings
  if (capabilities.tier === 'high') {
    settings.useSoftParticles = true;
    settings.useHighQualityBloom = true;
    settings.useHDR = capabilities.webgl2;
    settings.maxLights = 8;
    settings.useShadows = true;
    settings.resolution = 'high';
    return settings;
  }

  return settings;
};

// WebGL Help Dialog Component
const WebGLHelpDialog: React.FC<WebGLHelpDialogProps> = ({ onClose }) => {
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
          <Button 
            variant="contained" 
            color="primary" 
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

/**
 * Unified LENR Visualizer component
 */
const UnifiedLENRVisualizer: React.FC<UnifiedLENRVisualizerProps> = ({
  visualizationData,
  showLattice: initialShowLattice = true,
  showFusion: initialShowFusion = true,
  showEnhancement: initialShowEnhancement = true,
  loading = false,
}) => {
  // Use the PhysicsContext via the usePhysics hook
  const physicsData = usePhysics();

  // REF DECLARATIONS - keep all refs at the top with proper typing
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const fpsCounterRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: 0 });
  const objectsRef = useRef<THREE.Object3D[]>([]);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const frameCountRef = useRef<number>(0);
  const timeSinceLastFpsRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const timeseriesDataRef = useRef<any | null>(null);
  const atomsRef = useRef<THREE.Mesh[]>([]);
  const edgesRef = useRef<THREE.Line[]>([]);
  const latticeMeshRef = useRef<THREE.Mesh | null>(null);
  const glowTextureRef = useRef<THREE.Texture | null>(null);
  const glowSpritesRef = useRef<THREE.Sprite[]>([]);
  const fusionEffectsRef = useRef<FusionEffect[]>([]);
  const deviceCapabilitiesRef = useRef<WebGLCapabilities>({
    supported: false,
    hardwareAccelerated: false,
    webgl2: false,
    renderer: '',
    vendor: '',
    maxTextureSize: 0,
    maxCubeMapSize: 0,
    maxViewportDims: [0, 0],
    maxRenderbufferSize: 0,
    precision: 'unknown',
    extensions: [],
    version: '1.0',
    tier: 'low'
  });
  // Add post-processing refs
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  // STATE DECLARATIONS - keep all state declarations together with proper typing
  // State for visualization objects
  const [latticeObjects, setLatticeObjects] = useState<THREE.Object3D[]>([]);
  const [fusionObjects, setFusionObjects] = useState<THREE.Object3D[]>([]);
  const [enhancementObjects, setEnhancementObjects] = useState<THREE.Object3D[]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackControls, setPlaybackControls] = useState<{
    totalFrames: number;
    startTime: number;
    endTime: number;
    timeUnit: string;
  }>({
    totalFrames: 0,
    startTime: 0,
    endTime: 0,
    timeUnit: 'ns',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('light');
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // State for rendering info
  const [fps, setFps] = useState<number>(0);
  const [particleCount, setParticleCount] = useState<number>(0);
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([]);
  const [visualizationInfo, setVisualizationInfo] = useState<VisualizationInfo>({
    totalAtoms: 0,
    latticeType: '',
    temperature: 0,
    fusionEvents: 0,
  });

  // UI Controls - visualization options
  const [showLattice, setShowLattice] = useState<boolean>(initialShowLattice);
  const [showFusion, setShowFusion] = useState<boolean>(initialShowFusion);
  const [showEnhancement, setShowEnhancement] = useState<boolean>(
    initialShowEnhancement,
  );
  const [showControls, setShowControls] = useState<boolean>(true);

  // UI Controls - other parameters
  const [latticeSize, setLatticeSize] = useState<number>(1.0);
  const [reactionIntensity, setReactionIntensity] = useState<number>(1.0);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.0);
  const [latticeType, setLatticeType] = useState<string>('FCC');
  const [temperature, setTemperature] = useState<number>(300);
  const [latticeMetalType, setLatticeMetalType] = useState<string>('palladium');
  const [visualEffectsEnabled, setVisualEffectsEnabled] = useState<boolean>(true);

  // Performance optimization - device capability detection
  const [devicePerformance, setDevicePerformance] = useState<string>("medium");
  
  // Add state for help dialog
  const [showWebGLHelp, setShowWebGLHelp] = useState<boolean>(false);
  
  // UI Controls - visualization quality
  const [visualizationQuality, setVisualizationQuality] = useState<string>(() => {
    // Detect capabilities at initialization time
    const caps = detectWebGLCapabilities();
    return caps.hardwareAccelerated ? "auto" : "low";
  });
  
  // Add state for render settings that can be used by visualization functions
  const [renderSettings, setRenderSettings] = useState<{
    particleMultiplier: number;
    useShadows: boolean;
    useHighDetail: boolean;
    qualityName: string;
  }>({
    particleMultiplier: 1.0,
    useShadows: false,
    useHighDetail: true,
    qualityName: 'auto'
  });
  
  // State for internal visualization data
  const [internalVisualizationData, setInternalVisualizationData] = useState<VisualizationData | null>(null);

  // This is a partial implementation to demonstrate TypeScript integration
  // The full component would have all the functionality of the original component
  // Additional methods and effects would be implemented here with proper TypeScript types

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            TypeScript Implementation in Progress
          </Typography>
          <Typography>
            This is a TypeScript version of the UnifiedLENRVisualizer component with proper typing.
            The implementation is in progress following the incremental conversion plan.
          </Typography>
          
          {error && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
              <Typography fontWeight="bold">Error:</Typography>
              <Typography>{error}</Typography>
              <Button 
                variant="contained" 
                color="inherit" 
                size="small" 
                sx={{ mt: 1 }}
                onClick={() => setShowWebGLHelp(true)}
              >
                Show Help
              </Button>
            </Box>
          )}

          {showWebGLHelp && (
            <WebGLHelpDialog onClose={() => setShowWebGLHelp(false)} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Export the component wrapped with the ErrorBoundary
export default function WrappedUnifiedLENRVisualizer(props: UnifiedLENRVisualizerProps) {
  return (
    <ErrorBoundary fallback={<div>Failed to load LENR visualization. There was an error initializing the physics visualizer.</div>}>
      <UnifiedLENRVisualizer {...props} />
    </ErrorBoundary>
  );
} 