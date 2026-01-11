import React, { useState } from 'react';

// Default simulation parameters
const DEFAULT_PARAMS = {
  temperature: 300, // Celsius
  pressure: 1.0,    // atm
  latticeType: 'palladium',
  duration: 60,     // minutes
  timeStep: 0.1,    // seconds
  modelType: 'quantum',
};

// Simulation presets
const PRESETS = {
  standard: {
    name: 'Standard Run',
    params: {
      ...DEFAULT_PARAMS,
    }
  },
  highTemp: {
    name: 'High Temperature',
    params: {
      ...DEFAULT_PARAMS,
      temperature: 350,
      pressure: 1.2,
    }
  },
  highPressure: {
    name: 'High Pressure',
    params: {
      ...DEFAULT_PARAMS,
      pressure: 5.0,
    }
  },
  longDuration: {
    name: 'Long Duration',
    params: {
      ...DEFAULT_PARAMS,
      duration: 120,
    }
  },
};

// Component definition
const SimulationControlPanel = ({ 
  onStartSimulation, 
  onStopSimulation, 
  onResetSimulation,
  isLoading = false 
}) => {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [errors, setErrors] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  // Form validation
  const validate = (values) => {
    const errors = {};
    
    if (!values.temperature || values.temperature < 0) {
      errors.temperature = 'Temperature must be a positive number';
    }
    
    if (!values.pressure || values.pressure <= 0) {
      errors.pressure = 'Pressure must be greater than 0';
    }
    
    if (!values.duration || values.duration <= 0) {
      errors.duration = 'Duration must be greater than 0';
    }
    
    return errors;
  };

  // Handle parameter changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = e.target.type === 'number' ? parseFloat(value) : value;
    
    setParams(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear errors for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validate(params);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Start simulation
    setIsRunning(true);
    onStartSimulation(params);
  };

  // Handle stop simulation
  const handleStop = () => {
    setIsRunning(false);
    onStopSimulation();
  };

  // Handle reset simulation
  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    setErrors({});
    setIsRunning(false);
    onResetSimulation();
  };

  // Handle preset selection
  const handlePresetSelect = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setParams(preset.params);
      setErrors({});
    }
  };

  return (
    <div className="card w-full max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Simulation Control Panel</h2>
      
      {/* Presets selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetSelect(key)}
              className="px-3 py-1 text-sm rounded-full bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 text-primary-700 dark:text-primary-300"
              disabled={isLoading || isRunning}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Temperature */}
          <div>
            <label htmlFor="temperature" className="block text-sm font-medium mb-1">
              Temperature (°C)
            </label>
            <input
              type="number"
              id="temperature"
              name="temperature"
              value={params.temperature}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600 ${errors.temperature ? 'border-error-500 dark:border-error-500' : 'border-neutral-300 dark:border-neutral-600'}`}
              disabled={isLoading || isRunning}
            />
            {errors.temperature && (
              <p className="mt-1 text-sm text-error-500">{errors.temperature}</p>
            )}
          </div>
          
          {/* Pressure */}
          <div>
            <label htmlFor="pressure" className="block text-sm font-medium mb-1">
              Pressure (atm)
            </label>
            <input
              type="number"
              id="pressure"
              name="pressure"
              value={params.pressure}
              onChange={handleChange}
              step="0.1"
              className={`w-full px-3 py-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600 ${errors.pressure ? 'border-error-500 dark:border-error-500' : 'border-neutral-300 dark:border-neutral-600'}`}
              disabled={isLoading || isRunning}
            />
            {errors.pressure && (
              <p className="mt-1 text-sm text-error-500">{errors.pressure}</p>
            )}
          </div>
          
          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={params.duration}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600 ${errors.duration ? 'border-error-500 dark:border-error-500' : 'border-neutral-300 dark:border-neutral-600'}`}
              disabled={isLoading || isRunning}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-error-500">{errors.duration}</p>
            )}
          </div>
          
          {/* Lattice Type */}
          <div>
            <label htmlFor="latticeType" className="block text-sm font-medium mb-1">
              Lattice Material
            </label>
            <select
              id="latticeType"
              name="latticeType"
              value={params.latticeType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-700 dark:border-neutral-600"
              disabled={isLoading || isRunning}
            >
              <option value="palladium">Palladium</option>
              <option value="nickel">Nickel</option>
              <option value="titanium">Titanium</option>
            </select>
          </div>
          
          {/* Model Type */}
          <div className="md:col-span-2">
            <label htmlFor="modelType" className="block text-sm font-medium mb-1">
              Physics Model
            </label>
            <select
              id="modelType"
              name="modelType"
              value={params.modelType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md dark:bg-neutral-700 dark:border-neutral-600"
              disabled={isLoading || isRunning}
            >
              <option value="basic">Basic Model</option>
              <option value="quantum">Quantum Tunneling</option>
              <option value="advanced">Advanced Multi-physics</option>
            </select>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex flex-wrap gap-3">
          {!isRunning ? (
            <button 
              type="submit" 
              className={`btn btn-primary flex items-center ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Start Simulation'}
            </button>
          ) : (
            <button 
              type="button" 
              className={`btn bg-error-500 text-white hover:bg-error-600 dark:bg-error-600 dark:hover:bg-error-700 flex items-center ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={handleStop}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Stop Simulation'}
            </button>
          )}
          <button 
            type="button" 
            className={`btn btn-outline ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default SimulationControlPanel; 