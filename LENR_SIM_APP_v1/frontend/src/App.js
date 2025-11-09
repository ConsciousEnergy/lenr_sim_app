import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ThreeJsDebug from './debug/ThreeJsDebug';
import TestRunner from './debug/TestRunner';
import TestRydbergModel from './debug/testRydbergModel';
import VisualizationTester from './debug/VisualizationTester';
import LogViewer from './debug/LogViewer';
import SettingsPage from './debug/SettingsPage';
import UnifiedLENRVisualizer from './components/UnifiedLENRVisualizer';
import { ErrorBoundary } from './utils/ErrorBoundary';
import { useAppSettings } from './contexts/AppSettingsContext';
import { createAppTheme } from './theme/themeConfig';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('Checking...');
  const { settings, isLoaded } = useAppSettings();

  // Create theme based on settings
  const currentTheme = useMemo(() => {
    if (!isLoaded) return createAppTheme('light'); // Default to light theme
    
    const themeMode = settings.appearance.theme;
    // Handle 'system' theme preference by checking user's system preference
    if (themeMode === 'system') {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return createAppTheme(prefersDarkMode ? 'dark' : 'light');
    }
    
    return createAppTheme(themeMode);
  }, [isLoaded, settings?.appearance?.theme]);

  useEffect(() => {
    // Check if backend is reachable
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('/health');
        const data = await response.json();
        if (data.status === 'healthy') {
          setServerStatus('Connected');
        } else {
          setServerStatus('Available, but reporting issues');
        }
      } catch (error) {
        setServerStatus('Unavailable');
        console.error('Failed to connect to backend:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkBackendStatus();
  }, []);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Router>
        <ErrorBoundary>
          <Layout 
            isLoading={isLoading} 
            serverStatus={serverStatus}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/debug" element={<TestRydbergModel />} />
              <Route path="/three-debug" element={<ThreeJsDebug />} />
              <Route path="/diagnostic" element={<TestRunner />} />
              <Route path="/vis-test" element={<VisualizationTester />} />
              <Route path="/log-viewer" element={<LogViewer />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/unified-theory" element={<UnifiedLENRVisualizer />} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App; 