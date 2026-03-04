/**
 * Electron screening enhancement calculations
 * Aligned with backend app/physics/electron_screening.py
 *
 * Uses Debye and Thomas-Fermi screening (PlasmaPy/Ashcroft-Mermin conventions).
 * Enhancement via Assenbaum formula: f = exp(π η Ue / E)
 */

import { PHYSICAL_CONSTANTS } from './constants.js';

// kB in eV/K for Assenbaum energy scaling
const KB_EV = 8.617333262e-5;

export function calculateScreeningEnhancement(temperature, electronDensity, options = {}) {
  const { KB, EPS0, E_CHARGE, HBAR, ME, ALPHA } = PHYSICAL_CONSTANTS;

  const thermalEnergy = KB * Math.max(temperature, 1);

  // Debye length: λ_D = √(ε₀ k_B T / (n_e e²))
  const debyeLength = Math.sqrt(EPS0 * thermalEnergy / (electronDensity * E_CHARGE ** 2));

  // Thomas-Fermi length (PlasmaPy/Ashcroft-Mermin): λ_TF = √(2 ε₀ E_F / (3 n_e e²))
  const E_F = (HBAR ** 2 / (2 * ME)) * Math.pow(3 * Math.PI ** 2 * electronDensity, 2 / 3);
  const fermiTFLength = Math.sqrt(2 * EPS0 * E_F / (3 * electronDensity * E_CHARGE ** 2));

  const effectiveLength = Math.min(debyeLength, fermiTFLength);

  // Screening potential Ue (positive, eV): Ue = e² / (4π ε₀ λ)
  const Ue_J = E_CHARGE ** 2 / (4 * Math.PI * EPS0 * effectiveLength);
  const screeningPotential = Ue_J / E_CHARGE; // eV

  const plasmaFrequency = Math.sqrt(electronDensity * E_CHARGE ** 2 / (EPS0 * ME));

  // Assenbaum enhancement: f = exp(π η Ue / E) with η = Z₁Z₂ α √(μc²/(2E))
  const z1 = options.z1 ?? 1;
  const z2 = options.z2 ?? 1;
  const reducedMassAmu = options.reducedMassAmu ?? 1; // D-D
  const energyEv = options.energyEv ?? KB_EV * Math.max(temperature, 1);

  let enhancement = 1.0;
  if (energyEv > 0 && screeningPotential > 0) {
    const muC2Ev = reducedMassAmu * 931.494e6;
    const eta = z1 * z2 * ALPHA * Math.sqrt(muC2Ev / (2 * energyEv));
    let exponent = Math.PI * eta * screeningPotential / energyEv;
    exponent = Math.max(-700, Math.min(700, exponent));
    enhancement = Math.exp(exponent);
    enhancement = Math.min(enhancement, 1e15);

    const dynamicFactor = 1 + 0.5 * Math.pow((HBAR * plasmaFrequency) / thermalEnergy, 2);
    enhancement *= dynamicFactor;
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
    screeningPotential,
  };
}
