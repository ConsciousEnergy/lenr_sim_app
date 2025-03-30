import React, { useState, useEffect } from 'react';
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
import * as api from './api/api';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description';
import HelpIcon from '@mui/icons-material/Help';
import ScienceIcon from '@mui/icons-material/Science';
import MenuIcon from '@mui/icons-material/Menu';
import GitHubIcon from '@mui/icons-material/GitHub';

// Pages
import Dashboard from './pages/Dashboard';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

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

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  useEffect(() => {
    // Check if backend is reachable using the API client
    const checkBackendStatus = async () => {
      try {
        const data = await api.checkHealth();
        if (data.status === 'healthy') {
          setServerStatus('Connected');
        } else {
          setServerStatus('Available, but reporting issues');
        }
      } catch (error) {
        console.error('Failed to connect to backend:', error);
        setServerStatus('Unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    checkBackendStatus();

    // Set up periodic health checks (every 30 seconds)
    const healthCheckInterval = setInterval(checkBackendStatus, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(healthCheckInterval);
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          {/* App Bar */}
          <AppBarWithDrawer position="fixed" open={drawerOpen}>
            <Toolbar>
              <Button
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                edge="start"
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </Button>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                LENR Simulation App
              </Typography>
              
              {/* Server status indicator */}
              <Chip 
                label={`API: ${serverStatus}`}
                color={getStatusColor()}
                size="small"
                sx={{ mr: 2 }}
              />
              
              <Button 
                color="inherit" 
                component="a" 
                href="https://github.com/ConsciousEnergy/lenr_sim_app" 
                target="_blank"
                startIcon={<GitHubIcon />}
              >
                GitHub
              </Button>
            </Toolbar>
          </AppBarWithDrawer>

          {/* Side Drawer */}
          <Drawer
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
            variant="persistent"
            anchor="left"
            open={drawerOpen}
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <ScienceIcon sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                LENR Sim App
              </Typography>
            </Box>
            <Divider />
            <List>
              <ListItem button component={Link} to="/">
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItem>
              <ListItem button component={Link} to="/documentation">
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText primary="Documentation" />
              </ListItem>
              <ListItem button component={Link} to="/settings">
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItem>
              <ListItem button component={Link} to="/help">
                <ListItemIcon>
                  <HelpIcon />
                </ListItemIcon>
                <ListItemText primary="Help" />
              </ListItem>
            </List>
          </Drawer>

          {/* Main Content */}
          <Main open={drawerOpen}>
            <Toolbar /> {/* This creates space below the app bar */}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Routes>
          </Main>
        </Box>
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

function Settings() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Typography variant="body1">Application settings will be available here.</Typography>
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