/**
 * Physics Constraints and Validation Functions
 * 
 * This module provides advanced validation functions for physics parameters 
 * to ensure they respect physical constraints and laws.
 */

import { PhysicsParameter } from './PhysicsParameterInput';

/**
 * Boltzmann constant in eV/K
 */
export const BOLTZMANN_CONSTANT = 8.617333262e-5; // eV/K

/**
 * Avogadro's number
 */
export const AVOGADRO_NUMBER = 6.02214076e23; // mol^-1

/**
 * Planck constant in eV·s
 */
export const PLANCK_CONSTANT = 4.135667696e-15; // eV·s

/**
 * Speed of light in m/s
 */
export const SPEED_OF_LIGHT = 299792458; // m/s

/**
 * Elementary charge in C
 */
export const ELEMENTARY_CHARGE = 1.602176634e-19; // C

/**
 * Electron mass in kg
 */
export const ELECTRON_MASS = 9.1093837015e-31; // kg

/**
 * Proton mass in kg
 */
export const PROTON_MASS = 1.67262192369e-27; // kg

/**
 * Neutron mass in kg
 */
export const NEUTRON_MASS = 1.67492749804e-27; // kg

/**
 * Deuteron mass in kg
 */
export const DEUTERON_MASS = 3.3435837724e-27; // kg

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates that temperature results in thermal energy lower than activation energy
 */
export function validateThermalEnergyConstraint(
  temperature: number,
  activationEnergy: number
): ValidationResult {
  const thermalEnergy = temperature * BOLTZMANN_CONSTANT; // in eV
  
  if (thermalEnergy >= activationEnergy) {
    return {
      isValid: false,
      message: `Thermal energy (${thermalEnergy.toExponential(3)} eV) exceeds activation energy (${activationEnergy} eV). At this temperature, classical reaction would dominate over quantum tunneling.`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates that the lattice constant is physically reasonable for the material
 */
export function validateLatticeConstant(
  latticeConstant: number,
  latticeType: string = 'FCC'
): ValidationResult {
  // Typical ranges in Angstroms for common materials in LENR experiments
  const ranges: Record<string, [number, number]> = {
    'FCC': [3.5, 4.2],    // Typical for Pd
    'BCC': [2.8, 3.3],    // Typical for β-PdH
    'HCP': [2.5, 3.2],    // Theoretical for some hydrides
    'Diamond': [3.5, 5.8]  // Some semiconductor materials
  };
  
  const range = ranges[latticeType] || [2.0, 6.0];
  
  if (latticeConstant < range[0] || latticeConstant > range[1]) {
    return {
      isValid: false,
      message: `Lattice constant ${latticeConstant} Å is outside typical range for ${latticeType} (${range[0]}-${range[1]} Å)`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates deuterium loading ratio against physical limits
 */
export function validateDeuteriumLoading(
  deuteriumLoading: number,
  temperature: number,
  pressure: number
): ValidationResult {
  // High D/Pd ratios become physically unrealistic without sufficient pressure
  // This is a simplified model - real behavior is more complex
  const maxLoadingAtTempAndPressure = (0.8 + (pressure * 0.01)) * Math.exp(-0.0005 * Math.max(0, temperature - 300));
  
  if (deuteriumLoading > maxLoadingAtTempAndPressure) {
    return {
      isValid: false,
      message: `Deuterium loading ${deuteriumLoading} exceeds the physically realistic maximum of ${maxLoadingAtTempAndPressure.toFixed(2)} for the given temperature and pressure.`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates that screening factor is consistent with temperature and material
 */
export function validateScreeningFactor(
  screeningFactor: number,
  temperature: number
): ValidationResult {
  // Screening should generally decrease with increasing temperature
  // Basic model: maxScreening ∝ 1/√T
  const maxReasonableScreening = 50 * Math.pow(300 / temperature, 0.5);
  
  if (screeningFactor > maxReasonableScreening) {
    return {
      isValid: false,
      message: `Screening factor ${screeningFactor} is unrealistically high for temperature ${temperature} K. Maximum reasonable value would be ~${maxReasonableScreening.toFixed(1)}.`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates that quantum coherence time is consistent with temperature
 */
export function validateCoherenceTime(
  coherenceTime: number,
  temperature: number
): ValidationResult {
  // Quantum coherence time decreases with increasing temperature
  // Approximate relation: coherence ∝ ħ/(kB*T)
  const maxCoherenceTime = 1e-12 * (300 / temperature);
  
  if (coherenceTime > maxCoherenceTime) {
    return {
      isValid: false,
      message: `Coherence time ${coherenceTime.toExponential(2)} s is unrealistically long for ${temperature} K. Maximum reasonable value would be ~${maxCoherenceTime.toExponential(2)} s.`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates energy conservation in reaction parameters
 */
export function validateEnergyConservation(
  initialEnergy: number,
  activationEnergy: number,
  reactionEnergy: number
): ValidationResult {
  // For fusion reactions, released energy should be much higher than initial and activation energies
  if (reactionEnergy <= initialEnergy) {
    return {
      isValid: false,
      message: `Reaction energy (${reactionEnergy} eV) must be greater than initial energy (${initialEnergy} eV) to be energetically favorable.`
    };
  }
  
  // D-D fusion typically releases around 3.27 MeV (3.27e6 eV)
  // If the value is within an order of magnitude from 1 MeV to 50 MeV it's reasonable
  if (reactionEnergy < 1e6 || reactionEnergy > 5e7) {
    return {
      isValid: false,
      message: `Reaction energy ${reactionEnergy} eV is outside typical fusion energy range (1-50 MeV). D-D fusion typically releases ~3.27 MeV.`
    };
  }
  
  return { isValid: true };
}

/**
 * Cross-validates multiple parameters to ensure they form a physically consistent set
 */
export function validateParameterSet(parameters: Record<string, number | string>): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Temperature vs Activation Energy
  if (parameters.temperature && parameters.activationEnergy) {
    results.push({
      ...validateThermalEnergyConstraint(
        parameters.temperature as number, 
        parameters.activationEnergy as number
      ),
      parameterGroup: 'temperature-activation'
    } as ValidationResult);
  }
  
  // Lattice constant validation
  if (parameters.latticeConstant && parameters.latticeType) {
    results.push({
      ...validateLatticeConstant(
        parameters.latticeConstant as number, 
        parameters.latticeType as string
      ),
      parameterGroup: 'lattice'
    } as ValidationResult);
  }
  
  // Deuterium loading validation
  if (parameters.deuteriumLoading && parameters.temperature && parameters.pressure) {
    results.push({
      ...validateDeuteriumLoading(
        parameters.deuteriumLoading as number, 
        parameters.temperature as number, 
        parameters.pressure as number
      ),
      parameterGroup: 'loading'
    } as ValidationResult);
  }
  
  // Screening factor validation
  if (parameters.screeningFactor && parameters.temperature) {
    results.push({
      ...validateScreeningFactor(
        parameters.screeningFactor as number, 
        parameters.temperature as number
      ),
      parameterGroup: 'screening'
    } as ValidationResult);
  }
  
  // Coherence time validation
  if (parameters.coherenceTime && parameters.temperature) {
    results.push({
      ...validateCoherenceTime(
        parameters.coherenceTime as number, 
        parameters.temperature as number
      ),
      parameterGroup: 'quantum'
    } as ValidationResult);
  }
  
  // Energy conservation
  if (parameters.initialEnergy && parameters.activationEnergy && parameters.reactionEnergy) {
    results.push({
      ...validateEnergyConservation(
        parameters.initialEnergy as number, 
        parameters.activationEnergy as number, 
        parameters.reactionEnergy as number
      ),
      parameterGroup: 'energy'
    } as ValidationResult);
  }
  
  return results;
}

/**
 * Converts validation results to a flat array of error messages
 */
export function getValidationErrors(validationResults: ValidationResult[]): string[] {
  return validationResults
    .filter(result => !result.isValid)
    .map(result => result.message || 'Invalid parameter set');
}

export default {
  validateThermalEnergyConstraint,
  validateLatticeConstant,
  validateDeuteriumLoading,
  validateScreeningFactor,
  validateCoherenceTime,
  validateEnergyConservation,
  validateParameterSet,
  getValidationErrors,
  constants: {
    BOLTZMANN_CONSTANT,
    AVOGADRO_NUMBER,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    ELEMENTARY_CHARGE,
    ELECTRON_MASS,
    PROTON_MASS,
    NEUTRON_MASS,
    DEUTERON_MASS
  }
}; 