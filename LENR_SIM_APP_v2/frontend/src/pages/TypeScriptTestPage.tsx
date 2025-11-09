/**
 * TypeScript Test Page
 * Used to test TypeScript compatibility and verify configuration
 */
import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import TypeScriptTest from '../components/visualization/TypeScriptTest';

/**
 * Page component for testing the TypeScript implementation of UnifiedLENRVisualizer
 */
const TypeScriptTestPage: React.FC = () => {
  const handleTest = (): void => {
    console.log('TypeScript test function called!');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          TypeScript Implementation Test
        </Typography>
        <Typography variant="body1" paragraph>
          This page is for testing the TypeScript implementation of the UnifiedLENRVisualizer component.
          The test verifies that the TypeScript interfaces and implementation are working correctly.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Implementation progress: ~83% complete
        </Typography>
      </Paper>
      
      <Box sx={{ mb: 4 }}>
        <TypeScriptTest />
      </Box>
    </Container>
  );
};

export default TypeScriptTestPage; 