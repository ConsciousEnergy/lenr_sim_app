import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { useStableThreeTimer } from './threeTimer';

jest.mock('three', () => {
  const actual = jest.requireActual('three');
  const instances = [];

  class CountingTimer extends actual.Timer {
    constructor() {
      super();
      instances.push(this);
    }
  }

  return {
    ...actual,
    Timer: CountingTimer,
    __timerInstances: instances,
  };
});

function Harness() {
  useStableThreeTimer();
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      renders {count}
    </button>
  );
}

describe('useStableThreeTimer', () => {
  beforeEach(() => {
    THREE.__timerInstances.length = 0;
  });

  it('constructs one timer across rerenders', () => {
    render(<Harness />);
    expect(THREE.__timerInstances).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'renders 0' }));

    expect(screen.getByRole('button', { name: 'renders 1' })).toBeInTheDocument();
    expect(THREE.__timerInstances).toHaveLength(1);
    expect(typeof THREE.__timerInstances[0].update).toBe('function');
    expect(typeof THREE.__timerInstances[0].getDelta).toBe('function');
    expect(typeof THREE.__timerInstances[0].getElapsed).toBe('function');
  });
});
