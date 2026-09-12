import React from 'react';
import { render, screen } from '@testing-library/react';
import { WrapWithPostHog } from './WrapWithPostHog';

jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
}));

jest.mock('./posthog', () => ({
  analyticsEnabled: jest.fn(),
  posthog: { __mock: true },
}));

const { analyticsEnabled } = require('./posthog');

describe('WrapWithPostHog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not mount PostHogProvider when analytics are disabled', () => {
    analyticsEnabled.mockReturnValue(false);
    render(
      <WrapWithPostHog>
        <span>app-shell</span>
      </WrapWithPostHog>
    );
    expect(screen.queryByTestId('posthog-provider')).not.toBeInTheDocument();
    expect(screen.getByText('app-shell')).toBeInTheDocument();
  });

  it('mounts PostHogProvider when analytics are enabled', () => {
    analyticsEnabled.mockReturnValue(true);
    render(
      <WrapWithPostHog>
        <span>app-shell</span>
      </WrapWithPostHog>
    );
    expect(screen.getByTestId('posthog-provider')).toBeInTheDocument();
    expect(screen.getByText('app-shell')).toBeInTheDocument();
  });
});
