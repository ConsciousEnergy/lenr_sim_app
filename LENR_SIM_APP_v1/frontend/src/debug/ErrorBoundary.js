import React from 'react';
import errorReporter from '../utils/errorReporter';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      key: 0 // Used to force remount of children
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Basic console error for immediate visibility
    console.error("ErrorBoundary caught an error:", error.message);
    
    // Use lightweight error reporter instead of logger
    errorReporter.report(error, {
      componentStack: errorInfo.componentStack,
      component: this.props.componentName || 'Unknown'
    });
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError({ error, errorInfo });
    }
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Force garbage collection if available in the browser
    // This can help free up memory from components that crashed
    this.triggerGarbageCollection();
  }
  
  triggerGarbageCollection() {
    // Try to force garbage collection if available
    if (window.gc) {
      try {
        window.gc();
        console.debug('Garbage collection triggered after error');
      } catch (e) {
        console.debug('Failed to trigger garbage collection');
      }
    }
    
    // Alternative attempt to free memory
    try {
      // Clear any image caches that might be present in visualization components
      const imageCache = window.__THREE_IMAGE_CACHE__;
      if (imageCache) {
        Object.keys(imageCache).forEach(key => {
          delete imageCache[key];
        });
      }
      
      // Clear any texture caches
      const textureCache = window.__THREE_TEXTURE_CACHE__;
      if (textureCache) {
        Object.keys(textureCache).forEach(key => {
          delete textureCache[key];
        });
      }
    } catch (e) {
      console.debug('Failed to clear caches');
    }
  }

  resetError = () => {
    // Increment key to force children to remount completely
    this.setState({
      hasError: false, 
      error: null, 
      errorInfo: null,
      key: this.state.key + 1
    });
    
    // Try to clear memory again
    this.triggerGarbageCollection();
    
    // Call external reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI based on props
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />;
      }
      
      // Default fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          backgroundColor: '#f8d7da',
          color: '#721c24' 
        }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Show Error Details</summary>
            <p>{this.state.error && this.state.error.toString()}</p>
            <p>Component Stack:</p>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={this.resetError}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // Render children with the key to ensure proper remounting
    return <div key={this.state.key}>{this.props.children}</div>;
  }
}

export default ErrorBoundary; 