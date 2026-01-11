
import { AppBar, Toolbar, Typography, Container, Box, CircularProgress } from '@mui/material';

/**
 * Layout component that provides consistent structure for the application
 * Includes header with server status indicator and main content area
 */
const Layout = ({ children, isLoading = false, serverStatus = 'Unknown' }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            LENR Simulation App
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: getStatusColor(serverStatus),
            px: 2,
            py: 0.5,
            borderRadius: 1
          }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              Server: {serverStatus}
            </Typography>
            {isLoading && <CircularProgress size={20} color="inherit" />}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ py: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} LENR Simulation Project
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * Helper function to get appropriate color for server status
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'Connected':
      return 'success.main';
    case 'Unavailable':
      return 'error.main';
    case 'Available, but reporting issues':
      return 'warning.main';
    default:
      return 'info.main';
  }
};

export default Layout; 