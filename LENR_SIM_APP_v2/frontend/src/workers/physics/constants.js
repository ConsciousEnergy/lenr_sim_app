/**
 * Physical constants and material properties for LENR physics calculations
 * CODATA 2018 values
 */

// Physical constants (SI units) - CODATA 2018
export const PHYSICAL_CONSTANTS = {
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
export const MATERIALS = {
  palladium: {
    electronDensity: 6.8e28,    // m^-3
    latticeConstant: 3.89e-10,  // m
    debyeTemperature: 275,      // K
    workFunction: 5.12,         // eV
    screeningEnergy: 310,       // eV (D-Pd anomalous, LENR)
  },
  nickel: {
    electronDensity: 9.1e28,
    latticeConstant: 3.52e-10,
    debyeTemperature: 450,
    workFunction: 5.15,
    screeningEnergy: 200,       // eV (Ni-H anomalous)
  },
  titanium: {
    electronDensity: 1.0e29,
    latticeConstant: 2.95e-10,
    debyeTemperature: 420,
    workFunction: 4.33,
    screeningEnergy: 65,        // eV (Ti-D anomalous)
  },
};
