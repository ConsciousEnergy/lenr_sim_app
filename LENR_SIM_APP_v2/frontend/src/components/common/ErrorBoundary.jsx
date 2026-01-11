import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card, Typography, Button, Alert, Space, Divider } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * A centralized error logging function that can be expanded
 * to send errors to a monitoring service in production
 */
const logErrorToService = (error, errorInfo) => {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo?.componentStack);
  }
  
  // In production, this could send to a monitoring service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // Example of how this might work with a service like Sentry
    // Sentry.captureException(error, { extra: errorInfo });
    
    // For now, just log to console in production too
    console.error('Error in production:', error);
  }
};

/**
 * Error Boundary component to catch and handle React component errors
 * Provides a graceful fallback UI and error reporting
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    this.setState({ errorInfo });
    logErrorToService(error, errorInfo);
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { 
      children, 
      fallback, 
      showReset = true,
      showDetails = process.env.NODE_ENV === 'development', // Only show details in development by default
      resetButtonText = 'Try Again',
      errorTitle = 'Something went wrong'
    } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, errorInfo, this.handleReset)
          : fallback;
      }

      // Otherwise, use the default fallback UI
      return (
        <div style={{ 
          padding: 24, 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%'
        }}>
          <Card
            style={{ 
              maxWidth: 600,
              textAlign: 'center',
              borderRadius: 8,
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <WarningOutlined style={{ fontSize: 60, color: '#ff4d4f' }} />
              
              <Title level={3}>{errorTitle}</Title>
              
              <Paragraph type="secondary">
                We encountered an unexpected error. The development team has been notified.
              </Paragraph>
              
              {showDetails && error && (
                <Alert 
                  message="Error Details" 
                  description={
                    <div>
                      <Text code style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {error.toString()}
                      </Text>
                      {errorInfo && (
                        <div 
                          style={{ 
                            marginTop: 8,
                            maxHeight: 200, 
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            backgroundColor: 'rgba(0,0,0,0.03)',
                            padding: 8,
                            borderRadius: 4
                          }}
                        >
                          <Text code style={{ whiteSpace: 'pre-wrap' }}>
                            {errorInfo.componentStack}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                  type="error" 
                  style={{ textAlign: 'left', marginTop: 16, marginBottom: 16 }}
                />
              )}
              
              <Divider />
              
              {showReset && (
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  onClick={this.handleReset}
                >
                  {resetButtonText}
                </Button>
              )}
            </Space>
          </Card>
        </div>
      );
    }

    // When there's no error, render children normally
    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
  onReset: PropTypes.func,
  showReset: PropTypes.bool,
  showDetails: PropTypes.bool,
  resetButtonText: PropTypes.string,
  errorTitle: PropTypes.string
};

export { ErrorBoundary };
export default ErrorBoundary; 
