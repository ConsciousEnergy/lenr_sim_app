import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab,
  Button,
  Stack,
  Divider,
  Alert,
  useTheme,
  List,
  ListItem,
  ListItemText,
  TextField,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import { PhysicsParameter, validationFunctions } from './PhysicsParameterInput';
import PhysicsParameterGroup from './PhysicsParameterGroup';
import PhysicsConstraints, { ValidationResult } from './PhysicsConstraints';
import PhysicsParameterValidator from './PhysicsParameterValidator';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';

export interface PhysicsParameterSetProps {
  onParametersChange?: (parameters: Record<string, number | string>) => void;
  onStartSimulation?: (parameters: Record<string, number | string>) => void;
  initialParameters?: Record<string, number | string>;
}

/**
 * Thermal parameters for LENR simulations
 */
export const thermalParameters = [
  {
    name: 'temperature',
    label: 'Temperature',
    value: 300, // K
    min: 10,
    max: 1500,
    step: 5,
    unit: 'K',
    description: 'Ambient temperature of the system in Kelvin',
    validation: validationFunctions.temperature
  },
  {
    name: 'pressure',
    label: 'Pressure',
    value: 1.0, // atm
    min: 0.01,
    max: 100,
    step: 0.1,
    unit: 'atm',
    description: 'System pressure in atmospheres',
    validation: validationFunctions.pressure
  },
  {
    name: 'heatCapacity',
    label: 'Heat Capacity',
    value: 440, // J/kg·K
    min: 100,
    max: 2000,
    step: 10,
    unit: 'J/kg·K',
    description: 'Specific heat capacity of the material',
    validation: (value: number) => value > 0 || 'Heat capacity must be positive'
  }
] as PhysicsParameter[];

/**
 * Lattice parameters for LENR simulations
 */
export const latticeParameters = [
  {
    name: 'latticeConstant',
    label: 'Lattice Constant',
    value: 3.89, // Å
    min: 1.0,
    max: 10.0,
    step: 0.01,
    unit: 'Å',
    description: 'Distance between unit cells in Angstroms',
    validation: validationFunctions.length
  },
  {
    name: 'defectConcentration',
    label: 'Defect Concentration',
    value: 0.01, // ratio
    min: 0,
    max: 0.2,
    step: 0.001,
    unit: '',
    description: 'Ratio of lattice sites with defects (0-0.2)',
    validation: (value: number) => 
      value >= 0 && value <= 0.2 ? true : 'Value must be between 0 and 0.2'
  },
  {
    name: 'deuteriumLoading',
    label: 'Deuterium Loading',
    value: 0.6, // ratio
    min: 0,
    max: 1.0,
    step: 0.01,
    unit: 'D/Pd',
    description: 'Ratio of deuterium atoms to palladium atoms',
    validation: (value: number) => 
      value >= 0 && value <= 1 ? true : 'Value must be between 0 and 1'
  }
] as PhysicsParameter[];

/**
 * Quantum parameters for LENR simulations
 */
export const quantumParameters = [
  {
    name: 'screeningFactor',
    label: 'Electron Screening Factor',
    value: 5.0,
    min: 1.0,
    max: 100.0,
    step: 0.5,
    unit: '',
    description: 'Enhancement factor for electron screening effect',
    validation: (value: number) => value > 0 || 'Screening factor must be positive'
  },
  {
    name: 'tunnelFactor',
    label: 'Quantum Tunneling Factor',
    value: 1.0e-20,
    min: 1.0e-25,
    max: 1.0e-15,
    step: 1.0e-25,
    unit: '',
    description: 'Quantum tunneling probability factor',
    validation: (value: number) => value > 0 || 'Tunneling factor must be positive'
  },
  {
    name: 'coherenceTime',
    label: 'Quantum Coherence Time',
    value: 1.0e-12, // s
    min: 1.0e-15,
    max: 1.0e-6,
    step: 1.0e-15,
    unit: 's',
    description: 'Quantum coherence time in seconds',
    validation: (value: number) => value > 0 || 'Coherence time must be positive'
  }
] as PhysicsParameter[];

/**
 * Energy parameters for LENR simulations
 */
export const energyParameters = [
  {
    name: 'initialEnergy',
    label: 'Initial Energy',
    value: 0.025, // eV
    min: 0.001,
    max: 10.0,
    step: 0.001,
    unit: 'eV',
    description: 'Initial energy of particles in electron-volts',
    validation: validationFunctions.energy
  },
  {
    name: 'activationEnergy',
    label: 'Activation Energy',
    value: 0.5, // eV
    min: 0.01,
    max: 20.0,
    step: 0.01,
    unit: 'eV',
    description: 'Energy barrier for reaction in electron-volts',
    validation: validationFunctions.energy
  },
  {
    name: 'reactionEnergy',
    label: 'Reaction Energy',
    value: 23.8e6, // eV (typical D-D fusion)
    min: 1e3,
    max: 50e6,
    step: 1e3,
    unit: 'eV',
    description: 'Energy released per reaction in electron-volts',
    validation: validationFunctions.energy
  }
] as PhysicsParameter[];

/**
 * Complete physics parameter set component
 */
const PhysicsParameterSet: React.FC<PhysicsParameterSetProps> = ({
  onParametersChange,
  onStartSimulation,
  initialParameters = {}
}) => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [parameters, setParameters] = useState<Record<string, number | string>>({
    // Merge default values with any provided initial parameters
    ...thermalParameters.reduce((acc, param) => ({ ...acc, [param.name]: param.value }), {}),
    ...latticeParameters.reduce((acc, param) => ({ ...acc, [param.name]: param.value }), {}),
    ...quantumParameters.reduce((acc, param) => ({ ...acc, [param.name]: param.value }), {}),
    ...energyParameters.reduce((acc, param) => ({ ...acc, [param.name]: param.value }), {}),
    ...initialParameters,
    // Add latticeType as a string parameter
    latticeType: 'FCC'
  });

  // Apply initial parameters to our parameter objects
  const [thermalParams, setThermalParams] = useState<PhysicsParameter[]>(
    thermalParameters.map(p => ({ 
      ...p, 
      value: initialParameters[p.name] !== undefined
        ? typeof initialParameters[p.name] === 'number'
          ? initialParameters[p.name] as number
          : parseFloat(initialParameters[p.name] as string) || p.value
        : p.value 
    }))
  );
  
  const [latticeParams, setLatticeParams] = useState<PhysicsParameter[]>(
    latticeParameters.map(p => ({ 
      ...p, 
      value: initialParameters[p.name] !== undefined
        ? typeof initialParameters[p.name] === 'number'
          ? initialParameters[p.name] as number
          : parseFloat(initialParameters[p.name] as string) || p.value
        : p.value 
    }))
  );
  
  const [quantumParams, setQuantumParams] = useState<PhysicsParameter[]>(
    quantumParameters.map(p => ({ 
      ...p, 
      value: initialParameters[p.name] !== undefined
        ? typeof initialParameters[p.name] === 'number'
          ? initialParameters[p.name] as number
          : parseFloat(initialParameters[p.name] as string) || p.value
        : p.value 
    }))
  );
  
  const [energyParams, setEnergyParams] = useState<PhysicsParameter[]>(
    energyParameters.map(p => ({ 
      ...p, 
      value: initialParameters[p.name] !== undefined
        ? typeof initialParameters[p.name] === 'number'
          ? initialParameters[p.name] as number
          : parseFloat(initialParameters[p.name] as string) || p.value
        : p.value 
    }))
  );

  // Memoize all parameters for validation
  const allParameters = useMemo(() => [
    ...thermalParams,
    ...latticeParams,
    ...quantumParams,
    ...energyParams
  ], [thermalParams, latticeParams, quantumParams, energyParams]);

  // Handle parameter changes
  const handleParameterChange = (name: string, value: number) => {
    const newParameters = { ...parameters, [name]: value };
    setParameters(newParameters);
    
    // Update the appropriate parameter set
    if (thermalParams.some(p => p.name === name)) {
      setThermalParams(prev => prev.map(p => p.name === name ? { ...p, value } : p));
    } else if (latticeParams.some(p => p.name === name)) {
      setLatticeParams(prev => prev.map(p => p.name === name ? { ...p, value } : p));
    } else if (quantumParams.some(p => p.name === name)) {
      setQuantumParams(prev => prev.map(p => p.name === name ? { ...p, value } : p));
    } else if (energyParams.some(p => p.name === name)) {
      setEnergyParams(prev => prev.map(p => p.name === name ? { ...p, value } : p));
    }
    
    onParametersChange?.(newParameters);
  };

  // Check for any validation errors
  const validationErrors = allParameters
    .filter(p => p.validation)
    .map(p => {
      const result = p.validation!(p.value);
      return typeof result === 'string' ? { name: p.name, label: p.label, error: result } : null;
    })
    .filter(Boolean);

  // Handle tab changes
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  // Handle start simulation button click
  const handleStartSimulation = () => {
    if (validationErrors.length === 0 && onStartSimulation) {
      onStartSimulation(parameters);
    }
  };

  // All validation errors combined
  const allValidationErrorMessages = [
    ...validationErrors.map(err => `${err!.label}: ${err!.error}`)
  ];

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Physics Parameters</Typography>
      <Divider sx={{ mb: 2 }} />

      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="Thermal" />
        <Tab label="Lattice" />
        <Tab label="Quantum" />
        <Tab label="Energy" />
      </Tabs>

      <Box sx={{ p: 1 }}>
        {tab === 0 && (
          <PhysicsParameterGroup
            title="Thermal Parameters"
            parameters={thermalParams}
            onChange={handleParameterChange}
            description="Parameters related to temperature, pressure, and heat transfer in the system"
            layout="grid"
          />
        )}
        {tab === 1 && (
          <PhysicsParameterGroup
            title="Lattice Parameters"
            parameters={latticeParams}
            onChange={handleParameterChange}
            description="Crystalline lattice parameters for the metal substrate"
            layout="grid"
          />
        )}
        {tab === 2 && (
          <PhysicsParameterGroup
            title="Quantum Parameters"
            parameters={quantumParams}
            onChange={handleParameterChange}
            description="Parameters governing quantum mechanical behavior"
            layout="grid"
          />
        )}
        {tab === 3 && (
          <PhysicsParameterGroup
            title="Energy Parameters"
            parameters={energyParams}
            onChange={handleParameterChange}
            description="Energy-related parameters for reactions"
            layout="grid"
          />
        )}
      </Box>

      {/* Input validation errors */}
      {validationErrors.length > 0 && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="error">
            Please fix the following input errors:
          </Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '24px' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>
                <Typography variant="body2" color="error">
                  {err!.label}: {err!.error}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}

      {/* Physics constraint validation */}
      <PhysicsParameterValidator 
        parameters={parameters}
        showSuccessMessages={true}
      />

      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={validationErrors.length > 0}
          onClick={handleStartSimulation}
        >
          Start Simulation
        </Button>
      </Stack>
    </Paper>
  );
};

export default PhysicsParameterSet; 