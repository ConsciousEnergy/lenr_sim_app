import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import './App.css';
import ErrorBoundary from './debug/ErrorBoundary';
import { useAppSettings } from './contexts/AppSettingsContext';
import { createAppTheme } from './theme';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description';
import HelpIcon from '@mui/icons-material/Help';
import ScienceIcon from '@mui/icons-material/Science';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';
import BugReportIcon from '@mui/icons-material/BugReport';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';

// Pages
import Dashboard from './pages/Dashboard';
import Layout from './components/layout/Layout';
import TestRydbergModel from './debug/testRydbergModel';
import ThreeJsDebug from './debug/ThreeJsDebug';
import TestRunner from './debug/TestRunner';
import SettingsPage from './debug/SettingsPage';
import VisualizationTester from './debug/VisualizationTester';
import LogViewer from './debug/LogViewer';

// Styled components
const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: drawerWidth,
    }),
  }),
);

const AppBarWithDrawer = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: drawerWidth,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
);

function App() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
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

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

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

  // Get color based on server status
  const getStatusColor = () => {
    if (isLoading) return 'default';
    switch (serverStatus) {
      case 'Connected': return 'success';
      case 'Unavailable': return 'error';
      default: return 'warning';
    }
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Router>
        <ErrorBoundary>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/debug" element={<TestRydbergModel />} />
              <Route path="/three-debug" element={<ThreeJsDebug />} />
              <Route path="/diagnostic" element={<TestRunner />} />
              <Route path="/vis-test" element={<VisualizationTester />} />
              <Route path="/log-viewer" element={<LogViewer />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

// Placeholder components for routes
function Documentation() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Documentation</Typography>
      <Typography variant="body1">Documentation will be available here.</Typography>
    </Container>
  );
}

function Help() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Help</Typography>
      <Typography variant="body1">Help and support content will be available here.</Typography>
    </Container>
  );
}

export default App; 