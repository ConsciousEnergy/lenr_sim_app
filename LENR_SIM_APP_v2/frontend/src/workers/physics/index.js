/**
 * Physics WebWorker for LENR Simulation - Entry Point
 * Offloads heavy physics calculations from the main UI thread.
 */

/* eslint-disable no-restricted-globals */

import { PHYSICAL_CONSTANTS, MATERIALS } from './constants.js';
import { calculateScreeningEnhancement } from './screening.js';
import { calculateQEDEnhancement } from './qed.js';
import { calculateCasimirEnhancement } from './casimir.js';
import { calculateCoherenceEnhancement } from './coherence.js';
import { calculateTunnelingProbability, computeNuclearCrossSection } from './tunneling.js';
import { calculateBubbleCollapse, calculateMHDForces, updateVortexParticles, integrateProtonForces } from './mhd.js';

function calculateTotalEnhancement(params) {
  const { temperature = 300, electronDensity = 6.8e28, electricField = 1e6, latticeConstant = 3.89e-10, coherenceFactor = 0.5, material = 'palladium' } = params;
  const materialProps = MATERIALS[material] || MATERIALS.palladium;
  const effectiveElectronDensity = electronDensity || materialProps.electronDensity;
  const effectiveLatticeConstant = latticeConstant || materialProps.latticeConstant;
  const screening = calculateScreeningEnhancement(temperature, effectiveElectronDensity);
  const qed = calculateQEDEnhancement(effectiveElectronDensity, temperature);
  const casimir = calculateCasimirEnhancement(effectiveLatticeConstant, temperature);
  const coherence = calculateCoherenceEnhancement(temperature, effectiveLatticeConstant, coherenceFactor);
  const factors = [screening.enhancement, qed.enhancement, casimir.enhancement, coherence.enhancement];
  const validFactors = factors.filter(f => f > 0 && isFinite(f));
  let totalEnhancement = 1.0;
  if (validFactors.length > 0) {
    const logSum = validFactors.reduce((sum, f) => sum + Math.log(f), 0);
    totalEnhancement = Math.exp(logSum / validFactors.length) * validFactors.length;
  }
  if (totalEnhancement > 1e10) totalEnhancement = 1e10 * Math.log10(1 + totalEnhancement / 1e10);
  return {
    total: Math.max(1.0, totalEnhancement),
    breakdown: { screening: screening.enhancement, qed: qed.enhancement, casimir: casimir.enhancement, coherence: coherence.enhancement },
    details: { screening, qed, casimir, coherence },
    parameters: { temperature, electronDensity: effectiveElectronDensity, electricField, latticeConstant, material },
  };
}

function calculateEnhancementTimeSeries(params) {
  const { baseTemperature = 300, baseElectronDensity = 6.8e28, latticeConstant = 3.89e-10, initialRadius = 10e-6, drivingPressure = 1.5e5, ambientPressure = 101325, frequency = 20e3, numPoints = 50, material = 'palladium' } = params;
  const period = 1 / frequency;
  const results = [];
  for (let i = 0; i < numPoints; i++) {
    const normalizedTime = i / numPoints;
    const t = normalizedTime * period;
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
    temperature = baseTemperature * Math.pow(compressionRatio, 1.2);
    const electronDensity = baseElectronDensity * compressionRatio;
    const electricField = 1e8 * compressionRatio ** 2;
    const enhancement = calculateTotalEnhancement({ temperature, electronDensity, electricField, latticeConstant, material });
    results.push({ normalizedTime, phase, compressionRatio, temperature, electricField, enhancement: enhancement.total, breakdown: enhancement.breakdown });
  }
  return results;
}

self.onmessage = function(e) {
  const { type, params, id } = e.data;
  try {
    let result;
    switch (type) {
      case 'CALCULATE_ENHANCEMENT': result = calculateTotalEnhancement(params); break;
      case 'CALCULATE_SCREENING': result = calculateScreeningEnhancement(params.temperature, params.electronDensity); break;
      case 'CALCULATE_QED': result = calculateQEDEnhancement(params.electronDensity, params.temperature); break;
      case 'CALCULATE_CASIMIR': result = calculateCasimirEnhancement(params.latticeConstant, params.temperature); break;
      case 'CALCULATE_COHERENCE': result = calculateCoherenceEnhancement(params.temperature, params.latticeConstant, params.coherenceFactor); break;
      case 'COMPUTE_NUCLEAR_CROSS_SECTION': result = computeNuclearCrossSection(params.E_keV, params.reaction, params.screeningEnergyKeV); break;
      case 'CALCULATE_TUNNELING': result = calculateTunnelingProbability(params.energyKeV, params.z1||1, params.z2||1, params.a1||2, params.a2||2, params.screeningEV||0); break;
      case 'CALCULATE_BUBBLE_COLLAPSE': result = calculateBubbleCollapse(params.initialRadius, params.drivingPressure, params.ambientPressure, params.temperature); break;
      case 'CALCULATE_TIME_SERIES': result = calculateEnhancementTimeSeries(params); break;
      case 'GET_MATERIAL_PROPERTIES': result = MATERIALS[params.material] || MATERIALS.palladium; break;
      case 'GET_CONSTANTS': result = PHYSICAL_CONSTANTS; break;
      case 'CALCULATE_MHD_FORCES': result = calculateMHDForces(params); break;
      case 'UPDATE_VORTEX_PARTICLES': result = updateVortexParticles(params); break;
      case 'INTEGRATE_FORCES': result = integrateProtonForces(params); break;
      default: throw new Error(`Unknown calculation type: ${type}`);
    }
    self.postMessage({ type: `${type}_RESULT`, result, id, success: true });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: error.message, id, success: false });
  }
};
