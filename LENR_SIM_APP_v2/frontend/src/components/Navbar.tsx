import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  Visibility as VisibilityIcon,
  Science as ScienceIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <HomeIcon /> },
  { path: '/real-time-visualization', label: 'Real-time Viz', icon: <TimelineIcon /> },
  { path: '/physics-dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/physics-visualization', label: 'Physics Viz', icon: <ScienceIcon /> },
  { path: '/three-test', label: '3D Tests', icon: <VisibilityIcon /> },
  { path: '/visualization-debug', label: 'Debug Tools', icon: <BugReportIcon /> },
];

const Navbar: React.FC = () => {
  const muiTheme = useMuiTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            LENR Simulation
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  color="inherit"
                  sx={{
                    mx: 1,
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    borderBottom: location.pathname === item.path ? '2px solid' : 'none',
                  }}
                  startIcon={item.icon}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <ThemeToggle />
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer anchor="left" open={mobileMenuOpen} onClose={handleMobileMenuToggle}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={handleMobileMenuToggle}
        >
          <List>
            {navItems.map((item) => (
              <Box 
                key={item.path} 
                component={Link} 
                to={item.path}
                sx={{ 
                  textDecoration: 'none', 
                  color: 'inherit',
                  display: 'block'
                }}
              >
                <ListItem 
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: location.pathname === item.path 
                      ? 'action.selected' 
                      : 'transparent'
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItem>
              </Box>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar; 