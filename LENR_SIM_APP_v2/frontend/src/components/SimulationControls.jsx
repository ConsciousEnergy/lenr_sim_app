import React, { useState, useEffect } from 'react';
import { usePhysics } from '../contexts/PhysicsContext';

/**
 * SimulationControls component for managing simulation parameters and controls
 */
const SimulationControls = () => {
  const {
    parameters,
    updateParameters,
    startSimulation,
    stopSimulation,
    resetSimulation,
    isRunning,
    progress,
    simulationId,
    loadSimulation
  } = usePhysics();

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numberValue = name !== 'latticeType' ? parseFloat(value) : value;
    updateParameters({ [name]: numberValue });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  };

  // Add this function to load a test simulation
  const loadTestSimulation = () => {
    // Use the ID of the simulation we just created
    loadSimulation('dbd8cbda-ce7a-4434-a26e-171925b8c288');
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Simulation Controls</h2>
      
      {/* Progress indicator */}
      {isRunning && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Simulation in progress</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Simulation ID: {simulationId}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Temperature */}
          <div>
            <label htmlFor="temperature-input" className="block text-sm font-medium text-gray-700 mb-1">
              Temperature (K)
            </label>
            <input
              id="temperature-input"
              type="number"
              name="temperature"
              value={parameters.temperature}
              onChange={handleChange}
              min="273"
              max="2000"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isRunning}
              aria-label="Temperature in Kelvin"
              aria-describedby="temperature-description"
            />
          </div>

          {/* Pressure */}
          <div>
            <label htmlFor="pressure-input" className="block text-sm font-medium text-gray-700 mb-1">
              Pressure (Pa)
            </label>
            <div className="relative">
              <input
                id="pressure-input"
                type="number"
                name="pressure"
                value={parameters.pressure}
                onChange={handleChange}
                min="1000"
                max="500000"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isRunning}
                aria-label="Pressure in Pascals"
                aria-describedby="pressure-help"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 pointer-events-none">
                1 atm ≈ 101325
              </div>
            </div>
            <div id="pressure-help" className="text-xs text-gray-500 mt-1">
              Typical range: 0.01-5 atm (1013-506625 Pa)
            </div>
          </div>

          {/* Lattice Type */}
          <div>
            <label htmlFor="lattice-type-select" className="block text-sm font-medium text-gray-700 mb-1">
              Lattice Type
            </label>
            <select
              id="lattice-type-select"
              name="latticeType"
              value={parameters.latticeType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isRunning}
              aria-label="Select lattice type"
            >
              <option value="palladium">Palladium</option>
              <option value="nickel">Nickel</option>
              <option value="titanium">Titanium</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration-input" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (s)
            </label>
            <input
              id="duration-input"
              type="number"
              name="duration"
              value={parameters.duration}
              onChange={handleChange}
              min="1"
              max="1000"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isRunning}
              aria-label="Simulation duration in seconds"
            />
          </div>

          {/* Time Step */}
          <div>
            <label htmlFor="time-step-input" className="block text-sm font-medium text-gray-700 mb-1">
              Time Step (s)
            </label>
            <input
              id="time-step-input"
              type="number"
              name="timeStep"
              value={parameters.timeStep}
              onChange={handleChange}
              min="0.01"
              max="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isRunning}
              aria-label="Time step in seconds"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isRunning
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isRunning ? 'Stop Simulation' : 'Start Simulation'}
          </button>
          
          <button
            type="button"
            onClick={resetSimulation}
            className="px-4 py-2 rounded-md text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isRunning}
          >
            Reset
          </button>

          {/* Add debug button */}
          <button
            type="button"
            onClick={loadTestSimulation}
            className="px-4 py-2 rounded-md text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isRunning}
          >
            Load Test Simulation
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimulationControls; 