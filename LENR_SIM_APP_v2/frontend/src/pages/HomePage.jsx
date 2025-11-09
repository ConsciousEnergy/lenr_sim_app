import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-8">
        <h1 className="text-3xl font-bold mb-4 text-primary-600 dark:text-primary-400">
          LENR Simulation Application
        </h1>
        <p className="mb-4 text-lg">
          Welcome to the Low Energy Nuclear Reaction (LENR) Simulation Application. 
          This tool allows researchers and enthusiasts to simulate and visualize 
          LENR phenomena with adjustable parameters and multiple physics models.
        </p>
        <div className="flex flex-wrap gap-4 mt-6">
          <Link to="/simulation" className="btn btn-primary">
            Run Simulation
          </Link>
          <Link to="/advanced-analysis" className="btn btn-secondary">
            Advanced Analysis
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Key Features</h2>
          <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-300">
            <li>Interactive 3D lattice visualization</li>
            <li>Real-time data processing and display</li>
            <li>Multiple physics models to choose from</li>
            <li>Customizable simulation parameters</li>
            <li>Export and share simulation results</li>
            <li>Advanced quantum tunneling analysis</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2 text-neutral-700 dark:text-neutral-300">
            <li>Navigate to the Simulation page</li>
            <li>Select a predefined preset or customize parameters</li>
            <li>Start the simulation and observe the results</li>
            <li>Adjust parameters to explore different conditions</li>
            <li>Use the Advanced Analysis tools to explore physics details</li>
            <li>Export or save your findings for future reference</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 