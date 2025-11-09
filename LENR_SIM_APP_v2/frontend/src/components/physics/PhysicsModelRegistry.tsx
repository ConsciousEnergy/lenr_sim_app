/**
 * Physics Model Registry
 * 
 * This module provides a registry for organizing and accessing physics models.
 * It handles model categories, compatibility checking, and retrieving model information.
 */

// Model categories - can be expanded as needed
export type PhysicsModelCategory = 
  | 'LENR' 
  | 'Classical' 
  | 'Quantum' 
  | 'Experimental';

// Reference information for scholarly citations
export interface PhysicsModelReference {
  title: string;
  authors?: string;
  year?: number;
  url?: string;
  doi?: string;
}

// Compatibility rule type for model validation
export interface CompatibilityRule {
  check: (params: Record<string, any>) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Core physics model interface
export interface PhysicsModel {
  id: string;
  name: string;
  description: string;
  category: PhysicsModelCategory;
  compatibilityRules?: CompatibilityRule[];
  tags?: string[];
  references?: PhysicsModelReference[];
  defaultParameters?: Record<string, any>;
  version?: string;
  author?: string;
}

/**
 * The PhysicsModelRegistry class manages available physics models
 * and provides methods for model selection, filtering, and compatibility checking.
 */
class PhysicsModelRegistry {
  private models: Map<string, PhysicsModel> = new Map();
  
  /**
   * Register a new physics model in the registry
   */
  registerModel(model: PhysicsModel): void {
    if (this.models.has(model.id)) {
      console.warn(`Model with ID ${model.id} already exists and will be overwritten.`);
    }
    this.models.set(model.id, model);
  }
  
  /**
   * Get a model by its ID
   */
  getModel(modelId: string): PhysicsModel | undefined {
    return this.models.get(modelId);
  }
  
  /**
   * Get all registered models
   */
  getAllModels(): PhysicsModel[] {
    return Array.from(this.models.values());
  }
  
  /**
   * Filter models by category
   */
  getModelsByCategory(category: PhysicsModelCategory): PhysicsModel[] {
    return this.getAllModels().filter(model => model.category === category);
  }
  
  /**
   * Filter models by tag
   */
  getModelsByTag(tag: string): PhysicsModel[] {
    return this.getAllModels().filter(model => model.tags?.includes(tag));
  }
  
  /**
   * Check if a model is compatible with the current parameters
   * Returns { compatible: boolean, issues: string[] }
   */
  checkModelCompatibility(
    modelId: string, 
    parameters: Record<string, any>
  ): { compatible: boolean; issues: string[] } {
    const model = this.getModel(modelId);
    if (!model) {
      return { 
        compatible: false, 
        issues: ['Error: Model not found'] 
      };
    }
    
    // If no compatibility rules, assume compatible
    if (!model.compatibilityRules || model.compatibilityRules.length === 0) {
      return { 
        compatible: true, 
        issues: ['Info: No compatibility checks defined for this model']
      };
    }
    
    // Check each rule
    const issues: string[] = [];
    
    model.compatibilityRules.forEach(rule => {
      if (!rule.check(parameters)) {
        const prefix = rule.severity === 'error' ? 'Error: ' :
                      rule.severity === 'warning' ? 'Warning: ' : 'Info: ';
        issues.push(`${prefix}${rule.message}`);
      }
    });
    
    // Model is compatible if there are no error-level issues
    const hasErrors = issues.some(issue => issue.startsWith('Error:'));
    
    return {
      compatible: !hasErrors,
      issues
    };
  }
  
  /**
   * Get default parameters for a model
   */
  getModelDefaultParameters(modelId: string): Record<string, any> | undefined {
    return this.getModel(modelId)?.defaultParameters;
  }
}

// Create singleton instance
const physicsModelRegistry = new PhysicsModelRegistry();

// Example models - in a real application, these would be loaded dynamically or from a config
const exampleModels: PhysicsModel[] = [
  {
    id: 'widom-larsen',
    name: 'Widom-Larsen Theory',
    description: 'A theory based on weak interaction catalyzed by neutrons for explaining LENR phenomena.',
    category: 'LENR',
    tags: ['neutron catalysis', 'weak interaction'],
    references: [
      {
        title: 'Ultra low momentum neutron catalyzed nuclear reactions on metallic hydride surfaces',
        authors: 'Widom A., Larsen L.',
        year: 2006,
        url: 'https://arxiv.org/abs/cond-mat/0505026'
      }
    ],
    compatibilityRules: [
      {
        check: (params) => params.temperature && params.temperature <= 500,
        message: 'Model is designed for temperatures below 500K',
        severity: 'warning'
      }
    ]
  },
  {
    id: 'classical-pd-d',
    name: 'Classical Palladium-Deuterium',
    description: 'Classical model for palladium-deuterium interactions in LENR experiments.',
    category: 'Classical',
    tags: ['palladium', 'deuterium', 'electrochemical'],
    references: [
      {
        title: 'Review of experimental observations about the cold fusion effect',
        authors: 'Storms E.',
        year: 2010
      }
    ],
    compatibilityRules: [
      {
        check: (params) => params.material && params.material === 'palladium',
        message: 'This model requires palladium as the host material',
        severity: 'error'
      }
    ]
  },
  {
    id: 'quantum-coherence',
    name: 'Quantum Coherence Model',
    description: 'Quantum physics model explaining LENR via coherent quantum effects in metal lattices.',
    category: 'Quantum',
    tags: ['quantum', 'coherence', 'lattice'],
    references: [
      {
        title: 'Coherent and Collective Quantum Optical Effects in Mesoscopic Systems',
        authors: 'Preparata G.',
        year: 1995
      }
    ],
    compatibilityRules: [
      {
        check: (params) => params.temperature && params.temperature < 50,
        message: 'Quantum coherence typically requires very low temperatures',
        severity: 'warning'
      }
    ]
  }
];

// Register example models
exampleModels.forEach(model => physicsModelRegistry.registerModel(model));

export default physicsModelRegistry; 