import { useState } from 'react';

function Results() {
  const [activeTab, setActiveTab] = useState('energy');
  
  // This would come from API in real implementation
  const mockSimulations = [
    { id: 'sim-1', name: 'Pd-D Run 1', date: '2025-04-08', status: 'completed' },
    { id: 'sim-2', name: 'Ni-H Run 2', date: '2025-04-07', status: 'completed' },
    { id: 'sim-3', name: 'Ti-D Run 1', date: '2025-04-06', status: 'completed' },
    { id: 'sim-4', name: 'Custom Run', date: '2025-04-05', status: 'completed' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-300">
            Simulation Results
          </h1>
          <nav className="flex space-x-4">
            <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Import
            </button>
            <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Export
            </button>
            <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
              Compare
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Simulation List */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Recent Simulations
              </h2>
              
              <div className="space-y-2">
                {mockSimulations.map((sim) => (
                  <div 
                    key={sim.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200">{sim.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{sim.date}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Result Views
                </h3>
                <nav className="space-y-1">
                  {['energy', 'rates', 'enhancement', 'distribution'].map((tab) => (
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

          {/* Main content - Result Display */}
          <div className="lg:col-span-9">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {/* Energy Output View */}
              {activeTab === 'energy' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Energy Output
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Total energy production and power density over time.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Power Output
                      </h3>
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        3.27 W/cm³
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Average power density
                      </div>
                    </div>
                    
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Total Energy
                      </h3>
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        245.3 kJ
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Cumulative energy production
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Energy output chart will be displayed here
                    </p>
                  </div>
                </div>
              )}
              
              {/* Reaction Rates View */}
              {activeTab === 'rates' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Reaction Rates
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Nuclear reaction rates and event frequencies.
                  </p>
                  
                  <div className="overflow-x-auto mb-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Reaction
                          </th>
                          <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Rate (s⁻¹)
                          </th>
                          <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Energy (MeV)
                          </th>
                          <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Contribution
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">D + D → T + p</td>
                          <td className="px-6 py-4 whitespace-nowrap">4.2 × 10¹²</td>
                          <td className="px-6 py-4 whitespace-nowrap">4.03</td>
                          <td className="px-6 py-4 whitespace-nowrap">48%</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">D + D → ³He + n</td>
                          <td className="px-6 py-4 whitespace-nowrap">4.1 × 10¹²</td>
                          <td className="px-6 py-4 whitespace-nowrap">3.27</td>
                          <td className="px-6 py-4 whitespace-nowrap">47%</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap">D + D → ⁴He</td>
                          <td className="px-6 py-4 whitespace-nowrap">4.8 × 10¹¹</td>
                          <td className="px-6 py-4 whitespace-nowrap">23.8</td>
                          <td className="px-6 py-4 whitespace-nowrap">5%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Reaction rates chart will be displayed here
                    </p>
                  </div>
                </div>
              )}
              
              {/* Enhancement Factors View */}
              {activeTab === 'enhancement' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Enhancement Factors
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Contribution of different enhancement mechanisms.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Total Enhancement
                      </h3>
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        10<sup>42</sup>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Combined enhancement factor
                      </div>
                    </div>
                    
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Dominant Mechanism
                      </h3>
                      <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        Electron Screening
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Contributing 65% of total enhancement
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Enhancement factors chart will be displayed here
                    </p>
                  </div>
                </div>
              )}
              
              {/* Energy Distribution View */}
              {activeTab === 'distribution' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Energy Distribution
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Distribution of energy across reaction products.
                  </p>
                  
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-80 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      Energy distribution chart will be displayed here
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Energy to Charged Particles
                      </h3>
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        76%
                      </div>
                    </div>
                    
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Energy to Neutrons
                      </h3>
                      <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                        14%
                      </div>
                    </div>
                    
                    <div className="card">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Energy to Gammas
                      </h3>
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                        10%
                      </div>
                    </div>
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

export default Results; 