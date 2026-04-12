/**
 * Physics Model Registry (v0.3.0+ - Backend-Driven)
 *
 * Populated from `GET /api/physics/theories`. Hardcoded fallback models
 * apply when the backend is unreachable.
 */

import { API_BASE_URL } from '../../config/api';

export type PhysicsModelCategory =
  | 'LENR'
  | 'Classical'
  | 'Quantum'
  | 'Experimental'
  | 'primary'
  | 'secondary'
  | 'base'
  | 'general';

export interface PhysicsModelReference {
  title: string;
  authors?: string;
  year?: number;
  url?: string;
  doi?: string;
}

export interface CompatibilityRule {
  check: (params: Record<string, unknown>) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PhysicsModel {
  id: string;
  name: string;
  description: string;
  category: PhysicsModelCategory;
  compatibilityRules?: CompatibilityRule[];
  tags?: string[];
  references?: PhysicsModelReference[];
  defaultParameters?: Record<string, unknown>;
  version?: string;
  author?: string;
}

interface BackendTheoryInfo {
  theory_id: string;
  theory_name: string;
  description: string;
  configurable_parameters: Record<string, unknown>;
  references: string[];
  category: string;
}

class PhysicsModelRegistry {
  private models: Map<string, PhysicsModel> = new Map();
  private _loaded = false;

  registerModel(model: PhysicsModel): void {
    this.models.set(model.id, model);
  }

  /** Alias for legacy callers; same as registerModel. */
  register(model: PhysicsModel): void {
    this.registerModel(model);
  }

  getModel(modelId: string): PhysicsModel | undefined {
    return this.models.get(modelId);
  }

  getAllModels(): PhysicsModel[] {
    return Array.from(this.models.values());
  }

  getModelsByCategory(category: PhysicsModelCategory): PhysicsModel[] {
    return this.getAllModels().filter((m) => m.category === category);
  }

  getModelsByTag(tag: string): PhysicsModel[] {
    return this.getAllModels().filter((m) => m.tags?.includes(tag));
  }

  checkModelCompatibility(
    modelId: string,
    parameters: Record<string, unknown>,
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

  getModelDefaultParameters(modelId: string): Record<string, unknown> | undefined {
    return this.getModel(modelId)?.defaultParameters;
  }

  get loaded(): boolean {
    return this._loaded;
  }

  async loadFromBackend(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/physics/theories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BackendTheoryInfo[] = await res.json();

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
    }
  }
}

const physicsModelRegistry = new PhysicsModelRegistry();

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

fallbackModels.forEach((m) => physicsModelRegistry.registerModel(m));

export default physicsModelRegistry;
