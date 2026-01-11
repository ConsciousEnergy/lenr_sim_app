import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProtonElectronConfiguration from '../../../components/ProtonElectronConfiguration';
import { LogProvider } from '../../../contexts/LogContext';

// Mock the RydbergMatterModel functions
jest.mock('../../../models/RydbergMatterModel', () => ({
  calculateRydbergEnergy: jest.fn().mockImplementation(n => -13.6 / (n * n)),
  calculateRydbergRadius: jest.fn().mockImplementation(n => 0.0529 * n * n),
  calculateElectricField: jest.fn().mockImplementation((n, Z) => 1e9 / (n * n)),
  calculateOverlapProbability: jest.fn().mockImplementation((a, r0) => 0.0001),
  calculateCoulombPenetration: jest.fn().mockImplementation(() => 1e-20),
  generateRydbergSimulationParams: jest.fn()
}));

// Mock the useLogger hook
jest.mock('../../../contexts/LogContext', () => ({
  ...jest.requireActual('../../../contexts/LogContext'),
  useLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })
}));

const renderComponent = (props = {}) => {
  return render(
    <LogProvider>
      <ProtonElectronConfiguration {...props} />
    </LogProvider>
  );
};

describe('ProtonElectronConfiguration', () => {
  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Proton-Electron Configuration')).toBeInTheDocument();
  });

  it('renders the nuclear configuration section', () => {
    renderComponent();
    expect(screen.getByText('Nuclear Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('Nucleus Element')).toBeInTheDocument();
    expect(screen.getByLabelText('Nucleus Isotope')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Element')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Isotope')).toBeInTheDocument();
  });

  it('renders the electron configuration section', () => {
    renderComponent();
    expect(screen.getByText('Electron Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('Electron Configuration')).toBeInTheDocument();
    expect(screen.getByText('Principal Quantum Number (n):')).toBeInTheDocument();
  });

  it('renders the interaction parameters section', () => {
    renderComponent();
    expect(screen.getByText('Interaction Parameters')).toBeInTheDocument();
    expect(screen.getByText('Collision Energy:')).toBeInTheDocument();
    expect(screen.getByText('Screening Factor:')).toBeInTheDocument();
    expect(screen.getByText('Include Quantum Effects')).toBeInTheDocument();
    expect(screen.getByText('Include Tunneling')).toBeInTheDocument();
  });

  it('updates the configuration when changing the element', async () => {
    renderComponent();

    // Open the dropdown
    fireEvent.mouseDown(screen.getByLabelText('Nucleus Element'));
    // Click the Palladium option
    const palladiumOption = await screen.findByText('Palladium (Pd)');
    fireEvent.click(palladiumOption);

    // Should update the configuration
    await waitFor(() => {
      expect(screen.getByLabelText('Nucleus Element')).toHaveTextContent('Palladium (Pd)');
    });
  });

  it('updates the configuration when changing the electron configuration', async () => {
    renderComponent();

    // Open the dropdown
    fireEvent.mouseDown(screen.getByLabelText('Electron Configuration'));
    // Click the Rydberg State option
    const rydbergOption = await screen.findByText('Rydberg State');
    fireEvent.click(rydbergOption);

    // Should update the configuration and eventually show result values
    await waitFor(() => {
      expect(screen.getByText('Principal Quantum Number (n):')).toHaveTextContent('Principal Quantum Number (n): 10');
    });
  });

  it('updates the configuration when toggling quantum effects', async () => {
    renderComponent();

    // Find the switch
    const quantumSwitch = screen.getByLabelText('Include Quantum Effects');
    
    // Toggle it off
    fireEvent.click(quantumSwitch);
    
    // The screening factor slider should now be disabled
    await waitFor(() => {
      const slider = screen.getByText('Screening Factor:').closest('div').querySelector('input[type="range"]');
      expect(slider).toBeDisabled();
    });
  });

  it('displays calculation results after initial render', async () => {
    renderComponent();

    // After initial render, the results should be calculated and displayed
    await waitFor(() => {
      // Look for the results section
      const resultsHeading = screen.queryByText('Reaction Parameters');
      // If the component is working correctly, this should be found after results are calculated
      expect(resultsHeading).toBeInTheDocument();
    });
  });

  it('calls onConfigChange when configuration changes', async () => {
    const onConfigChange = jest.fn();
    renderComponent({ onConfigChange });

    // Change a configuration value
    fireEvent.mouseDown(screen.getByLabelText('Electron Configuration'));
    const excitedOption = await screen.findByText('Excited State');
    fireEvent.click(excitedOption);

    // The onConfigChange callback should be called
    await waitFor(() => {
      expect(onConfigChange).toHaveBeenCalled();
    });
  });
}); 