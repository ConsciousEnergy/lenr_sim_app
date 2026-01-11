import React, { useState, useEffect } from 'react';
import physicsApi from '../../api/physicsApi';

const PhysicsPanel = ({
  onDataUpdate,
  onError,
  initialConfig = null,
}) => {
  // State for physics parameters
  const [physicsConfig, setPhysicsConfig] = useState({
    temperature: 300,  // K
    pressure: 101325,  // Pa (1 atm)
    electron_density: 1e28,  // m^-3
    lattice_constant: 3.89e-10,  // m (palladium)
    dimensions: [10, 10, 10],
    enhancement_factor: 1.0,
    time_step: 1e-15,  // s
    max_steps: 1000,
  });
  
  const [enhancementParams, setEnhancementParams] = useState({
    temperature: 300,  // K
    electron_density: 1e28,  // m^-3
    electric_field: 1e6,  // V/m
    lattice_constant: 3.89e-10,  // m
  });
  
  const [fusionParams, setFusionParams] = useState({
    reaction_type: "DD",
    density: 1e22,  // m^-3
    temperature: 300,  // K
    n_events: 1000,
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancementData, setEnhancementData] = useState(null);
  const [latticeData, setLatticeData] = useState(null);
  const [fusionData, setFusionData] = useState(null);
  
  // Initialize simulation with provided or default config
  useEffect(() => {
    if (initialConfig) {
      setPhysicsConfig({
        ...physicsConfig,
        ...initialConfig,
      });
    }
  }, [initialConfig]);
  
  // Initialize the physics simulation
  const initializeSimulation = async () => {
    setIsLoading(true);
    try {
      const response = await physicsApi.initializeSimulation(physicsConfig);
      setIsInitialized(true);
      
      // Notify parent component about successful initialization
      if (onDataUpdate) {
        onDataUpdate({
          type: 'initialization',
          data: response,
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error initializing simulation:', error);
      if (onError) {
        onError('Failed to initialize physics simulation');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate quantum enhancement
  const calculateEnhancement = async () => {
    setIsLoading(true);
    try {
      const response = await physicsApi.calculateEnhancement(enhancementParams);
      setEnhancementData(response);
      
      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate({
          type: 'enhancement',
          data: response,
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error calculating enhancement:', error);
      if (onError) {
        onError('Failed to calculate quantum enhancement factors');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run lattice simulation
  const runLatticeSimulation = async (timeSteps = 10) => {
    if (!isInitialized) {
      await initializeSimulation();
    }
    
    setIsLoading(true);
    try {
      const params = {
        config: physicsConfig,
        time_steps: timeSteps,
      };
      
      const response = await physicsApi.simulateLattice(params);
      setLatticeData(response);
      
      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate({
          type: 'lattice',
          data: response,
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error simulating lattice:', error);
      if (onError) {
        onError('Failed to run lattice simulation');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate fusion rates
  const calculateFusionRate = async () => {
    setIsLoading(true);
    try {
      const response = await physicsApi.calculateFusionRate(fusionParams);
      
      // Update fusion data
      setFusionData(prev => ({
        ...prev,
        reactionRates: response,
      }));
      
      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate({
          type: 'fusion_rate',
          data: response,
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error calculating fusion rate:', error);
      if (onError) {
        onError('Failed to calculate fusion reaction rates');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simulate fusion products
  const simulateFusionProducts = async () => {
    setIsLoading(true);
    try {
      const response = await physicsApi.simulateFusionProducts(fusionParams);
      
      // Update fusion data
      setFusionData(prev => ({
        ...(prev || {}),
        products: response,
      }));
      
      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate({
          type: 'fusion_products',
          data: response,
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error simulating fusion products:', error);
      if (onError) {
        onError('Failed to simulate fusion products');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run a complete simulation sequence
  const runCompleteSimulation = async () => {
    try {
      // Step 1: Initialize the simulation
      await initializeSimulation();
      
      // Step 2: Calculate enhancement factors
      const enhancementResult = await calculateEnhancement();
      
      // Update fusion params with enhancement factor
      if (enhancementResult && enhancementResult.total_enhancement) {
        setFusionParams(prev => ({
          ...prev,
          enhancement_factor: enhancementResult.total_enhancement,
        }));
      }
      
      // Step 3: Run lattice simulation
      await runLatticeSimulation();
      
      // Step 4: Calculate fusion rates with enhancement
      await calculateFusionRate();
      
      // Step 5: Simulate fusion products
      await simulateFusionProducts();
      
      return {
        enhancement: enhancementData,
        lattice: latticeData,
        fusion: fusionData,
      };
    } catch (error) {
      console.error('Error running complete simulation:', error);
      if (onError) {
        onError('Failed to run complete simulation sequence');
      }
    }
  };
  
  // Update physics config
  const updatePhysicsConfig = (newConfig) => {
    setPhysicsConfig(prev => ({
      ...prev,
      ...newConfig,
    }));
    
    // Reset initialization flag if critical parameters change
    setIsInitialized(false);
  };
  
  // Update enhancement parameters
  const updateEnhancementParams = (newParams) => {
    setEnhancementParams(prev => ({
      ...prev,
      ...newParams,
    }));
  };
  
  // Update fusion parameters
  const updateFusionParams = (newParams) => {
    setFusionParams(prev => ({
      ...prev,
      ...newParams,
    }));
  };
  
  // Return component API for parent components to use
  return {
    physicsConfig,
    enhancementParams,
    fusionParams,
    isInitialized,
    isLoading,
    enhancementData,
    latticeData,
    fusionData,
    initializeSimulation,
    calculateEnhancement,
    runLatticeSimulation,
    calculateFusionRate,
    simulateFusionProducts,
    runCompleteSimulation,
    updatePhysicsConfig,
    updateEnhancementParams,
    updateFusionParams,
  };
};

export default PhysicsPanel; 