import React from 'react';
import ReactDOM from 'react-dom/client';
import { SnackbarProvider } from 'notistack';
import { PostHogProvider } from 'posthog-js/react';
import { ThrottleProvider } from './contexts/ThrottleContext';
import { OfflineProvider } from './contexts/OfflineContext';
import App from './App';
import initializeAntDesignPatches from './utils/antdPatch';
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

// Apply patches to fix Ant Design warnings
initializeAntDesignPatches();

// Remove the old inline fix
// Fix for Ant Design Card bodyStyle warning
// This patch converts bodyStyle prop to styles.body which is the new recommended approach
// if (window.antd && window.antd.Card) {
//   const originalCard = window.antd.Card;
//   window.antd.Card = function PatchedCard(props) {
//     // If bodyStyle is used, convert it to styles.body
//     const newProps = {...props};
//     if (newProps.bodyStyle) {
//       newProps.styles = newProps.styles || {};
//       newProps.styles.body = newProps.bodyStyle;
//       delete newProps.bodyStyle;
//     }
//     return originalCard(newProps);
//   };
//   console.log('Patched Ant Design Card component');
// }
