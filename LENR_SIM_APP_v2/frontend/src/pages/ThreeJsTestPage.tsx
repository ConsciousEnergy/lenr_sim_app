import React from 'react';
import { Container, Typography, Paper, Box, Divider, Button } from '@mui/material';
import ThreeJsTest from '../visualization/components/ThreeJsTest';
import { Link } from 'react-router-dom';

const ThreeJsTestPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Three.js Diagnostics
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page tests basic Three.js functionality to help diagnose rendering issues.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Basic Three.js Test
        </Typography>
        <Typography variant="body2" paragraph>
          This test initializes a minimal Three.js scene with a rotating cube. 
          If this works but your complex visualizations don't, the issue is likely 
          in the data processing or rendering logic, not in Three.js itself.
        </Typography>
        
        <Box sx={{ mt: 2, mb: 4 }}>
          <ThreeJsTest />
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          Troubleshooting:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>If the cube appears and rotates, Three.js is working correctly</li>
          <li>If you see an error, check the browser console for more details</li>
          <li>WebGL support issues might require updating your graphics drivers</li>
          <li>Some features may not work in all browsers - try Chrome or Firefox</li>
        </Typography>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/"
        >
          Go to Home
        </Button>
        <Button 
          variant="contained" 
          component={Link} 
          to="/unified-theory"
        >
          Go to Simulation
        </Button>
      </Box>
    </Container>
  );
};

export default ThreeJsTestPage; 