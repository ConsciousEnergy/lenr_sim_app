import React from 'react';
import { PostHogProvider } from 'posthog-js/react';
import { analyticsEnabled, posthog } from './posthog';

/**
 * Mount PostHogProvider only when product analytics actually initialized.
 * Passing `client={undefined}` triggers PostHog's "No apiKey or client" warning
 * in every local/dev session — avoid that by not mounting the provider at all.
 */
export function WrapWithPostHog({ children }) {
  if (!analyticsEnabled()) {
    return children;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
