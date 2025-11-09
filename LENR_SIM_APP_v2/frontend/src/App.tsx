import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { useMemo, lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
// import AppLayout from './components/AppLayout';
import AppLayoutFixed from './components/AppLayoutFixed';
import './App.css';

// Pages - Simulation Workflow
// import Dashboard from './pages/Dashboard';
import Dashboard from './pages/DashboardNew';
import SimulationDetail from './pages/SimulationDetail';
import NewSimulation from './pages/NewSimulation';
import QuantumTunnelingPage from './pages/QuantumTunnelingPage';
import FusionSimulationPage from './pages/FusionSimulationPage';
import LENRSimulationPage from './pages/LENRSimulationPage';
import BubbleFusionPage from './pages/BubbleFusionPage';

// Pages - Information & Theory
import AboutPage from './pages/AboutPage';
import TheoryPage from './pages/TheoryPage';
import DocumentationPage from './pages/DocumentationPage';

// Pages - Advanced Visualization & Physics
import RealTimeVisualizationPage from './pages/RealTimeVisualizationPage';
import PhysicsSimulationDashboardPage from './pages/PhysicsSimulationDashboardPage';
import PhysicsVisualizationPage from './pages/PhysicsVisualizationPage';
import ThreeJsTestPage from './pages/ThreeJsTestPage';
import VisualizationDebugPage from './pages/VisualizationDebugPage';
import VisualizationTest from './pages/VisualizationTest';

// Components
import ComponentShowcase from './components/ui/ComponentShowcase';
import DiagnosticTool from './debug/DiagnosticTool';

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
                <SimulationDetail />
              </AppLayoutFixed>
            } />
            <Route path="/new-simulation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <NewSimulation />
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
                <QuantumTunnelingPage />
              </AppLayoutFixed>
            } />
            <Route path="/fusion-simulation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <FusionSimulationPage />
              </AppLayoutFixed>
            } />
            <Route path="/lenr-simulation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <LENRSimulationPage />
              </AppLayoutFixed>
            } />
            <Route path="/bubble-fusion" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <BubbleFusionPage />
              </AppLayoutFixed>
            } />
            
            {/* Advanced Visualization Pages - Use AppLayoutFixed */}
            <Route path="/lattice-test" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Suspense fallback={<LoadingFallback />}>
                  <LazyLatticeTest />
                </Suspense>
              </AppLayoutFixed>
            } />
            <Route path="/real-time-visualization" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <RealTimeVisualizationPage />
              </AppLayoutFixed>
            } />
            <Route path="/physics-dashboard" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <PhysicsSimulationDashboardPage />
              </AppLayoutFixed>
            } />
            <Route path="/physics-visualization" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <PhysicsVisualizationPage />
              </AppLayoutFixed>
            } />
            <Route path="/three-test" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <ThreeJsTestPage />
              </AppLayoutFixed>
            } />
            <Route path="/visualization-debug" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <VisualizationDebugPage />
              </AppLayoutFixed>
            } />
            
            {/* Other Pages */}
            <Route path="/about" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <AboutPage />
              </AppLayoutFixed>
            } />
            <Route path="/theory" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <TheoryPage />
              </AppLayoutFixed>
            } />
            <Route path="/unified-theory" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <TheoryPage />
              </AppLayoutFixed>
            } />
            <Route path="/analytics" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Dashboard />
              </AppLayoutFixed>
            } />
            <Route path="/documentation" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <DocumentationPage />
              </AppLayoutFixed>
            } />
            <Route path="/docs" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <DocumentationPage />
              </AppLayoutFixed>
            } />
            <Route path="/team" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Dashboard />
              </AppLayoutFixed>
            } />
            <Route path="/settings" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <Dashboard />
              </AppLayoutFixed>
            } />
            
            {/* Development & Testing Pages */}
            <Route path="/diagnostics" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <DiagnosticTool />
              </AppLayoutFixed>
            } />
            <Route path="/component-showcase" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <ComponentShowcase />
              </AppLayoutFixed>
            } />
            <Route path="/visualization-test" element={
              <AppLayoutFixed darkMode={isDarkMode} toggleDarkMode={toggleTheme}>
                <VisualizationTest />
              </AppLayoutFixed>
            } />
          </Routes>
        </Router>
      </SnackbarProvider>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

