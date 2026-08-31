import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { useMemo, lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayoutFixed from './components/AppLayoutFixed';
import { PhysicsProvider } from './contexts/PhysicsContext';
import NotFound from './pages/NotFound';
import Dashboard from './pages/DashboardNew';
import SimulationDetail from './pages/SimulationDetail';
import AboutPage from './pages/AboutPage';
import TeamPage from './pages/TeamPage';
import PrivacyPage from './pages/PrivacyPage';
import './App.css';

// Development-only routes are hidden in production
const IS_PRODUCTION = process.env.REACT_APP_ENVIRONMENT === 'production' ||
  process.env.NODE_ENV === 'production';

// Pages - Simulation Workflow (Lazy load heavy pages)
const NewSimulation = lazy(() => import('./pages/NewSimulation'));
const QuantumTunnelingPage = lazy(() => import('./pages/QuantumTunnelingPage'));
const FusionSimulationPage = lazy(() => import('./pages/FusionSimulationPage'));
const LENRSimulationPage = lazy(() => import('./pages/LENRSimulationPage'));
const BubbleFusionPage = lazy(() => import('./pages/BubbleFusionPage'));
const UnifiedTheoryPage = lazy(() => import('./pages/UnifiedTheoryPage'));

// Pages - Information & Theory (Lazy load documentation-heavy pages)
const TheoryPage = lazy(() => import('./pages/TheoryPage'));
const TheoryPaperPage = lazy(() => import('./pages/TheoryPaperPage'));
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'));
const DocViewerPage = lazy(() => import('./pages/DocViewerPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AdvancedAnalysisPage = lazy(() => import('./pages/AdvancedAnalysisPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Pages - Advanced Visualization & Physics (All lazy - heavy Three.js dependencies)
const RealTimeVisualizationPage = lazy(() => import('./pages/RealTimeVisualizationPage'));
const PhysicsSimulationDashboardPage = lazy(() => import('./pages/PhysicsSimulationDashboardPage'));
const PhysicsVisualizationPage = lazy(() => import('./pages/PhysicsVisualizationPage'));
const ThreeJsTestPage = lazy(() => import('./pages/ThreeJsTestPage'));
const VisualizationDebugPage = lazy(() => import('./pages/VisualizationDebugPage'));
const VisualizationTest = lazy(() => import('./pages/VisualizationTest'));

// Components (Lazy load dev/debug tools)
const ComponentShowcase = lazy(() => import('./components/ui/ComponentShowcase'));
const DiagnosticTool = lazy(() => import('./debug/DiagnosticTool'));

// Lazy load heavy visualization components
const LazyLatticeTest = lazy(() => import('./visualization/components/LatticeTest'));

// Loading fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <CircularProgress size={60} thickness={4} />
  </Box>
);

// App with theme handling
const AppContent = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Create theme based on dark/light mode
  const theme = useMemo<Theme>(() => 
    createTheme({
      palette: {
        mode: isDarkMode ? 'dark' : 'light' as PaletteMode,
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
        background: {
          default: isDarkMode ? '#121212' : '#f5f5f5',
          paper: isDarkMode ? '#1e1e1e' : '#ffffff',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
          fontWeight: 500,
        },
        subtitle1: {
          fontWeight: 500,
        },
        subtitle2: {
          fontWeight: 500,
        },
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
    }),
    [isDarkMode]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <PhysicsProvider>
          <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Routes>
            {/* Main Dashboard - Use AppLayoutFixed */}
            <Route path="/" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Dashboard />
              </AppLayoutFixed>
            } />
            
            {/* Simulation Workflow Pages - Use AppLayoutFixed */}
            <Route path="/dashboard" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Dashboard />
              </AppLayoutFixed>
            } />
            <Route path="/simulations" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <NewSimulation />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/new-simulation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <NewSimulation />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/simulation/:simulationId" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <SimulationDetail />
              </AppLayoutFixed>
            } />
            
            {/* Specific Physics Simulation Pages - Use AppLayoutFixed */}
            <Route path="/quantum-tunneling" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <QuantumTunnelingPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/fusion-simulation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <FusionSimulationPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/lenr-simulation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <LENRSimulationPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/bubble-fusion" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <BubbleFusionPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            
            {/* Advanced Visualization Pages - Use AppLayoutFixed */}
            <Route path="/real-time-visualization" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <RealTimeVisualizationPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/physics-dashboard" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <PhysicsSimulationDashboardPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/physics-visualization" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <PhysicsVisualizationPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            {/* Other Pages */}
            <Route path="/about" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <AboutPage />
              </AppLayoutFixed>
            } />
            <Route path="/privacy" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <PrivacyPage />
              </AppLayoutFixed>
            } />
            <Route path="/theory" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <TheoryPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/theory-paper" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <TheoryPaperPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/unified-theory" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                    <UnifiedTheoryPage />
                  </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/analytics" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <AnalyticsPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/advanced-analysis" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                    <AdvancedAnalysisPage />
                  </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/documentation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <DocumentationPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/docs" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <DocumentationPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/docs/:slug" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <DocViewerPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/team" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <TeamPage />
              </AppLayoutFixed>
            } />
            <Route path="/settings" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              </AppLayoutFixed>
            } />
            
            {/* Development & Testing Pages -- hidden in production */}
            {!IS_PRODUCTION && (
              <>
                <Route path="/diagnostics" element={
                  <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                    <Suspense fallback={<LoadingFallback />}>
                      <DiagnosticTool />
                    </Suspense>
                  </AppLayoutFixed>
                } />
                <Route path="/component-showcase" element={
                  <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                    <Suspense fallback={<LoadingFallback />}>
                      <ComponentShowcase />
                    </Suspense>
                  </AppLayoutFixed>
                } />
                <Route path="/visualization-test" element={
                  <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                    <Suspense fallback={<LoadingFallback />}>
                      <VisualizationTest />
                    </Suspense>
                  </AppLayoutFixed>
                } />
                <Route path="/visualization-debug" element={
                  <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                    <Suspense fallback={<LoadingFallback />}>
                      <VisualizationDebugPage />
                    </Suspense>
                  </AppLayoutFixed>
                } />
                <Route path="/three-test" element={
                  <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                    <Suspense fallback={<LoadingFallback />}>
                      <ThreeJsTestPage />
                    </Suspense>
                  </AppLayoutFixed>
                } />
                <Route path="/lattice-test" element={
                  <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                    <Suspense fallback={<LoadingFallback />}>
                      <LazyLatticeTest />
                    </Suspense>
                  </AppLayoutFixed>
                } />
              </>
            )}

            {/* 404 catch-all */}
            <Route path="*" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <NotFound />
              </AppLayoutFixed>
            } />
          </Routes>
          </Router>
        </PhysicsProvider>
      </SnackbarProvider>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;