import React, { useState, useEffect } from 'react';
import { 
  Container,
  Paper, 
  Typography, 
  Box, 
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Avatar,
  LinearProgress,
  Alert,
  AlertTitle,
  Divider,
  useTheme,
  alpha,
  Fade,
  Grow
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// Icons
import ScienceIcon from '@mui/icons-material/Science';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import TuneIcon from '@mui/icons-material/Tune';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MemoryIcon from '@mui/icons-material/Memory';
import DocumentationIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import TeamIcon from '@mui/icons-material/Groups';
import LaunchIcon from '@mui/icons-material/Launch';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GitHubIcon from '@mui/icons-material/GitHub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import PendingIcon from '@mui/icons-material/Pending'; // Not currently used
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(8, 0, 6),
  borderRadius: theme.shape.borderRadius * 2,
  marginBottom: theme.spacing(4),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    opacity: 0.1
  }
}));

const QuickActionCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
    borderColor: theme.palette.primary.main,
    '& .MuiAvatar-root': {
      transform: 'scale(1.1)',
    }
  }
}));

const StatusCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}));

const FeatureChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  fontWeight: 600,
  background: 'rgba(255, 255, 255, 0.95)',
  color: theme.palette.primary.main,
  border: `1px solid rgba(255, 255, 255, 0.3)`,
  '& .MuiChip-icon': {
    color: theme.palette.primary.main
  }
}));

const MemoryIndicator = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  background: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: 'blur(10px)',
  boxShadow: theme.shadows[4],
  zIndex: 1000,
}));

// Quick Action data
const quickActions = [
  {
    id: 'unified-theory',
    title: 'Unified LENR Theory',
    description: 'Comprehensive simulation with all enhancement mechanisms from the unified framework',
    icon: <MemoryIcon />,
    color: '#2196F3',
    path: '/unified-theory',
    status: 'new'
  },
  {
    id: 'lenr-simulation',
    title: 'LENR Simulation',
    description: 'Lattice-based low energy nuclear reaction modeling',
    icon: <ScienceIcon />,
    color: '#4CAF50',
    path: '/lenr-simulation',
    status: 'ready'
  },
  {
    id: 'fusion-simulation',
    title: 'Fusion Simulation',
    description: 'Model fusion reactions in metal lattices',
    icon: <BubbleChartIcon />,
    color: '#9C27B0',
    path: '/fusion-simulation',
    status: 'ready'
  },
  {
    id: 'quantum-tunneling',
    title: 'Quantum Tunneling',
    description: 'Analyze quantum mechanical tunneling effects',
    icon: <TuneIcon />,
    color: '#FF9800',
    path: '/quantum-tunneling',
    status: 'ready'
  },
  {
    id: 'bubble-fusion',
    title: 'Bubble Fusion',
    description: 'Simulate sonofusion and acoustic cavitation phenomena',
    icon: <BubbleChartIcon />,
    color: '#00BCD4',
    path: '/bubble-fusion',
    status: 'beta'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Analyze simulation results and generate reports',
    icon: <AssessmentIcon />,
    color: '#F44336',
    path: '/analytics',
    status: 'ready'
  }
];

function DashboardNew() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [_loading, setLoading] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState({ used: 0, total: 4 });

  useEffect(() => {
    // Simulate memory usage updates
    const interval = setInterval(() => {
      if (performance.memory) {
        setMemoryUsage({
          used: (performance.memory.usedJSHeapSize / 1048576).toFixed(0),
          total: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(0)
        });
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleActionClick = (path) => {
    setLoading(true);
    setTimeout(() => {
      navigate(path);
      setLoading(false);
    }, 300);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Hero Section */}
      <Fade in={true} timeout={600}>
        <HeroSection>
          <Container maxWidth="lg">
            <Grid container spacing={4} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                  <Box
                    component="img"
                    src="/images/ce-logo.png"
                    alt="Conscious Energy Logo"
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 2,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      padding: '4px',
                    }}
                  />
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    sx={{ fontWeight: 700 }}
                  >
                    LENR Simulation Platform
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
                  Advanced modeling and visualization of Low Energy Nuclear Reactions
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <FeatureChip label="Physics Simulation" icon={<CheckCircleIcon />} />
                  <FeatureChip label="3D Visualization" icon={<CheckCircleIcon />} />
                  <FeatureChip label="Real-time Analysis" icon={<CheckCircleIcon />} />
                  <FeatureChip label="Export Results" icon={<CheckCircleIcon />} />
                </Stack>
                <Box sx={{ mt: 4 }}>
                  <Button 
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    sx={{ 
                      mr: 2,
                      background: 'white',
                      color: theme.palette.primary.main,
                      '&:hover': {
                        background: alpha(theme.palette.common.white, 0.9),
                      }
                    }}
                    onClick={() => handleActionClick('/unified-theory')}
                  >
                    Start Simulation
                  </Button>
                  <Button 
                    variant="outlined"
                    size="large"
                    startIcon={<DocumentationIcon />}
                    sx={{ 
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        background: alpha(theme.palette.common.white, 0.1),
                      }
                    }}
                    onClick={() => handleActionClick('/documentation')}
                  >
                    Documentation
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <StatusCard elevation={3}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    System Status
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">GPU Acceleration</Typography>
                        <Chip label="Active" size="small" color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Physics Engine</Typography>
                        <Chip label="Ready" size="small" color="success" />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">API Server</Typography>
                        <Chip label="Connected" size="small" color="success" />
                      </Box>
                    </Box>
                  </Stack>
                </StatusCard>
              </Grid>
            </Grid>
          </Container>
        </HeroSection>
      </Fade>

      {/* Quick Actions Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={3}>
          {quickActions.map((action, index) => (
            <Grow in={true} timeout={300 + index * 100} key={action.id}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <QuickActionCard 
                  onClick={() => handleActionClick(action.path)}
                  elevation={1}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: alpha(action.color, 0.1),
                          color: action.color,
                          transition: 'transform 0.3s',
                        }}
                      >
                        {action.icon}
                      </Avatar>
                      {action.status === 'beta' && (
                        <Chip 
                          label="BETA" 
                          size="small" 
                          sx={{ ml: 'auto' }}
                          color="warning"
                        />
                      )}
                      {action.status === 'new' && (
                        <Chip 
                          label="NEW" 
                          size="small" 
                          sx={{ ml: 'auto' }}
                          color="primary"
                        />
                      )}
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      fullWidth 
                      endIcon={<ArrowForwardIcon />}
                      sx={{ color: action.color }}
                    >
                      Launch
                    </Button>
                  </CardActions>
                </QuickActionCard>
              </Grid>
            </Grow>
          ))}
        </Grid>
      </Box>

      {/* Recent Activity / Info Section */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Getting Started
            </Typography>
            <Stack spacing={2}>
              <Alert severity="info" icon={<InfoOutlinedIcon />}>
                <AlertTitle>Welcome to LENR Simulation Platform</AlertTitle>
                Start by exploring the <strong>Unified LENR Theory</strong> for comprehensive simulations, or choose a specific simulation type below.
              </Alert>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Quick Start Guide:</Typography>
                <Stack spacing={1} sx={{ ml: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>🔬 Unified Theory</strong> - Complete LENR model with all enhancement mechanisms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>⚛️ LENR Simulation</strong> - Focused lattice-based nuclear reactions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>🔥 Fusion Simulation</strong> - Plasma fusion in metal lattices
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>💧 Bubble Fusion</strong> - Acoustic cavitation dynamics
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Resources
            </Typography>
            <Stack spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DocumentationIcon />}
                onClick={() => handleActionClick('/documentation')}
              >
                Documentation
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<TeamIcon />}
                onClick={() => handleActionClick('/team')}
              >
                About Team
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => handleActionClick('/settings')}
              >
                Settings
              </Button>
              <Divider />
              <Button
                fullWidth
                variant="text"
                startIcon={<GitHubIcon />}
                href="https://github.com/ConsciousEnergy/lenr_sim_app"
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<LaunchIcon fontSize="small" />}
              >
                GitHub Repository
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Memory Status Indicator */}
      {performance.memory && (
        <MemoryIndicator>
          <Stack direction="row" spacing={2} alignItems="center">
            <MemoryIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="caption" display="block" color="textSecondary">
                Memory Status
              </Typography>
              <Typography variant="body2">
                {memoryUsage.used} MB / {memoryUsage.total} MB
              </Typography>
            </Box>
            <Box sx={{ width: 100 }}>
              <LinearProgress 
                variant="determinate" 
                value={(memoryUsage.used / memoryUsage.total) * 100}
                sx={{ borderRadius: 1 }}
              />
            </Box>
          </Stack>
        </MemoryIndicator>
      )}
    </Container>
  );
}

export default DashboardNew;
