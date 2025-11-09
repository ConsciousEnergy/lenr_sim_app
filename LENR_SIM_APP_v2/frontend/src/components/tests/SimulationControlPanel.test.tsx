import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import SimulationControlPanel from '../SimulationControlPanel';

// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SimulationControlPanel', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the API response for available reactions
    mockedAxios.get.mockResolvedValue({
      data: [
        { name: 'd-d', description: 'Deuterium-Deuterium Fusion' },
        { name: 'p-ni', description: 'Proton-Nickel Fusion' }
      ]
    });
  });

  test('renders simulation control panel with presets', async () => {
    render(<SimulationControlPanel />);
    
    // Wait for the component to load and fetch data
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/physics/available-reactions'));
    });
    
    // Check if the component renders main sections
    expect(screen.getByText('Simulation Control Panel')).toBeInTheDocument();
    expect(screen.getByText('Simulation Presets')).toBeInTheDocument();
    expect(screen.getByText('Basic Parameters')).toBeInTheDocument();
    
    // Check if presets are rendered
    expect(screen.getByText('Palladium/D₂O Electrolysis')).toBeInTheDocument();
    expect(screen.getByText('Nickel/Hydrogen LENR')).toBeInTheDocument();
    expect(screen.getByText('Titanium/Deuterium')).toBeInTheDocument();
  });

  test('parameter fields update when values change', async () => {
    render(<SimulationControlPanel />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByLabelText('Temperature (K)')).toBeInTheDocument();
    });
    
    // Get the temperature input field
    const temperatureInput = screen.getByLabelText('Temperature (K)');
    
    // Change the temperature value
    fireEvent.change(temperatureInput, { target: { value: '500' } });
    
    // Check if the temperature value has been updated
    expect((temperatureInput as HTMLInputElement).value).toBe('500');
  });

  test('validation prevents starting simulation with invalid parameters', async () => {
    const mockStartFn = jest.fn();
    render(<SimulationControlPanel onSimulationStart={mockStartFn} />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Start Simulation')).toBeInTheDocument();
    });
    
    // Set invalid temperature (negative)
    const temperatureInput = screen.getByLabelText('Temperature (K)');
    fireEvent.change(temperatureInput, { target: { value: '-100' } });
    
    // Try to start the simulation
    const startButton = screen.getByText('Start Simulation');
    fireEvent.click(startButton);
    
    // Check that onSimulationStart wasn't called due to validation errors
    expect(mockStartFn).not.toHaveBeenCalled();
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Please correct the validation errors before starting the simulation.')).toBeInTheDocument();
    });
  });

  test('applies preset when selected', async () => {
    render(<SimulationControlPanel />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Palladium/D₂O Electrolysis')).toBeInTheDocument();
    });
    
    // Click on a preset button
    const presetButton = screen.getByText('Nickel/Hydrogen LENR');
    fireEvent.click(presetButton);
    
    // Check if preset values are applied
    const temperatureInput = screen.getByLabelText('Temperature (K)') as HTMLInputElement;
    expect(temperatureInput.value).toBe('600');
    
    const pressureInput = screen.getByLabelText('Pressure (atm)') as HTMLInputElement;
    expect(pressureInput.value).toBe('5');
  });

  test('calls onSimulationStart when start button is clicked with valid parameters', async () => {
    const mockStartFn = jest.fn();
    render(<SimulationControlPanel onSimulationStart={mockStartFn} />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Start Simulation')).toBeInTheDocument();
    });
    
    // Click on start button
    const startButton = screen.getByText('Start Simulation');
    fireEvent.click(startButton);
    
    // Check that onSimulationStart was called with parameters
    expect(mockStartFn).toHaveBeenCalledWith(expect.objectContaining({
      reaction_name: 'd-d',
      conditions: expect.objectContaining({
        loading_ratio: 0.6,
      }),
      enhancement_factors: expect.objectContaining({
        electron_screening: 1.0,
      }),
    }));
  });

  test('toggles advanced parameters section when clicked', async () => {
    render(<SimulationControlPanel />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Advanced Parameters')).toBeInTheDocument();
    });
    
    // Initially, advanced parameters should be collapsed
    expect(screen.queryByLabelText('Surface Roughness (nm)')).not.toBeVisible();
    
    // Click on Advanced Parameters to expand
    const advancedSection = screen.getByText('Advanced Parameters');
    fireEvent.click(advancedSection);
    
    // Now advanced parameters should be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Surface Roughness (nm)')).toBeVisible();
    });
  });

  test('calls onSimulationStop when stop button is clicked', async () => {
    const mockStopFn = jest.fn();
    render(<SimulationControlPanel 
      onSimulationStop={mockStopFn} 
      isSimulationRunning={true}
    />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });
    
    // Click stop button
    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);
    
    // Check if stop handler was called
    expect(mockStopFn).toHaveBeenCalled();
  });

  test('calls onSimulationReset when reset button is clicked', async () => {
    const mockResetFn = jest.fn();
    render(<SimulationControlPanel onSimulationReset={mockResetFn} />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
    
    // Click reset button
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    // Check if reset handler was called
    expect(mockResetFn).toHaveBeenCalled();
  });
}); 