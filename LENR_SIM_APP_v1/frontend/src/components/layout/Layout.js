import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar as MuiAppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  Tooltip
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import BugReportIcon from '@mui/icons-material/BugReport';
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation';
import BuildIcon from '@mui/icons-material/Build';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useOffline } from '../../contexts/OfflineContext';

const drawerWidth = 240;

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    boxSizing: 'border-box',
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const Layout = ({ children, isLoading, serverStatus }) => {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const { isOffline, storedLogs, clearStoredLogs } = useOffline();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  // Menu items configuration
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { 
      type: 'divider',
      label: 'Development Tools'
    },
    { path: '/diagnostic', label: 'System Diagnostics', icon: <BuildIcon /> },
    { path: '/vis-test', label: 'Visualization Tester', icon: <VisibilityIcon /> },
    { path: '/debug', label: 'Debug Model', icon: <BugReportIcon /> },
    { path: '/three-debug', label: 'Three.js Debug', icon: <ThreeDRotationIcon /> },
    { 
      type: 'divider',
      label: 'Settings & Help'
    },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
    { path: '/help', label: 'Help', icon: <HelpIcon /> },
    { path: '/log-viewer', label: 'Log Viewer', icon: <AssessmentIcon /> }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            LENR Simulation App
          </Typography>
          
          {/* Offline mode indicator */}
          {isOffline && (
            <Tooltip title="Application is running in offline mode. Backend services are unavailable.">
              <Chip 
                icon={<CloudOffIcon />}
                label="Offline Mode" 
                color="warning"
                size="small" 
                sx={{ mr: 2 }}
              />
            </Tooltip>
          )}
          
          {/* Stored logs indicator */}
          {storedLogs > 0 && (
            <Tooltip title={`${storedLogs} logs stored locally. Will be sent when backend is available.`}>
              <Chip
                icon={<ContentPasteIcon />}
                label={`${storedLogs} Stored Logs`}
                color="info"
                size="small"
                sx={{ mr: 2 }}
                onClick={clearStoredLogs}
              />
            </Tooltip>
          )}
          
          {/* Connection status indicator */}
          <Tooltip title={`Backend API: ${isOffline ? 'Offline' : serverStatus}`}>
            <Chip 
              icon={isOffline ? <CloudOffIcon /> : <CloudDoneIcon />}
              label={isOffline ? 'Offline' : serverStatus}
              color={isOffline ? 'error' : (serverStatus === 'Connected' ? 'success' : 'warning')}
              size="small"
              sx={{ mr: 2 }}
            />
          </Tooltip>
          
          <Button 
            color="inherit" 
            component="a" 
            href="https://conscious.energy" 
            target="_blank"
            sx={{ ml: 1 }}
          >
            conscious.energy
          </Button>
        </Toolbar>
      </AppBar>
      
      <StyledDrawer
        variant="permanent"
        open={open}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, pl: 2 }}>
            <ScienceIcon sx={{ mr: 1 }} />
            <Typography variant="h6">LENR Sim App</Typography>
          </Box>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item, index) => (
            item.type === 'divider' ? (
              <React.Fragment key={`divider-${index}`}>
                <Divider sx={{ mt: 2, mb: 1 }} />
                {item.label && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      ml: 2, 
                      mt: 1, 
                      display: 'block', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {item.label}
                  </Typography>
                )}
              </React.Fragment>
            ) : (
              <ListItem 
                button 
                component={Link} 
                to={item.path}
                selected={location.pathname === item.path}
                key={item.path}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            )
          ))}
        </List>
      </StyledDrawer>
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
};

export default Layout; 