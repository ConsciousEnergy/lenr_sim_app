import { useState } from 'react';

type SettingValue = string | number | boolean;

function Settings() {
  const [activeSection, setActiveSection] = useState('appearance');
  
  // These would be pulled from the settings context in real implementation
  const [settings, setSettings] = useState({
    appearance: {
      theme: 'system',
      fontSize: 'medium',
      animationsEnabled: true,
    },
    physics: {
      precision: 'high',
      defaultTemperature: 300,
      defaultPressure: 101325,
      defaultLoadingRatio: 0.85,
    },
    visualization: {
      qualityLevel: 'high',
      maxParticles: 5000,
      colorScheme: 'scientific',
    },
    advanced: {
      apiUrl: 'http://localhost:8000',
      enableDebugMode: false,
      cacheTTL: 3600,
      experimentalFeatures: false,
    }
  });
  
  // Handler to update settings
  const updateSetting = (section: string, key: string, value: SettingValue) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-300">
            Application Settings
          </h1>
          <div className="flex space-x-4">
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md">
              Save Changes
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md">
              Reset Defaults
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Settings
              </h2>
              <nav className="space-y-1">
                {['appearance', 'physics', 'visualization', 'advanced'].map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                      activeSection === section
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                ))}
              </nav>
              
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Import/Export
                  </span>
                </div>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Export Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Import Settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-9">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {/* Appearance Settings */}
              {activeSection === 'appearance' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Appearance Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Customize the appearance of the application.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['light', 'dark', 'system'].map((theme) => (
                          <div 
                            key={theme}
                            onClick={() => updateSetting('appearance', 'theme', theme)}
                            className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                              settings.appearance.theme === theme 
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                                : 'border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Font Size
                      </label>
                      <select 
                        value={settings.appearance.fontSize}
                        onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
                        className="select w-full"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="animationsEnabled"
                        className="mr-2"
                        checked={settings.appearance.animationsEnabled}
                        onChange={(e) => updateSetting('appearance', 'animationsEnabled', e.target.checked)}
                      />
                      <label htmlFor="animationsEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                        Enable animations
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Physics Settings */}
              {activeSection === 'physics' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Physics Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Configure physics simulation parameters.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Calculation Precision
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['low', 'medium', 'high'].map((precision) => (
                          <div 
                            key={precision}
                            onClick={() => updateSetting('physics', 'precision', precision)}
                            className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                              settings.physics.precision === precision 
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                                : 'border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {precision.charAt(0).toUpperCase() + precision.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Default Temperature (K)
                      </label>
                      <input 
                        type="number" 
                        value={settings.physics.defaultTemperature}
                        onChange={(e) => updateSetting('physics', 'defaultTemperature', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Default Pressure (Pa)
                      </label>
                      <input 
                        type="number" 
                        value={settings.physics.defaultPressure}
                        onChange={(e) => updateSetting('physics', 'defaultPressure', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Default Loading Ratio
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="1"
                        value={settings.physics.defaultLoadingRatio}
                        onChange={(e) => updateSetting('physics', 'defaultLoadingRatio', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Visualization Settings */}
              {activeSection === 'visualization' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Visualization Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Configure 3D visualization settings.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quality Level
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['low', 'medium', 'high'].map((quality) => (
                          <div 
                            key={quality}
                            onClick={() => updateSetting('visualization', 'qualityLevel', quality)}
                            className={`border rounded-md p-3 flex items-center justify-center cursor-pointer ${
                              settings.visualization.qualityLevel === quality 
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                                : 'border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {quality.charAt(0).toUpperCase() + quality.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Maximum Particles
                      </label>
                      <input 
                        type="number" 
                        value={settings.visualization.maxParticles}
                        onChange={(e) => updateSetting('visualization', 'maxParticles', parseInt(e.target.value))}
                        className="input w-full"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Higher values may impact performance.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color Scheme
                      </label>
                      <select 
                        value={settings.visualization.colorScheme}
                        onChange={(e) => updateSetting('visualization', 'colorScheme', e.target.value)}
                        className="select w-full"
                      >
                        <option value="scientific">Scientific</option>
                        <option value="spectral">Spectral</option>
                        <option value="grayscale">Grayscale</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Advanced Settings */}
              {activeSection === 'advanced' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Advanced Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Configure advanced application settings.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API URL
                      </label>
                      <input 
                        type="text" 
                        value={settings.advanced.apiUrl}
                        onChange={(e) => updateSetting('advanced', 'apiUrl', e.target.value)}
                        className="input w-full"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        URL of the backend API server.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cache TTL (seconds)
                      </label>
                      <input 
                        type="number" 
                        value={settings.advanced.cacheTTL}
                        onChange={(e) => updateSetting('advanced', 'cacheTTL', parseInt(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="enableDebugMode"
                        className="mr-2"
                        checked={settings.advanced.enableDebugMode}
                        onChange={(e) => updateSetting('advanced', 'enableDebugMode', e.target.checked)}
                      />
                      <label htmlFor="enableDebugMode" className="text-sm text-gray-700 dark:text-gray-300">
                        Enable debug mode
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id="experimentalFeatures"
                        className="mr-2"
                        checked={settings.advanced.experimentalFeatures}
                        onChange={(e) => updateSetting('advanced', 'experimentalFeatures', e.target.checked)}
                      />
                      <label htmlFor="experimentalFeatures" className="text-sm text-gray-700 dark:text-gray-300">
                        Enable experimental features
                      </label>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
                        Clear All Data
                      </button>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This will clear all saved simulations and settings.
                      </p>
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

export default Settings; 