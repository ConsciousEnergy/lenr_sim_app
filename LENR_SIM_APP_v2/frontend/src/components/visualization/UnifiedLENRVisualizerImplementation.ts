import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import {
  WebGLCapabilities,
  RenderSettings,
  FusionEffect,
} from "./interfaces";

/**
 * Adds lighting to a Three.js scene
 * @param scene - The Three.js scene to add lighting to
 * @param isDarkMode - Whether the current theme is dark mode
 * @returns Object containing references to the created lights
 */
export const addLighting = (scene: THREE.Scene, isDarkMode: boolean): Record<string, THREE.Light> => {
  // Remove any existing lights
  scene.children.forEach(child => {
    if ((child as THREE.Light).isLight) {
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
    // Use moderate shadow map settings for most devices
    const shadowMapSize = 1024;
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
};

/**
 * Sets up post-processing effects for the renderer
 * @param renderer - The Three.js WebGL renderer
 * @param scene - The Three.js scene
 * @param camera - The Three.js camera
 * @param isDarkMode - Whether the current theme is dark mode
 * @param containerWidth - Width of the container element
 * @param containerHeight - Height of the container element
 * @returns The created EffectComposer
 */
export const setupPostProcessing = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  isDarkMode: boolean,
  containerWidth: number,
  containerHeight: number
): EffectComposer => {
  // Create EffectComposer
  const composer = new EffectComposer(renderer);
  
  // Add render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // Add bloom pass with appropriate settings
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(containerWidth, containerHeight),
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
  
  // Add FXAA pass for anti-aliasing
  const fxaaPass = new ShaderPass(FXAAShader);
  const pixelRatio = renderer.getPixelRatio();
  
  fxaaPass.material.uniforms.resolution.value.x = 1 / (
    containerWidth * pixelRatio
  );
  fxaaPass.material.uniforms.resolution.value.y = 1 / (
    containerHeight * pixelRatio
  );
  
  composer.addPass(fxaaPass);
  
  return composer;
};

/**
 * Updates bloom settings for the current theme
 * @param bloomPass - The UnrealBloomPass to update
 * @param isDarkMode - Whether the current theme is dark mode
 */
export const updateBloomSettings = (bloomPass: UnrealBloomPass, isDarkMode: boolean): void => {
  if (!bloomPass) return;
  
  if (isDarkMode) {
    // Stronger bloom in dark mode for better visibility
    bloomPass.strength = 0.7;
    bloomPass.radius = 0.5;
    bloomPass.threshold = 0.2;
  } else {
    // Subtle bloom in light mode
    bloomPass.strength = 0.4;
    bloomPass.radius = 0.3;
    bloomPass.threshold = 0.4;
  }
};

/**
 * Optimizes renderer settings based on device capabilities
 * @param renderer - The Three.js WebGL renderer
 * @param capabilities - The detected WebGL capabilities
 * @param isDarkMode - Whether the current theme is dark mode
 * @returns The optimized renderer
 */
export const optimizeRenderer = (
  renderer: THREE.WebGLRenderer,
  capabilities: WebGLCapabilities,
  isDarkMode: boolean
): THREE.WebGLRenderer => {
  if (!renderer) return renderer;
  
  // Enable shadows if device can handle them
  renderer.shadowMap.enabled = capabilities.tier !== 'low';
  renderer.shadowMap.type = capabilities.tier === 'high' 
    ? THREE.PCFSoftShadowMap
    : THREE.BasicShadowMap;
  
  // Set pixel ratio based on device capabilities
  const pixelRatio = window.devicePixelRatio || 1;
  const limitedPixelRatio = capabilities.tier === 'high' 
    ? Math.min(pixelRatio, 2) // Limit to 2x for high-end devices
    : Math.min(pixelRatio, 1.5); // Limit to 1.5x for mid-range
  renderer.setPixelRatio(limitedPixelRatio);
  
  // Configure additional renderer properties
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = capabilities.tier === 'high' 
    ? THREE.ACESFilmicToneMapping
    : THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Enable physical lights for better realism on high-end devices
  if (capabilities.tier === 'high') {
    // Configure physically correct lighting where needed
    // In newer THREE.js, physical correctness is handled at the material/light level
  }
  
  // Set default clear color (will be overridden by scene background)
  const clearColor = isDarkMode 
    ? new THREE.Color(0x111827) 
    : new THREE.Color(0xf3f4f6);
  renderer.setClearColor(clearColor);
  
  return renderer;
};

/**
 * Creates a glow texture for particle effects
 * @returns The created Three.js texture
 */
export const createGlowTexture = (): THREE.Texture | null => {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  
  // Get the 2D context
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!context) return null;
  
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
  
  return texture;
};

/**
 * Calculates thermal displacement based on temperature
 * @param temp - The temperature in Kelvin
 * @returns The calculated thermal displacement
 */
export const getThermalDisplacement = (temp: number): number => {
  // Simple model: displacement increases with temperature
  const maxDisplacement = 0.05 * Math.sqrt(temp / 300);
  return (Math.random() * 2 - 1) * maxDisplacement;
};

/**
 * Detects WebGL capabilities of the current device
 * @returns The detected WebGL capabilities
 */
export const detectWebGLCapabilities = (): WebGLCapabilities => {
  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | null = null;
  
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
    const gl2Context = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl2Context) {
      gl = gl2Context as unknown as WebGLRenderingContext;
      result.webgl2 = true;
      result.version = '2.0';
    } else {
      // Fall back to WebGL1 with explicit null check and type assertions
      const gl1Context = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (gl1Context) {
        gl = gl1Context;
      } else {
        const gl1FallbackContext = canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (gl1FallbackContext) {
          gl = gl1FallbackContext;
        }
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

/**
 * Gets optimal rendering settings based on device capabilities
 * @param capabilities - The detected WebGL capabilities
 * @returns The optimal rendering settings
 */
export const getOptimalRenderingSettings = (capabilities: WebGLCapabilities): RenderSettings => {
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

/**
 * Adds a glow effect to a position in the scene
 * @param scene - The Three.js scene
 * @param position - The position to add the glow effect to
 * @param color - The color of the glow effect
 * @param glowTexture - The glow texture to use
 * @param size - The size of the glow effect
 * @returns The created Three.js sprite
 */
export const addGlowEffect = (
  scene: THREE.Scene,
  position: THREE.Vector3,
  color: number | string,
  glowTexture: THREE.Texture,
  size: number = 0.5
): THREE.Sprite | null => {
  if (!glowTexture || !scene) {
    return null;
  }
  
  const spriteMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: new THREE.Color(color),
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.7,
  });
  
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.copy(position);
  sprite.scale.set(size, size, 1);
  scene.add(sprite);
  
  return sprite;
};

/**
 * Adds a fusion effect to a position in the scene
 * @param scene - The Three.js scene
 * @param position - The position to add the fusion effect to
 * @param timer - The Three.js timer for timing. Updated once before the start time is read.
 * @param color - The color of the fusion effect
 * @param duration - The duration of the fusion effect
 * @returns The created fusion effect object
 */
export const addFusionEffect = (
  scene: THREE.Scene,
  position: THREE.Vector3,
  timer: THREE.Timer,
  color: number | string = 0xffaa00,
  duration: number = 2.0
): FusionEffect | null => {
  if (!scene) return null;
  
  const geometry = new THREE.SphereGeometry(0.15, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.copy(position);
  scene.add(sphere);
  
  timer.update();
  const startTime = timer.getElapsed();
  const fusionEffect: FusionEffect = {
    mesh: sphere,
    startTime,
    duration,
    updateEffect: (currentTime: number): boolean => {
      const elapsed = currentTime - startTime;
      if (elapsed > duration) {
        if (scene) {
          scene.remove(sphere);
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
  
  return fusionEffect;
};

/**
 * Gets particle count based on device performance
 * @param performance - The device performance level
 * @param type - The type of particle
 * @returns The particle count
 */
export const getParticleCountForDevice = (
  performance: string,
  type: 'lattice' | 'deuterium' | 'phonons'
): number => {
  const counts: Record<string, Record<string, number>> = {
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

  if (!counts[type]) return 4;
  
  return counts[type][performance] || counts[type].medium || 4;
};

/**
 * Detects device performance level
 * @returns The device performance level string ('high', 'medium', or 'low')
 */
export const detectDevicePerformance = (): string => {
  try {
    const canvas = document.createElement("canvas");
    
    // Get WebGL context with proper null checking and type assertions
    let gl: WebGLRenderingContext | null = null;
    
    const webGLContext = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (webGLContext) {
      gl = webGLContext;
    } else {
      const experimentalContext = canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      if (experimentalContext) {
        gl = experimentalContext;
      }
    }

    if (!gl) {
      return "low";
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) {
      return "medium"; // Default if can't determine
    }
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    // Check for mobile GPU patterns
    const isMobileGPU = /(adreno|mali|powervr)/i.test(renderer);

    // Check for performance.memory if available (Chrome only)
    const memoryInfo =
      window.performance && (window.performance as any).memory
        ? (window.performance as any).memory.jsHeapSizeLimit
        : 0;

    if (isMobileGPU || memoryInfo < 100000000) {
      return "low";
    } else if (memoryInfo < 500000000) {
      return "medium";
    } else {
      return "high";
    }
  } catch (err) {
    console.warn(
      "Could not detect GPU performance, defaulting to medium",
      err,
    );
    return "medium";
  }
}; 