/**
 * #409 M4 — compact scrubber layout / thumb reach.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../tests/test-utils';
import BubbleLatticeTimelineControls from './BubbleLatticeTimelineControls';
import { MOBILE_VISUAL_MAX_WIDTH_PX } from '../controls/TouchControls';

function renderControls(overrides = {}) {
  const props = {
    isPlaying: false,
    onPlayPause: jest.fn(),
    onRestart: jest.fn(),
    onStepForward: jest.fn(),
    onStepBackward: jest.fn(),
    cycleFraction: 0.25,
    onScrub: jest.fn(),
    animationSpeed: 0.45,
    onSpeedChange: jest.fn(),
    frequencyKhz: 20,
    ...overrides,
  };
  return { ...render(<BubbleLatticeTimelineControls {...props} />), props };
}

describe('BubbleLatticeTimelineControls (#409 M4)', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    window.matchMedia = originalMatchMedia;
  });

  function mockCompactViewport(width) {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    window.matchMedia = jest.fn().mockImplementation((query) => {
      const maxMatch = /max-width:\s*(\d+)px/.exec(query);
      const matches = maxMatch ? width <= Number(maxMatch[1]) : false;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    });
  }

  test('desktop keeps inline layout (data-compact=false)', () => {
    mockCompactViewport(MOBILE_VISUAL_MAX_WIDTH_PX + 200);
    renderControls();
    const root = screen.getByTestId('bubble-lattice-timeline-controls');
    expect(root).toHaveAttribute('data-compact', 'false');
    expect(screen.queryByTestId('ublv-scrubber-row')).not.toBeInTheDocument();
  });

  test('narrow viewport stacks scrubber with thumb-reach affordances', () => {
    mockCompactViewport(390);
    renderControls();
    const root = screen.getByTestId('bubble-lattice-timeline-controls');
    expect(root).toHaveAttribute('data-compact', 'true');
    expect(screen.getByTestId('ublv-scrubber-row')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-scrubber')).toBeInTheDocument();
    expect(screen.getByTestId('ublv-transport')).toBeInTheDocument();
  });

  test('scrubber change invokes onScrub on compact layout', () => {
    mockCompactViewport(390);
    const { props } = renderControls({ cycleFraction: 0.1 });
    const scrubber = screen.getByTestId('ublv-scrubber');
    // MUI Slider uses input[type=range] under the testid wrapper in jsdom.
    const input = scrubber.querySelector('input') || scrubber;
    fireEvent.change(input, { target: { value: '0.55' } });
    expect(props.onScrub).toHaveBeenCalled();
    const lastArg = props.onScrub.mock.calls.at(-1)[0];
    expect(Number(lastArg)).toBeCloseTo(0.55, 2);
  });
});
