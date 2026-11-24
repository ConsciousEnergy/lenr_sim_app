import React from 'react';
import { render, screen } from '@testing-library/react';
import BubbleFusionParameterControls, {
  BUBBLE_FUSION_ENGINE_NUM_CYCLES,
} from './BubbleFusionParameterControls';

describe('BubbleFusionParameterControls honesty', () => {
  it('states fixed engine cycle count and that μs/ns sliders are not sent', () => {
    render(<BubbleFusionParameterControls />);
    const alert = screen.getByTestId('bubble-fusion-sim-window-honesty');
    expect(alert).toHaveTextContent(String(BUBBLE_FUSION_ENGINE_NUM_CYCLES));
    expect(alert).toHaveTextContent(/not sent to the API/i);
    expect(alert).toHaveTextContent(/100/); // 2 cycles @ 20 kHz → 100 μs
  });
});