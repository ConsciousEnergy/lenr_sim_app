import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/AppLayoutFixed', () => ({ children }: { children: React.ReactNode }) => children);
jest.mock('./pages/DashboardNew', () => () => <div>Dashboard page</div>);
jest.mock('./pages/SimulationDetail', () => () => <div data-testid="simulation-detail">Simulation detail</div>);
jest.mock('./pages/NewSimulation', () => () => <div data-testid="new-simulation">New simulation</div>);
jest.mock('./pages/QuantumTunnelingPage', () => () => <div>Quantum tunneling page</div>);
jest.mock('./pages/FusionSimulationPage', () => () => <div>Fusion simulation page</div>);
jest.mock('./pages/LENRSimulationPage', () => () => <div>LENR simulation page</div>);
jest.mock('./pages/BubbleFusionPage', () => () => <div>Bubble fusion page</div>);
jest.mock('./pages/AboutPage', () => () => <div>About page</div>);
jest.mock('./pages/TheoryPage', () => () => <div>Theory page</div>);
jest.mock('./pages/DocumentationPage', () => () => <div>Documentation page</div>);
jest.mock('./pages/RealTimeVisualizationPage', () => () => <div>Real-time visualization page</div>);
jest.mock('./pages/PhysicsSimulationDashboardPage', () => () => <div>Physics dashboard page</div>);
jest.mock('./pages/PhysicsVisualizationPage', () => () => <div>Physics visualization page</div>);
jest.mock('./pages/ThreeJsTestPage', () => () => <div>Three.js test page</div>);
jest.mock('./pages/VisualizationDebugPage', () => () => <div>Visualization debug page</div>);
jest.mock('./pages/VisualizationTest', () => () => <div>Visualization test page</div>);
jest.mock('./components/ui/ComponentShowcase', () => () => <div>Component showcase</div>);
jest.mock('./debug/DiagnosticTool', () => () => <div>Diagnostic tool</div>);

describe('simulation routes', () => {
  test('/simulations renders the new simulation workflow', () => {
    window.history.pushState({}, '', '/simulations');

    render(<App />);

    expect(screen.getByTestId('new-simulation')).toBeInTheDocument();
    expect(screen.queryByTestId('simulation-detail')).not.toBeInTheDocument();
  });

  test('/simulation/:simulationId retains the simulation detail workflow', () => {
    window.history.pushState({}, '', '/simulation/sim-123');

    render(<App />);

    expect(screen.getByTestId('simulation-detail')).toBeInTheDocument();
    expect(screen.queryByTestId('new-simulation')).not.toBeInTheDocument();
  });
});
