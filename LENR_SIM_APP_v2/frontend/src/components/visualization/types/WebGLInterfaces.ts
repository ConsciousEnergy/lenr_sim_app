/**
 * WebGL and Three.js related interfaces for the LENR visualization
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// WebGL capabilities detection result
export interface WebGLCapabilities {
  supported: boolean;
  hardwareAccelerated: boolean;
  webgl2: boolean;
  renderer: string;
  vendor: string;
  maxTextureSize: number;
  maxCubeMapSize: number;
  maxViewportDims: [number, number];
  maxRenderbufferSize: number;
  precision: string;
  extensions: string[];
  version: string;
  tier?: 'high' | 'medium' | 'low';
}

// Optimal rendering settings based on device capabilities
export interface RenderSettings {
  antialias: boolean;
  pixelRatio: number;
  shadowMapType: THREE.ShadowMapType;
  shadowMapEnabled: boolean;
  gammaCorrection: boolean;
  physicallyCorrectLights: boolean;
  toneMappingExposure: number;
  toneMapping: THREE.ToneMapping;
  maxLights: number;
  useHDR: boolean;
  useSoftParticles: boolean;
  useHighQualityBloom: boolean;
  useShadows?: boolean;
  resolution?: 'high' | 'medium' | 'low';
}

// Internal render settings for component
export interface InternalRenderSettings {
  particleMultiplier: number;
  useShadows: boolean;
  useHighDetail: boolean;
  qualityName: string;
}

// FPS counter reference
export interface FPSCounter {
  frames: number;
  lastTime: number;
}

// Animation frame reference
export interface AnimationFrameRef {
  id?: number;
}

// Fusion effect object for animations
export interface FusionEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  updateEffect: (currentTime: number) => boolean;
}

// Type aliases for Three.js objects with proper TypeScript types
export type ThreeScene = THREE.Scene;
export type ThreeCamera = THREE.PerspectiveCamera;
export type ThreeRenderer = THREE.WebGLRenderer;
export type ThreeControls = OrbitControls;
export type ThreeComposer = EffectComposer;
export type ThreeBloomPass = UnrealBloomPass;
export type ThreeObject3D = THREE.Object3D;
export type ThreeMesh = THREE.Mesh;
export type ThreeLight = THREE.Light;
export type ThreeClock = THREE.Clock;
export type ThreeTexture = THREE.Texture;
export type ThreeSprite = THREE.Sprite;
export type ThreeVector3 = THREE.Vector3;
export type ThreeColor = THREE.Color; 