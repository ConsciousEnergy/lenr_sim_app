import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../tests/test-utils';
import CampaignPackManifestIndex from './CampaignPackManifestIndex';
import { apiClient } from '../../api/client';

jest.mock('../../api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock('../../analytics/events', () => ({
  track: { exportDownloaded: jest.fn() },
}));

describe('CampaignPackManifestIndex downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: {
        schema: 'lenr-campaign-pack-index-v1',
        lenr_proved: false,
        eq_open_status: 'OPEN',
        disclaimer: 'Campaign packs are model-output only.',
        n_packs: 1,
        packs: [
          {
            pack_id: 'smoke',
            role: 'fixture',
            fixture: true,
            preset: 'smoke',
            n_experiments: 1,
            n_theory_runs: 1,
            open_ids_all_present: true,
            pack_path: 'LENR_SIM_APP_v2/datasets/reviewer_packs/smoke/',
          },
        ],
      },
    });
  });

  test('renders honesty chips and download affordances', async () => {
    render(<CampaignPackManifestIndex testIdPrefix="packs-test" />);
    await waitFor(() => {
      expect(screen.getByTestId('packs-test-panel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('packs-test-lenr-proved')).toBeInTheDocument();
    expect(screen.getByTestId('packs-test-benchmark-download')).toBeInTheDocument();
    expect(screen.getByTestId('packs-test-download-smoke')).toBeInTheDocument();
  });

  test('opens honesty modal before benchmark download', async () => {
    render(<CampaignPackManifestIndex testIdPrefix="packs-test" />);
    await waitFor(() => {
      expect(screen.getByTestId('packs-test-benchmark-download')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('packs-test-benchmark-download'));
    expect(screen.getByTestId('packs-test-honesty-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('packs-test-honesty-confirm')).toBeDisabled();
  });
});
