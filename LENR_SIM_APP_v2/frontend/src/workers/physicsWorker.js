/**
 * Physics WebWorker for LENR Simulation
 * 
 * Offloads heavy physics calculations from the main UI thread to prevent blocking.
 * Handles enhancement factor calculations, tunneling probabilities, and bubble dynamics.
 * 
 * Usage:
 *   const worker = new Worker(new URL('./workers/physicsWorker.js', import.meta.url));
 *   worker.postMessage({ type: 'CALCULATE_ENHANCEMENT', params: {...} });
 *   worker.onmessage = (e) => { console.log(e.data); };
 */

/* eslint-disable no-restricted-globals */

// Physical constants (SI units)
const PHYSICAL_CONSTANTS = {
  HBAR: 1.054571817e-34,      // Reduced Planck constant (J·s)
  KB: 1.380649e-23,           // Boltzmann constant (J/K)
  E_CHARGE: 1.602176634e-19,  // Elementary charge (C)
  EPS0: 8.8541878128e-12,     // Vacuum permittivity (F/m)
  ME: 9.1093837015e-31,       // Electron mass (kg)
  MP: 1.67262192369e-27,      // Proton mass (kg)
  C: 299792458,               // Speed of light (m/s)
  ALPHA: 7.2973525693e-3,     // Fine structure constant
  AMU: 1.66053906660e-27,     // Atomic mass unit (kg)
};

// Material properties database
const MATERIALS = {
  palladium: {
    electronDensity: 6.8e28,    // m^-3
    latticeConstant: 3.89e-10,  // m
    debyeTemperature: 275,      // K
    workFunction: 5.12,         // eV
    screeningEnergy: 310,       // eV (D-Pd)
  },
  nickel: {
    electronDensity: 9.1e28,
    latticeConstant: 3.52e-10,
    debyeTemperature: 450,
    workFunction: 5.15,
    screeningEnergy: 200,
  },
  titanium: {
    electronDensity: 3.8e28,
    latticeConstant: 2.95e-10,
    debyeTemperature: 420,
    workFunction: 4.33,
    screeningEnergy: 65,
  },
};

/**
 * Calculate electron screening enhancement factor
 * Based on Debye screening model
 * 
 * @param {number} temperature - Temperature in Kelvin
 * @param {number} electronDensity - Electron density in m^-3
 * @returns {Object} Screening enhancement results
 */
function calculateScreeningEnhancement(temperature, electronDensity) {
  const { KB, EPS0, E_CHARGE, HBAR, ME } = PHYSICAL_CONSTANTS;
  
  // Thermal energy
  const thermalEnergy = KB * Math.max(temperature, 1);
  
  // Debye screening length
  const debyeLength = Math.sqrt(EPS0 * thermalEnergy / (electronDensity * E_CHARGE ** 2));
  
  // Thomas-Fermi screening length (for degenerate electron gas)
  const fermiTFLength = Math.sqrt(EPS0 * HBAR ** 2 / (ME * Math.pow(electronDensity, 1/3) * E_CHARGE ** 2));
  
  // Use the smaller (more effective) screening length
  const effectiveLength = Math.min(debyeLength, fermiTFLength);
  
  // Screening potential
  const screeningPotential = -(E_CHARGE ** 2) / (4 * Math.PI * EPS0 * effectiveLength);
  
  // Plasma frequency for dynamic effects
  const plasmaFrequency = Math.sqrt(electronDensity * E_CHARGE ** 2 / (EPS0 * ME));
  
  // Enhancement factor with saturation
  let enhancement = 1.0;
  if (thermalEnergy > 0) {
    enhancement = Math.exp(-screeningPotential / thermalEnergy);
    const dynamicFactor = 1 + 0.5 * Math.pow(HBAR * plasmaFrequency / thermalEnergy, 2);
    enhancement *= dynamicFactor;
    
    // Apply non-linear scaling for very high values
    if (enhancement > 1e5) {
      enhancement = 1e5 * Math.log10(1 + enhancement / 1e5);
    }
  }
  
  return {
    enhancement: Math.max(1.0, enhancement),
    screeningLength: effectiveLength,
    debyeLength,
    fermiTFLength,
    plasmaFrequency,
  };
}

/**
 * Calculate QED vacuum polarization enhancement
 * 
 * @param {number} electronDensity - Electron density in m^-3
 * @param {number} temperature - Temperature in Kelvin
 * @returns {Object} QED enhancement results
 */
function calculateQEDEnhancement(electronDensity, temperature) {
  const { ME, C, HBAR, E_CHARGE, EPS0, ALPHA } = PHYSICAL_CONSTANTS;
  
  // Schwinger critical field
  const eCritical = ME ** 2 * C ** 3 / (HBAR * E_CHARGE);
  
  // Local field estimate from electron density
  const localField = Math.sqrt(electronDensity) * E_CHARGE / (4 * Math.PI * EPS0);
  
  // Field ratio
  const fieldRatio = localField / eCritical;
  
  // Vacuum polarization factor
  const vpFactor = 1 + (2 * ALPHA / (3 * Math.PI)) * fieldRatio ** 2;
  
  // Temperature correction
  const tempCorrection = 1 + 0.1 * Math.tanh(temperature / 1000);
  
  return {
    enhancement: vpFactor * tempCorrection,
    vacuumPolarization: vpFactor,
    temperatureCorrection: tempCorrection,
    fieldRatio,
  };
}

/**
 * Calculate Casimir effect enhancement for nanoscale geometries
 * 
 * @param {number} latticeConstant - Lattice parameter in meters
 * @param {number} temperature - Temperature in Kelvin
 * @returns {Object} Casimir enhancement results
 */
function calculateCasimirEnhancement(latticeConstant, temperature) {
  const { HBAR, C, KB } = PHYSICAL_CONSTANTS;
  
  // Thermal wavelength
  const thermalWavelength = HBAR * C / (KB * Math.max(temperature, 1));
  
  // Characteristic length for Casimir effect
  const casimirLength = latticeConstant * 0.5;
  
  // Casimir energy (simplified spherical cavity model)
  const casimirEnergy = -HBAR * C * Math.PI / (720 * casimirLength ** 3);
  
  // Temperature factor
  let tempFactor = 1.0;
  if (thermalWavelength > 0) {
    tempFactor = Math.tanh(Math.PI * casimirLength / thermalWavelength);
  }
  
  // Enhancement factor (capped at reasonable value)
  let enhancement = 1.0;
  if (temperature > 0) {
    enhancement = Math.exp(Math.abs(casimirEnergy) / (KB * temperature));
    enhancement = 1 + (enhancement - 1) * tempFactor;
  }
  
  return {
    enhancement: Math.min(10.0, Math.max(1.0, enhancement)),
    casimirEnergy,
    thermalWavelength,
    temperatureFactor: tempFactor,
  };
}

/**
 * Calculate quantum coherence enhancement
 * 
 * @param {number} temperature - Temperature in Kelvin
 * @param {number} latticeConstant - Lattice constant in meters
 * @param {number} coherenceFactor - Coherence configuration factor (0-1)
 * @returns {Object} Coherence enhancement results
 */
function calculateCoherenceEnhancement(temperature, latticeConstant, coherenceFactor = 0.5) {
  const { HBAR, KB, AMU } = PHYSICAL_CONSTANTS;
  
  // Deuterium mass
  const mD = 2.014 * AMU;
  
  // Thermal de Broglie wavelength for deuterons
  const thermalWavelength = Math.sqrt(2 * Math.PI * HBAR ** 2 / (mD * KB * Math.max(temperature, 1)));
  
  // Coherence length estimation
  const coherenceLength = thermalWavelength * coherenceFactor;
  
  // Coherence volume ratio
  const volumeRatio = Math.pow(coherenceLength / latticeConstant, 3);
  
  // Number of coherent particles (capped)
  const nCoherent = Math.min(100, Math.max(1, volumeRatio));
  
  // Enhancement scales with coherent particles
  const coherenceEnhancement = Math.sqrt(nCoherent);
  
  // Temperature dependence (lower T = higher coherence)
  const tempFactor = 1 + Math.exp(-temperature / 500);
  
  return {
    enhancement: Math.max(1.0, coherenceEnhancement * tempFactor),
    thermalWavelength,
    coherenceLength,
    coherentParticles: nCoherent,
    temperatureFactor: tempFactor,
  };
}

/**
 * Calculate WKB tunneling probability through Coulomb barrier
 * 
 * @param {number} energyKeV - Center-of-mass energy in keV
 * @param {number} z1 - Charge of nucleus 1
 * @param {number} z2 - Charge of nucleus 2
 * @param {number} a1 - Mass number of nucleus 1
 * @param {number} a2 - Mass number of nucleus 2
 * @param {number} screeningEV - Screening energy in eV
 * @returns {Object} Tunneling calculation results
 */
function calculateTunnelingProbability(energyKeV, z1, z2, a1, a2, screeningEV = 0) {
  const { HBAR, E_CHARGE, EPS0, AMU } = PHYSICAL_CONSTANTS;
  
  // Reduced mass
  const m1 = a1 * AMU;
  const m2 = a2 * AMU;
  const mu = (m1 * m2) / (m1 + m2);
  
  // Convert energies to Joules
  const KEV_TO_J = E_CHARGE * 1000;
  const EV_TO_J = E_CHARGE;
  const effectiveEnergy = (energyKeV + screeningEV / 1000) * KEV_TO_J;
  
  if (effectiveEnergy <= 0) {
    return { probability: 0, gamowFactor: Infinity };
  }
  
  // Sommerfeld parameter
  const eta = (z1 * z2 * E_CHARGE ** 2) / (4 * Math.PI * EPS0 * HBAR * Math.sqrt(2 * effectiveEnergy / mu));
  
  // Gamow penetration factor
  const gamowFactor = 2 * Math.PI * eta;
  const probability = Math.exp(-gamowFactor);
  
  // Classical turning point
  const rTurn = (z1 * z2 * E_CHARGE ** 2) / (4 * Math.PI * EPS0 * effectiveEnergy);
  
  // Barrier height (keV)
  const barrierHeightJ = (z1 * z2 * E_CHARGE ** 2) / (4 * Math.PI * EPS0 * 2e-15); // At nuclear radius
  const barrierHeightKeV = barrierHeightJ / KEV_TO_J;
  
  return {
    probability: Math.max(probability, 1e-300),
    gamowFactor,
    sommerfeld: eta,
    turningPoint: rTurn,
    barrierHeight: barrierHeightKeV,
    effectiveEnergy: effectiveEnergy / KEV_TO_J,
  };
}

/**
 * Calculate bubble collapse parameters using simplified Rayleigh-Plesset
 * 
 * @param {number} initialRadius - Initial bubble radius in meters
 * @param {number} drivingPressure - Driving pressure in Pa
 * @param {number} ambientPressure - Ambient pressure in Pa
 * @param {number} temperature - Temperature in K
 * @returns {Object} Bubble collapse results
 */
function calculateBubbleCollapse(initialRadius, drivingPressure, ambientPressure, temperature) {
  // Fluid properties (water)
  const rho = 998;        // kg/m³
  const sigma = 0.0728;   // N/m (surface tension)
  const gamma = 1.4;      // Polytropic index
  
  // Pressure ratio
  const pressureRatio = (ambientPressure + drivingPressure) / ambientPressure;
  
  // Estimate compression ratio from Rayleigh collapse
  // R_min / R_0 ≈ (P_0 / (P_0 + P_a))^(1/3γ) simplified
  const compressionRatio = Math.min(100, Math.pow(pressureRatio, 1 / (3 * gamma)));
  const minRadius = initialRadius / compressionRatio;
  
  // Temperature at collapse (adiabatic)
  const maxTemperature = temperature * Math.pow(compressionRatio, 3 * (gamma - 1));
  
  // Pressure at collapse
  const maxPressure = ambientPressure * Math.pow(compressionRatio, 3 * gamma);
  
  // Collapse time (Rayleigh collapse time)
  const collapseTime = 0.915 * initialRadius * Math.sqrt(rho / ambientPressure);
  
  // Electric field intensification (double-layer)
  const E0 = 1e8; // V/m baseline
  const peakField = E0 * compressionRatio ** 2;
  
  return {
    minRadius,
    compressionRatio,
    maxTemperature,
    maxPressure,
    collapseTime,
    peakField,
  };
}

/**
 * Calculate total enhancement factor combining all mechanisms
 * 
 * @param {Object} params - Calculation parameters
 * @returns {Object} Complete enhancement analysis
 */
function calculateTotalEnhancement(params) {
  const {
    temperature = 300,
    electronDensity = 6.8e28,
    electricField = 1e6,
    latticeConstant = 3.89e-10,
    coherenceFactor = 0.5,
    material = 'palladium',
  } = params;
  
  // Get material properties
  const materialProps = MATERIALS[material] || MATERIALS.palladium;
  const effectiveElectronDensity = electronDensity || materialProps.electronDensity;
  const effectiveLatticeConstant = latticeConstant || materialProps.latticeConstant;
  
  // Calculate individual enhancements
  const screening = calculateScreeningEnhancement(temperature, effectiveElectronDensity);
  const qed = calculateQEDEnhancement(effectiveElectronDensity, temperature);
  const casimir = calculateCasimirEnhancement(effectiveLatticeConstant, temperature);
  const coherence = calculateCoherenceEnhancement(temperature, effectiveLatticeConstant, coherenceFactor);
  
  // Combine factors using geometric mean approach
  const factors = [
    screening.enhancement,
    qed.enhancement,
    casimir.enhancement,
    coherence.enhancement,
  ];
  
  const validFactors = factors.filter(f => f > 0 && isFinite(f));
  let totalEnhancement = 1.0;
  
  if (validFactors.length > 0) {
    const logSum = validFactors.reduce((sum, f) => sum + Math.log(f), 0);
    totalEnhancement = Math.exp(logSum / validFactors.length) * validFactors.length;
  }
  
  // Apply non-linear scaling for very high values
  if (totalEnhancement > 1e10) {
    totalEnhancement = 1e10 * Math.log10(1 + totalEnhancement / 1e10);
  }
  
  return {
    total: Math.max(1.0, totalEnhancement),
    breakdown: {
      screening: screening.enhancement,
      qed: qed.enhancement,
      casimir: casimir.enhancement,
      coherence: coherence.enhancement,
    },
    details: {
      screening,
      qed,
      casimir,
      coherence,
    },
    parameters: {
      temperature,
      electronDensity: effectiveElectronDensity,
      electricField,
      latticeConstant: effectiveLatticeConstant,
      material,
    },
  };
}

/**
 * Calculate enhancement factors over time for animation
 * 
 * @param {Object} params - Simulation parameters
 * @returns {Array} Time series of enhancement factors
 */
function calculateEnhancementTimeSeries(params) {
  const {
    baseTemperature = 300,
    baseElectronDensity = 6.8e28,
    latticeConstant = 3.89e-10,
    initialRadius = 10e-6,
    drivingPressure = 1.5e5,
    ambientPressure = 101325,
    frequency = 20e3,
    numPoints = 50,
    material = 'palladium',
  } = params;
  
  const period = 1 / frequency;
  const results = [];
  
  for (let i = 0; i < numPoints; i++) {
    const normalizedTime = i / numPoints;
    const t = normalizedTime * period;
    
    // Determine collapse phase
    let phase, compressionRatio, temperature;
    
    if (normalizedTime < 0.4) {
      phase = 'EXPANSION';
      compressionRatio = 1 + 0.3 * Math.sin(normalizedTime / 0.4 * Math.PI / 2);
    } else if (normalizedTime < 0.55) {
      phase = 'COLLAPSE';
      const progress = (normalizedTime - 0.4) / 0.15;
      compressionRatio = 1.3 + 8.7 * progress ** 2;
    } else if (normalizedTime < 0.6) {
      phase = 'MINIMUM';
      compressionRatio = 10;
    } else if (normalizedTime < 0.7) {
      phase = 'REBOUND';
      const progress = (normalizedTime - 0.6) / 0.1;
      compressionRatio = 10 - 7 * progress;
    } else {
      phase = 'RECOVERY';
      const progress = (normalizedTime - 0.7) / 0.3;
      compressionRatio = 3 - 2 * progress;
    }
    
    // Calculate conditions at this point
    temperature = baseTemperature * Math.pow(compressionRatio, 1.2);
    const electronDensity = baseElectronDensity * compressionRatio;
    const electricField = 1e8 * compressionRatio ** 2;
    
    // Calculate enhancement
    const enhancement = calculateTotalEnhancement({
      temperature,
      electronDensity,
      electricField,
      latticeConstant,
      material,
    });
    
    results.push({
      normalizedTime,
      phase,
      compressionRatio,
      temperature,
      electricField,
      enhancement: enhancement.total,
      breakdown: enhancement.breakdown,
    });
  }
  
  return results;
}

// =============================================================================
// MHD Proton Confinement Calculations (v0.2.2-beta)
// =============================================================================

/**
 * Calculate MHD confinement forces on a proton
 * Implements Lorentz force, Z-pinch, and pressure gradient forces
 * 
 * @param {Object} params - Proton position, velocity, and field parameters
 * @returns {Object} Force components and total force
 */
function calculateMHDForces(params) {
  const { position, velocity, cavitationPoint, compressionRatio = 1.0, bubbleRadius = 1e-6 } = params;
  const { E_CHARGE, MP } = PHYSICAL_CONSTANTS;
  
  // MU_0 for magnetic field calculations
  const MU_0 = 4 * Math.PI * 1e-7;
  
  // Direction and distance to cavitation point
  const dx = cavitationPoint[0] - position[0];
  const dy = cavitationPoint[1] - position[1];
  const dz = cavitationPoint[2] - position[2];
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz) + 1e-12;
  
  // Unit direction vector
  const dirX = dx / distance;
  const dirY = dy / distance;
  const dirZ = dz / distance;
  
  // Z-pinch azimuthal B-field: B_theta = mu_0 * I / (2 * pi * r)
  const pinchCurrent = 1.0; // Amperes (effective)
  const rPerp = Math.sqrt(dx*dx + dz*dz) + 1e-12;
  const B_theta = MU_0 * pinchCurrent / (2 * Math.PI * rPerp);
  
  // Azimuthal unit vector (perpendicular to radial in x-z plane)
  const thetaX = -dz / rPerp;
  const thetaZ = dx / rPerp;
  
  // Magnetic field vector (azimuthal component)
  const B = [B_theta * thetaX, 0, B_theta * thetaZ];
  
  // Radial electric field (toward cavitation point)
  const E0 = 1e8; // V/m reference field
  const E_magnitude = E0 * compressionRatio * compressionRatio / (distance * 1e6 + 1);
  const E = [-E_magnitude * dirX, -E_magnitude * dirY, -E_magnitude * dirZ];
  
  // Lorentz force: F = q(E + v x B)
  const vCrossB = [
    velocity[1] * B[2] - velocity[2] * B[1],
    velocity[2] * B[0] - velocity[0] * B[2],
    velocity[0] * B[1] - velocity[1] * B[0]
  ];
  
  const F_lorentz = [
    E_CHARGE * (E[0] + vCrossB[0]),
    E_CHARGE * (E[1] + vCrossB[1]),
    E_CHARGE * (E[2] + vCrossB[2])
  ];
  
  // Pressure gradient force (radially inward during collapse)
  const P_gradient = 1e10 * compressionRatio * compressionRatio / bubbleRadius; // Pa/m
  const V_proton = 4/3 * Math.PI * Math.pow(0.87e-15, 3);
  const F_pressure = [
    -V_proton * P_gradient * dirX,
    -V_proton * P_gradient * dirY,
    -V_proton * P_gradient * dirZ
  ];
  
  // Total force
  const F_total = [
    F_lorentz[0] + F_pressure[0],
    F_lorentz[1] + F_pressure[1],
    F_lorentz[2] + F_pressure[2]
  ];
  
  // Acceleration
  const acceleration = [F_total[0] / MP, F_total[1] / MP, F_total[2] / MP];
  
  return {
    total: F_total,
    lorentz: F_lorentz,
    pressure: F_pressure,
    B_field: B,
    E_field: E,
    acceleration,
    distance_to_cavitation: distance
  };
}

/**
 * Update vortex particle positions and vorticity
 * Inspired by VPFM (Vortex Particle Flow Maps) approach
 * 
 * @param {Object} params - Particles array and simulation parameters
 * @returns {Object} Updated particles and statistics
 */
function updateVortexParticles(params) {
  const {
    particles,
    dt,
    phase,
    compressionRatio = 1.0,
    cavitationPoint = [0, 0, 0],
    bubbleRadius = 1e-6
  } = params;
  
  const isCollapsing = phase === 'COLLAPSE' || phase === 'MINIMUM';
  const isRebounding = phase === 'REBOUND';
  
  const updatedParticles = particles.map(particle => {
    const pos = particle.position;
    const vel = particle.velocity;
    const vort = particle.vorticity || [0, 0, 0];
    
    // Calculate MHD forces
    const forces = calculateMHDForces({
      position: pos,
      velocity: vel,
      cavitationPoint,
      compressionRatio,
      bubbleRadius
    });
    
    // Update velocity
    const newVel = [
      vel[0] + forces.acceleration[0] * dt,
      vel[1] + forces.acceleration[1] * dt,
      vel[2] + forces.acceleration[2] * dt
    ];
    
    // Apply damping
    const damping = isCollapsing ? 0.95 : 0.98;
    newVel[0] *= damping;
    newVel[1] *= damping;
    newVel[2] *= damping;
    
    // Add spiral motion during collapse
    if (isCollapsing) {
      const dx = cavitationPoint[0] - pos[0];
      const dz = cavitationPoint[2] - pos[2];
      const rPerp = Math.sqrt(dx*dx + dz*dz) + 0.01;
      const spiralStrength = 0.01 * compressionRatio / rPerp;
      newVel[0] += (-dz / rPerp) * spiralStrength;
      newVel[2] += (dx / rPerp) * spiralStrength;
    }
    
    // Update position
    const newPos = [
      pos[0] + newVel[0] * dt,
      pos[1] + newVel[1] * dt,
      pos[2] + newVel[2] * dt
    ];
    
    // Vorticity evolution: stretching term (omega . grad)v
    // Simplified: increase during collapse, decay otherwise
    let vorticityMagnitude = Math.sqrt(vort[0]*vort[0] + vort[1]*vort[1] + vort[2]*vort[2]);
    if (isCollapsing) {
      vorticityMagnitude *= (1 + 0.1 * compressionRatio * dt);
    } else {
      vorticityMagnitude *= 0.99;
    }
    
    // Direction stays tangential
    const dx = cavitationPoint[0] - newPos[0];
    const dz = cavitationPoint[2] - newPos[2];
    const rPerp = Math.sqrt(dx*dx + dz*dz) + 0.01;
    const newVort = [
      (-dz / rPerp) * vorticityMagnitude,
      0,
      (dx / rPerp) * vorticityMagnitude
    ];
    
    // Determine state
    let state = 'dispersed';
    if (isCollapsing) {
      state = forces.distance_to_cavitation < 0.5 ? 'confined' :
              forces.distance_to_cavitation < 2 ? 'spiral' : 'converging';
    } else if (isRebounding) {
      state = 'reexpanding';
    }
    
    return {
      position: newPos,
      velocity: newVel,
      vorticity: newVort,
      state,
      distance_to_cavitation: forces.distance_to_cavitation
    };
  });
  
  // Calculate statistics
  const stateCounts = { dispersed: 0, converging: 0, spiral: 0, confined: 0, reexpanding: 0 };
  let totalVorticity = 0;
  let avgDistance = 0;
  
  updatedParticles.forEach(p => {
    stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
    totalVorticity += Math.sqrt(
      p.vorticity[0]*p.vorticity[0] + 
      p.vorticity[1]*p.vorticity[1] + 
      p.vorticity[2]*p.vorticity[2]
    );
    avgDistance += p.distance_to_cavitation;
  });
  
  avgDistance /= updatedParticles.length;
  
  return {
    particles: updatedParticles,
    statistics: {
      stateCounts,
      totalVorticity,
      avgVorticity: totalVorticity / updatedParticles.length,
      avgDistance
    }
  };
}

/**
 * Integrate multiple proton forces over time step
 * Uses Velocity Verlet for better accuracy
 * 
 * @param {Object} params - Particles and integration parameters
 * @returns {Array} Updated particle states
 */
function integrateProtonForces(params) {
  const { particles, dt, cavitationPoint, compressionRatio, bubbleRadius } = params;
  
  return particles.map(particle => {
    const pos = particle.position.slice();
    const vel = particle.velocity.slice();
    
    // Half-step velocity (Verlet)
    const forces1 = calculateMHDForces({
      position: pos,
      velocity: vel,
      cavitationPoint,
      compressionRatio,
      bubbleRadius
    });
    
    const halfVel = vel.map((v, i) => v + 0.5 * forces1.acceleration[i] * dt);
    const newPos = pos.map((p, i) => p + halfVel[i] * dt);
    
    // Full step velocity
    const forces2 = calculateMHDForces({
      position: newPos,
      velocity: halfVel,
      cavitationPoint,
      compressionRatio,
      bubbleRadius
    });
    
    const newVel = halfVel.map((v, i) => v + 0.5 * forces2.acceleration[i] * dt);
    
    return {
      position: newPos,
      velocity: newVel,
      forces: forces2
    };
  });
}

// Message handler
self.onmessage = function(e) {
  const { type, params, id } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'CALCULATE_ENHANCEMENT':
        result = calculateTotalEnhancement(params);
        break;
        
      case 'CALCULATE_SCREENING':
        result = calculateScreeningEnhancement(params.temperature, params.electronDensity);
        break;
        
      case 'CALCULATE_QED':
        result = calculateQEDEnhancement(params.electronDensity, params.temperature);
        break;
        
      case 'CALCULATE_CASIMIR':
        result = calculateCasimirEnhancement(params.latticeConstant, params.temperature);
        break;
        
      case 'CALCULATE_COHERENCE':
        result = calculateCoherenceEnhancement(params.temperature, params.latticeConstant, params.coherenceFactor);
        break;
        
      case 'CALCULATE_TUNNELING':
        result = calculateTunnelingProbability(
          params.energyKeV,
          params.z1 || 1,
          params.z2 || 1,
          params.a1 || 2,
          params.a2 || 2,
          params.screeningEV || 0
        );
        break;
        
      case 'CALCULATE_BUBBLE_COLLAPSE':
        result = calculateBubbleCollapse(
          params.initialRadius,
          params.drivingPressure,
          params.ambientPressure,
          params.temperature
        );
        break;
        
      case 'CALCULATE_TIME_SERIES':
        result = calculateEnhancementTimeSeries(params);
        break;
        
      case 'GET_MATERIAL_PROPERTIES':
        result = MATERIALS[params.material] || MATERIALS.palladium;
        break;
        
      case 'GET_CONSTANTS':
        result = PHYSICAL_CONSTANTS;
        break;
      
      // v0.2.2-beta: MHD and VPFM calculations
      case 'CALCULATE_MHD_FORCES':
        result = calculateMHDForces(params);
        break;
        
      case 'UPDATE_VORTEX_PARTICLES':
        result = updateVortexParticles(params);
        break;
        
      case 'INTEGRATE_FORCES':
        result = integrateProtonForces(params);
        break;
        
      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }
    
    self.postMessage({
      type: `${type}_RESULT`,
      result,
      id,
      success: true,
    });
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      id,
      success: false,
    });
  }
};

// Export functions for testing (if needed in Node environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateScreeningEnhancement,
    calculateQEDEnhancement,
    calculateCasimirEnhancement,
    calculateCoherenceEnhancement,
    calculateTunnelingProbability,
    calculateBubbleCollapse,
    calculateTotalEnhancement,
    calculateEnhancementTimeSeries,
    // v0.2.2-beta: MHD and VPFM functions
    calculateMHDForces,
    updateVortexParticles,
    integrateProtonForces,
    PHYSICAL_CONSTANTS,
    MATERIALS,
  };
}
