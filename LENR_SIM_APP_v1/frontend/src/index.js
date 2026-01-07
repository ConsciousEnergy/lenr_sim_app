import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LogProvider } from './contexts/LogContext';
import { ThrottleProvider } from './contexts/ThrottleContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import { SnackbarProvider } from 'notistack';
// Initialize error reporter
import './utils/errorReporter';
// Import Three.js cleanup utilities
import threeCleanup from './utils/threeCleanup';

// Initialize defensive DOM observer to prevent React DOM removal errors
const defensiveObserver = threeCleanup.initDefensiveDomObserver('#root');

// Add cleanup handler for development hot reloading
if (module.hot) {
  module.hot.dispose(() => {
    if (defensiveObserver && defensiveObserver.cleanup) {
      defensiveObserver.cleanup();
      console.debug('Cleaned up defensive DOM observer during hot reload');
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <OfflineProvider>
      <LogProvider enableRemote={false}>
        <ThrottleProvider>
          <AppSettingsProvider>
            <SnackbarProvider maxSnack={3}>
              <App />
            </SnackbarProvider>
          </AppSettingsProvider>
        </ThrottleProvider>
      </LogProvider>
    </OfflineProvider>
  </React.StrictMode>
); 