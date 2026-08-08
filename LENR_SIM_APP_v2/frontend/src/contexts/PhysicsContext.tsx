import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SimulationUpdateMessage, LatticeState } from '../api/physics/types';
import { getWebSocketUrl, resolveApiUrl } from '../config/api';

// ---------------------------------------------------------------------------
// Theory Testbed types (Phase 4.4)
// ---------------------------------------------------------------------------

/** Metadata for a single theory module from the backend. */
export interface TheoryInfo {
  theory_id: string;
  theory_name: string;
  description: string;
  configurable_parameters: Record<string, any>;
  references: string[];
  category: string;
}

/** Per-theory contribution returned after a pipeline run. */
export interface TheoryContributionResult {
  theory_id: string;
  theory_name: string;
  enhancement_factor: number;
  reaction_rate_modifier: number;
  energy_output_watts: number;
  observables: Record<string, number>;
  parameters_used: Record<string, number>;
  is_applicable: boolean;
  confidence: number;
  confidence_breakdown?: Record<string, any>;
  uncertainty_interval?: Record<string, number>;
  falsification_conditions?: string[];
  evidence_class?: string;
  reproducibility_tier?: string;
  claim_tier?: string;
  provenance?: Record<string, any>;
  references: string[];
}

/** Combined result from the pipeline. */
export interface TheoryPipelineResult {
  combined_enhancement: number;
  combined_reaction_rate_modifier: number;
  total_energy_watts: number;
  conditions: Record<string, number>;
  enabled_theories: string[];
  contract_version?: string;
  observables_bridge?: Record<string, any>;
  analytics_transparency?: Record<string, any>;
  per_theory: TheoryContributionResult[];
}

/** Extended result from the coupled pipeline. */
export interface CoupledPipelineResult {
  execution_order: string[];
  contributions: TheoryContributionResult[];
  combined_enhancement: number;
  combined_reaction_rate_modifier: number;
  total_energy_watts: number;
  enriched_conditions: Record<string, number>;
  coupling_map: Record<string, Array<{
    source_id: string;
    relationship_type: string;
    shared_properties: string[];
    strength: number;
  }>>;
}

// ---------------------------------------------------------------------------

export interface PhysicsContextType {
  simulationState: SimulationUpdateMessage | null;
  latticeState: LatticeState | null;
  isConnected: boolean;
  isSimulating: boolean;
  parameters: Record<string, number | string>;
  setParameters: (_params: Record<string, number | string>) => void;
  startSimulation: (_params: Record<string, number | string>) => Promise<void>;
  stopSimulation: () => Promise<void>;
  connectWebSocket: (_simulationId: string) => void;
  disconnectWebSocket: () => void;

  // Theory Testbed state
  availableTheories: TheoryInfo[];
  enabledTheories: string[];
  theoryConfigs: Record<string, Record<string, any>>;
  theoryResult: TheoryPipelineResult | null;
  // Exposed so consumers can clear stale theory results; the value is persisted, so
  // without a setter a stale run would survive until the tab closed.
  setTheoryResult: (_data: TheoryPipelineResult | null) => void;
  isLoadingTheories: boolean;
  setEnabledTheories: (_ids: string[]) => void;
  setTheoryConfigs: (_configs: Record<string, Record<string, any>>) => void;
  fetchTheories: () => Promise<void>;
  runTheories: (_conditions: Record<string, number | string>) => Promise<TheoryPipelineResult | null>;
  runCoupledTheories: (_conditions: Record<string, number | string>) => Promise<CoupledPipelineResult | null>;
  coupledResult: CoupledPipelineResult | null;

  // Shared simulation result (persists across route navigation)
  simulationResult: Record<string, any> | null;
  setSimulationResult: (_data: Record<string, any> | null) => void;
}

export const PhysicsContext = createContext<PhysicsContextType | undefined>(undefined);

export interface PhysicsProviderProps {
  children: ReactNode;
}

export const PhysicsProvider: React.FC<PhysicsProviderProps> = ({ children }) => {
  const [simulationState, setSimulationState] = useState<SimulationUpdateMessage | null>(null);
  const [latticeState, setLatticeState] = useState<LatticeState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [parameters, setParameters] = useState<Record<string, number | string>>({});
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Theory Testbed state
  const [availableTheories, setAvailableTheories] = useState<TheoryInfo[]>([]);
  const [enabledTheories, setEnabledTheories] = useState<string[]>([]);
  const [theoryConfigs, setTheoryConfigs] = useState<Record<string, Record<string, any>>>({});
  const [coupledResult, setCoupledResult] = useState<CoupledPipelineResult | null>(null);
  const [isLoadingTheories, setIsLoadingTheories] = useState(false);

  /** Read a persisted context value, tolerating quota/private-browsing failures. */
  const readPersisted = <T,>(key: string): T | null => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : null;
    } catch {
      return null;
    }
  };

  const writePersisted = (key: string, data: unknown | null) => {
    try {
      if (data) {
        sessionStorage.setItem(key, JSON.stringify(data));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch { /* quota exceeded or private browsing */ }
  };

  // Shared simulation result (bubble-lattice response persists across pages and reloads)
  const [simulationResult, setSimulationResultRaw] = useState<Record<string, any> | null>(
    () => readPersisted<Record<string, any>>('lenr_simulationResult'),
  );

  const setSimulationResult = useCallback((data: Record<string, any> | null) => {
    setSimulationResultRaw(data);
    writePersisted('lenr_simulationResult', data);
  }, []);

  // Theory-pipeline result. Persisted for the same reason as simulationResult: the
  // Advanced Analysis page reads it on a different route, and without persistence a
  // reload silently emptied the Theory Summary tab while the simulation-backed tabs
  // stayed populated, so the page looked ready but never was.
  const [theoryResult, setTheoryResultRaw] = useState<TheoryPipelineResult | null>(
    () => readPersisted<TheoryPipelineResult>('lenr_theoryResult'),
  );

  const setTheoryResult = useCallback((data: TheoryPipelineResult | null) => {
    setTheoryResultRaw(data);
    writePersisted('lenr_theoryResult', data);
  }, []);

  /** Fetch available theories from the backend. */
  const fetchTheories = useCallback(async () => {
    setIsLoadingTheories(true);
    try {
      const response = await fetch(resolveApiUrl('/api/physics/theories'));
      if (!response.ok) throw new Error(`Failed to fetch theories: ${response.statusText}`);
      const data: TheoryInfo[] = await response.json();
      setAvailableTheories(data);
      // Enable all theories by default on first load
      if (enabledTheories.length === 0 && data.length > 0) {
        setEnabledTheories(data.map((t) => t.theory_id));
      }
    } catch (error) {
      console.error('Error fetching theories:', error);
    } finally {
      setIsLoadingTheories(false);
    }
  }, [enabledTheories.length]);

  /** Run enabled theories against supplied conditions. */
  const runTheories = useCallback(
    async (conditions: Record<string, number | string>): Promise<TheoryPipelineResult | null> => {
      try {
        const response = await fetch(resolveApiUrl('/api/physics/theories/run'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conditions,
            enabled_theories: enabledTheories.length > 0 ? enabledTheories : null,
            theory_configs: Object.keys(theoryConfigs).length > 0 ? theoryConfigs : null,
          }),
        });
        if (!response.ok) throw new Error(`Theory run failed: ${response.statusText}`);
        const data: TheoryPipelineResult = await response.json();
        setTheoryResult(data);
        return data;
      } catch (error) {
        console.error('Error running theories:', error);
        return null;
      }
    },
    [enabledTheories, theoryConfigs],
  );

  /** Run enabled theories in coupled (sequential dependency) mode. */
  const runCoupledTheories = useCallback(
    async (conditions: Record<string, number | string>): Promise<CoupledPipelineResult | null> => {
      try {
        const response = await fetch(resolveApiUrl('/api/analytics/theories/run-coupled'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conditions,
            enabled_theories: enabledTheories.length > 0 ? enabledTheories : null,
            theory_configs: Object.keys(theoryConfigs).length > 0 ? theoryConfigs : null,
          }),
        });
        if (!response.ok) throw new Error(`Coupled run failed: ${response.statusText}`);
        const data: CoupledPipelineResult = await response.json();
        setCoupledResult(data);

        // Also update the standard theoryResult so contribution cards render
        setTheoryResult({
          combined_enhancement: data.combined_enhancement,
          combined_reaction_rate_modifier: data.combined_reaction_rate_modifier,
          total_energy_watts: data.total_energy_watts,
          conditions: data.enriched_conditions,
          enabled_theories: data.execution_order,
          per_theory: data.contributions,
        });

        return data;
      } catch (error) {
        console.error('Error running coupled theories:', error);
        return null;
      }
    },
    [enabledTheories, theoryConfigs],
  );

  const connectWebSocket = (simulationId: string) => {
    if (ws) {
      ws.close();
    }

    const websocket = new WebSocket(getWebSocketUrl(`/api/physics/simulate/${simulationId}`));
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'simulation_update') {
          setSimulationState(data);
        } else if (data.type === 'lattice_update') {
          setLatticeState(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsSimulating(false);
    };

    setWs(websocket);
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
    }
  };

  const startSimulation = async (params: Record<string, number | string>) => {
    try {
      const response = await fetch(resolveApiUrl('/api/physics/simulate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to start simulation: ${response.statusText}`);
      }

      const data = await response.json();
      setIsSimulating(true);
      setParameters(params);
      
      // Connect to WebSocket for real-time updates
      if (data.simulation_id) {
        connectWebSocket(data.simulation_id);
      }

      return data;
    } catch (error) {
      console.error('Error starting simulation:', error);
      throw error;
    }
  };

  const stopSimulation = async () => {
    try {
      disconnectWebSocket();
      setIsSimulating(false);
      setSimulationState(null);
      setLatticeState(null);
    } catch (error) {
      console.error('Error stopping simulation:', error);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: PhysicsContextType = {
    simulationState,
    latticeState,
    isConnected,
    isSimulating,
    parameters,
    setParameters,
    startSimulation,
    stopSimulation,
    connectWebSocket,
    disconnectWebSocket,
    // Theory Testbed
    availableTheories,
    enabledTheories,
    theoryConfigs,
    theoryResult,
    setTheoryResult,
    isLoadingTheories,
    setEnabledTheories,
    setTheoryConfigs,
    fetchTheories,
    runTheories,
    runCoupledTheories,
    coupledResult,
    // Shared simulation result
    simulationResult,
    setSimulationResult,
  };

  return (
    <PhysicsContext.Provider value={value}>
      {children}
    </PhysicsContext.Provider>
  );
};

export const usePhysics = () => {
  const context = useContext(PhysicsContext);
  
  if (context === undefined) {
    throw new Error('usePhysics must be used within a PhysicsProvider');
  }
  
  return context;
};