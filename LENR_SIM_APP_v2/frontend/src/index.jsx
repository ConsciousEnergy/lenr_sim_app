import React from 'react';
import ReactDOM from 'react-dom/client';
import { SnackbarProvider } from 'notistack';
import { PostHogProvider } from 'posthog-js/react';
import { ThrottleProvider } from './contexts/ThrottleContext';
import { OfflineProvider } from './contexts/OfflineContext';
import App from './App';
import { initAnalytics, posthog, analyticsEnabled } from './analytics/posthog';

// Self-gates: no-op in dev/test, without a key, or under Do-Not-Track.
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PostHogProvider client={analyticsEnabled() ? posthog : undefined}>
      <OfflineProvider>
        <ThrottleProvider>
          <SnackbarProvider maxSnack={3}>
            <App />
          </SnackbarProvider>
        </ThrottleProvider>
      </OfflineProvider>
    </PostHogProvider>
  </React.StrictMode>
);
