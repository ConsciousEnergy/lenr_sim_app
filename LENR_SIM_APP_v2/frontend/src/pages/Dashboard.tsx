import { useState } from 'react';
import { Link } from 'react-router-dom';
import PhysicsParameterSet from '../components/physics/PhysicsParameterSets';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('parameters');
  const [parameters, setParameters] = useState<Record<string, number | string>>({});

  const handleParametersChange = (newParameters: Record<string, number | string>) => {
    setParameters(newParameters);
  };

  const handleStartSimulation = (simulationParameters: Record<string, number | string>) => {
    console.log('Starting simulation with parameters:', simulationParameters);
    // Here you would typically call an API to start the simulation
    alert('Simulation started with the configured parameters!');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-300">
            LENR Simulation Dashboard
          </h1>
          <nav className="flex space-x-4">
            <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Save
            </button>
            <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Load
            </button>
            <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Export
            </button>
            <Link 
              to="/custom-reactions" 
              className="px-3 py-2 rounded-md text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
            >
              Custom Reactions
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Simulation Controls
                </h2>
                <div className="space-y-2">
                  <button 
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded"
                    onClick={() => handleStartSimulation(parameters)}
                  >
                    Start Simulation
                  </button>
                  <button className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded">
                    Pause
                  </button>
                  <button className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded">
                    Reset
                  </button>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Tabs
                </h2>
                <nav className="space-y-1">
                  {['parameters', 'visualization', 'results', 'analysis'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                        activeTab === tab
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-9">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {activeTab === 'parameters' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Simulation Parameters
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Configure the parameters for your LENR simulation.
                  </p>
                  
                  <PhysicsParameterSet 
                    onParametersChange={handleParametersChange}
                    onStartSimulation={handleStartSimulation}
                    initialParameters={parameters}
                  />
                </div>
              )}
              
              {activeTab === 'visualization' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Visualization
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    3D visualization of the lattice structure and simulation.
                  </p>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      3D Visualization will be rendered here
                    </p>
                  </div>
                </div>
              )}
              
              {activeTab === 'results' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Simulation Results
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    View and analyze simulation results.
                  </p>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Results charts will be displayed here
                    </p>
                  </div>
                </div>
              )}
              
              {activeTab === 'analysis' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Data Analysis
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Advanced analysis of simulation data.
                  </p>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Analysis tools will be available here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard; 