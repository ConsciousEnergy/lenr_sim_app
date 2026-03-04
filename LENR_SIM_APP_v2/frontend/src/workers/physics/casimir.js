/**
 * Casimir effect enhancement for nanoscale geometries
 */

import { PHYSICAL_CONSTANTS } from './constants.js';

export function calculateCasimirEnhancement(latticeConstant, temperature) {
  const { HBAR, C, KB } = PHYSICAL_CONSTANTS;

  const thermalWavelength = HBAR * C / (KB * Math.max(temperature, 1));
  const casimirLength = latticeConstant * 0.5;
  const casimirEnergy = -HBAR * C * Math.PI / (720 * casimirLength ** 3);

  let tempFactor = 1.0;
  if (thermalWavelength > 0) {
    tempFactor = Math.tanh(Math.PI * casimirLength / thermalWavelength);
  }

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
