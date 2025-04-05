import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useLogger } from './LogContext';

// Create settings context
const AppSettingsContext = createContext(null);

// Default settings structure
const defaultSettings = {
  appearance: {
    theme: 'light',
    animationsEnabled: true,
    highContrastMode: false,
    fontSize: 'medium'
  },
  visualization: {
    renderQuality: 'medium', // low, medium, high
    particleCount: 200,
    showAxes: true,
    showGrid: true,
    useAntialiasing: true,
    maxFPS: 60,
    backgroundColor: '#f0f0f0',
    atomScale: 1.0,
    electronCloudVisibility: 0.6,
    showTunnelingPaths: true,
    colorIntensityByEnergy: true,
    motionIntensity: 1.0
  },
  simulation: {
    defaultPrecision: 'medium', // low, medium, high
    autosaveResults: true,
    maxIterations: 1000,
    defaultTimestep: 0.01,
    useFastMath: false,
    savePath: './results',
    autoPlaySimulation: true,
    principalQuantumNumber: 7,
    minFusionDistance: 0.5,
    maxOverlapProbability: 0.8,
    tunnelingEnhancementFactor: 1.0,
    thermalEnergyScale: 0.025, // eV, room temperature
    includeBoseEinsteinStats: true,
    useQuantumCorrections: true,
    pairedElectronMode: 'spin-paired'
  },
  lenrPhysics: {
    modelType: 'rydberg', // rydberg, widom-larsen, etc.
    includeCoulombBarrier: true,
    includeScreeningEffects: true,
    includeMagneticEffects: false,
    palladiumIsotope: 'Pd-106',
    deuteriumLoading: 0.85, // D/Pd ratio
    minRydbergRadius: 10, // Angstroms
    enableFusionEvents: true,
    emissionModel: 'phonon-coupled'
  },
  advanced: {
    enableDevTools: false,
    debugLogging: false,
    useExperimentalFeatures: false,
    allowRemoteDataFetching: true,
    maxConcurrentCalculations: 4,
    memoryLimit: 2048, // MB
    cacheTimeoutMinutes: 60,
    useGPUAcceleration: false,
    precisionBits: 64,
    maxLatticeSize: 5,
    experimentalCollectiveEffects: false
  }
};

// Storage key for settings
const STORAGE_KEY = 'lenr_app_settings';

// Provider component
export const AppSettingsProvider = ({ children }) => {
  const logger = useLogger();
  const [settings, setSettings] = useState(JSON.parse(JSON.stringify(defaultSettings)));
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        
        // Ensure all required sections exist by merging with defaults
        const validatedSettings = {
          appearance: { ...defaultSettings.appearance, ...parsedSettings.appearance },
          visualization: { ...defaultSettings.visualization, ...parsedSettings.visualization },
          simulation: { ...defaultSettings.simulation, ...parsedSettings.simulation },
          lenrPhysics: { ...defaultSettings.lenrPhysics, ...parsedSettings.lenrPhysics },
          advanced: { ...defaultSettings.advanced, ...parsedSettings.advanced }
        };
        
        setSettings(validatedSettings);
        logger.info('Settings loaded from storage and validated');
      } else {
        // No settings found, use defaults
        setSettings(JSON.parse(JSON.stringify(defaultSettings)));
        logger.info('No stored settings found, using defaults');
      }
    } catch (error) {
      logger.error('Error loading settings', error);
      // Fallback to defaults on error
      setSettings(JSON.parse(JSON.stringify(defaultSettings)));
    } finally {
      setIsLoaded(true);
    }
  }, [logger]);

  // Save settings to localStorage
  const saveSettings = (newSettings) => {
    try {
      // Validate settings structure before saving
      const validatedSettings = {
        appearance: { ...defaultSettings.appearance, ...newSettings.appearance },
        visualization: { ...defaultSettings.visualization, ...newSettings.visualization },
        simulation: { ...defaultSettings.simulation, ...newSettings.simulation },
        lenrPhysics: { ...defaultSettings.lenrPhysics, ...newSettings.lenrPhysics },
        advanced: { ...defaultSettings.advanced, ...newSettings.advanced }
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedSettings));
      setSettings(validatedSettings);
      logger.info('Settings saved to storage');
      return true;
    } catch (error) {
      logger.error('Error saving settings', error);
      return false;
    }
  };

  // Update a specific setting
  const updateSetting = (category, settingName, value) => {
    try {
      // Make sure the category exists
      if (!settings[category]) {
        logger.warn(`Category ${category} does not exist in settings`);
        return false;
      }
      
      const updatedSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          [settingName]: value
        }
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
      logger.info(`Updated setting: ${category}.${settingName}`);
      return true;
    } catch (error) {
      logger.error(`Error updating setting: ${category}.${settingName}`, error);
      return false;
    }
  };

  // Update an entire category of settings
  const updateCategory = (category, categorySettings) => {
    try {
      // Make sure the category exists
      if (!settings[category] || !defaultSettings[category]) {
        logger.warn(`Category ${category} does not exist in settings`);
        return false;
      }
      
      // Ensure all required properties exist by merging with defaults
      const validatedCategorySettings = {
        ...defaultSettings[category],
        ...categorySettings
      };
      
      const updatedSettings = {
        ...settings,
        [category]: validatedCategorySettings
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
      logger.info(`Updated category: ${category}`);
      return true;
    } catch (error) {
      logger.error(`Error updating category: ${category}`, error);
      return false;
    }
  };

  // Reset settings to defaults
  const resetSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      setSettings({ ...defaultSettings });
      logger.info('Settings reset to defaults');
      return true;
    } catch (error) {
      logger.error('Error resetting settings', error);
      return false;
    }
  };

  // Clear settings from storage
  const clearSettings = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSettings({ ...defaultSettings });
      logger.info('Settings cleared from storage');
      return true;
    } catch (error) {
      logger.error('Error clearing settings', error);
      return false;
    }
  };

  // Apply settings to application (to be expanded)
  const applySettings = () => {
    try {
      // Update theme
      document.documentElement.setAttribute('data-theme', settings.appearance.theme);
      
      // Apply other settings to application components...
      // This would normally update various parts of the application
      
      logger.info('Settings applied to application');
      return true;
    } catch (error) {
      logger.error('Error applying settings', error);
      return false;
    }
  };

  return (
    <AppSettingsContext.Provider 
      value={{
        settings,
        defaultSettings,
        isLoaded,
        saveSettings,
        updateSetting,
        updateCategory,
        resetSettings,
        clearSettings,
        applySettings
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

// Custom hook for using the settings context
export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};

export default AppSettingsContext; 