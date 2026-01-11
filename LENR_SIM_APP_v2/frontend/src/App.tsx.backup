import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { useMemo, lazy, Suspense } from 'react';
import LatticeTest from './visualization/components/LatticeTest';
import RealTimeVisualizationPage from './pages/RealTimeVisualizationPage';
import PhysicsSimulationDashboardPage from './pages/PhysicsSimulationDashboardPage';
import PhysicsVisualizationPage from './pages/PhysicsVisualizationPage';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import DiagnosticTool from './debug/DiagnosticTool';
import ThreeJsTestPage from './pages/ThreeJsTestPage';
import VisualizationDebugPage from './pages/VisualizationDebugPage';
import { CircularProgress, Box } from '@mui/material';

// Lazy load components that might be causing issues
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
            <Route path="/" element={
              <Suspense fallback={<LoadingFallback />}>
                <LazyLatticeTest />
              </Suspense>
            } />
            <Route path="/real-time-visualization" element={<RealTimeVisualizationPage />} />
            <Route path="/physics-dashboard" element={<PhysicsSimulationDashboardPage />} />
            <Route path="/physics-visualization" element={<PhysicsVisualizationPage />} />
            <Route path="/diagnostics" element={<DiagnosticTool />} />
            <Route path="/viz-test" element={<LatticeTest />} />
            <Route path="/three-test" element={<ThreeJsTestPage />} />
            <Route path="/visualization-debug" element={<VisualizationDebugPage />} />
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