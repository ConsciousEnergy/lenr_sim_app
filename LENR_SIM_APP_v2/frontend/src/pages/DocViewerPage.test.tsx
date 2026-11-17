import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DocViewerPage from './DocViewerPage';

const markdownBody = '# Hello\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))';

describe('DocViewerPage markdown hardening', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/docs/campaign-packs')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schema: 'lenr-campaign-pack-index-v1',
            lenr_proved: false,
            eq_open_status: 'OPEN',
            n_packs: 1,
            disclaimer: 'Model-output packs only.',
            packs: [
              {
                pack_id: 'smoke',
                role: 'fixture',
                fixture: true,
                schema: 'lenr-reviewer-pack-v1',
                preset: 'smoke',
                n_experiments: 1,
                n_theory_runs: 1,
                lenr_proved: false,
                open_ids_all_present: true,
                open_ids: [
                  'EQ-OPEN-MEV-01',
                  'EQ-OPEN-RAD-01',
                  'EQ-OPEN-RATE-01',
                  'EQ-OPEN-EC-01',
                  'EQ-OPEN-YIELD-01',
                ],
                pack_path: 'LENR_SIM_APP_v2/datasets/reviewer_packs/smoke/',
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => markdownBody,
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders allowlisted markdown without raw HTML sinks', async () => {
    render(
      <MemoryRouter initialEntries={['/docs/issue-ledger']}>
        <Routes>
          <Route path="/docs/:slug" element={<DocViewerPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('doc-viewer-download')).toBeInTheDocument();
  });

  it('shows surface banner, pack index, and download on reviewer-packets', async () => {
    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    render(
      <MemoryRouter initialEntries={['/docs/reviewer-packets']}>
        <Routes>
          <Route path="/docs/:slug" element={<DocViewerPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('doc-viewer-surfaces-banner')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('doc-viewer-packs-panel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('doc-viewer-packs-fixture-smoke')).toBeInTheDocument();
    expect(screen.getByTestId('doc-viewer-packs-lenr-proved')).toHaveTextContent(
      'lenr_proved: false'
    );
    expect(screen.getByTestId('doc-viewer-crosswalk-panel')).toBeInTheDocument();
    expect(screen.getByTestId('doc-viewer-crosswalk-lenr-proved')).toHaveTextContent(
      /lenr_proved: false/i
    );
    expect(screen.getByTestId('doc-viewer-crosswalk-eq-open')).toHaveTextContent(/OPEN/i);
    expect(screen.getByTestId('doc-viewer-crosswalk-row-A')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('doc-viewer-download'));
    expect(createObjectURL).toHaveBeenCalled();

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreate });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevoke });
  });
});
