/**
 * Settings Context
 * Provides application-wide settings management
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const SettingsContext = createContext();

const defaultSettings = {
  theme: 'light',
  enableAnimations: true,
  showGrid: true,
  autoSave: true,
  debugMode: false,
  renderQuality: 'high'
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Alias for backwards compatibility
export const useAppSettings = useSettings;

export default SettingsContext;

