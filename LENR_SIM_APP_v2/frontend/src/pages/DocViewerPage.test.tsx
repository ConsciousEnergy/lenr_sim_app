import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DocViewerPage from './DocViewerPage';
import {
  CORPUS_MOE_COVERAGE,
  OPEN_EQ_IDS,
  SCIENCE_EVIDENCE_HONESTY,
} from '../config/unifiedTheoryScienceEvidence';

const markdownBody =
  '# Hello\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n' +
  'Display:\n\n\\[\n\\frac{a}{b} = 2.63 \\times 10^{11}\n\\]\n\n' +
  'Inline \\( E = mc^2 \\) here.';

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
    expect(screen.getByTestId('doc-viewer-print')).toBeInTheDocument();
  });

  it('renders KaTeX for Pandoc-style math on testable-predictions', async () => {
    render(
      <MemoryRouter initialEntries={['/docs/testable-predictions']}>
        <Routes>
          <Route path="/docs/:slug" element={<DocViewerPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('doc-viewer-markdown')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.querySelector('.katex')).not.toBeNull();
    });
    expect(document.querySelector('.katex-display')).not.toBeNull();
    // KaTeX keeps TeX in MathML annotations; assert HTML render layer exists.
    expect(document.querySelector('.katex-html')).not.toBeNull();
    expect(screen.getByTestId('doc-viewer-markdown').innerHTML).not.toMatch(
      /\\\[/,
    );
  });

  it('keeps honesty locks on math-bearing DocViewer surfaces', async () => {
    expect(SCIENCE_EVIDENCE_HONESTY.lenr_proved).toBe(false);
    expect(OPEN_EQ_IDS).toHaveLength(5);
    for (const id of OPEN_EQ_IDS) {
      expect(SCIENCE_EVIDENCE_HONESTY.open_status[id]).toBe('OPEN');
    }
    expect(CORPUS_MOE_COVERAGE.discovery_grade_eligible_count).toBe(2);
    expect(CORPUS_MOE_COVERAGE.discovery_grade_eligible_ids).toEqual([
      'kasagi-nicu-radiant-2026',
      'kasagi-ni-radiant-2026',
    ]);
    expect(CORPUS_MOE_COVERAGE.n_records).toBe(25);
    expect(CORPUS_MOE_COVERAGE.literature_moe_inventory_exhausted).toBe(true);

    render(
      <MemoryRouter initialEntries={['/docs/testable-predictions']}>
        <Routes>
          <Route path="/docs/:slug" element={<DocViewerPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('doc-viewer-honesty-note')).toBeInTheDocument();
    });
    expect(screen.getByTestId('doc-viewer-honesty-lenr-proved')).toHaveTextContent(
      'lenr_proved: false',
    );
    expect(screen.getByTestId('doc-viewer-honesty-eq-open')).toHaveTextContent(/OPEN/i);
    expect(screen.getByTestId('doc-viewer-honesty-discovery')).toHaveTextContent(
      /2\/25/,
    );
    expect(screen.getByTestId('doc-viewer-honesty-discovery')).toHaveTextContent(
      /analytics_gates_clear/,
    );
    expect(screen.getByTestId('doc-viewer-honesty-discovery')).toHaveTextContent(
      /never .*≥5σ met/i,
    );
  });

  it('invokes window.print from the Print control', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/docs/testable-predictions']}>
        <Routes>
          <Route path="/docs/:slug" element={<DocViewerPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('doc-viewer-print')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('doc-viewer-print'));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
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
    expect(screen.getByTestId('doc-viewer-honesty-note')).toBeInTheDocument();
    expect(screen.getByTestId('doc-viewer-print')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('doc-viewer-download'));
    expect(createObjectURL).toHaveBeenCalled();

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreate });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevoke });
  });
});
