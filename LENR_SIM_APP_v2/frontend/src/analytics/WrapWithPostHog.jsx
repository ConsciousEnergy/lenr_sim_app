import React from 'react';
import { PostHogProvider } from 'posthog-js/react';
import { analyticsEnabled, posthog } from './posthog';
import { FeatureFlagsProvider, PostHogFeatureFlagsSync } from './flags';

/**
 * Mount PostHogProvider only when product analytics actually initialized.
 * Passing `client={undefined}` triggers PostHog's "No apiKey or client" warning
 * in every local/dev session — avoid that by not mounting the provider at all.
 *
 * Feature-flag context is always present: safe defaults (OFF) when analytics is
 * disabled; live `useFeatureFlagEnabled` sync when PostHog is on.
 */
export function WrapWithPostHog({ children }) {
  if (!analyticsEnabled()) {
    return <FeatureFlagsProvider>{children}</FeatureFlagsProvider>;
  }
  return (
    <PostHogProvider client={posthog}>
      <PostHogFeatureFlagsSync>{children}</PostHogFeatureFlagsSync>
    </PostHogProvider>
  );
}
