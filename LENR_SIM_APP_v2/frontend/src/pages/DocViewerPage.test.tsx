import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DocViewerPage from './DocViewerPage';

describe('DocViewerPage markdown hardening', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '# Hello\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))',
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
  });
});
