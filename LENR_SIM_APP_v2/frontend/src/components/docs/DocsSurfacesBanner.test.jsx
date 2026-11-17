import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocsSurfacesBanner from './DocsSurfacesBanner';

describe('DocsSurfacesBanner', () => {
  test('disambiguates three pack surfaces with honesty lock', () => {
    render(
      <MemoryRouter>
        <DocsSurfacesBanner activeSlug="reviewer-packets" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('docs-surfaces-banner')).toBeInTheDocument();
    expect(screen.getByText(/Paper packets A–E/i)).toBeInTheDocument();
    expect(screen.getByText(/Campaign JSON packs/i)).toBeInTheDocument();
    expect(screen.getByText(/Researcher review pack/i)).toBeInTheDocument();
    expect(screen.getByText(/lenr_proved: false/i)).toBeInTheDocument();
  });
});
