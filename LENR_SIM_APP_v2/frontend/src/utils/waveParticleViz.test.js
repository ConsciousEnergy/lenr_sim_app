/**
 * Wave / soft-particle viz helpers — presentation only; not CFD.
 */
import * as THREE from 'three';
import {
  WAVE_PARTICLE_FIDELITY,
  WAVE_PARTICLE_SOURCE,
  enhancementGlowFactor,
  createSoftParticleCloud,
  WaveRibbonTrailSystem,
  ProtonWaveCompanion,
} from './waveParticleViz';

describe('waveParticleViz (schematic soft Points + ribbons)', () => {
  test('honesty tags stay schematic_visualization', () => {
    expect(WAVE_PARTICLE_FIDELITY).toBe('schematic');
    expect(WAVE_PARTICLE_SOURCE).toBe('schematic_visualization');
  });

  test('enhancementGlowFactor floors low values and saturates high logs', () => {
    expect(enhancementGlowFactor(1)).toBeCloseTo(0.25);
    expect(enhancementGlowFactor(0)).toBeCloseTo(0.25);
    expect(enhancementGlowFactor(NaN)).toBeCloseTo(0.25);
    const mid = enhancementGlowFactor(1e3);
    const high = enhancementGlowFactor(1e6);
    expect(mid).toBeGreaterThan(0.25);
    expect(high).toBeGreaterThanOrEqual(mid);
    expect(high).toBeLessThanOrEqual(1);
  });

  test('createSoftParticleCloud allocates buffers and tags fidelity', () => {
    const cloud = createSoftParticleCloud({ count: 8, colorHex: 0xff8800, size: 0.2 });
    expect(cloud.positions).toHaveLength(24);
    expect(cloud.colors).toHaveLength(24);
    expect(cloud.points.userData.fidelity).toBe('schematic');
    expect(cloud.points.userData.source).toBe('schematic_visualization');
    cloud.dispose();
  });

  test('WaveRibbonTrailSystem writes faded segments from samples', () => {
    const trails = new WaveRibbonTrailSystem({
      particleCount: 2,
      trailLength: 4,
      colorHex: 0x00ffff,
    });
    trails.updateFromSamples([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ], 0.8);
    trails.updateFromSamples([
      new THREE.Vector3(0.1, 0, 0),
      new THREE.Vector3(1.1, 0, 0),
    ], 0.8);
    expect(trails.geometry.drawRange.count).toBeGreaterThan(0);
    expect(trails.lines.userData.source).toBe('schematic_visualization');
    trails.dispose();
  });

  test('ProtonWaveCompanion syncs mesh positions into soft cloud + bloom', () => {
    const companion = new ProtonWaveCompanion({ particleCount: 3, trailLength: 6 });
    const meshes = [0, 1, 2].map((i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xff4500 }),
      );
      mesh.position.set(i, 0.5, -i);
      return mesh;
    });
    companion.syncFromMeshes(meshes, { glow: 0.7, hideMeshCores: true });
    expect(companion.cloud.positions[0]).toBe(0);
    expect(companion.cloud.positions[3]).toBe(1);
    expect(companion.bloom.positions[3]).toBe(1);
    expect(meshes[0].material.opacity).toBeLessThan(0.5);
    companion.dispose();
  });
});
