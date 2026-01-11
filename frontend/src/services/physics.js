/**
 * Physics API service for the LENR Simulation App
 * 
 * Provides functions for interacting with the physics-related backend API endpoints,
 * including fusion reactions, enhancement calculations, and more.
 */

import api from './api';

const PHYSICS_BASE = '/physics';

/**
 * Physics service for accessing fusion reactions and physics calculations
 */
const physicsService = {
  /**
   * Get all available fusion reactions
   * @returns {Promise<Array>} Promise resolving to list of available reactions
   */
  getReactions: () => {
    return api.get(`${PHYSICS_BASE}/reactions`);
  },
  
  /**
   * Get default fusion reactions
   * @returns {Promise<Array>} Promise resolving to list of default reactions
   */
  getDefaultReactions: () => {
    return api.get(`${PHYSICS_BASE}/reactions/default`);
  },
  
  /**
   * Get custom fusion reactions
   * @returns {Promise<Array>} Promise resolving to list of custom reactions
   */
  getCustomReactions: () => {
    return api.get(`${PHYSICS_BASE}/reactions/custom`);
  },
  
  /**
   * Get details of a specific reaction
   * @param {string} reactionName - Name of the reaction
   * @returns {Promise<Object>} Promise resolving to reaction details
   */
  getReactionDetails: (reactionName) => {
    return api.get(`${PHYSICS_BASE}/reactions/${reactionName}`);
  },
  
  /**
   * Add a custom fusion reaction
   * @param {Object} reaction - Reaction data
   * @returns {Promise<Object>} Promise resolving to created reaction
   */
  addCustomReaction: (reaction) => {
    return api.post(`${PHYSICS_BASE}/reactions/custom`, reaction);
  },
  
  /**
   * Remove a custom fusion reaction
   * @param {string} reactionName - Name of the reaction to remove
   * @returns {Promise<Object>} Promise resolving to success message
   */
  removeCustomReaction: (reactionName) => {
    return api.delete(`${PHYSICS_BASE}/reactions/custom/${reactionName}`);
  },
  
  /**
   * Calculate fusion reaction rate
   * @param {string} reactionName - Name of the reaction
   * @param {Object} conditions - Reaction conditions
   * @param {Object} enhancementFactors - Optional enhancement factors
   * @returns {Promise<Object>} Promise resolving to calculation results
   */
  calculateReactionRate: (reactionName, conditions, enhancementFactors = null) => {
    return api.post(`${PHYSICS_BASE}/calculate/rate`, {
      reaction_name: reactionName,
      conditions,
      enhancement_factors: enhancementFactors
    });
  },
  
  /**
   * Calculate fusion rates across multiple temperatures
   * @param {string} reactionName - Name of the reaction
   * @param {Array<number>} temperatures - List of temperatures in Kelvin
   * @param {number} density - Particle density in m^-3
   * @param {Object} enhancementFactors - Optional enhancement factors
   * @returns {Promise<Object>} Promise resolving to calculation results
   */
  calculateTemperatureScan: (reactionName, temperatures, density, enhancementFactors = null) => {
    return api.post(`${PHYSICS_BASE}/calculate/temperature-scan`, {
      reaction_name: reactionName,
      temperatures,
      density,
      enhancement_factors: enhancementFactors
    });
  },
  
  /**
   * Find optimal temperature for maximum reaction rate
   * @param {string} reactionName - Name of the reaction
   * @param {Array<number>} temperatureRange - [min, max] temperature range in Kelvin
   * @param {number} density - Particle density in m^-3
   * @param {Object} enhancementFactors - Optional enhancement factors
   * @returns {Promise<Object>} Promise resolving to optimization results
   */
  optimizeTemperature: (reactionName, temperatureRange, density, enhancementFactors = null) => {
    return api.post(`${PHYSICS_BASE}/optimize/temperature`, {
      reaction_name: reactionName,
      temperature_range: temperatureRange,
      density,
      enhancement_factors: enhancementFactors
    });
  },
  
  /**
   * Analyze contribution of each mechanism to the total enhancement
   * @param {string} reactionName - Name of the reaction
   * @param {number} temperature - Temperature in Kelvin
   * @param {number} density - Particle density in m^-3
   * @param {Array<string>} mechanisms - Optional list of mechanisms to analyze
   * @returns {Promise<Object>} Promise resolving to analysis results
   */
  analyzeMechanisms: (reactionName, temperature, density, mechanisms = null) => {
    return api.post(`${PHYSICS_BASE}/analyze-mechanisms`, {
      reaction_name: reactionName,
      temperature,
      density,
      mechanisms
    });
  },
  
  /**
   * Get available enhancement mechanisms
   * @returns {Promise<Object>} Promise resolving to list of mechanisms and requirements
   */
  getAvailableMechanisms: () => {
    return api.get(`${PHYSICS_BASE}/available-mechanisms`);
  },
  
  /**
   * Get default configuration for enhancement calculations
   * @returns {Promise<Object>} Promise resolving to default configuration
   */
  getDefaultConfiguration: () => {
    return api.get(`${PHYSICS_BASE}/default-configuration`);
  },
  
  /**
   * Calculate enhancement factors
   * @param {Object} config - Configuration parameters for each mechanism
   * @param {Array<string>} mechanisms - Optional list of mechanisms to include
   * @returns {Promise<Object>} Promise resolving to enhancement calculation results
   */
  calculateEnhancement: (config, mechanisms = null) => {
    return api.post(`${PHYSICS_BASE}/calculate-enhancement`, {
      config,
      mechanisms
    });
  },
  
  /**
   * Calculate material-based enhancement factors
   * @param {string} materialName - Name of the material
   * @param {number} temperature - Temperature in Kelvin
   * @param {number} pressure - Pressure in Pa
   * @param {number} electricField - Electric field in V/m
   * @param {Array<string>} mechanisms - Optional list of mechanisms to include
   * @returns {Promise<Object>} Promise resolving to enhancement results
   */
  calculateMaterialEnhancement: (materialName, temperature, pressure, electricField = 0, mechanisms = null) => {
    return api.post(`${PHYSICS_BASE}/material-enhancement`, {
      material_name: materialName,
      temperature,
      pressure,
      electric_field: electricField,
      mechanisms
    });
  },
  
  /**
   * Get quantum tunneling parameter presets
   * @returns {Promise<Object>} Promise resolving to tunneling presets
   */
  getTunnelingPresets: () => {
    return api.get(`${PHYSICS_BASE}/tunneling-presets`);
  },
  
  /**
   * Calculate quantum tunneling probability
   * @param {Object} parameters - Tunneling parameters
   * @returns {Promise<Object>} Promise resolving to tunneling calculation results
   */
  calculateQuantumTunneling: (parameters) => {
    return api.post(`${PHYSICS_BASE}/quantum-tunneling`, parameters);
  },
  
  /**
   * Calculate phonon dispersion
   * @param {Object} latticeParams - Lattice parameters
   * @param {string} direction - Direction in the Brillouin zone
   * @returns {Promise<Object>} Promise resolving to phonon dispersion results
   */
  calculatePhononDispersion: (latticeParams, direction = "100") => {
    return api.post(`${PHYSICS_BASE}/phonon-dispersion`, {
      lattice_params: latticeParams,
      direction
    });
  },
  
  /**
   * Get lattice parameter presets
   * @returns {Promise<Object>} Promise resolving to lattice presets
   */
  getLatticePresets: () => {
    return api.get(`${PHYSICS_BASE}/lattice-presets`);
  }
};

export default physicsService; 