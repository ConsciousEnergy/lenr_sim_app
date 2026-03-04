/**
 * WKB tunneling and nuclear cross-section calculations
 */

import { PHYSICAL_CONSTANTS } from './constants.js';

export function calculateTunnelingProbability(energyKeV, z1, z2, a1, a2, screeningEV = 0) {
  const { HBAR, E_CHARGE, EPS0, AMU } = PHYSICAL_CONSTANTS;

  const m1 = a1 * AMU;
  const m2 = a2 * AMU;
  const mu = (m1 * m2) / (m1 + m2);
  const KEV_TO_J = E_CHARGE * 1000;
  const EV_TO_J = E_CHARGE;
  const effectiveEnergy = (energyKeV + screeningEV / 1000) * KEV_TO_J;

  if (effectiveEnergy <= 0) {
    return { probability: 0, gamowFactor: Infinity };
  }

  const eta = (z1 * z2 * E_CHARGE ** 2) / (4 * Math.PI * EPS0 * HBAR * Math.sqrt(2 * effectiveEnergy / mu));
  const gamowFactor = 2 * Math.PI * eta;
  const probability = Math.exp(-gamowFactor);
  const rTurn = (z1 * z2 * E_CHARGE ** 2) / (4 * Math.PI * EPS0 * effectiveEnergy);
  const barrierHeightJ = (z1 * z2 * E_CHARGE ** 2) / (4 * Math.PI * EPS0 * 2e-15);
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

export function computeNuclearCrossSection(E_keV, reaction, screeningEnergyKeV) {
  reaction = reaction || 'D(d,n)He3';
  screeningEnergyKeV = screeningEnergyKeV || 0;
  const { AMU, C, E_CHARGE } = PHYSICAL_CONSTANTS;
  const PI = Math.PI;
  const alpha = 7.2973525693e-3;
  const DD_SFACTOR = { 'D(d,n)He3': { S_0: 52.9 }, 'D(d,p)T': { S_0: 55.2 }, 'D(d,gamma)He4': { S_0: 5.5e-6 } };
  const rp = DD_SFACTOR[reaction] || DD_SFACTOR['D(d,n)He3'];
  const E_eff = E_keV + screeningEnergyKeV;
  if (E_eff <= 0) return { S_factor_keV_b: 0, cross_section_barn: 0, cross_section_m2: 0, penetration_probability: 0 };
  const M_DEUTERON = 2.01410177811 * AMU;
  const mu_amu = M_DEUTERON / (2 * AMU);
  const mu_c2_keV = mu_amu * AMU * C * C / (1e3 * E_CHARGE);
  const eta = alpha * Math.sqrt(mu_c2_keV / (2 * E_eff));
  const penetration = Math.exp(-2 * PI * eta);
  const S = rp.S_0;
  const sigma_barn = S * penetration / E_eff;
  return { S_factor_keV_b: S, cross_section_barn: sigma_barn, cross_section_m2: sigma_barn * 1e-28, penetration_probability: penetration };
}
