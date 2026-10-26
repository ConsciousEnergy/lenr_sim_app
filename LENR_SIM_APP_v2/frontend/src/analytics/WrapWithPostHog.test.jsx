import React from 'react';
import { render, screen } from '@testing-library/react';
import { WrapWithPostHog } from './WrapWithPostHog';
import { useMaintenanceHideRun } from './flags';

jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
  useFeatureFlagEnabled: jest.fn(() => undefined),
}));

jest.mock('./posthog', () => ({
  analyticsEnabled: jest.fn(),
  posthog: { __mock: true },
}));

const { analyticsEnabled } = require('./posthog');
const { useFeatureFlagEnabled } = require('posthog-js/react');

function FlagProbe() {
  const hideRun = useMaintenanceHideRun();
  return <span data-testid="hide-run">{String(hideRun)}</span>;
}

describe('WrapWithPostHog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not mount PostHogProvider when analytics are disabled; flags default OFF', () => {
    analyticsEnabled.mockReturnValue(false);
    render(
      <WrapWithPostHog>
        <span>app-shell</span>
        <FlagProbe />
      </WrapWithPostHog>
    );
    expect(screen.queryByTestId('posthog-provider')).not.toBeInTheDocument();
    expect(screen.getByText('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('hide-run')).toHaveTextContent('false');
  });

  it('mounts PostHogProvider when analytics are enabled and syncs flags', () => {
    analyticsEnabled.mockReturnValue(true);
    useFeatureFlagEnabled.mockReturnValue(true);
    render(
      <WrapWithPostHog>
        <span>app-shell</span>
        <FlagProbe />
      </WrapWithPostHog>
    );
    expect(screen.getByTestId('posthog-provider')).toBeInTheDocument();
    expect(screen.getByText('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('hide-run')).toHaveTextContent('true');
  });

  it('treats an unset PostHog flag as OFF (safe default)', () => {
    analyticsEnabled.mockReturnValue(true);
    useFeatureFlagEnabled.mockReturnValue(undefined);
    render(
      <WrapWithPostHog>
        <FlagProbe />
      </WrapWithPostHog>
    );
    expect(screen.getByTestId('hide-run')).toHaveTextContent('false');
  });
});
