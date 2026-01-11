/**
 * QuantumFluxVisualization.js
 * 
 * Physics-based visualization effects grounded in observable phenomena from:
 * - Experimental LENR/fusion physics
 * - Stellar nucleosynthesis observations
 * - Quantum mechanical principles
 * 
 * Visualizes:
 * - Electron screening density (Thomas-Fermi model around nuclei)
 * - Magnetic dipole moments (nuclear and electron spin interactions)
 * - Phonon modes (lattice vibrations as standing waves)
 * - Virtual photon exchange (Coulomb interaction visualization)
 * - Gamow window (optimal tunneling energy region)
 */

import * as THREE from 'three';

// Physical constants (SI units)
const CONSTANTS = {
  hbar: 1.054571817e-34,        // Reduced Planck constant (J·s)
  electronMass: 9.1093837e-31,  // Electron mass (kg)
  protonMass: 1.6726219e-27,    // Proton mass (kg)
  bohrRadius: 5.29177210903e-11, // Bohr radius (m)
  electronCharge: 1.602176634e-19, // Elementary charge (C)
  nuclearMagneton: 5.0507837461e-27, // Nuclear magneton (J/T)
  boltzmann: 1.380649e-23,      // Boltzmann constant (J/K)
};

/**
 * Visualization modes for quantum effects
 * Supports both LENR (lattice-scale) and Fusion (plasma-scale) physics
 */
export const FluxMode = {
  // Lattice-scale modes (LENR)
  ELECTRON_SCREENING: 'electron_screening',
  MAGNETIC_DIPOLES: 'magnetic_dipoles',
  PHONON_MODES: 'phonon_modes',
  COULOMB_EXCHANGE: 'coulomb_exchange',
  GAMOW_WINDOW: 'gamow_window',
  COMBINED: 'combined',
  
  // Plasma-scale modes (Fusion)
  PLASMA_DENSITY: 'plasma_density',
  MAGNETIC_CONFINEMENT: 'magnetic_confinement',
  Z_PINCH: 'z_pinch',
};

/**
 * Calculates Thomas-Fermi screening density around nuclei
 * Based on: ρ(r) = ρ₀ * exp(-r/λ_TF) where λ_TF is the Thomas-Fermi length
 */
function calculateScreeningDensity(position, screeningLength, nucleiPositions) {
  let density = 0;
  const pos = new THREE.Vector3(position.x, position.y, position.z);
  
  if (nucleiPositions.length === 0) {
    // Default: screening from origin with r² falloff envelope
    const r = pos.length();
    density = Math.exp(-r / screeningLength) * (1 / (1 + r * r * 0.1));
  } else {
    // Sum contributions from all nuclei (superposition principle)
    for (const nucleus of nucleiPositions) {
      const r = pos.distanceTo(nucleus);
      // Avoid singularity at nucleus position
      const rSafe = Math.max(r, 0.1);
      density += Math.exp(-rSafe / screeningLength) / (rSafe * rSafe + 0.01);
    }
    density = Math.min(density / nucleiPositions.length, 1.0);
  }
  
  return Math.min(density, 1.0);
}

/**
 * Calculates phonon displacement field
 * Models acoustic and optical phonon modes in a crystal lattice
 * Based on Debye model: ω = v_s * k for acoustic, flat for optical
 */
function calculatePhononDisplacement(position, time, params) {
  const { debyeFrequency = 1.0, temperature = 300, latticeConstant = 1.0 } = params;
  const { x, y, z } = position;
  
  // Thermal amplitude: <u²> ∝ k_B*T / (M*ω²)
  const thermalAmplitude = Math.sqrt(temperature / 300) * 0.3;
  
  // Acoustic phonon modes (long wavelength, ω ∝ k)
  const k1 = 2 * Math.PI / (3 * latticeConstant);
  const omega1 = debyeFrequency * 0.3;
  const acoustic = Math.sin(k1 * x - omega1 * time) * 
                   Math.cos(k1 * y) * 
                   Math.cos(k1 * z);
  
  // Optical phonon mode (short wavelength, ω ≈ const)
  const k2 = 2 * Math.PI / latticeConstant;
  const omega2 = debyeFrequency * 0.9;
  const optical = Math.sin(k2 * x) * 
                  Math.sin(k2 * y - omega2 * time) * 
                  Math.cos(k2 * z);
  
  // Zone boundary mode
  const k3 = Math.PI / latticeConstant;
  const omega3 = debyeFrequency;
  const zoneBoundary = Math.cos(k3 * x) * 
                       Math.cos(k3 * y) * 
                       Math.sin(k3 * z - omega3 * time);
  
  const displacement = (acoustic * 0.4 + optical * 0.35 + zoneBoundary * 0.25) * thermalAmplitude;
  return (displacement + 1) / 2; // Normalize to 0-1
}

/**
 * Calculates Gamow peak probability
 * The Gamow window is where tunneling probability × Maxwell-Boltzmann distribution peaks
 * E_G = (π * α * Z1 * Z2)² * μ * c² / 2 (Gamow energy)
 * Peak at E₀ = (E_G * k_B * T / 2)^(2/3)
 */
function calculateGamowProbability(position, params) {
  const { temperature = 1e7, Z1 = 1, Z2 = 1, reducedMass = 1 } = params;
  const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  
  // Simplified Gamow factor visualization
  // Shows where tunneling is most probable based on distance
  const sommerfeld = Z1 * Z2 * Math.sqrt(reducedMass) * 0.5;
  
  // Tunneling probability decreases with distance (barrier penetration)
  const tunneling = Math.exp(-sommerfeld * Math.sqrt(Math.max(r, 0.1)));
  
  // Maxwell-Boltzmann factor (higher T = broader distribution)
  const kT = temperature / 1e7; // Normalized
  const boltzmann = Math.exp(-r / kT);
  
  // Gamow peak is the product
  const gamowPeak = tunneling * boltzmann;
  
  return Math.min(gamowPeak * 10, 1.0); // Scale for visualization
}

/**
 * Calculates plasma density distribution for fusion visualization
 * Models ion/electron density in a toroidal or spherical geometry
 * Based on: n(r) = n₀ * (1 - (r/a)²)^α for parabolic profile
 */
function calculatePlasmaDensity(position, params) {
  const { 
    majorRadius = 5.0,      // Tokamak major radius
    minorRadius = 2.0,      // Tokamak minor radius
    peakDensity = 1.0,      // Normalized peak density
    profileExponent = 2.0,  // Density profile shape
    isToroidal = true,      // Toroidal vs spherical geometry
  } = params;
  
  const { x, y, z } = position;
  
  if (isToroidal) {
    // Toroidal geometry (tokamak-like)
    const R = Math.sqrt(x * x + y * y); // Distance from z-axis
    const rMinor = Math.sqrt((R - majorRadius) ** 2 + z * z);
    const normalizedR = rMinor / minorRadius;
    
    if (normalizedR > 1.0) return 0;
    
    // Parabolic density profile: n(r) = n₀(1 - r²)^α
    const density = peakDensity * Math.pow(1 - normalizedR * normalizedR, profileExponent);
    return Math.max(0, Math.min(density, 1.0));
  } else {
    // Spherical geometry (ICF-like)
    const r = Math.sqrt(x * x + y * y + z * z);
    const normalizedR = r / majorRadius;
    
    if (normalizedR > 1.0) return 0;
    
    // Gaussian-like profile for compressed fuel
    const density = peakDensity * Math.exp(-normalizedR * normalizedR * 3);
    return Math.max(0, Math.min(density, 1.0));
  }
}

/**
 * Calculates magnetic confinement field strength
 * Models tokamak magnetic field: B_φ (toroidal) + B_θ (poloidal)
 * B_total = sqrt(B_φ² + B_θ²)
 */
function calculateMagneticConfinement(position, params) {
  const {
    majorRadius = 5.0,
    toroidalField = 5.0,    // Tesla at major radius
    plasmaCurrent = 15.0,   // MA
    q = 3.0,                // Safety factor
  } = params;
  
  const { x, y, z } = position;
  const R = Math.sqrt(x * x + y * y);
  const rMinor = Math.sqrt((R - majorRadius) ** 2 + z * z);
  
  if (R < 0.5) return 0;
  
  // Toroidal field: B_φ ∝ 1/R
  const B_toroidal = toroidalField * majorRadius / R;
  
  // Poloidal field: B_θ ∝ I_p * r / R (simplified)
  const B_poloidal = (plasmaCurrent / 15) * (rMinor / majorRadius) * 0.5;
  
  // Total field magnitude (normalized)
  const B_total = Math.sqrt(B_toroidal * B_toroidal + B_poloidal * B_poloidal);
  const B_normalized = B_total / (toroidalField * 1.5);
  
  return Math.max(0, Math.min(B_normalized, 1.0));
}

/**
 * Calculates Z-pinch compression effect
 * Models the electromagnetic compression of plasma in a z-pinch configuration
 * Both used in ICF (laser-driven) and as a bridge to LENR (localized pinch)
 * Based on: P_magnetic = B²/2μ₀, B_θ = μ₀I/(2πr)
 */
function calculateZPinchEffect(position, time, params) {
  const {
    current = 1.0,          // Normalized current (MA scale)
    pinchRadius = 2.0,      // Characteristic pinch radius
    compressionRatio = 10,  // Peak compression
    oscillationFreq = 1.0,  // Instability frequency
  } = params;
  
  const { x, y, z } = position;
  const r = Math.sqrt(x * x + y * y); // Distance from z-axis
  
  // Azimuthal magnetic field: B_θ ∝ I/r (inside pinch)
  // and B_θ ∝ I/r (outside pinch) but decreasing
  let B_theta;
  if (r < pinchRadius) {
    B_theta = current * r / pinchRadius; // Linear inside
  } else {
    B_theta = current * pinchRadius / r; // 1/r falloff outside
  }
  
  // Magnetic pressure peaks at pinch surface
  const magneticPressure = B_theta * B_theta;
  
  // Add sausage instability visualization (m=0 mode)
  const sausageMode = 1 + 0.3 * Math.sin(z * 2 + time * oscillationFreq);
  
  // Add kink instability visualization (m=1 mode)
  const kinkMode = 1 + 0.2 * Math.cos(z * 1.5 + time * oscillationFreq * 0.7);
  
  // Compression effect - higher at pinch boundary
  const compression = Math.exp(-Math.pow((r - pinchRadius) / 0.5, 2)) * 
                     compressionRatio / 10 * sausageMode * kinkMode;
  
  // Combine field and compression
  const effect = (magneticPressure * 0.5 + compression * 0.5);
  
  return Math.max(0, Math.min(effect, 1.0));
}

/**
 * QuantumFluxEffect - Main visualization class
 * Creates physically-grounded 3D representations of quantum effects
 */
export class QuantumFluxEffect {
  constructor(options = {}) {
    this.mode = options.mode || FluxMode.ELECTRON_SCREENING;
    this.resolution = options.resolution || 15;
    this.size = options.size || 8;
    this.opacity = options.opacity || 0.35;
    this.animated = options.animated !== false;
    
    // Physics parameters
    this.screeningLength = options.screeningLength || 2.0;
    this.temperature = options.temperature || 300;
    this.debyeFrequency = options.debyeFrequency || 1.0;
    this.latticeConstant = options.latticeConstant || 1.0;
    this.particlePositions = options.particlePositions || [];
    
    this.group = new THREE.Group();
    this.group.name = 'quantumFlux';
    this.volumeMesh = null;
    this.dipoleFields = [];
    this.exchangeLines = [];
    this.time = 0;
    
    // Color schemes based on physics conventions - brighter for visibility
    this.colorSchemes = {
      [FluxMode.ELECTRON_SCREENING]: {
        low: new THREE.Color(0x0044aa),  // Brighter blue base
        high: new THREE.Color(0x00ddff), // Bright cyan
        name: 'Electron Screening',
        description: 'Thomas-Fermi electron density reducing Coulomb barrier',
      },
      [FluxMode.MAGNETIC_DIPOLES]: {
        low: new THREE.Color(0x880044),  // Brighter magenta base
        high: new THREE.Color(0xff66aa), // Bright pink
        name: 'Magnetic Dipoles',
        description: 'Nuclear and electron spin magnetic moments',
      },
      [FluxMode.PHONON_MODES]: {
        low: new THREE.Color(0x885500),  // Brighter orange base
        high: new THREE.Color(0xffcc00), // Bright yellow-orange
        name: 'Phonon Modes',
        description: 'Lattice vibration standing waves (Debye model)',
      },
      [FluxMode.COULOMB_EXCHANGE]: {
        low: new THREE.Color(0x226644),  // Brighter teal base
        high: new THREE.Color(0x66ffcc), // Bright cyan-green
        name: 'Coulomb Exchange',
        description: 'Virtual photon exchange between charged particles',
      },
      [FluxMode.GAMOW_WINDOW]: {
        low: new THREE.Color(0x440088),  // Brighter purple base
        high: new THREE.Color(0xff44ff), // Bright magenta
        name: 'Gamow Window',
        description: 'Optimal tunneling energy region (stellar nucleosynthesis)',
      },
      [FluxMode.COMBINED]: {
        low: new THREE.Color(0x224444),  // Brighter base
        high: new THREE.Color(0xaaffee), // Bright mint
        name: 'Combined Effects',
        description: 'Total enhancement from quantum coupling',
      },
      // Plasma-scale modes (Fusion)
      [FluxMode.PLASMA_DENSITY]: {
        low: new THREE.Color(0x001144),  // Deep blue
        high: new THREE.Color(0xff4400), // Hot orange-red
        name: 'Plasma Density',
        description: 'Ion/electron density distribution in plasma',
      },
      [FluxMode.MAGNETIC_CONFINEMENT]: {
        low: new THREE.Color(0x002244),  // Dark blue
        high: new THREE.Color(0x44aaff), // Light blue
        name: 'Magnetic Confinement',
        description: 'Tokamak B-field lines (toroidal + poloidal)',
      },
      [FluxMode.Z_PINCH]: {
        low: new THREE.Color(0x440022),  // Dark red
        high: new THREE.Color(0xffcc00), // Yellow-white (hot core)
        name: 'Z-Pinch Effect',
        description: 'Electromagnetic compression (bridges LENR/Fusion scales)',
      },
    };
    
    // Plasma-specific parameters
    this.majorRadius = options.majorRadius || 5.0;
    this.minorRadius = options.minorRadius || 2.0;
    this.toroidalField = options.toroidalField || 5.0;
    this.plasmaCurrent = options.plasmaCurrent || 15.0;
    this.pinchRadius = options.pinchRadius || 2.0;
  }

  initialize() {
    this.clear();
    this.createVolumeVisualization();
    
    // Create mode-specific visualizations
    switch (this.mode) {
      case FluxMode.MAGNETIC_DIPOLES:
        this.createMagneticDipoleFields();
        break;
      case FluxMode.COULOMB_EXCHANGE:
        this.createCoulombExchangeLines();
        break;
      case FluxMode.PHONON_MODES:
        this.createPhononLattice();
        break;
      default:
        // Volume visualization is sufficient for other modes
        break;
    }
  }

  /**
   * Create volumetric density field
   */
  createVolumeVisualization() {
    const pointCount = this.resolution ** 3;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    const sizes = new Float32Array(pointCount);
    
    const halfSize = this.size / 2;
    const step = this.size / this.resolution;
    
    let index = 0;
    for (let i = 0; i < this.resolution; i++) {
      for (let j = 0; j < this.resolution; j++) {
        for (let k = 0; k < this.resolution; k++) {
          const x = -halfSize + i * step + step / 2;
          const y = -halfSize + j * step + step / 2;
          const z = -halfSize + k * step + step / 2;
          
          positions[index * 3] = x;
          positions[index * 3 + 1] = y;
          positions[index * 3 + 2] = z;
          
          const density = this.calculateDensityAt({ x, y, z });
          const scheme = this.colorSchemes[this.mode];
          const color = new THREE.Color().lerpColors(scheme.low, scheme.high, density);
          
          colors[index * 3] = color.r;
          colors[index * 3 + 1] = color.g;
          colors[index * 3 + 2] = color.b;
          
          // Size based on density (more intense = larger point)
          sizes[index] = 0.1 + density * 0.2;
          
          index++;
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      opacity: Math.max(this.opacity, 0.5), // Ensure minimum visibility
      size: 0.25, // Larger points for better visibility
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.volumeMesh = new THREE.Points(geometry, material);
    this.volumeMesh.name = 'quantumDensity';
    this.group.add(this.volumeMesh);
  }

  /**
   * Create magnetic dipole field visualization
   * Shows local magnetic field loops around particles (nuclear magnetic moments)
   */
  createMagneticDipoleFields() {
    // Create dipole fields at lattice points or particle positions
    const positions = this.particlePositions.length > 0 
      ? this.particlePositions 
      : this.generateLatticePositions(3);
    
    const scheme = this.colorSchemes[this.mode];
    
    for (const pos of positions) {
      // Create magnetic field loop (dipole field lines)
      const dipoleGroup = new THREE.Group();
      dipoleGroup.position.copy(pos);
      
      // Multiple field line loops at different orientations
      for (let i = 0; i < 3; i++) {
        const curve = new THREE.EllipseCurve(
          0, 0,                           // center
          0.4, 0.25,                       // x, y radius
          0, 2 * Math.PI,                  // start, end angle
          false,                           // clockwise
          0                                // rotation
        );
        
        const points = curve.getPoints(24);
        const points3D = points.map(p => new THREE.Vector3(p.x, 0, p.y));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
        const material = new THREE.LineBasicMaterial({
          color: scheme.high,
          transparent: true,
          opacity: 0.4,
        });
        
        const loop = new THREE.Line(geometry, material);
        
        // Rotate to create 3D dipole pattern
        if (i === 0) loop.rotation.x = Math.PI / 2;
        else if (i === 1) loop.rotation.z = Math.PI / 2;
        else loop.rotation.y = Math.PI / 4;
        
        dipoleGroup.add(loop);
      }
      
      // Add central spin indicator
      const arrowGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
      const arrowMaterial = new THREE.MeshBasicMaterial({ color: scheme.high });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.position.y = 0.1;
      dipoleGroup.add(arrow);
      
      // Random initial spin orientation
      dipoleGroup.rotation.x = Math.random() * Math.PI;
      dipoleGroup.rotation.y = Math.random() * Math.PI * 2;
      
      this.dipoleFields.push(dipoleGroup);
      this.group.add(dipoleGroup);
    }
  }

  /**
   * Create Coulomb exchange visualization
   * Shows virtual photon exchange lines between nearby charged particles
   */
  createCoulombExchangeLines() {
    const positions = this.particlePositions.length > 0 
      ? this.particlePositions 
      : this.generateLatticePositions(4);
    
    const scheme = this.colorSchemes[this.mode];
    const interactionRange = 2.5;
    
    // Connect nearby particles with exchange lines
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = positions[i].distanceTo(positions[j]);
        
        if (dist < interactionRange) {
          // Create wavy line representing virtual photon exchange
          const points = [];
          const segments = 20;
          
          for (let t = 0; t <= 1; t += 1 / segments) {
            const point = new THREE.Vector3().lerpVectors(positions[i], positions[j], t);
            // Add perpendicular wave displacement
            const waveAmplitude = 0.1 * Math.sin(t * Math.PI) * (1 - dist / interactionRange);
            const perpendicular = new THREE.Vector3(
              Math.sin(t * 8 * Math.PI) * waveAmplitude,
              Math.cos(t * 8 * Math.PI) * waveAmplitude,
              0
            );
            point.add(perpendicular);
            points.push(point);
          }
          
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          
          // Opacity based on distance (closer = stronger interaction)
          const opacity = 0.6 * (1 - dist / interactionRange);
          const material = new THREE.LineBasicMaterial({
            color: scheme.high,
            transparent: true,
            opacity,
          });
          
          const line = new THREE.Line(geometry, material);
          line.userData = { startIndex: i, endIndex: j, distance: dist };
          this.exchangeLines.push(line);
          this.group.add(line);
        }
      }
    }
  }

  /**
   * Create phonon lattice visualization
   * Shows lattice points with displacement vectors
   */
  createPhononLattice() {
    const gridSize = 5;
    const spacing = this.size / gridSize;
    const scheme = this.colorSchemes[this.mode];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const x = (i - gridSize / 2 + 0.5) * spacing;
          const y = (j - gridSize / 2 + 0.5) * spacing;
          const z = (k - gridSize / 2 + 0.5) * spacing;
          
          // Lattice point
          const pointGeom = new THREE.SphereGeometry(0.08, 8, 8);
          const pointMat = new THREE.MeshBasicMaterial({
            color: scheme.low,
            transparent: true,
            opacity: 0.6,
          });
          const point = new THREE.Mesh(pointGeom, pointMat);
          point.position.set(x, y, z);
          point.userData = { basePosition: new THREE.Vector3(x, y, z), i, j, k };
          
          this.dipoleFields.push(point); // Reuse array for lattice points
          this.group.add(point);
        }
      }
    }
  }

  /**
   * Generate lattice positions for visualization
   */
  generateLatticePositions(gridSize) {
    const positions = [];
    const spacing = this.size / (gridSize + 1);
    const offset = this.size / 2;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          positions.push(new THREE.Vector3(
            (i + 1) * spacing - offset,
            (j + 1) * spacing - offset,
            (k + 1) * spacing - offset
          ));
        }
      }
    }
    
    return positions;
  }

  /**
   * Calculate density at a point based on current mode
   */
  calculateDensityAt(position) {
    switch (this.mode) {
      case FluxMode.ELECTRON_SCREENING:
        return calculateScreeningDensity(
          position,
          this.screeningLength,
          this.particlePositions
        );
      
      case FluxMode.PHONON_MODES:
        return calculatePhononDisplacement(position, this.time, {
          debyeFrequency: this.debyeFrequency,
          temperature: this.temperature,
          latticeConstant: this.latticeConstant,
        });
      
      case FluxMode.GAMOW_WINDOW:
        return calculateGamowProbability(position, {
          temperature: this.temperature * 1e5, // Scale to stellar temps for visualization
          Z1: 1,
          Z2: 1,
          reducedMass: 1,
        });
      
      case FluxMode.MAGNETIC_DIPOLES:
        // Dipole field strength falloff: B ∝ 1/r³
        const r = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        return Math.exp(-r * 0.5) * 0.8;
      
      case FluxMode.COULOMB_EXCHANGE:
        // Coulomb potential: V ∝ 1/r
        const rC = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        return Math.exp(-rC * 0.3);
      
      case FluxMode.COMBINED:
        const screening = calculateScreeningDensity(position, this.screeningLength, []);
        const phonon = calculatePhononDisplacement(position, this.time, {
          debyeFrequency: this.debyeFrequency,
          temperature: this.temperature,
          latticeConstant: this.latticeConstant,
        });
        const gamow = calculateGamowProbability(position, { temperature: this.temperature * 1e5 });
        return (screening * 0.4 + phonon * 0.3 + gamow * 0.3);
      
      // Plasma-scale modes
      case FluxMode.PLASMA_DENSITY:
        return calculatePlasmaDensity(position, {
          majorRadius: this.majorRadius,
          minorRadius: this.minorRadius,
          peakDensity: 1.0,
          profileExponent: 2.0,
          isToroidal: true,
        });
      
      case FluxMode.MAGNETIC_CONFINEMENT:
        return calculateMagneticConfinement(position, {
          majorRadius: this.majorRadius,
          toroidalField: this.toroidalField,
          plasmaCurrent: this.plasmaCurrent,
        });
      
      case FluxMode.Z_PINCH:
        return calculateZPinchEffect(position, this.time, {
          current: 1.0,
          pinchRadius: this.pinchRadius,
          compressionRatio: 10,
          oscillationFreq: 1.0,
        });
      
      default:
        return 0;
    }
  }

  /**
   * Update visualization each frame
   */
  update(deltaTime = 0.016) {
    if (!this.animated) return;
    
    this.time += deltaTime;
    
    // Update volume colors for time-dependent modes
    if (this.volumeMesh && 
        (this.mode === FluxMode.PHONON_MODES || this.mode === FluxMode.COMBINED)) {
      const positions = this.volumeMesh.geometry.attributes.position.array;
      const colors = this.volumeMesh.geometry.attributes.color.array;
      const scheme = this.colorSchemes[this.mode];
      
      for (let i = 0; i < positions.length / 3; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        
        const density = this.calculateDensityAt({ x, y, z });
        const color = new THREE.Color().lerpColors(scheme.low, scheme.high, density);
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      this.volumeMesh.geometry.attributes.color.needsUpdate = true;
    }
    
    // Animate magnetic dipoles (precession)
    if (this.mode === FluxMode.MAGNETIC_DIPOLES) {
      for (const dipole of this.dipoleFields) {
        // Larmor precession around z-axis
        dipole.rotation.z += deltaTime * 0.5;
      }
    }
    
    // Animate phonon lattice points
    if (this.mode === FluxMode.PHONON_MODES) {
      const scheme = this.colorSchemes[this.mode];
      
      for (const point of this.dipoleFields) {
        if (point.userData.basePosition) {
          const base = point.userData.basePosition;
          const { i, j, k } = point.userData;
          
          // Calculate phonon displacement
          const displacement = calculatePhononDisplacement(base, this.time, {
            debyeFrequency: this.debyeFrequency,
            temperature: this.temperature,
            latticeConstant: this.latticeConstant,
          });
          
          // Apply displacement
          const amp = 0.2;
          point.position.set(
            base.x + Math.sin(this.time * 2 + i) * amp * (displacement - 0.5),
            base.y + Math.sin(this.time * 2.3 + j) * amp * (displacement - 0.5),
            base.z + Math.sin(this.time * 1.7 + k) * amp * (displacement - 0.5)
          );
          
          // Color based on displacement magnitude
          point.material.color.lerpColors(scheme.low, scheme.high, displacement);
        }
      }
    }
    
    // Animate Coulomb exchange lines (wave propagation)
    if (this.mode === FluxMode.COULOMB_EXCHANGE) {
      for (const line of this.exchangeLines) {
        const positions = line.geometry.attributes.position.array;
        const dist = line.userData.distance;
        
        for (let i = 0; i < positions.length / 3; i++) {
          const t = i / (positions.length / 3 - 1);
          const wavePhase = this.time * 5 + t * 8 * Math.PI;
          const waveAmplitude = 0.08 * Math.sin(t * Math.PI) * (1 - dist / 2.5);
          
          // Update y and z for wave motion (keep x as interpolation)
          positions[i * 3 + 1] += Math.sin(wavePhase) * waveAmplitude * deltaTime * 10;
          positions[i * 3 + 2] += Math.cos(wavePhase) * waveAmplitude * deltaTime * 10;
        }
        
        line.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  updateParameters(params) {
    if (params.screeningLength !== undefined) this.screeningLength = params.screeningLength;
    if (params.temperature !== undefined) this.temperature = params.temperature;
    if (params.debyeFrequency !== undefined) this.debyeFrequency = params.debyeFrequency;
    if (params.latticeConstant !== undefined) this.latticeConstant = params.latticeConstant;
    if (params.particlePositions !== undefined) this.particlePositions = params.particlePositions;
    
    // Re-initialize for non-animated modes
    if (this.mode !== FluxMode.PHONON_MODES && this.mode !== FluxMode.COMBINED) {
      this.initialize();
    }
  }

  setMode(mode) {
    if (Object.values(FluxMode).includes(mode)) {
      this.mode = mode;
      this.initialize();
    }
  }

  setOpacity(opacity) {
    this.opacity = opacity;
    if (this.volumeMesh) {
      this.volumeMesh.material.opacity = opacity;
    }
  }

  getGroup() {
    return this.group;
  }

  getModeInfo() {
    return this.colorSchemes[this.mode];
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      this.group.remove(child);
    }
    this.dipoleFields = [];
    this.exchangeLines = [];
    this.volumeMesh = null;
  }

  dispose() {
    this.clear();
  }
}

/**
 * Scale bar visualization for showing physical dimensions
 */
export class ScaleBar {
  constructor(options = {}) {
    this.length = options.length || 5;
    this.realWorldScale = options.realWorldScale || 1e-9; // meters per unit
    this.position = options.position || new THREE.Vector3(-4, -4.5, 4);
    this.color = options.color || 0xffffff;
    this.group = new THREE.Group();
    this.group.name = 'scaleBar';
  }

  initialize() {
    this.clear();
    
    // Main bar
    const barGeometry = new THREE.BoxGeometry(this.length, 0.06, 0.06);
    const barMaterial = new THREE.MeshBasicMaterial({ color: this.color });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    this.group.add(bar);
    
    // End caps
    const capGeometry = new THREE.BoxGeometry(0.06, 0.25, 0.06);
    const leftCap = new THREE.Mesh(capGeometry, barMaterial);
    leftCap.position.x = -this.length / 2;
    const rightCap = new THREE.Mesh(capGeometry, barMaterial);
    rightCap.position.x = this.length / 2;
    this.group.add(leftCap);
    this.group.add(rightCap);
    
    // Tick marks
    const tickCount = 5;
    const tickSpacing = this.length / tickCount;
    for (let i = 1; i < tickCount; i++) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.12, 0.03),
        barMaterial
      );
      tick.position.x = -this.length / 2 + i * tickSpacing;
      this.group.add(tick);
    }
    
    // Label
    const label = this.createLabel();
    if (label) {
      label.position.y = -0.35;
      this.group.add(label);
    }
    
    this.group.position.copy(this.position);
  }

  createLabel() {
    const realLength = this.length * this.realWorldScale;
    let labelText;
    
    if (realLength >= 1e-6) {
      labelText = `${(realLength * 1e6).toFixed(1)} μm`;
    } else if (realLength >= 1e-9) {
      labelText = `${(realLength * 1e9).toFixed(1)} nm`;
    } else if (realLength >= 1e-10) {
      labelText = `${(realLength * 1e10).toFixed(1)} Å`;
    } else {
      labelText = `${(realLength * 1e12).toFixed(1)} pm`;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'Bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 64, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.8, 0.45, 1);
    
    return sprite;
  }

  setScale(realWorldScale) {
    this.realWorldScale = realWorldScale;
    this.initialize();
  }

  getGroup() {
    return this.group;
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      child.geometry?.dispose();
      child.material?.dispose();
      if (child.material?.map) child.material.map.dispose();
      this.group.remove(child);
    }
  }

  dispose() {
    this.clear();
  }
}

export default {
  QuantumFluxEffect,
  ScaleBar,
  FluxMode,
};
