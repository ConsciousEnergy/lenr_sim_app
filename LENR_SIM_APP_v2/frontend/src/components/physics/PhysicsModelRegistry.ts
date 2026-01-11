/**
 * Physics Model Registry
 * 
 * A centralized registry for all available physics models in the application.
 * Models are registered with metadata including parameters, compatibility 
 * requirements, and documentation.
 */

import { PhysicsParameter } from './PhysicsParameterInput';
import { ParameterDocumentationData } from './ParameterDocumentation';

/**
 * Physics model category types
 */
export type PhysicsModelCategory = 
  | 'quantum'
  | 'classical'
  | 'hybrid'
  | 'statistical'
  | 'molecular'
  | 'lattice';

/**
 * Compatibility requirements for a physics model
 */
export interface ModelCompatibility {
  requiredParameters: string[];
  incompatibleModels: string[];
  temperatureRange?: { min: number; max: number };
  pressureRange?: { min: number; max: number };
  otherRequirements?: Record<string, any>;
}

/**
 * Physics model reference information
 */
export interface ModelReference {
  authors: string[];
  title: string;
  publication?: string;
  year: number;
  doi?: string;
  url?: string;
}

/**
 * Complete physics model definition
 */
export interface PhysicsModel {
  id: string;
  name: string;
  description: string;
  category: PhysicsModelCategory;
  parameters: PhysicsParameter[];
  compatibility: ModelCompatibility;
  documentation?: ParameterDocumentationData;
  references?: ModelReference[];
  version: string;
  tags: string[];
  complexity: 'low' | 'medium' | 'high';
  computeIntensity: 'low' | 'medium' | 'high';
  estimatedRuntime?: string;
}

/**
 * Registry class to store and manage physics models
 */
class ModelRegistry {
  private models: Map<string, PhysicsModel> = new Map();

  /**
   * Register a new physics model
   */
  register(model: PhysicsModel): void {
    if (this.models.has(model.id)) {
      console.warn(`Model with ID ${model.id} already exists in registry. Overwriting.`);
    }
    this.models.set(model.id, model);
  }

  /**
   * Get a physics model by ID
   */
  getModel(id: string): PhysicsModel | undefined {
    return this.models.get(id);
  }

  /**
   * Get all registered models
   */
  getAllModels(): PhysicsModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models filtered by category
   */
  getModelsByCategory(category: PhysicsModelCategory): PhysicsModel[] {
    return this.getAllModels().filter(model => model.category === category);
  }

  /**
   * Get models filtered by tag
   */
  getModelsByTag(tag: string): PhysicsModel[] {
    return this.getAllModels().filter(model => model.tags.includes(tag));
  }

  /**
   * Check if a model is compatible with the current parameter values
   */
  checkModelCompatibility(
    modelId: string, 
    currentParameters: Record<string, number | string>
  ): { compatible: boolean; issues: string[] } {
    const model = this.getModel(modelId);
    if (!model) {
      return { 
        compatible: false, 
        issues: [`Model with ID ${modelId} not found`] 
      };
    }

    const { compatibility } = model;
    const issues: string[] = [];

    // Check required parameters
    for (const param of compatibility.requiredParameters) {
      if (!(param in currentParameters)) {
        issues.push(`Missing required parameter: ${param}`);
      }
    }

    // Check temperature range
    if (compatibility.temperatureRange && 'temperature' in currentParameters) {
      const temp = Number(currentParameters.temperature);
      const { min, max } = compatibility.temperatureRange;
      if (temp < min || temp > max) {
        issues.push(`Temperature ${temp}K is outside the valid range (${min}-${max}K) for this model`);
      }
    }

    // Check pressure range
    if (compatibility.pressureRange && 'pressure' in currentParameters) {
      const pressure = Number(currentParameters.pressure);
      const { min, max } = compatibility.pressureRange;
      if (pressure < min || pressure > max) {
        issues.push(`Pressure ${pressure} is outside the valid range (${min}-${max}) for this model`);
      }
    }

    // Check other requirements
    if (compatibility.otherRequirements) {
      for (const [key, requirement] of Object.entries(compatibility.otherRequirements)) {
        // This would need custom logic based on the requirement type
        // For now just check if the parameter exists
        if (!(key in currentParameters)) {
          issues.push(`Parameter required by model: ${key}`);
        }
      }
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }
}

// Create and export singleton instance
export const physicsModelRegistry = new ModelRegistry();

/**
 * Sample models for testing and demonstration
 */
const sampleModels: PhysicsModel[] = [
  {
    id: 'quantum_tunneling_basic',
    name: 'Basic Quantum Tunneling Model',
    description: 'A simplified quantum tunneling model for deuterium in metal lattices',
    category: 'quantum',
    parameters: [
      {
        name: 'screeningFactor',
        label: 'Electron Screening Factor',
        value: 5.0,
        min: 1.0,
        max: 100.0,
        step: 0.5,
        unit: '',
        description: 'Enhancement factor for electron screening effect',
        validation: (value: number) => value > 0 || 'Screening factor must be positive'
      },
      {
        name: 'tunnelDistance',
        label: 'Tunneling Distance',
        value: 0.74, // Å
        min: 0.1,
        max: 5.0,
        step: 0.01,
        unit: 'Å',
        description: 'Mean distance for quantum tunneling effect',
        validation: (value: number) => value > 0 || 'Tunneling distance must be positive'
      }
    ],
    compatibility: {
      requiredParameters: ['temperature', 'latticeConstant'],
      incompatibleModels: ['classical_diffusion'],
      temperatureRange: { min: 50, max: 500 },
    },
    version: '1.0.0',
    tags: ['quantum', 'tunneling', 'beginner'],
    complexity: 'low',
    computeIntensity: 'low',
    estimatedRuntime: '<1s',
    references: [
      {
        authors: ['Fleischmann, M.', 'Pons, S.'],
        title: 'Electrochemically induced nuclear fusion of deuterium',
        publication: 'Journal of Electroanalytical Chemistry',
        year: 1989,
        doi: '10.1016/0022-0728(89)80006-3'
      }
    ]
  },
  {
    id: 'lattice_phonon_model',
    name: 'Phonon-Deuterium Coupling Model',
    description: 'Models the interactions between lattice phonons and deuterium nuclei',
    category: 'lattice',
    parameters: [
      {
        name: 'phononFrequency',
        label: 'Phonon Frequency',
        value: 7.5e12, // Hz
        min: 1e12,
        max: 1e14,
        step: 1e11,
        unit: 'Hz',
        description: 'Characteristic frequency of lattice phonons',
        validation: (value: number) => value > 0 || 'Frequency must be positive'
      },
      {
        name: 'couplingStrength',
        label: 'Coupling Strength',
        value: 0.2,
        min: 0.01,
        max: 0.99,
        step: 0.01,
        unit: '',
        description: 'Strength of phonon-deuterium coupling (0-1)',
        validation: (value: number) => 
          value > 0 && value < 1 ? true : 'Value must be between 0 and 1'
      }
    ],
    compatibility: {
      requiredParameters: ['temperature', 'latticeConstant', 'defectConcentration'],
      incompatibleModels: [],
      temperatureRange: { min: 100, max: 800 },
      pressureRange: { min: 0.1, max: 50 }
    },
    version: '1.2.1',
    tags: ['lattice', 'phonon', 'intermediate'],
    complexity: 'medium',
    computeIntensity: 'medium',
    estimatedRuntime: '5-10s'
  },
  {
    id: 'hybrid_statistical_model',
    name: 'Hybrid Quantum-Statistical Model',
    description: 'A combined quantum and statistical approach to modeling LENR phenomena',
    category: 'hybrid',
    parameters: [
      {
        name: 'quantumWeight',
        label: 'Quantum Component Weight',
        value: 0.7,
        min: 0,
        max: 1,
        step: 0.05,
        unit: '',
        description: 'Relative weight of quantum component in the hybrid model (0-1)',
        validation: (value: number) => 
          value >= 0 && value <= 1 ? true : 'Value must be between 0 and 1'
      },
      {
        name: 'interactionRange',
        label: 'Interaction Range',
        value: 5.0, // Å
        min: 1.0,
        max: 20.0,
        step: 0.1,
        unit: 'Å',
        description: 'Maximum range of nuclear interactions',
        validation: (value: number) => value > 0 || 'Range must be positive'
      },
      {
        name: 'resonanceWidth',
        label: 'Resonance Width',
        value: 0.05, // eV
        min: 0.001,
        max: 1.0,
        step: 0.001,
        unit: 'eV',
        description: 'Width of energy resonance for reactions',
        validation: (value: number) => value > 0 || 'Width must be positive'
      }
    ],
    compatibility: {
      requiredParameters: [
        'temperature', 
        'pressure', 
        'deuteriumLoading',
        'screeningFactor',
        'activationEnergy'
      ],
      incompatibleModels: [],
      temperatureRange: { min: 200, max: 1000 },
      pressureRange: { min: 0.5, max: 100 }
    },
    version: '2.1.0',
    tags: ['hybrid', 'statistical', 'advanced', 'comprehensive'],
    complexity: 'high',
    computeIntensity: 'high',
    estimatedRuntime: '30-60s'
  }
];

// Register sample models
sampleModels.forEach(model => physicsModelRegistry.register(model));

export default physicsModelRegistry; 