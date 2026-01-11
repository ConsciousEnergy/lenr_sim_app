import React from 'react';
import PropTypes from 'prop-types';
import { Layout } from 'antd';
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
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ 
        background: '#fff', 
        padding: '0 20px',
        boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          height: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>LENR Simulation App</h1>
          </div>
        </div>
      </Layout.Header>
      
      <Layout.Content style={{ 
        padding: '24px', 
        overflow: 'auto',
        backgroundColor: '#f0f2f5'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          minHeight: 'calc(100vh - 112px)',
          borderRadius: '4px'
        }}>
          {children}
        </div>
      </Layout.Content>
    </Layout>
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
