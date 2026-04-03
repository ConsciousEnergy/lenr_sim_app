/**
 * Custom Reactions Service for the LENR Simulation App
 * 
 * Provides specialized functions for managing custom fusion reactions,
 * including creation, validation, and templates for common reaction types.
 */

import physicsService from './physics';

/**
 * Validate if a fusion reaction's parameters are physically consistent
 * @param {Object} reaction - Reaction data to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
export const validateReaction = (reaction) => {
  const errors = [];
  
  // Check for required fields
  if (!reaction.name) {
    errors.push('Reaction name is required');
  }
  
  if (!Number.isInteger(reaction.reactant1_z) || reaction.reactant1_z < 0) {
    errors.push('Reactant 1 atomic number (Z) must be a non-negative integer');
  }
  
  if (!Number.isInteger(reaction.reactant1_a) || reaction.reactant1_a <= 0) {
    errors.push('Reactant 1 mass number (A) must be a positive integer');
  }
  
  if (!Number.isInteger(reaction.reactant2_z) || reaction.reactant2_z < 0) {
    errors.push('Reactant 2 atomic number (Z) must be a non-negative integer');
  }
  
  if (!Number.isInteger(reaction.reactant2_a) || reaction.reactant2_a <= 0) {
    errors.push('Reactant 2 mass number (A) must be a positive integer');
  }
  
  if (reaction.q_value <= 0) {
    errors.push('Q-value must be positive');
  }
  
  // Check products
  if (!reaction.products || !Array.isArray(reaction.products) || reaction.products.length === 0) {
    errors.push('At least one product is required');
  } else {
    // Calculate total charge and mass for conservation check
    const inputZ = reaction.reactant1_z + reaction.reactant2_z;
    const inputA = reaction.reactant1_a + reaction.reactant2_a;
    let outputZ = 0;
    let outputA = 0;
    
    // Validate each product
    for (let i = 0; i < reaction.products.length; i++) {
      const product = reaction.products[i];
      if (!product.name) {
        errors.push(`Product ${i + 1} must have a name`);
      }
      
      if (!Number.isInteger(product.z) || product.z < 0) {
        errors.push(`Product ${i + 1} atomic number (Z) must be a non-negative integer`);
      } else {
        outputZ += product.z * product.branch_ratio;
      }
      
      if (!Number.isInteger(product.a) || product.a <= 0) {
        errors.push(`Product ${i + 1} mass number (A) must be a positive integer`);
      } else {
        outputA += product.a * product.branch_ratio;
      }
      
      if (product.branch_ratio <= 0 || product.branch_ratio > 1) {
        errors.push(`Product ${i + 1} branch ratio must be between 0 and 1`);
      }
    }
    
    // Check conservation laws
    if (Math.abs(inputZ - outputZ) > 1e-10) {
      errors.push('Charge is not conserved in this reaction');
    }
    
    if (Math.abs(inputA - outputA) > 1e-10) {
      errors.push('Mass number is not conserved in this reaction');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get element symbol from atomic number
 * @param {number} z - Atomic number
 * @returns {string} Element symbol
 */
export const getElementSymbol = (z) => {
  const elements = [
    'n', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
    'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr'
  ];
  
  return z >= 0 && z < elements.length ? elements[z] : `Element${z}`;
};

/**
 * Format reaction as a text equation
 * @param {Object} reaction - Reaction data
 * @returns {string} Formatted reaction equation
 */
export const formatReactionEquation = (reaction) => {
  if (!reaction) return '';
  
  // Format reactants
  const reactant1 = `${reaction.reactant1_a}${getElementSymbol(reaction.reactant1_z)}`;
  const reactant2 = `${reaction.reactant2_a}${getElementSymbol(reaction.reactant2_z)}`;
  
  // Group products by branch
  const branches = {};
  
  if (reaction.products && reaction.products.length > 0) {
    reaction.products.forEach(product => {
      const ratio = product.branch_ratio;
      if (!branches[ratio]) {
        branches[ratio] = [];
      }
      branches[ratio].push(`${product.a}${getElementSymbol(product.z)}`);
    });
  }
  
  // Format each branch
  const branchStrings = Object.entries(branches).map(([ratio, products]) => {
    const productsStr = products.join(' + ');
    return ratio < 1 ? `${productsStr} (${Math.round(ratio * 100)}%)` : productsStr;
  });
  
  // Combine all branches
  return `${reactant1} + ${reactant2} → ${branchStrings.join(' or ')}`;
};

/**
 * Create a custom reaction template
 * @param {Object} params - Initial parameters for the reaction
 * @returns {Object} Reaction template
 */
export const createReactionTemplate = (params = {}) => {
  return {
    name: params.name || 'Custom Reaction',
    reactant1_z: params.reactant1_z || 1,
    reactant1_a: params.reactant1_a || 1,
    reactant2_z: params.reactant2_z || 1,
    reactant2_a: params.reactant2_a || 1,
    products: params.products || [
      { name: 'Product', z: 2, a: 2, branch_ratio: 1.0 }
    ],
    q_value: params.q_value || 1.0
  };
};

/**
 * Common fusion reaction templates
 */
export const REACTION_TEMPLATES = {
  deuteriumDeuterium: createReactionTemplate({
    name: 'Custom D-D',
    reactant1_z: 1,
    reactant1_a: 2,
    reactant2_z: 1,
    reactant2_a: 2,
    products: [
      { name: 'He3', z: 2, a: 3, branch_ratio: 0.5 },
      { name: 'n', z: 0, a: 1, branch_ratio: 0.5 },
      { name: 'T', z: 1, a: 3, branch_ratio: 0.5 },
      { name: 'p', z: 1, a: 1, branch_ratio: 0.5 }
    ],
    q_value: 4.03
  }),
  
  deuteriumTritium: createReactionTemplate({
    name: 'Custom D-T',
    reactant1_z: 1,
    reactant1_a: 2,
    reactant2_z: 1,
    reactant2_a: 3,
    products: [
      { name: 'He4', z: 2, a: 4, branch_ratio: 1.0 },
      { name: 'n', z: 0, a: 1, branch_ratio: 1.0 }
    ],
    q_value: 17.59
  }),
  
  protonBoron: createReactionTemplate({
    name: 'Custom p-B11',
    reactant1_z: 1,
    reactant1_a: 1,
    reactant2_z: 5,
    reactant2_a: 11,
    products: [
      { name: 'He4', z: 2, a: 4, branch_ratio: 3.0 }
    ],
    q_value: 8.7
  })
};

/**
 * Simulate reaction test results
 * This is a temporary implementation until we have a backend API for testing
 * @param {Object} reaction - Reaction to test
 * @returns {Promise<Object>} Promise resolving to test results
 */
const simulateTestResults = (reaction) => {
  // This is a placeholder implementation that creates realistic-looking test data
  // In a real implementation, this would call a backend API
  
  // Calculate total input/output Z and A
  const _inputZ = reaction.reactant1_z + reaction.reactant2_z;
  const inputA = reaction.reactant1_a + reaction.reactant2_a;
  
  // Calculate Coulomb barrier (approximation)
  const coulombBarrier = 1.44 * reaction.reactant1_z * reaction.reactant2_z / 
    (1.4 * (Math.pow(reaction.reactant1_a, 1/3) + Math.pow(reaction.reactant2_a, 1/3)));
  
  // Determine radiation products based on reaction products
  const radiationProducts = [];
  
  reaction.products.forEach(product => {
    // Add information for each product
    let type = '';
    let range = '';
    let shielding = '';
    
    if (product.z === 0 && product.a === 1) {
      // Neutron
      type = 'neutron radiation';
      range = 'high';
      shielding = 'requires thick hydrogen-rich materials';
    } else if (product.z === 1 && product.a === 0) {
      // Proton
      type = 'proton radiation';
      range = 'medium';
      shielding = 'requires dense materials';
    } else if (product.z === 2 && product.a === 4) {
      // Alpha particle
      type = 'alpha radiation';
      range = 'very short';
      shielding = 'minimal shielding required';
    } else if (product.z > 2) {
      // Heavy ion
      type = 'heavy ion';
      range = 'short';
      shielding = 'minimal shielding required';
    }
    
    if (type) {
      radiationProducts.push({
        name: `${product.a}${getElementSymbol(product.z)}`,
        type,
        energy: (reaction.q_value * product.a / inputA).toFixed(2),
        range,
        shielding
      });
    }
  });
  
  // Create simulated cross sections based on Coulomb barrier
  const lowCrossSection = coulombBarrier > 100 ? 
    "< 10⁻⁶" : coulombBarrier > 50 ? 
    "10⁻⁴" : "10⁻²";
    
  const highCrossSection = coulombBarrier > 200 ? 
    "10⁻⁴" : coulombBarrier > 100 ? 
    "10⁻²" : "10⁻¹";
  
  // Calculate energy distribution
  let energyDistribution = "unknown";
  if (reaction.products.length === 2) {
    // Binary reaction - energy distributed by mass ratio
    const p1 = reaction.products[0];
    const p2 = reaction.products[1];
    
    if (p1.a > 0 && p2.a > 0) {
      const p2Fraction = p1.a / (p1.a + p2.a);
      const p1Energy = (reaction.q_value * p2Fraction).toFixed(2);
      const p2Energy = (reaction.q_value * (1 - p2Fraction)).toFixed(2);
      energyDistribution = `${p1Energy} MeV to ${p1.a}${getElementSymbol(p1.z)}, ${p2Energy} MeV to ${p2.a}${getElementSymbol(p2.z)}`;
    }
  } else if (reaction.products.length === 1) {
    // Single product gets all energy
    energyDistribution = "100% to " + reaction.products[0].a + getElementSymbol(reaction.products[0].z);
  } else {
    // Complex distribution
    energyDistribution = "Complex multi-body distribution";
  }
  
  // Wait a bit to simulate network delay
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        reactionEquation: formatReactionEquation(reaction),
        qValue: reaction.q_value,
        energyDistribution,
        energyEfficiency: Math.min(0.85, 0.3 + Math.random() * 0.4),
        coulombBarrier,
        crossSection: {
          low: lowCrossSection,
          high: highCrossSection
        },
        radiationProducts,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  });
};

/**
 * Generate detailed test results for a reaction
 * @param {Object} reaction - The reaction to test
 * @param {Object} params - Test parameters
 * @returns {Promise<Object>} Promise resolving to detailed test results
 */
const generateDetailedTestResults = async (reaction, params) => {
  // This is an enhanced simulation that provides more detailed results
  // In a production environment, this would call a backend physics engine API
  
  const {
    temperature,
    density,
    duration,
    initialEnergy,
    confinementTime,
    magneticField: _magneticField,
    plasmaVolume: _plasmaVolume,
    parameterSweep,
    sweepParameter,
    sweepStart,
    sweepEnd,
    sweepSteps
  } = params;
  
  // Calculate base reaction metrics
  // Calculate total input/output Z and A
  const inputZ = reaction.reactant1_z + reaction.reactant2_z;
  const inputA = reaction.reactant1_a + reaction.reactant2_a;
  
  // Calculate Coulomb barrier (approximation)
  const coulombBarrier = 1.44 * reaction.reactant1_z * reaction.reactant2_z / 
    (1.4 * (Math.pow(reaction.reactant1_a, 1/3) + Math.pow(reaction.reactant2_a, 1/3)));
  
  // Calculate Gamow energy (approximation)
  const gamowEnergy = 0.12 * Math.pow(reaction.reactant1_z * reaction.reactant2_z * 
    (reaction.reactant1_a + reaction.reactant2_a) / (reaction.reactant1_a * reaction.reactant2_a), 1/3);
  
  // Calculate temperature-dependent cross-section (simplified model)
  const calculateCrossSection = (energy) => {
    // Simplified cross-section model
    const peak = coulombBarrier * 1.5; // approximate peak energy
    const width = peak * 0.5; // width of the peak
    
    // Gamow factor - quantum tunneling effect
    const gamowFactor = Math.exp(-gamowEnergy / Math.sqrt(energy));
    
    // Resonance factor - peaks at certain energy
    const resonanceFactor = width / (Math.pow(energy - peak, 2) + width * width / 4);
    
    // Combine factors
    return 1e-24 * resonanceFactor * gamowFactor * reaction.q_value;
  };
  
  // Calculate Maxwell-Boltzmann averaged cross-section (simplified model)
  const calculateMaxwellianCrossSection = (kT) => {
    // Very simplified approximation
    return calculateCrossSection(kT * 1.5) * Math.exp(-coulombBarrier / kT);
  };
  
  // Calculate reactivity (simplified model)
  const calculateReactivity = (kT) => {
    // Very simplified approximation
    const cs = calculateMaxwellianCrossSection(kT);
    const velocity = Math.sqrt(2 * kT * 1.602e-16 / (1.67e-27 * inputA / 2)); // in m/s
    return cs * velocity * 1e-6; // convert to cm³/s
  };
  
  // Calculate energy gain factor
  const calculateEnergyGain = (kT) => {
    const reactivity = calculateReactivity(kT);
    const powerOut = reactivity * density * density * reaction.q_value * 1.602e-13; // W/cm³
    const bremsstrahlung = 1e-31 * Math.sqrt(kT) * inputZ * inputZ * density * density; // W/cm³
    const confinementLoss = 3 * density * kT * 1.602e-16 / confinementTime; // W/cm³
    
    const powerIn = bremsstrahlung + confinementLoss;
    return powerOut / powerIn;
  };
  
  // Find optimal temperature
  const findOptimalTemperature = () => {
    let maxReactivity = 0;
    let optimalTemp = 0;
    
    for (let t = 1; t <= 200; t += 1) {
      const r = calculateReactivity(t);
      if (r > maxReactivity) {
        maxReactivity = r;
        optimalTemp = t;
      }
    }
    
    return optimalTemp;
  };
  
  // Generate cross-section data
  const generateCrossSectionData = () => {
    const data = [];
    const minEnergy = 0.1;
    const maxEnergy = coulombBarrier * 5;
    const steps = 100;
    
    const logMin = Math.log10(minEnergy);
    const logMax = Math.log10(maxEnergy);
    const stepSize = (logMax - logMin) / steps;
    
    // Find peak cross-section
    let peakCrossSection = 0;
    let peakEnergy = 0;
    
    for (let i = 0; i <= steps; i++) {
      const energy = Math.pow(10, logMin + i * stepSize);
      const crossSection = calculateCrossSection(energy);
      const maxwellianAverage = calculateMaxwellianCrossSection(energy);
      
      data.push({
        energy,
        crossSection,
        maxwellianAverage
      });
      
      if (crossSection > peakCrossSection) {
        peakCrossSection = crossSection;
        peakEnergy = energy;
      }
    }
    
    return {
      data,
      peakCrossSection,
      peakEnergy
    };
  };
  
  // Generate reactivity data
  const generateReactivityData = () => {
    const data = [];
    const steps = 50;
    
    for (let i = 0; i <= steps; i++) {
      const temp = 1 + i * 200 / steps;
      const reactivity = calculateReactivity(temp);
      
      // Add D-T reactivity for comparison (approximation)
      const dtReactivity = 1.1e-18 * Math.exp(-20 / Math.sqrt(temp)) * Math.pow(temp, -2/3);
      
      data.push({
        temperature: temp,
        reactivity,
        comparisonReactivity: dtReactivity
      });
    }
    
    return data;
  };
  
  // Generate energy distribution data
  const generateEnergyDistribution = () => {
    const data = [];
    const steps = 40;
    
    for (let i = 0; i <= steps; i++) {
      const energy = reaction.q_value * i / steps;
      
      // Create a simplified distribution curve
      let probability = 0;
      
      // For each product, add a contribution
      reaction.products.forEach(product => {
        const productEnergy = reaction.q_value * product.a / inputA;
        const spread = productEnergy * 0.1;
        
        // Add a gaussian peak for this product
        probability += product.branch_ratio * 
          Math.exp(-Math.pow(energy - productEnergy, 2) / (2 * spread * spread));
      });
      
      data.push({
        energy,
        probability
      });
    }
    
    return data;
  };
  
  // Generate energy over time data
  const generateEnergyOverTime = () => {
    const data = [];
    const steps = 20;
    
    let totalEnergy = initialEnergy;
    let ionEnergy = initialEnergy;
    let radiationEnergy = 0;
    
    for (let i = 0; i <= steps; i++) {
      const time = duration * i / steps;
      const reactivity = calculateReactivity(ionEnergy);
      
      // Fusion power generation
      const fusionPower = reactivity * density * density * reaction.q_value * 1.602e-13; // W/cm³
      
      // Energy losses
      const bremsstrahlung = 1e-31 * Math.sqrt(ionEnergy) * inputZ * inputZ * density * density; // W/cm³
      const confinementLoss = 3 * density * ionEnergy * 1.602e-16 / confinementTime; // W/cm³
      
      // Update energies
      const timeStep = duration / steps;
      ionEnergy += (fusionPower - bremsstrahlung - confinementLoss) * timeStep / (3 * density * 1.602e-16);
      radiationEnergy += bremsstrahlung * timeStep;
      totalEnergy = ionEnergy + radiationEnergy;
      
      data.push({
        time,
        totalEnergy,
        ionEnergy,
        radiationEnergy
      });
    }
    
    return data;
  };
  
  // Generate product distribution data
  const generateProductDistribution = () => {
    const data = reaction.products.map(product => {
      const productEnergy = reaction.q_value * product.a / inputA;
      
      return {
        name: `${product.a}${getElementSymbol(product.z)}`,
        energy: productEnergy,
        percentage: product.branch_ratio * 100
      };
    });
    
    return data;
  };
  
  // Calculate Lawson criterion
  const calculateLawsonCriterion = () => {
    // Simplified calculation
    const required = 1e16 / (reaction.q_value * calculateMaxwellianCrossSection(temperature));
    const achieved = density * confinementTime;
    
    return {
      required,
      achieved
    };
  };
  
  // Handle parameter sweep if enabled
  const generateSweepResults = () => {
    if (!parameterSweep) return null;
    
    const results = [];
    
    // Create a copy of the base parameters
    const baseParams = { ...params };
    
    // Calculate the step size
    const stepSize = (sweepEnd - sweepStart) / (sweepSteps - 1);
    
    // Generate data for each step
    for (let i = 0; i < sweepSteps; i++) {
      const parameterValue = sweepStart + i * stepSize;
      
      // Update the parameter in the copy
      baseParams[sweepParameter] = parameterValue;
      
      // Calculate key metrics for this parameter value
      let reactivity, powerDensity;
      
      switch (sweepParameter) {
        case 'temperature':
          reactivity = calculateReactivity(parameterValue);
          break;
        default:
          // For other parameters, use the base temperature
          reactivity = calculateReactivity(baseParams.temperature);
          break;
      }
      
      // Calculate power density
      powerDensity = reactivity * density * density * reaction.q_value * 1.602e-13; // W/cm³
      
      results.push({
        parameterValue,
        reactivity,
        powerDensity
      });
    }
    
    // Find optimal values
    let maxReactivity = 0;
    let maxReactivityValue = 0;
    let maxPowerDensity = 0;
    let maxPowerDensityValue = 0;
    
    results.forEach(result => {
      if (result.reactivity > maxReactivity) {
        maxReactivity = result.reactivity;
        maxReactivityValue = result.parameterValue;
      }
      
      if (result.powerDensity > maxPowerDensity) {
        maxPowerDensity = result.powerDensity;
        maxPowerDensityValue = result.parameterValue;
      }
    });
    
    return {
      results,
      optimalValues: {
        reactivity: {
          value: maxReactivityValue,
          reactivity: maxReactivity
        },
        powerDensity: {
          value: maxPowerDensityValue,
          powerDensity: maxPowerDensity
        }
      }
    };
  };
  
  // Assemble all results
  const optimalTemperature = findOptimalTemperature();
  const crossSectionResults = generateCrossSectionData();
  const reactivityData = generateReactivityData();
  const energyDistribution = generateEnergyDistribution();
  const energyOverTime = generateEnergyOverTime();
  const productDistribution = generateProductDistribution();
  const lawsonCriterion = calculateLawsonCriterion();
  const sweepResults = generateSweepResults();
  
  // Calculate main metrics
  const reactionRate = calculateReactivity(temperature);
  const powerDensity = reactionRate * density * density * reaction.q_value * 1.602e-13; // W/cm³
  const energyGain = calculateEnergyGain(temperature);
  const energyConfinement = confinementTime; // Simplified
  const fusionProbability = reactionRate * density * confinementTime;
  
  // Delay to simulate processing time
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        // Basic metrics
        reactionRate,
        powerDensity,
        energyGain,
        energyConfinement,
        optimalTemperature,
        fusionProbability,
        
        // Detailed data
        crossSectionData: crossSectionResults.data,
        peakCrossSection: crossSectionResults.peakCrossSection,
        peakCrossSectionEnergy: crossSectionResults.peakEnergy,
        gamowEnergy,
        reactivityData,
        energyDistribution,
        energyOverTime,
        productDistribution,
        lawsonCriterion,
        
        // Parameter sweep results
        sweepResults: sweepResults?.results || null,
        optimalValues: sweepResults?.optimalValues || null,
        
        // Metadata
        reaction: {
          name: reaction.name,
          equation: formatReactionEquation(reaction)
        },
        testParameters: params,
        timestamp: new Date().toISOString()
      });
    }, 2000); // Simulate 2 second processing time
  });
};

/**
 * Perform a comparison between the given reaction and standard fusion reactions
 * @param {Object} reaction - The reaction to compare
 * @param {Object} params - Test parameters
 * @returns {Promise<Object>} Promise resolving to comparison results
 */
const compareWithStandardReactions = async (reaction, params) => {
  // Standard reactions to compare with
  const standardReactions = [
    REACTION_TEMPLATES.deuteriumDeuterium,
    REACTION_TEMPLATES.deuteriumTritium,
    REACTION_TEMPLATES.protonBoron
  ];
  
  // Run tests for each standard reaction
  const standardResults = await Promise.all(
    standardReactions.map(async (stdReaction) => {
      const results = await generateDetailedTestResults(stdReaction, params);
      return {
        name: stdReaction.name,
        equation: formatReactionEquation(stdReaction),
        reactionRate: results.reactionRate,
        powerDensity: results.powerDensity,
        energyGain: results.energyGain,
        optimalTemperature: results.optimalTemperature,
        reactivityData: results.reactivityData.map(point => ({
          temperature: point.temperature,
          reactivity: point.reactivity
        }))
      };
    })
  );
  
  // Get results for the custom reaction
  const customResults = await generateDetailedTestResults(reaction, params);
  
  // Prepare comparison metrics
  const metrics = [
    {
      name: 'Reaction Rate',
      unit: 'cm³/s',
      custom: customResults.reactionRate,
      standard: standardResults.map(r => ({
        name: r.name,
        value: r.reactionRate
      })),
      formatter: (value) => value.toExponential(3)
    },
    {
      name: 'Power Density',
      unit: 'W/cm³',
      custom: customResults.powerDensity,
      standard: standardResults.map(r => ({
        name: r.name,
        value: r.powerDensity
      })),
      formatter: (value) => value.toFixed(3)
    },
    {
      name: 'Energy Gain Factor (Q)',
      unit: '',
      custom: customResults.energyGain,
      standard: standardResults.map(r => ({
        name: r.name,
        value: r.energyGain
      })),
      formatter: (value) => value.toFixed(2)
    },
    {
      name: 'Optimal Temperature',
      unit: 'keV',
      custom: customResults.optimalTemperature,
      standard: standardResults.map(r => ({
        name: r.name,
        value: r.optimalTemperature
      })),
      formatter: (value) => value.toFixed(1)
    }
  ];
  
  // Prepare reactivity comparison data
  const reactivityComparison = {
    customReaction: {
      name: reaction.name,
      data: customResults.reactivityData
    },
    standardReactions: standardResults.map(r => ({
      name: r.name,
      data: r.reactivityData
    }))
  };
  
  // Return comparison results
  return {
    metrics,
    reactivityComparison,
    customReaction: {
      name: reaction.name,
      equation: formatReactionEquation(reaction)
    },
    testParameters: params,
    timestamp: new Date().toISOString()
  };
};

/**
 * Reactions service for managing custom fusion reactions
 */
const reactionsService = {
  /**
   * Create a new custom reaction
   * @param {Object} reaction - Reaction data
   * @returns {Promise<Object>} Promise resolving to created reaction
   */
  createReaction: (reaction) => {
    return physicsService.addCustomReaction(reaction);
  },
  
  /**
   * Get all custom reactions
   * @returns {Promise<Array>} Promise resolving to list of custom reactions
   */
  getCustomReactions: () => {
    return physicsService.getCustomReactions();
  },
  
  /**
   * Get details of a specific reaction
   * @param {string} reactionName - Name of the reaction
   * @returns {Promise<Object>} Promise resolving to reaction details
   */
  getReactionDetails: (reactionName) => {
    return physicsService.getReactionDetails(reactionName);
  },
  
  /**
   * Delete a custom reaction
   * @param {string} reactionName - Name of the reaction to delete
   * @returns {Promise<Object>} Promise resolving to success message
   */
  deleteReaction: (reactionName) => {
    return physicsService.removeCustomReaction(reactionName);
  },
  
  /**
   * Get all available reactions (both default and custom)
   * @returns {Promise<Array>} Promise resolving to list of all reactions
   */
  getAllReactions: () => {
    return physicsService.getReactions();
  },
  
  /**
   * Validate a reaction object
   * @param {Object} reaction - Reaction to validate
   * @returns {Object} Validation result
   */
  validateReaction,
  
  /**
   * Format a reaction as a text equation
   * @param {Object} reaction - Reaction to format
   * @returns {string} Formatted equation
   */
  formatReactionEquation,
  
  /**
   * Get a reaction template
   * @param {string} templateName - Name of the template to use
   * @returns {Object} Reaction template
   */
  getTemplate: (templateName) => {
    return REACTION_TEMPLATES[templateName] || createReactionTemplate();
  },
  
  /**
   * Test a reaction
   * @param {Object} reaction - Reaction to test
   * @returns {Promise<Object>} Promise resolving to test results
   */
  testReaction: (reaction) => {
    // In the future, this would call a backend API
    // For now, we'll use a simulation function
    return simulateTestResults(reaction);
  },
  
  /**
   * Create a reaction template
   * Simply calls the createReactionTemplate function
   * @param {Object} params - Parameters for the template
   * @returns {Object} New reaction template
   */
  createTemplate: (params) => {
    return createReactionTemplate(params);
  },
  
  /**
   * Run detailed test on a reaction
   * @param {Object} params - Test configuration with reaction and parameters
   * @returns {Promise<Object>} Promise resolving to detailed test results
   */
  runDetailedTest: (params) => {
    return generateDetailedTestResults(params.reaction, params.params);
  },
  
  /**
   * Compare a reaction with standard fusion reactions
   * @param {Object} reaction - Reaction to compare
   * @param {Object} params - Test parameters
   * @returns {Promise<Object>} Promise resolving to comparison results
   */
  compareWithStandardReactions: (reaction, params) => {
    return compareWithStandardReactions(reaction, params);
  }
};

export default reactionsService; 