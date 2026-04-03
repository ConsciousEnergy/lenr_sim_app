/**
 * QED vacuum polarization enhancement
 */

import { PHYSICAL_CONSTANTS } from './constants.js';

export function calculateQEDEnhancement(electronDensity, temperature) {
  const { ME, C, HBAR, E_CHARGE, EPS0, ALPHA } = PHYSICAL_CONSTANTS;

  const eCritical = ME ** 2 * C ** 3 / (HBAR * E_CHARGE);
  const localField = Math.sqrt(electronDensity) * E_CHARGE / (4 * Math.PI * EPS0);
  const fieldRatio = localField / eCritical;
  const vpFactor = 1 + (2 * ALPHA / (3 * Math.PI)) * fieldRatio ** 2;
  const tempCorrection = 1 + 0.1 * Math.tanh(temperature / 1000);

  return {
    enhancement: vpFactor * tempCorrection,
    vacuumPolarization: vpFactor,
    temperatureCorrection: tempCorrection,
    fieldRatio,
  };
}
