/**
 * Physics Unit Conversion System
 * 
 * Provides utilities for converting between different units commonly used in physics
 * and LENR simulations, with support for temperature, pressure, length, energy, and time units.
 */

// Type definitions for units
export type TemperatureUnit = 'K' | '°C' | '°F';
export type PressureUnit = 'atm' | 'Pa' | 'bar' | 'torr' | 'psi';
export type LengthUnit = 'Å' | 'nm' | 'pm' | 'µm' | 'mm' | 'm';
export type EnergyUnit = 'eV' | 'keV' | 'MeV' | 'J' | 'kJ';
export type TimeUnit = 's' | 'ms' | 'µs' | 'ns' | 'ps' | 'fs';
export type PowerUnit = 'W' | 'kW' | 'MW' | 'GW';
export type MassUnit = 'kg' | 'g' | 'mg' | 'u'; // u = atomic mass unit

export type UnitType = 
  | 'temperature'
  | 'pressure'
  | 'length'
  | 'energy'
  | 'time'
  | 'power'
  | 'mass';

export type UnitMap = {
  temperature: TemperatureUnit;
  pressure: PressureUnit;
  length: LengthUnit;
  energy: EnergyUnit;
  time: TimeUnit;
  power: PowerUnit;
  mass: MassUnit;
};

export type UnitFamily = keyof UnitMap;
export type Unit = UnitMap[UnitFamily];

/**
 * Determines if two units are compatible (can be converted between each other)
 */
export function areUnitsCompatible(fromUnit: string, toUnit: string): boolean {
  // Match units to their categories
  const categories: Record<string, UnitFamily> = {
    // Temperature units
    'K': 'temperature',
    '°C': 'temperature',
    '°F': 'temperature',
    
    // Pressure units
    'atm': 'pressure',
    'Pa': 'pressure',
    'bar': 'pressure',
    'torr': 'pressure',
    'psi': 'pressure',
    
    // Length units
    'Å': 'length',
    'nm': 'length',
    'pm': 'length',
    'µm': 'length',
    'mm': 'length',
    'm': 'length',
    
    // Energy units
    'eV': 'energy',
    'keV': 'energy',
    'MeV': 'energy',
    'J': 'energy',
    'kJ': 'energy',
    
    // Time units
    's': 'time',
    'ms': 'time',
    'µs': 'time',
    'ns': 'time',
    'ps': 'time',
    'fs': 'time',
    
    // Power units
    'W': 'power',
    'kW': 'power',
    'MW': 'power',
    'GW': 'power',
    
    // Mass units
    'kg': 'mass',
    'g': 'mass',
    'mg': 'mass',
    'u': 'mass'
  };
  
  const fromCategory = categories[fromUnit];
  const toCategory = categories[toUnit];
  
  // Units are compatible if they belong to the same category
  return fromCategory !== undefined && 
         toCategory !== undefined && 
         fromCategory === toCategory;
}

/**
 * Get the base unit for a given unit family
 */
export function getBaseUnit(unitFamily: UnitFamily): Unit {
  const baseUnits: Record<UnitFamily, Unit> = {
    temperature: 'K',      // Kelvin
    pressure: 'Pa',        // Pascal
    length: 'm',           // Meter
    energy: 'J',           // Joule
    time: 's',             // Second
    power: 'W',            // Watt
    mass: 'kg'             // Kilogram
  };
  
  return baseUnits[unitFamily];
}

/**
 * Get the unit family for a given unit
 */
export function getUnitFamily(unit: string): UnitFamily | null {
  if (['K', '°C', '°F'].includes(unit)) return 'temperature';
  if (['atm', 'Pa', 'bar', 'torr', 'psi'].includes(unit)) return 'pressure';
  if (['Å', 'nm', 'pm', 'µm', 'mm', 'm'].includes(unit)) return 'length';
  if (['eV', 'keV', 'MeV', 'J', 'kJ'].includes(unit)) return 'energy';
  if (['s', 'ms', 'µs', 'ns', 'ps', 'fs'].includes(unit)) return 'time';
  if (['W', 'kW', 'MW', 'GW'].includes(unit)) return 'power';
  if (['kg', 'g', 'mg', 'u'].includes(unit)) return 'mass';
  return null;
}

/**
 * Get a user-friendly name for a unit
 */
export function getUnitName(unit: string): string {
  const unitNames: Record<string, string> = {
    // Temperature
    'K': 'Kelvin',
    '°C': 'Celsius',
    '°F': 'Fahrenheit',
    
    // Pressure
    'atm': 'Atmosphere',
    'Pa': 'Pascal',
    'bar': 'Bar',
    'torr': 'Torr',
    'psi': 'Pounds per Square Inch',
    
    // Length
    'Å': 'Angstrom',
    'nm': 'Nanometer',
    'pm': 'Picometer',
    'µm': 'Micrometer',
    'mm': 'Millimeter',
    'm': 'Meter',
    
    // Energy
    'eV': 'Electron Volt',
    'keV': 'Kilo-electron Volt',
    'MeV': 'Mega-electron Volt',
    'J': 'Joule',
    'kJ': 'Kilojoule',
    
    // Time
    's': 'Second',
    'ms': 'Millisecond',
    'µs': 'Microsecond',
    'ns': 'Nanosecond',
    'ps': 'Picosecond',
    'fs': 'Femtosecond',
    
    // Power
    'W': 'Watt',
    'kW': 'Kilowatt',
    'MW': 'Megawatt',
    'GW': 'Gigawatt',
    
    // Mass
    'kg': 'Kilogram',
    'g': 'Gram',
    'mg': 'Milligram',
    'u': 'Atomic Mass Unit'
  };
  
  return unitNames[unit] || unit;
}

/**
 * Convert a value from one unit to another
 */
export function convertUnit(
  value: number, 
  fromUnit: string, 
  toUnit: string
): number {
  // First check if units are compatible
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Cannot convert between incompatible units: ${fromUnit} and ${toUnit}`);
  }
  
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return value;
  }
  
  // Temperature conversions
  if (getUnitFamily(fromUnit) === 'temperature') {
    return convertTemperature(value, fromUnit as TemperatureUnit, toUnit as TemperatureUnit);
  }
  
  // Convert to base unit first, then to target unit
  const baseValue = convertToBaseUnit(value, fromUnit);
  return convertFromBaseUnit(baseValue, toUnit);
}

/**
 * Convert a temperature value between different temperature units
 */
function convertTemperature(
  value: number, 
  fromUnit: TemperatureUnit, 
  toUnit: TemperatureUnit
): number {
  // Convert to Kelvin first (base unit)
  let kelvin: number;
  
  switch (fromUnit) {
    case 'K':
      kelvin = value;
      break;
    case '°C':
      kelvin = value + 273.15;
      break;
    case '°F':
      kelvin = (value + 459.67) * 5/9;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${fromUnit}`);
  }
  
  // Convert from Kelvin to target unit
  switch (toUnit) {
    case 'K':
      return kelvin;
    case '°C':
      return kelvin - 273.15;
    case '°F':
      return kelvin * 9/5 - 459.67;
    default:
      throw new Error(`Unknown temperature unit: ${toUnit}`);
  }
}

/**
 * Convert a value to its base unit
 */
function convertToBaseUnit(value: number, unit: string): number {
  switch (unit) {
    // Pressure units to Pascal (Pa)
    case 'atm':
      return value * 101325;
    case 'bar':
      return value * 100000;
    case 'torr':
      return value * 133.322;
    case 'psi':
      return value * 6894.76;
    case 'Pa':
      return value;
      
    // Length units to meter (m)
    case 'Å':
      return value * 1e-10;
    case 'nm':
      return value * 1e-9;
    case 'pm':
      return value * 1e-12;
    case 'µm':
      return value * 1e-6;
    case 'mm':
      return value * 1e-3;
    case 'm':
      return value;
      
    // Energy units to Joule (J)
    case 'eV':
      return value * 1.602176634e-19;
    case 'keV':
      return value * 1.602176634e-16;
    case 'MeV':
      return value * 1.602176634e-13;
    case 'kJ':
      return value * 1000;
    case 'J':
      return value;
      
    // Time units to second (s)
    case 'ms':
      return value * 1e-3;
    case 'µs':
      return value * 1e-6;
    case 'ns':
      return value * 1e-9;
    case 'ps':
      return value * 1e-12;
    case 'fs':
      return value * 1e-15;
    case 's':
      return value;
      
    // Power units to Watt (W)
    case 'kW':
      return value * 1e3;
    case 'MW':
      return value * 1e6;
    case 'GW':
      return value * 1e9;
    case 'W':
      return value;
      
    // Mass units to kilogram (kg)
    case 'g':
      return value * 1e-3;
    case 'mg':
      return value * 1e-6;
    case 'u': // atomic mass unit to kg
      return value * 1.66053906660e-27;
    case 'kg':
      return value;
      
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Convert a value from its base unit to another unit
 */
function convertFromBaseUnit(baseValue: number, toUnit: string): number {
  switch (toUnit) {
    // Pascal (Pa) to pressure units
    case 'atm':
      return baseValue / 101325;
    case 'bar':
      return baseValue / 100000;
    case 'torr':
      return baseValue / 133.322;
    case 'psi':
      return baseValue / 6894.76;
    case 'Pa':
      return baseValue;
      
    // Meter (m) to length units
    case 'Å':
      return baseValue / 1e-10;
    case 'nm':
      return baseValue / 1e-9;
    case 'pm':
      return baseValue / 1e-12;
    case 'µm':
      return baseValue / 1e-6;
    case 'mm':
      return baseValue / 1e-3;
    case 'm':
      return baseValue;
      
    // Joule (J) to energy units
    case 'eV':
      return baseValue / 1.602176634e-19;
    case 'keV':
      return baseValue / 1.602176634e-16;
    case 'MeV':
      return baseValue / 1.602176634e-13;
    case 'kJ':
      return baseValue / 1000;
    case 'J':
      return baseValue;
      
    // Second (s) to time units
    case 'ms':
      return baseValue / 1e-3;
    case 'µs':
      return baseValue / 1e-6;
    case 'ns':
      return baseValue / 1e-9;
    case 'ps':
      return baseValue / 1e-12;
    case 'fs':
      return baseValue / 1e-15;
    case 's':
      return baseValue;
      
    // Watt (W) to power units
    case 'kW':
      return baseValue / 1e3;
    case 'MW':
      return baseValue / 1e6;
    case 'GW':
      return baseValue / 1e9;
    case 'W':
      return baseValue;
      
    // Kilogram (kg) to mass units
    case 'g':
      return baseValue / 1e-3;
    case 'mg':
      return baseValue / 1e-6;
    case 'u': // kg to atomic mass unit
      return baseValue / 1.66053906660e-27;
    case 'kg':
      return baseValue;
      
    default:
      throw new Error(`Unknown unit: ${toUnit}`);
  }
}

/**
 * Format a number with a unit to a human-readable string
 */
export function formatWithUnit(
  value: number, 
  unit: string, 
  precision: number = 3
): string {
  // Handle very small or very large numbers with scientific notation
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
    return `${value.toExponential(precision)} ${unit}`;
  }
  
  // For normal numbers use fixed precision
  return `${value.toFixed(precision)} ${unit}`;
}

/**
 * Get available units for a given unit family
 */
export function getAvailableUnits(unitFamily: UnitFamily): Unit[] {
  switch (unitFamily) {
    case 'temperature':
      return ['K', '°C', '°F'];
    case 'pressure':
      return ['atm', 'Pa', 'bar', 'torr', 'psi'];
    case 'length':
      return ['Å', 'nm', 'pm', 'µm', 'mm', 'm'];
    case 'energy':
      return ['eV', 'keV', 'MeV', 'J', 'kJ'];
    case 'time':
      return ['s', 'ms', 'µs', 'ns', 'ps', 'fs'];
    case 'power':
      return ['W', 'kW', 'MW', 'GW'];
    case 'mass':
      return ['kg', 'g', 'mg', 'u'];
    default:
      return [];
  }
}

/**
 * Return both value and unit for a parameter in the desired unit
 */
export function convertParameter(
  value: number, 
  fromUnit: string, 
  toUnit: string
): { value: number, unit: string } {
  return {
    value: convertUnit(value, fromUnit, toUnit),
    unit: toUnit
  };
}

const PhysicsUnitConverter = {
  convertUnit,
  convertParameter,
  areUnitsCompatible,
  getBaseUnit,
  getUnitFamily,
  getUnitName,
  getAvailableUnits,
  formatWithUnit
};

export default PhysicsUnitConverter; 