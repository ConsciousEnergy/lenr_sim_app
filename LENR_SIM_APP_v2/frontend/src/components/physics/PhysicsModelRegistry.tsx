/**
 * Physics Model Registry (v0.3.0 - Backend-Driven)
 *
 * This module provides a registry that is populated from the backend
 * ``GET /api/physics/theories`` endpoint.  The hardcoded example models
 * are kept as fallback defaults when the backend is unreachable.
 */

import { API_BASE_URL } from '../../config/api';

// Model categories
export type PhysicsModelCategory =
  | 'LENR'
  | 'Classical'
  | 'Quantum'
  | 'Experimental'
  | 'primary'
  | 'secondary'
  | 'base'
  | 'general';

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
 * Backend theory info shape (mirrors TheoryInfo in PhysicsContext).
 */
interface BackendTheoryInfo {
  theory_id: string;
  theory_name: string;
  description: string;
  configurable_parameters: Record<string, any>;
  references: string[];
  category: string;
}

/**
 * The PhysicsModelRegistry class manages available physics models
 * and provides methods for model selection, filtering, and compatibility
 * checking.  It can be refreshed from the backend at runtime.
 */
class PhysicsModelRegistry {
  private models: Map<string, PhysicsModel> = new Map();
  private _loaded = false;

  /** Register a new physics model in the registry. */
  registerModel(model: PhysicsModel): void {
    this.models.set(model.id, model);
  }

  /** Get a model by its ID. */
  getModel(modelId: string): PhysicsModel | undefined {
    return this.models.get(modelId);
  }

  /** Get all registered models. */
  getAllModels(): PhysicsModel[] {
    return Array.from(this.models.values());
  }

  /** Filter models by category. */
  getModelsByCategory(category: PhysicsModelCategory): PhysicsModel[] {
    return this.getAllModels().filter((m) => m.category === category);
  }

  /** Filter models by tag. */
  getModelsByTag(tag: string): PhysicsModel[] {
    return this.getAllModels().filter((m) => m.tags?.includes(tag));
  }

  /** Check compatibility of a model with the given parameters. */
  checkModelCompatibility(
    modelId: string,
    parameters: Record<string, any>,
  ): { compatible: boolean; issues: string[] } {
    const model = this.getModel(modelId);
    if (!model) return { compatible: false, issues: ['Error: Model not found'] };
    if (!model.compatibilityRules || model.compatibilityRules.length === 0) {
      return { compatible: true, issues: [] };
    }
    const issues: string[] = [];
    model.compatibilityRules.forEach((rule) => {
      if (!rule.check(parameters)) {
        const prefix =
          rule.severity === 'error' ? 'Error: ' : rule.severity === 'warning' ? 'Warning: ' : 'Info: ';
        issues.push(`${prefix}${rule.message}`);
      }
    });
    return { compatible: !issues.some((i) => i.startsWith('Error:')), issues };
  }

  /** Get default parameters for a model. */
  getModelDefaultParameters(modelId: string): Record<string, any> | undefined {
    return this.getModel(modelId)?.defaultParameters;
  }

  /** Whether the registry has been populated from the backend. */
  get loaded(): boolean {
    return this._loaded;
  }

  /**
   * Fetch theories from the backend and replace the registry contents.
   * Falls back silently on network errors (keeps existing models).
   */
  async loadFromBackend(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/physics/theories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BackendTheoryInfo[] = await res.json();

      // Clear existing and repopulate
      this.models.clear();

      data.forEach((t) => {
        this.registerModel({
          id: t.theory_id,
          name: t.theory_name,
          description: t.description,
          category: (t.category || 'LENR') as PhysicsModelCategory,
          defaultParameters: t.configurable_parameters,
          references: t.references.map((r) => ({ title: r })),
          tags: [t.category],
        });
      });

      this._loaded = true;
      console.log(`PhysicsModelRegistry loaded ${data.length} theories from backend`);
    } catch (err) {
      console.warn('Failed to load theories from backend, using fallback models:', err);
      // Keep whatever models were registered previously
    }
  }
}

// Create singleton instance
const physicsModelRegistry = new PhysicsModelRegistry();

// Fallback models (used when the backend is unreachable)
const fallbackModels: PhysicsModel[] = [
  {
    id: 'electron_screening',
    name: 'Electron Screening',
    description: 'Debye screening reduces Coulomb barrier by 10-100 eV.',
    category: 'primary',
    tags: ['screening', 'debye'],
  },
  {
    id: 'coherent_qed',
    name: 'Confined-Mode QED / Coherent Domains',
    description: 'Del Giudice/Preparata coherent EM domains with geometry-dependent vacuum modification.',
    category: 'primary',
    tags: ['qed', 'coherent'],
  },
  {
    id: 'nae_model',
    name: 'Nuclear Active Environment (NAE)',
    description: 'Statistical model of NAE site density.',
    category: 'primary',
    tags: ['nae', 'storms'],
  },
  {
    id: 'bubble_mhd_confinement',
    name: 'Bubble-MHD Nano-Confinement',
    description: 'Staged confinement: Rayleigh-Plesset + MHD Z-pinch.',
    category: 'primary',
    tags: ['bubble', 'mhd'],
  },
  {
    id: 'casimir_confinement',
    name: 'Casimir Confinement',
    description: 'Vacuum fluctuation confinement with Lifshitz correction.',
    category: 'secondary',
    tags: ['casimir', 'vacuum'],
  },
  {
    id: 'quantum_tunneling',
    name: 'Quantum Tunneling (Base Rate)',
    description: 'Gamow/WKB base tunnelling probability.',
    category: 'base',
    tags: ['tunneling', 'gamow'],
  },
];

// Register fallback models
fallbackModels.forEach((m) => physicsModelRegistry.registerModel(m));

export default physicsModelRegistry; 