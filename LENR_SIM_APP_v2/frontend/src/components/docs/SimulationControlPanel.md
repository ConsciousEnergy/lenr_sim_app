# SimulationControlPanel Component

The `SimulationControlPanel` component provides a comprehensive interface for configuring and controlling LENR physics simulations. It allows users to set simulation parameters, apply presets, and start/stop/reset simulations.

## Features

- **Simulation Parameter Configuration**: Configure all necessary parameters for LENR simulations
- **Built-in Presets**: Apply predefined configurations for common LENR experiments
- **Parameter Validation**: Prevents starting simulations with invalid parameter values
- **Advanced Settings**: Access additional parameters for more detailed simulation control
- **Enhancement Factors**: Fine-tune quantum enhancement factors for LENR reactions
- **Simulation Control**: Start, stop, and reset simulations with dedicated controls

## Usage

```tsx
import React, { useState } from 'react';
import SimulationControlPanel from '../components/SimulationControlPanel';

const SimulationPage = () => {
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  
  const handleSimulationStart = async (parameters) => {
    try {
      // Start the simulation on the backend
      const response = await fetch('/api/simulations/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters),
      });
      
      const data = await response.json();
      setSimulationId(data.simulationId);
      setIsSimulationRunning(true);
    } catch (error) {
      console.error('Failed to start simulation:', error);
    }
  };
  
  const handleSimulationStop = async () => {
    if (simulationId) {
      try {
        // Stop the simulation on the backend
        await fetch(`/api/simulations/${simulationId}/stop`, {
          method: 'POST',
        });
        
        setIsSimulationRunning(false);
      } catch (error) {
        console.error('Failed to stop simulation:', error);
      }
    }
  };
  
  const handleSimulationReset = () => {
    setSimulationId(null);
    setIsSimulationRunning(false);
  };
  
  return (
    <div>
      <h1>LENR Simulation</h1>
      <SimulationControlPanel
        onSimulationStart={handleSimulationStart}
        onSimulationStop={handleSimulationStop}
        onSimulationReset={handleSimulationReset}
        simulationId={simulationId}
        isSimulationRunning={isSimulationRunning}
      />
      
      {/* Additional content like visualization components */}
    </div>
  );
};

export default SimulationPage;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSimulationStart` | `(parameters: any) => void` | `() => {}` | Callback function called when the start button is clicked with validation-passing parameters |
| `onSimulationStop` | `() => void` | `() => {}` | Callback function called when the stop button is clicked |
| `onSimulationReset` | `() => void` | `() => {}` | Callback function called when the reset button is clicked |
| `simulationId` | `string \| null` | `null` | ID of the current simulation if one is running |
| `isSimulationRunning` | `boolean` | `false` | Whether a simulation is currently running |

## Parameter Structure

The component passes parameters to the `onSimulationStart` callback in the following structure:

```typescript
{
  // Basic parameters
  reaction_name: string,
  lattice_type: string,
  lattice_constant: number,
  temperature: number,
  pressure: number,
  
  // Conditions object containing reaction conditions
  conditions: {
    loading_ratio: number,
    surface_roughness: number,
    defect_density: number,
    field_strength: number,
    coherence_length: number,
  },
  
  // Enhancement factors for quantum effects
  enhancement_factors: {
    rydberg_matter: number,
    electron_screening: number,
    interface_field: number,
    coherent_tunneling: number,
    casimir_force: number,
    shock_confinement: number,
    dislocation_energy: number,
    oppenheimer_phillips: number,
    double_layer_qed: number,
  }
}
```

## Built-in Presets

The component includes the following built-in presets:

1. **Palladium/D₂O Electrolysis**: Classic Pd/D2O electrolysis setup with high loading ratio
2. **Nickel/Hydrogen LENR**: Nickel-hydrogen system at elevated temperature
3. **Titanium/Deuterium**: Titanium loaded with deuterium under stress

## Validation Rules

The component performs the following validations before starting a simulation:

- Reaction name must be selected
- Lattice constant must be positive
- Temperature must be positive
- Pressure must be positive
- Loading ratio cannot be negative
- Surface roughness cannot be negative
- Defect density cannot be negative
- Field strength cannot be negative
- Coherence length cannot be negative

## API Integration

The component automatically fetches the list of available reactions from the backend API endpoint:

```
GET /physics/available-reactions
```

## Styling

The component uses Material-UI (MUI) for styling and layout. It adapts to different screen sizes with responsive design:

- Mobile: Single column layout
- Tablet: Two-column layout for some parameter fields
- Desktop: Multi-column layout for optimal space usage

## Accessibility

- All inputs have proper labels
- Form elements include helper text
- Error states are clearly indicated
- Controls have appropriate ARIA attributes

## Future Enhancements

Potential improvements for future versions:

- Save and load custom presets
- Parameter history tracking
- Real-time parameter validation
- Integration with simulation results visualization
- Dark mode support 