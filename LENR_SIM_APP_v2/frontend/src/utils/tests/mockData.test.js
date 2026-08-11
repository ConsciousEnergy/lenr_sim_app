import { mockFusionSimulation } from '../mockData';

describe('mockFusionSimulation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('returns the time-step contract required by the fusion visualizer', async () => {
    const parameters = {
      temperature: 600,
      latticeDimension: 3,
      defectDensity: 0.2,
      timeStepSize: 0.1,
      totalSimulationTime: 0.4,
    };

    const simulationPromise = mockFusionSimulation(parameters);
    jest.advanceTimersByTime(1000);
    const simulation = await simulationPromise;

    expect(simulation).toMatchObject({
      status: 'completed',
      progress: 100,
      parameters,
      results: {
        energy: 3.27,
        efficiency: 0.85,
      },
    });
    expect(simulation).not.toHaveProperty('data');
    expect(simulation.timeSteps).toHaveLength(4);

    simulation.timeSteps.forEach((timeStep) => {
      expect(timeStep).toMatchObject({
        time: expect.any(Number),
        temperature: expect.any(Number),
        energy: expect.any(Number),
      });
      expect(timeStep.particles).toHaveLength(9);
      expect(timeStep.particles[0]).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
        type: expect.any(String),
        energy: expect.any(Number),
        vx: expect.any(Number),
        vy: expect.any(Number),
        vz: expect.any(Number),
      });
      expect(timeStep.hotspots).toHaveLength(10);
      expect(timeStep.hotspots[0]).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
        intensity: expect.any(Number),
      });
    });
  });

  test('caps generated particles for large lattices', async () => {
    const simulationPromise = mockFusionSimulation({
      latticeDimension: 20,
      timeStepSize: 0.1,
      totalSimulationTime: 0.1,
    });
    jest.advanceTimersByTime(1000);
    const simulation = await simulationPromise;

    expect(simulation.timeSteps).toHaveLength(1);
    expect(simulation.timeSteps[0].particles).toHaveLength(200);
  });
});
