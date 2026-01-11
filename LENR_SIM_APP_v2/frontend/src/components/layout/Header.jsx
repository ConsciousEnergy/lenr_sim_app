import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
  useMediaQuery,
  Divider,
  ListSubheader
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ScienceIcon from '@mui/icons-material/Science';
import CodeIcon from '@mui/icons-material/Code';

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  const navigationItems = [
    { text: 'Home', path: '/' },
    { text: 'Simulation', path: '/simulation' },
    { text: 'Advanced Analysis', path: '/advanced-analysis' },
    { text: 'History', path: '/history' },
    { text: 'About', path: '/about' }
  ];
  
  // Development navigation items - only shown in development mode
  const developmentItems = [
    { text: 'Debug Test', path: '/debug-test' },
    { text: 'TypeScript Test', path: '/typescript-test' }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ScienceIcon sx={{ mr: 1 }} />
        LENR Simulation
      </Typography>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              sx={{ 
                textAlign: 'center',
                bgcolor: location.pathname === item.path ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
              }}
              onClick={() => handleNavigate(item.path)}
            >
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {isDevelopment && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListSubheader>Development</ListSubheader>
            {developmentItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  sx={{ 
                    textAlign: 'center',
                    bgcolor: location.pathname === item.path ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
                  }}
                  onClick={() => handleNavigate(item.path)}
                >
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 0 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            <ScienceIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                flexGrow: 1,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              LENR Simulation App
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {navigationItems.map((item) => (
              <Button
                key={item.text}
                color="inherit"
                onClick={() => handleNavigate(item.path)}
                sx={{ 
                  mx: 0.5,
                  '&.active': {
                    borderBottom: '2px solid white'
                  },
                  borderBottom: location.pathname === item.path ? '2px solid white' : 'none'
                }}
              >
                {item.text}
              </Button>
            ))}
            
            {isDevelopment && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.3)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CodeIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                  {developmentItems.map((item) => (
                    <Button
                      key={item.text}
                      color="inherit"
                      size="small"
                      onClick={() => handleNavigate(item.path)}
                      sx={{ 
                        mx: 0.5,
                        fontSize: '0.875rem',
                        borderBottom: location.pathname === item.path ? '2px solid white' : 'none'
                      }}
                    >
                      {item.text}
                    </Button>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </Box>
  );
};

export default Header; 