import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import ErrorBoundary from '../common/ErrorBoundary';

/**
 * AppLayout provides a consistent layout structure for the application
 * It includes a header and main content area, wrapped in an ErrorBoundary
 */
const AppLayout = ({
  children,
  disableErrorBoundary = false
}) => {
  const content = (
    <Box sx={{ minHeight: '100vh' }}>
      <Box
        component="header"
        sx={{
          background: '#fff',
          px: 2.5,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
        }}
      >
        <Typography variant="h5" component="h1" sx={{ m: 0 }}>
          LENR Simulation App
        </Typography>
      </Box>

      <Box sx={{ p: 3, overflow: 'auto', backgroundColor: '#f0f2f5' }}>
        <Box
          sx={{
            background: '#fff',
            p: 3,
            minHeight: 'calc(100vh - 112px)',
            borderRadius: 1
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );

  return disableErrorBoundary ? (
    content
  ) : (
    <ErrorBoundary>
      {content}
    </ErrorBoundary>
  );
};

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
  disableErrorBoundary: PropTypes.bool
};

export default AppLayout;
