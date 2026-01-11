import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import SimulationControlPanel from '../components/simulation/SimulationControlPanel';
import simulationApi from '../api/simulationApi';

const SimulationPage = () => {
  const [simulationId, setSimulationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulation control handlers
  const handleStartSimulation = async (params) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await simulationApi.startSimulation(params);
      setSimulationId(result.simulationId);
      
      console.log('Simulation started with ID:', result.simulationId);
    } catch (err) {
      setError('Failed to start simulation. Please try again.');
      console.error('Error starting simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSimulation = async () => {
    if (!simulationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await simulationApi.stopSimulation(simulationId);
      console.log('Simulation stopped');
    } catch (err) {
      setError('Failed to stop simulation. Please try again.');
      console.error('Error stopping simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    if (!simulationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await simulationApi.resetSimulation(simulationId);
      console.log('Simulation reset');
    } catch (err) {
      setError('Failed to reset simulation. Please try again.');
      console.error('Error resetting simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      {error && (
        <div className="mb-4 p-3 bg-error-100 border border-error-300 text-error-700 dark:bg-error-900 dark:border-error-700 dark:text-error-300 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Controls */}
        <div className="lg:col-span-4">
          <SimulationControlPanel
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
            onResetSimulation={handleResetSimulation}
            isLoading={isLoading}
          />
        </div>

        {/* Right column - Visualization (placeholder) */}
        <div className="lg:col-span-8">
          <div className="card h-full min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Simulation Visualization</h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                {simulationId 
                  ? `Active simulation: ${simulationId}` 
                  : 'Start a simulation to see visualization'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SimulationPage; 