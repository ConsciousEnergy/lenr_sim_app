import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { useMemo, lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import AppLayout from './components/AppLayout';

// Pages - Simulation Workflow
import Dashboard from './pages/Dashboard';
import SimulationDetail from './pages/SimulationDetail';
import NewSimulation from './pages/NewSimulation';
import QuantumTunnelingPage from './pages/QuantumTunnelingPage';
import FusionSimulationPage from './pages/FusionSimulationPage';
import LENRSimulationPage from './pages/LENRSimulationPage';
import BubbleFusionPage from './pages/BubbleFusionPage';

// Pages - Advanced Visualization & Physics
import RealTimeVisualizationPage from './pages/RealTimeVisualizationPage';
import PhysicsSimulationDashboardPage from './pages/PhysicsSimulationDashboardPage';
import PhysicsVisualizationPage from './pages/PhysicsVisualizationPage';
import ThreeJsTestPage from './pages/ThreeJsTestPage';
import VisualizationDebugPage from './pages/VisualizationDebugPage';

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
  const { isDarkMode } = useTheme();
  
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
        <Router>
          <Navbar />
          <Routes>
            {/* Main Dashboard - Use AppLayout */}
            <Route path="/" element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            } />
            
            {/* Simulation Workflow Pages - Use AppLayout */}
            <Route path="/dashboard" element={
              <AppLayout>
                <Dashboard />
              </AppLayout>
            } />
            <Route path="/new-simulation" element={
              <AppLayout>
                <NewSimulation />
              </AppLayout>
            } />
            <Route path="/simulation/:simulationId" element={
              <AppLayout>
                <SimulationDetail />
              </AppLayout>
            } />
            
            {/* Specific Physics Simulation Pages - Use AppLayout */}
            <Route path="/quantum-tunneling" element={
              <AppLayout>
                <QuantumTunnelingPage />
              </AppLayout>
            } />
            <Route path="/fusion-simulation" element={
              <AppLayout>
                <FusionSimulationPage />
              </AppLayout>
            } />
            <Route path="/lenr-simulation" element={
              <AppLayout>
                <LENRSimulationPage />
              </AppLayout>
            } />
            <Route path="/bubble-fusion" element={
              <AppLayout>
                <BubbleFusionPage />
              </AppLayout>
            } />
            
            {/* Advanced Visualization Pages - Full screen with just Navbar */}
            <Route path="/lattice-test" element={
              <Suspense fallback={<LoadingFallback />}>
                <LazyLatticeTest />
              </Suspense>
            } />
            <Route path="/real-time-visualization" element={<RealTimeVisualizationPage />} />
            <Route path="/physics-dashboard" element={<PhysicsSimulationDashboardPage />} />
            <Route path="/physics-visualization" element={<PhysicsVisualizationPage />} />
            <Route path="/three-test" element={<ThreeJsTestPage />} />
            <Route path="/visualization-debug" element={<VisualizationDebugPage />} />
            
            {/* Development & Testing Pages */}
            <Route path="/diagnostics" element={<DiagnosticTool />} />
            <Route path="/component-showcase" element={
              <AppLayout>
                <ComponentShowcase />
              </AppLayout>
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

