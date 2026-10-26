import React from 'react';
import ReactDOM from 'react-dom/client';
import { SnackbarProvider } from 'notistack';
import { ThrottleProvider } from './contexts/ThrottleContext';
import { OfflineProvider } from './contexts/OfflineContext';
import App from './App';
import { initAnalytics } from './analytics/posthog';
import { WrapWithPostHog } from './analytics/WrapWithPostHog';
import { AppLoadTracker } from './analytics/AppLoadTracker';

// Self-gates: no-op in dev/test, without a key, or under Do-Not-Track.
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WrapWithPostHog>
      <AppLoadTracker />
      <OfflineProvider>
        <ThrottleProvider>
          <SnackbarProvider maxSnack={3}>
            <App />
          </SnackbarProvider>
        </ThrottleProvider>
      </OfflineProvider>
    </WrapWithPostHog>
  </React.StrictMode>
);
