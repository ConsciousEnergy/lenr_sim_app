import { ScaleBar } from '../visualizations/QuantumFluxVisualization';

describe('ScaleBar adaptive scaling', () => {
  it('anchors lattice mode around 5 nm marker length', () => {
    const bar = new ScaleBar({ length: 4, realWorldScale: 1e-6 });
    bar.initialize = jest.fn();

    bar.setAdaptiveScale(8, {
      bubbleRegimeScale: 1e-6,
      latticeRegimeScale: 3.24e-10,
      transitionDistance: 20,
      fovDeg: 75,
      latticeTargetLengthM: 5e-9,
      forceLatticeOnly: true,
    });

    expect(bar.regimeLabel).toBe('lattice scale');
    const physicalLength = bar.length * bar.realWorldScale;
    expect(physicalLength).toBeGreaterThan(4.7e-9);
    expect(physicalLength).toBeLessThan(5.3e-9);
  });

  it('keeps bubble regime when camera is far', () => {
    const bar = new ScaleBar({ length: 4, realWorldScale: 1e-6 });
    bar.initialize = jest.fn();

    bar.setAdaptiveScale(40, {
      bubbleRegimeScale: 1e-6,
      latticeRegimeScale: 3.24e-10,
      transitionDistance: 20,
      fovDeg: 75,
      latticeTargetLengthM: 5e-9,
    });

    expect(bar.regimeLabel).toBe('bubble scale');
    expect(bar.realWorldScale).toBe(1e-6);
  });

  it('stays lattice-only at far camera when forced', () => {
    const bar = new ScaleBar({ length: 4, realWorldScale: 1e-6 });
    bar.initialize = jest.fn();

    bar.setAdaptiveScale(40, {
      latticeRegimeScale: 3.24e-10,
      transitionDistance: 20,
      fovDeg: 75,
      latticeTargetLengthM: 5e-9,
      forceLatticeOnly: true,
    });

    expect(bar.regimeLabel).toBe('lattice scale');
    expect(bar.realWorldScale).toBe(3.24e-10);
  });
});
