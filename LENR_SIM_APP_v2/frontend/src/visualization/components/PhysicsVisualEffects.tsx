import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useStableThreeTimer } from '../utils/threeTimer';
import { SimulationUpdateMessage, LatticePoint as PhysicsLatticePoint } from '../../api/physics/types';
import { getColorFromMap, getDefaultColorMapForType } from '../utils/colorMaps'; // Assuming color map utility exists

interface PhysicsVisualEffectsProps {
  scene: THREE.Scene;
  simulationData: SimulationUpdateMessage | null;
  visualizationType: 'temperature' | 'energy' | 'reaction_rate';
  showParticleMovement: boolean;
  showWaveAnimations: boolean;
  intensity: number;
}

// Max number of pooled objects for waves and sprites
const MAX_WAVES = 15;
const MAX_SPRITES = 30;

// Types for storing effect objects in the scene
interface EffectObjects {
  particles: THREE.Points | null;
  particleCount: number; // Store the count used to create the current particle geometry
  energyWaves: THREE.Mesh[]; // Pool of wave objects
  reactionPoints: THREE.Sprite[]; // Pool of sprite objects
  spriteTexture: THREE.CanvasTexture | null; // Store the shared texture
}

/**
 * Component to add visual effects to the lattice visualization
 * based on physics simulation data (Optimized for object reuse)
 */
const PhysicsVisualEffects: React.FC<PhysicsVisualEffectsProps> = ({
  scene,
  simulationData,
  visualizationType,
  showParticleMovement,
  showWaveAnimations,
  intensity = 1.0
}) => {
  const effectsRef = useRef<EffectObjects>({
    particles: null,
    particleCount: 0,
    energyWaves: [],
    reactionPoints: [],
    spriteTexture: null,
  });

  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useStableThreeTimer();

  // --- Initialization Effect --- 
  // Create object pools and texture once on mount
  useEffect(() => {
    const effects = effectsRef.current;
    const wavesPool: THREE.Mesh[] = [];
    const spritesPool: THREE.Sprite[] = [];

    // Pre-create wave objects
    const ringGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
    ringGeometry.rotateX(Math.PI / 2); // Orient rings
    for (let i = 0; i < MAX_WAVES; i++) {
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // Will be set later
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0, // Start invisible
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.visible = false; // Start hidden
      ring.userData = { active: false, baseSize: 0.1, maxSize: 0.5, growSpeed: 0.5, value: 0 };
      scene.add(ring);
      wavesPool.push(ring);
    }

    // Pre-create sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    effectsRef.current.spriteTexture = texture;

    // Pre-create sprite objects
    for (let i = 0; i < MAX_SPRITES; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.0, // Start invisible
        sizeAttenuation: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false; // Start hidden
      sprite.userData = { active: false, flashSpeed: 0.5, value: 0 };
      scene.add(sprite);
      spritesPool.push(sprite);
    }

    effects.energyWaves = wavesPool;
    effects.reactionPoints = spritesPool;

    // Cleanup function for unmount
    return () => {
      cleanupEffects();
      // Dispose geometries/textures created here
      ringGeometry.dispose();
      texture?.dispose();
      effects.spriteTexture = null;
      // Materials are disposed in cleanupEffects
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]); // Run only once on mount

  // --- Cleanup Function --- 
  const cleanupEffects = () => {
    // Stop animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Dispose particles
    if (effectsRef.current.particles) {
      scene.remove(effectsRef.current.particles);
      effectsRef.current.particles.geometry.dispose();
      (effectsRef.current.particles.material as THREE.Material).dispose();
      effectsRef.current.particles = null;
      effectsRef.current.particleCount = 0;
    }

    // Dispose pooled waves
    effectsRef.current.energyWaves.forEach(wave => {
      scene.remove(wave);
      // Geometry is shared, disposed on unmount
      (wave.material as THREE.Material).dispose();
    });
    effectsRef.current.energyWaves = [];

    // Dispose pooled sprites
    effectsRef.current.reactionPoints.forEach(point => {
      scene.remove(point);
      // Texture is shared, disposed on unmount
      (point.material as THREE.Material).dispose();
    });
    effectsRef.current.reactionPoints = [];
  };

  // --- Update Functions (Optimized) --- 

  const updateParticleSystem = (points: Array<{ position: [number, number, number], value: number }>) => {
    const currentParticles = effectsRef.current.particles;
    const currentCount = effectsRef.current.particleCount;
    const newCount = points.length;
    const activeColorMap = getDefaultColorMapForType(visualizationType);

    // If count mismatches, recreate the system
    if (!currentParticles || newCount !== currentCount) {
      if (currentParticles) {
        scene.remove(currentParticles);
        currentParticles.geometry.dispose();
        (currentParticles.material as THREE.Material).dispose();
      }

      if (newCount === 0) {
         effectsRef.current.particles = null;
         effectsRef.current.particleCount = 0;
         return; // Nothing to create
      }

      const geometry = new THREE.BufferGeometry();
      const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        sizeAttenuation: true,
        depthWrite: false
      });

      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newCount * 3), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(newCount * 3), 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(newCount), 1));

      const newParticles = new THREE.Points(geometry, material);
      newParticles.name = 'physics-particles';
      scene.add(newParticles);
      effectsRef.current.particles = newParticles;
      effectsRef.current.particleCount = newCount;
    }

    // Update attributes of the existing system
    const particles = effectsRef.current.particles;
    if (!particles) return;

    const positions = particles.geometry.attributes.position.array as Float32Array;
    const colors = particles.geometry.attributes.color.array as Float32Array;
    const sizes = particles.geometry.attributes.size.array as Float32Array;
    const dataRange = { min: Infinity, max: -Infinity };
    points.forEach(p => {
        dataRange.min = Math.min(dataRange.min, p.value);
        dataRange.max = Math.max(dataRange.max, p.value);
    });
    dataRange.min = isFinite(dataRange.min) ? dataRange.min : 0;
    dataRange.max = isFinite(dataRange.max) ? dataRange.max : 1;

    points.forEach((point, i) => {
      positions[i * 3] = point.position[0];
      positions[i * 3 + 1] = point.position[1];
      positions[i * 3 + 2] = point.position[2];

      const color = getColorFromMap(point.value, dataRange.min, dataRange.max, activeColorMap);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const normalizedValue = Math.max(0, Math.min(1, (point.value - dataRange.min) / (dataRange.max - dataRange.min) || 0));
      sizes[i] = 0.05 + 0.2 * normalizedValue * intensity;
    });

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
  };

  const updateEnergyWaves = (points: Array<{ position: [number, number, number], value: number }>) => {
    const wavesPool = effectsRef.current.energyWaves;
    if (!wavesPool || wavesPool.length === 0) return;

    // Determine color based on type
    let waveColorHex: number;
    if (visualizationType === 'temperature') waveColorHex = 0xff3300;
    else if (visualizationType === 'energy') waveColorHex = 0x00aaff;
    else waveColorHex = 0x88ff00; // reaction_rate

    // Find top N points based on value
    const threshold = 0.5; // Example threshold
    const highValuePoints = points
      .filter(p => p.value > threshold)
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_WAVES); // Limit to pool size

    // Reset all waves in pool first
    wavesPool.forEach(wave => {
        wave.visible = false;
        wave.userData.active = false;
    });

    // Activate and update waves for high value points
    highValuePoints.forEach((point, i) => {
      if (i < wavesPool.length) {
        const wave = wavesPool[i];
        wave.position.set(point.position[0], point.position[1], point.position[2]);
        (wave.material as THREE.MeshBasicMaterial).color.setHex(waveColorHex);
        wave.userData.value = point.value;
        wave.userData.growSpeed = 0.5 + Math.random() * 0.5; // Randomize speed slightly
        wave.userData.active = true;
        wave.visible = true;
        (wave.material as THREE.MeshBasicMaterial).opacity = 0.7; // Reset opacity
        wave.scale.set(wave.userData.baseSize, wave.userData.baseSize, wave.userData.baseSize); // Reset scale
      }
    });
  };

  const updateReactionPoints = (points: Array<{ position: [number, number, number], value: number }>) => {
    const spritesPool = effectsRef.current.reactionPoints;
    if (!spritesPool || spritesPool.length === 0 || visualizationType !== 'reaction_rate') {
        // Hide all if not reaction rate view or no pool
        spritesPool.forEach(sprite => sprite.visible = false);
        return;
    }

    // Filter points with significant reaction rates
    const threshold = 0.05;
    const reactionPointsData = points
        .filter(p => p.value > threshold)
        .sort((a, b) => b.value - a.value)
        .slice(0, MAX_SPRITES); // Limit to pool size

    // Reset all sprites in pool
    spritesPool.forEach(sprite => {
        sprite.visible = false;
        sprite.userData.active = false;
    });

    // Activate and update sprites for reaction points
    reactionPointsData.forEach((point, i) => {
        if (i < spritesPool.length) {
            const sprite = spritesPool[i];
            sprite.position.set(point.position[0], point.position[1], point.position[2]);
            const scale = 0.1 + 0.3 * point.value * intensity;
            sprite.scale.set(scale, scale, 1);
            sprite.userData.value = point.value;
            sprite.userData.flashSpeed = 0.5 + Math.random() * 2;
            sprite.userData.active = true;
            sprite.visible = true;
             (sprite.material as THREE.SpriteMaterial).opacity = 1.0; // Reset opacity
        }
    });
  };

  // --- Animation Loop --- 
  const animate = (timestamp?: number) => {
    const timer = timerRef.current;
    timer.update(timestamp);
    const deltaTime = timer.getDelta();
    const elapsed = timer.getElapsed();

    // Animate active energy waves
    if (showWaveAnimations) {
      effectsRef.current.energyWaves.forEach(wave => {
        if (wave.visible && wave.userData.active) {
          const userData = wave.userData;
          const time = elapsed * userData.growSpeed;
          const pulse = Math.sin(time) * 0.5 + 0.5;
          const scale = userData.baseSize + pulse * (userData.maxSize - userData.baseSize) * intensity;
          wave.scale.set(scale, scale, scale);
          (wave.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.7 * pulse;
        }
      });
    }

    // Animate active reaction points
    if (visualizationType === 'reaction_rate') { // Only animate if relevant
        effectsRef.current.reactionPoints.forEach(sprite => {
            if (sprite.visible && sprite.userData.active) {
                const userData = sprite.userData;
                const time = elapsed * userData.flashSpeed;
                const flash = 0.3 + (Math.sin(time) * 0.5 + 0.5) * 0.7;
                (sprite.material as THREE.SpriteMaterial).opacity = flash;
            }
        });
    }

    // Animate particle jitter (if system exists)
    if (showParticleMovement && effectsRef.current.particles) {
      const positions = effectsRef.current.particles.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += (Math.random() - 0.5) * 0.01 * intensity * deltaTime * 60; // Scale jitter by delta time
        positions[i * 3 + 1] += (Math.random() - 0.5) * 0.01 * intensity * deltaTime * 60;
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.01 * intensity * deltaTime * 60;
      }
      effectsRef.current.particles.geometry.attributes.position.needsUpdate = true;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // --- Main Data Update Effect --- 
  useEffect(() => {
    if (!simulationData?.lattice?.points) {
        // No data, hide visuals that might exist
        if (effectsRef.current.particles) effectsRef.current.particles.visible = false;
        effectsRef.current.energyWaves.forEach(w => w.visible = false);
        effectsRef.current.reactionPoints.forEach(s => s.visible = false);
        return; // Exit early if no data
    }

    // Ensure particles exist if needed, make visible
    if (showParticleMovement && effectsRef.current.particles) {
        effectsRef.current.particles.visible = true;
    } else if (effectsRef.current.particles) {
        effectsRef.current.particles.visible = false; // Hide if toggled off
    }

    // Extract points data
    const points = simulationData.lattice.points.map((point: PhysicsLatticePoint) => ({
      position: point.position,
      value: visualizationType === 'temperature'
        ? point.temperature
        : visualizationType === 'energy'
          ? point.energy
          : point.reaction_rate
    }));

    // Update effects based on toggles and data
    if (showParticleMovement) {
      updateParticleSystem(points);
    }
    if (showWaveAnimations) {
      updateEnergyWaves(points);
    } else {
        // Hide waves if toggled off
        effectsRef.current.energyWaves.forEach(w => w.visible = false);
    }
    // Always update reaction points (function handles visibility based on type)
    updateReactionPoints(points);

    // Start animation loop if not running
    if (animationFrameRef.current === null) {
      timerRef.current.update();
      animate();
    }

    // No explicit cleanup here needed as useEffect runs on dependency change
    // Unmount cleanup is handled by the initialization effect

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationData, visualizationType, showParticleMovement, showWaveAnimations, intensity, scene]);

  // This component manages effects programmatically, renders null
  return null;
};

export default PhysicsVisualEffects; 