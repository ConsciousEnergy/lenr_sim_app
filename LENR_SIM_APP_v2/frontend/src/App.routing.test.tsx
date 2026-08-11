import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ isDarkMode: false, toggleTheme: jest.fn() }),
}));
jest.mock('./components/AppLayoutFixed', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('./pages/DashboardNew', () => ({
  __esModule: true,
  default: () => <div>Dashboard page</div>,
}));
jest.mock('./pages/SimulationDetail', () => ({
  __esModule: true,
  default: () => <div data-testid="simulation-detail">Simulation detail</div>,
}));
jest.mock('./pages/NewSimulation', () => ({
  __esModule: true,
  default: () => <div data-testid="new-simulation">New simulation</div>,
}));
jest.mock('./pages/QuantumTunnelingPage', () => ({
  __esModule: true,
  default: () => <div>Quantum tunneling page</div>,
}));
jest.mock('./pages/FusionSimulationPage', () => ({
  __esModule: true,
  default: () => <div>Fusion simulation page</div>,
}));
jest.mock('./pages/LENRSimulationPage', () => ({
  __esModule: true,
  default: () => <div>LENR simulation page</div>,
}));
jest.mock('./pages/BubbleFusionPage', () => ({
  __esModule: true,
  default: () => <div>Bubble fusion page</div>,
}));
jest.mock('./pages/AboutPage', () => ({
  __esModule: true,
  default: () => <div>About page</div>,
}));
jest.mock('./pages/TheoryPage', () => ({
  __esModule: true,
  default: () => <div>Theory page</div>,
}));
jest.mock('./pages/DocumentationPage', () => ({
  __esModule: true,
  default: () => <div>Documentation page</div>,
}));
jest.mock('./pages/RealTimeVisualizationPage', () => ({
  __esModule: true,
  default: () => <div>Real-time visualization page</div>,
}));
jest.mock('./pages/PhysicsSimulationDashboardPage', () => ({
  __esModule: true,
  default: () => <div>Physics dashboard page</div>,
}));
jest.mock('./pages/PhysicsVisualizationPage', () => ({
  __esModule: true,
  default: () => <div>Physics visualization page</div>,
}));
jest.mock('./pages/ThreeJsTestPage', () => ({
  __esModule: true,
  default: () => <div>Three.js test page</div>,
}));
jest.mock('./pages/VisualizationDebugPage', () => ({
  __esModule: true,
  default: () => <div>Visualization debug page</div>,
}));
jest.mock('./pages/VisualizationTest', () => ({
  __esModule: true,
  default: () => <div>Visualization test page</div>,
}));
jest.mock('./components/ui/ComponentShowcase', () => ({
  __esModule: true,
  default: () => <div>Component showcase</div>,
}));
jest.mock('./debug/DiagnosticTool', () => ({
  __esModule: true,
  default: () => <div>Diagnostic tool</div>,
}));

describe('simulation routes', () => {
  test('/simulations renders the new simulation workflow', async () => {
    window.history.pushState({}, '', '/simulations');

    render(<App />);

    expect(await screen.findByTestId('new-simulation')).toBeInTheDocument();
    expect(screen.queryByTestId('simulation-detail')).not.toBeInTheDocument();
  });

  test('/simulation/:simulationId retains the simulation detail workflow', async () => {
    window.history.pushState({}, '', '/simulation/sim-123');

    render(<App />);

    expect(await screen.findByTestId('simulation-detail')).toBeInTheDocument();
    expect(screen.queryByTestId('new-simulation')).not.toBeInTheDocument();
  });
});
