/**
 * Quantum coherence enhancement
 */

import { PHYSICAL_CONSTANTS } from './constants.js';

export function calculateCoherenceEnhancement(temperature, latticeConstant, coherenceFactor = 0.5) {
  const { HBAR, KB, AMU } = PHYSICAL_CONSTANTS;

  const mD = 2.014 * AMU;
  const thermalWavelength = Math.sqrt(2 * Math.PI * HBAR ** 2 / (mD * KB * Math.max(temperature, 1)));
  const coherenceLength = thermalWavelength * coherenceFactor;
  const volumeRatio = Math.pow(coherenceLength / latticeConstant, 3);
  const nCoherent = Math.min(100, Math.max(1, volumeRatio));
  const coherenceEnhancement = Math.sqrt(nCoherent);
  const tempFactor = 1 + Math.exp(-temperature / 500);

  return {
    enhancement: Math.max(1.0, coherenceEnhancement * tempFactor),
    thermalWavelength,
    coherenceLength,
    coherentParticles: nCoherent,
    temperatureFactor: tempFactor,
  };
}
