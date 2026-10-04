import React, { Component } from "react";

/**
 * Error boundary component to catch and handle React component errors
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
    
    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      // You can render any custom fallback UI
      if (fallback) {
        return fallback;
      }

      return (
        <div className="error-boundary">
          <h2 className="error-title">Something went wrong</h2>
          <details className="error-details">
            <summary>View technical details</summary>
            <p>{error && error.toString()}</p>
            <div className="error-stack">
              {errorInfo && errorInfo.componentStack}
            </div>
          </details>
        </div>
      );
    }

    // When there's no error, render children normally
    return children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
