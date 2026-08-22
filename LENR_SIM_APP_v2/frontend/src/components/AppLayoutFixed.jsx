import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider,
  Link as MuiLink,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Collapse,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
// ChevronRightIcon removed - not needed
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import HubIcon from '@mui/icons-material/Hub';
import BoltIcon from '@mui/icons-material/Bolt';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import ArticleIcon from '@mui/icons-material/Article';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoIcon from '@mui/icons-material/Info';
// User profile icons removed - app is open access without authentication
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { APP_VERSION } from '../config/version';

const drawerWidth = 260;

// Styled components
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    height: 0,             // Combined with flexGrow:1 to fill remaining viewport height
    overflowY: 'auto',     // Scroll when content exceeds available height
    padding: theme.spacing(3),
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    width: '100%',
    ...(open && {
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: `${drawerWidth}px`,
      width: `calc(100% - ${drawerWidth}px)`,
    }),
  }),
);

const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));

const StyledListItemButton = styled(ListItemButton)(({ theme, selected }) => ({
  borderRadius: theme.shape.borderRadius,
  margin: theme.spacing(0.5, 1),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  }),
}));

// Navigation menu structure
const menuItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/',
    icon: <DashboardIcon />
  },
  {
    id: 'divider1',
    type: 'divider'
  },
  {
    id: 'unified-theory',
    title: 'Unified Theory',
    path: '/unified-theory',
    icon: <HubIcon />,
    highlight: true
  },
  {
    id: 'simulations',
    title: 'Advanced Tools',
    path: '/simulations',
    icon: <ScienceIcon />,
    children: [
      {
        id: 'quantum-tunneling',
        title: 'Quantum Tunneling',
        path: '/quantum-tunneling',
        icon: <BoltIcon />
      },
      {
        id: 'bubble-fusion',
        title: 'Bubble Fusion',
        path: '/bubble-fusion',
        icon: <BubbleChartIcon />
      },
      {
        id: 'advanced-analysis',
        title: 'Advanced Analysis',
        path: '/advanced-analysis',
        icon: <AssessmentIcon />
      }
      // Legacy simulations (LENR, Fusion) hidden - routes still work via direct URL
    ]
  },
  {
    id: 'divider2',
    type: 'divider'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    path: '/analytics',
    icon: <AnalyticsIcon />
  },
  {
    id: 'divider3',
    type: 'divider'
  },
  {
    id: 'documentation',
    title: 'Documentation',
    path: '/documentation',
    icon: <DescriptionIcon />,
    children: [
      {
        id: 'theory-paper',
        title: 'Theory Paper',
        path: '/theory-paper',
        icon: <ArticleIcon />
      },
      {
        id: 'theory-guide',
        title: 'Theory Guide',
        path: '/theory',
        icon: <DescriptionIcon />
      }
    ]
  },
  {
    id: 'about',
    title: 'About',
    path: '/about',
    icon: <InfoIcon />
  },
  {
    id: 'team',
    title: 'Team',
    path: '/team',
    icon: <GroupIcon />
  },
  {
    id: 'settings',
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />
  }
];

function AppLayoutFixed({ children, darkMode = false, toggleDarkMode = null }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  
  const [open, setOpen] = useState(!isMobile);
  const [submenuOpen, setSubmenuOpen] = useState({});

  useEffect(() => {
    // Auto-close drawer on mobile when route changes
    if (isMobile) {
      setOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    // Update drawer state when screen size changes
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleSubmenuToggle = (id) => {
    setSubmenuOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Profile menu handlers removed - app is open access without authentication

  const isSelected = (path) => {
    return location.pathname === path;
  };

  const renderMenuItem = (item, _level = 0) => {
    if (item.type === 'divider') {
      return <Divider key={item.id} sx={{ my: 1 }} />;
    }

    if (item.children) {
      const isSubmenuOpen = !!submenuOpen[item.id];
      return (
        <React.Fragment key={item.id}>
          <StyledListItemButton onClick={() => handleSubmenuToggle(item.id)}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.title} />
            {isSubmenuOpen ? <ExpandLess /> : <ExpandMore />}
          </StyledListItemButton>
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => (
                <StyledListItemButton
                  key={child.id}
                  component={Link}
                  to={child.path}
                  selected={isSelected(child.path)}
                  sx={{ pl: 6 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {child.icon}
                  </ListItemIcon>
                  <ListItemText primary={child.title} />
                </StyledListItemButton>
              ))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <StyledListItemButton
        key={item.id}
        component={Link}
        to={item.path}
        selected={isSelected(item.path)}
        sx={item.highlight ? {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          },
        } : {}}
      >
        <ListItemIcon sx={{ minWidth: 40, color: item.highlight ? theme.palette.primary.main : 'inherit' }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText 
          primary={item.title} 
          sx={item.highlight ? { 
            '& .MuiTypography-root': { fontWeight: 600, color: theme.palette.primary.main } 
          } : {}}
        />
        {item.highlight && (
          <Box
            sx={{
              bgcolor: theme.palette.primary.main,
              color: 'white',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontSize: '0.65rem',
              fontWeight: 'bold',
            }}
          >
            NEW
          </Box>
        )}
      </StyledListItemButton>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBarStyled position="fixed" open={open} elevation={1}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            LENR Simulation
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {toggleDarkMode && (
              <IconButton onClick={toggleDarkMode} color="inherit" aria-label="Toggle dark mode">
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBarStyled>
      
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.default,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerToggle}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src="/images/ce-logo.png"
              alt="CE Logo"
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
              }}
            />
            <Typography variant="h6" noWrap>
              LENR App
            </Typography>
          </Box>
          {!isMobile && (
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon />
            </IconButton>
          )}
        </DrawerHeader>
        
        <Divider />
        
        <List>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Divider />
        
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Version {APP_VERSION}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            © 2025-2026 LENR Simulation App
          </Typography>
          <Typography variant="caption" color="text.secondary">
            GNU{' '}
            <MuiLink
              href="https://github.com/ConsciousEnergy/lenr_sim_app/blob/lenr_sim_app_v0.3.6-beta/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              underline="hover"
            >
              GPL-3.0
            </MuiLink>
            {' '}copyleft
          </Typography>
        </Box>
      </Drawer>
      
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
}

export default AppLayoutFixed;
