import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  TextField, 
  MenuItem, 
  Grid, 
  Button, 
  Slider, 
  Switch, 
  FormControlLabel,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup,
  Chip,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Menu,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Save,
  ExpandMore,
  Settings,
  Info,
  FastForward,
  SlowMotionVideo,
  Speed,
  BatchPrediction,
  Add,
  Remove,
  Camera,
  Restore,
  Delete,
  Download,
  Upload,
  MoreVert,
  FileCopy,
  History,
  HelpOutline,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import PhysicsModelSelector from './physics/PhysicsModelSelector';
import physicsModelRegistry from './physics/PhysicsModelRegistry';
import { AdvancedControlHelpDialog, AdvancedControlHelpButton } from './docs/AdvancedControlHelp';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Extend Window interface to include our custom functions
declare global {
  interface Window {
    updateLENRVisualizerEnhancement?: (factorName: string, value: number) => void;
  }
}

// Preset simulation configurations
const SIMULATION_PRESETS = [
  {
    id: 'pd-d2o',
    name: 'Palladium/D₂O Electrolysis',
    description: 'Classic Pd/D2O electrolysis setup with high loading ratio',
    parameters: {
      reaction_name: 'd-d',
      lattice_type: 'FCC',
      lattice_constant: 3.89,
      temperature: 300,
      pressure: 1.0,
      loading_ratio: 0.9,
      surface_roughness: 5.0,
      defect_density: 1e12,
      field_strength: 1e8,
      coherence_length: 10.0,
      enhancement_factors: {
        electron_screening: 10.0,
        coherent_tunneling: 5.0
      }
    }
  },
  {
    id: 'ni-h',
    name: 'Nickel/Hydrogen LENR',
    description: 'Nickel-hydrogen system at elevated temperature',
    parameters: {
      reaction_name: 'p-ni',
      lattice_type: 'FCC',
      lattice_constant: 3.52,
      temperature: 600,
      pressure: 5.0,
      loading_ratio: 0.85,
      surface_roughness: 8.0,
      defect_density: 5e11,
      field_strength: 5e7,
      coherence_length: 5.0,
      enhancement_factors: {
        electron_screening: 5.0,
        interface_field: 3.0
      }
    }
  },
  {
    id: 'ti-d',
    name: 'Titanium/Deuterium',
    description: 'Titanium loaded with deuterium under stress',
    parameters: {
      reaction_name: 'd-d',
      lattice_type: 'HCP',
      lattice_constant: 2.95,
      temperature: 350,
      pressure: 10.0,
      loading_ratio: 1.8,
      surface_roughness: 12.0,
      defect_density: 8e12,
      field_strength: 2e8,
      coherence_length: 8.0,
      enhancement_factors: {
        dislocation_energy: 8.0,
        shock_confinement: 4.0
      }
    }
  }
];

interface SimulationControlPanelProps {
  onSimulationStart?: (parameters: any) => void;
  onSimulationStop?: () => void;
  onSimulationReset?: () => void;
  simulationId?: string | null;
  isSimulationRunning?: boolean;
}

// Type for simulation snapshots
interface SimulationSnapshot {
  id: string;
  name: string;
  timestamp: number;
  parameters: any;
  enhancementFactors: any;
  modelId?: string;
  notes?: string;
}

const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  onSimulationStart = () => {},
  onSimulationStop = () => {},
  onSimulationReset = () => {},
  simulationId = null,
  isSimulationRunning = false,
}) => {
  const theme = useTheme();
  
  // Main simulation parameters state
  const [parameters, setParameters] = useState({
    reaction_name: 'd-d',
    lattice_type: 'FCC',
    lattice_constant: 3.89,
    temperature: 300,
    pressure: 1.0,
    loading_ratio: 0.6,
    surface_roughness: 5.0,
    defect_density: 1e12,
    field_strength: 1e8,
    coherence_length: 10.0,
  });
  
  // Enhancement factors state
  const [enhancementFactors, setEnhancementFactors] = useState({
    rydberg_matter: 1.0,
    electron_screening: 1.0,
    interface_field: 1.0,
    coherent_tunneling: 1.0,
    casimir_force: 1.0,
    shock_confinement: 1.0,
    dislocation_energy: 1.0,
    oppenheimer_phillips: 1.0,
    double_layer_qed: 1.0,
  });
  
  // Physics model selection state
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  
  // Simulation speed state
  const [simulationSpeed, setSimulationSpeed] = useState(1.0);
  const [maxSpeedMode, setMaxSpeedMode] = useState(false);
  
  // UI states
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEnhancementFactors, setShowEnhancementFactors] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableReactions, setAvailableReactions] = useState<Array<{name: string, description: string}>>([]);
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Ensemble configuration
  const [ensembleMode, setEnsembleMode] = useState(false);
  const [ensembleConfig, setEnsembleConfig] = useState<{
    paramName: string;
    min: number;
    max: number;
    steps: number;
  }[]>([]);
  const [selectedEnsembleParams, setSelectedEnsembleParams] = useState<string[]>([]);
  
  // Snapshot system states
  const [snapshots, setSnapshots] = useState<SimulationSnapshot[]>([]);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<SimulationSnapshot | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [snapshotMenuAnchorEl, setSnapshotMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  
  // Fetch available reactions on component mount
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/physics/available-reactions`);
        setAvailableReactions(response.data);
      } catch (err) {
        console.error('Failed to fetch available reactions:', err);
        setError('Failed to load reaction data. Please try again later.');
      }
    };
    
    fetchReactions();
  }, []);
  
  // Apply preset configuration
  const applyPreset = (presetId: string) => {
    const preset = SIMULATION_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setParameters({
        ...parameters,
        ...preset.parameters,
      });
      
      // Apply enhancement factors if provided in preset
      if (preset.parameters.enhancement_factors) {
        setEnhancementFactors({
          ...enhancementFactors,
          ...preset.parameters.enhancement_factors,
        });
      }
      
      setActivePreset(presetId);
      setError(null);
    }
  };
  
  // Handle parameter changes
  const handleParameterChange = (name: string, value: any) => {
    // Clear validation error for this field if exists
    if (validationErrors[name]) {
      const updatedErrors = { ...validationErrors };
      delete updatedErrors[name];
      setValidationErrors(updatedErrors);
    }
    
    setParameters(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear active preset when user modifies parameters
    setActivePreset(null);
  };
  
  // Convert simulation enhancement factor to visualization scale
  const convertToVisualizationScale = (name: string, simulationValue: number): number => {
    // Different factors have different scales in the simulation (1-5, 1-10, 1-20, etc.)
    // but we need a consistent 0-100 scale for visualization
    switch (name) {
      case 'double_layer_qed':
        // Convert from 1-5 scale to 0-100 scale
        return Math.max(0, (simulationValue - 1) * 25);
      case 'electron_screening':
        // Convert from 1-50 scale to 0-100 scale
        return Math.max(0, (simulationValue - 1) * 2);
      default:
        // Default conversion for other factors (assuming 1-10 scale)
        return Math.max(0, (simulationValue - 1) * 10);
    }
  };

  // Handle enhancement factor changes
  const handleEnhancementFactorChange = (name: string, value: number) => {
    setEnhancementFactors(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear active preset when user modifies parameters
    setActivePreset(null);
    
    // For the QED Double Layer enhancement factor, update the visualizer if available
    if (name === 'double_layer_qed') {
      // Convert to visualization scale (0-100 for better visual effect)
      const visualizationValue = convertToVisualizationScale(name, value);
      console.log(`Converting ${name} from ${value} to visualization scale: ${visualizationValue}`);
      
      // Try the direct method if available
      if (typeof window.updateLENRVisualizerEnhancement === 'function') {
        window.updateLENRVisualizerEnhancement('double_layer_qed', visualizationValue);
      } else {
        // Fallback to custom event
        const event = new CustomEvent('enhancementFactorUpdate', {
          detail: { factorName: name, value: visualizationValue }
        });
        window.dispatchEvent(event);
      }
    }
  };
  
  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    
    // Apply model parameters if available
    const model = physicsModelRegistry.getModel(modelId);
    if (model) {
      // Extract parameter values from the model
      const modelParameterValues: Record<string, number> = {};
      model.parameters.forEach(param => {
        modelParameterValues[param.name] = param.value;
      });
      
      // Update parameters with model values
      setParameters(prev => ({
        ...prev,
        ...modelParameterValues
      }));
      
      // Clear active preset
      setActivePreset(null);
    }
  };
  
  // Handle simulation speed change
  const handleSpeedChange = (newSpeed: number) => {
    setSimulationSpeed(newSpeed);
    
    // If we're in a running simulation, inform the backend about the speed change
    if (isSimulationRunning && simulationId) {
      try {
        // This would typically be an async call to update the simulation speed
        // For now, we'll just log it
        console.log(`Setting simulation speed to ${newSpeed}x for simulation ${simulationId}`);
        
        // Example of what an actual API call might look like:
        // await axios.post(`${BACKEND_URL}/simulations/${simulationId}/speed`, { speed: newSpeed });
      } catch (err) {
        console.error('Failed to update simulation speed:', err);
      }
    }
  };
  
  // Increase simulation speed
  const increaseSpeed = () => {
    const newSpeed = Math.min(simulationSpeed + 1, 10);
    handleSpeedChange(newSpeed);
  };
  
  // Decrease simulation speed
  const decreaseSpeed = () => {
    const newSpeed = Math.max(simulationSpeed - 1, 1);
    handleSpeedChange(newSpeed);
  };
  
  // Toggle max speed mode
  const toggleMaxSpeedMode = () => {
    const newMaxSpeedMode = !maxSpeedMode;
    setMaxSpeedMode(newMaxSpeedMode);
    
    // When toggling to max speed, we save the current speed so we can restore it later
    if (newMaxSpeedMode) {
      handleSpeedChange(10); // Set to max speed
    } else {
      handleSpeedChange(Math.min(simulationSpeed, 5)); // Return to a reasonable speed
    }
  };
  
  // Validate all parameters before starting simulation
  const validateParameters = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Basic validation rules
    if (!parameters.reaction_name) {
      errors.reaction_name = 'Reaction name is required';
    }
    
    if (parameters.lattice_constant <= 0) {
      errors.lattice_constant = 'Lattice constant must be positive';
    }
    
    if (parameters.temperature <= 0) {
      errors.temperature = 'Temperature must be positive';
    }
    
    if (parameters.pressure <= 0) {
      errors.pressure = 'Pressure must be positive';
    }
    
    if (parameters.loading_ratio < 0) {
      errors.loading_ratio = 'Loading ratio cannot be negative';
    }
    
    if (parameters.surface_roughness < 0) {
      errors.surface_roughness = 'Surface roughness cannot be negative';
    }
    
    if (parameters.defect_density < 0) {
      errors.defect_density = 'Defect density cannot be negative';
    }
    
    if (parameters.field_strength < 0) {
      errors.field_strength = 'Field strength cannot be negative';
    }
    
    if (parameters.coherence_length < 0) {
      errors.coherence_length = 'Coherence length cannot be negative';
    }
    
    // Update validation errors state
    setValidationErrors(errors);
    
    // Return true if no errors
    return Object.keys(errors).length === 0;
  };
  
  // Calculate total number of simulations in ensemble
  const totalEnsembleRuns = useMemo(() => {
    if (!ensembleMode || ensembleConfig.length === 0) return 1;
    
    return ensembleConfig.reduce((total, param) => {
      return total * (param.steps + 1); // +1 because steps represents intervals, not points
    }, 1);
  }, [ensembleMode, ensembleConfig]);
  
  // Handle adding parameter to ensemble
  const addParameterToEnsemble = (paramName: string) => {
    // Don't add if already in ensemble
    if (selectedEnsembleParams.includes(paramName)) return;
    
    // Get current parameter value
    const currentValue = 
      paramName in parameters 
        ? parameters[paramName as keyof typeof parameters] as number
        : enhancementFactors[paramName as keyof typeof enhancementFactors] as number;
    
    // Add parameter to selected list
    setSelectedEnsembleParams([...selectedEnsembleParams, paramName]);
    
    // Add configuration with reasonable default range
    setEnsembleConfig([
      ...ensembleConfig,
      {
        paramName,
        min: Math.max(0.5 * currentValue, 0.1), // Ensure non-negative
        max: 1.5 * currentValue,
        steps: 5,
      }
    ]);
  };
  
  // Handle removing parameter from ensemble
  const removeParameterFromEnsemble = (paramName: string) => {
    setSelectedEnsembleParams(selectedEnsembleParams.filter(p => p !== paramName));
    setEnsembleConfig(ensembleConfig.filter(p => p.paramName !== paramName));
  };
  
  // Update ensemble parameter configuration
  const updateEnsembleParam = (
    index: number, 
    field: 'min' | 'max' | 'steps', 
    value: number
  ) => {
    const newConfig = [...ensembleConfig];
    newConfig[index][field] = value;
    setEnsembleConfig(newConfig);
  };
  
  // Format parameter name for display
  const formatParamName = (paramName: string): string => {
    // Convert camelCase to Title Case with spaces
    return paramName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };
  
  // Check if parameter is eligible for ensemble
  const isParameterEligibleForEnsemble = (paramName: string): boolean => {
    // Only numerical parameters can be part of an ensemble
    const value = 
      paramName in parameters 
        ? parameters[paramName as keyof typeof parameters]
        : enhancementFactors[paramName as keyof typeof enhancementFactors];
    
    return typeof value === 'number';
  };
  
  // Get list of eligible parameters
  const eligibleParameters = useMemo(() => {
    const result: string[] = [];
    
    // Add main parameters
    Object.keys(parameters).forEach(key => {
      if (isParameterEligibleForEnsemble(key)) {
        result.push(key);
      }
    });
    
    // Add enhancement factors
    Object.keys(enhancementFactors).forEach(key => {
      if (isParameterEligibleForEnsemble(key)) {
        result.push(key);
      }
    });
    
    return result;
  }, [parameters, enhancementFactors]);
  
  // Start simulation with current parameters
  const startSimulation = async () => {
    // Validate parameters
    if (!validateParameters()) {
      setError('Please correct the validation errors before starting the simulation.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Base simulation parameters
      const baseParams = {
        ...parameters,
        physicsModelId: selectedModelId,
        simulationSpeed: simulationSpeed,
        maxSpeedMode: maxSpeedMode,
        conditions: {
          loading_ratio: parameters.loading_ratio,
          surface_roughness: parameters.surface_roughness,
          defect_density: parameters.defect_density,
          field_strength: parameters.field_strength,
          coherence_length: parameters.coherence_length,
        },
        enhancement_factors: enhancementFactors,
      };
      
      // Add ensemble configuration if in ensemble mode
      const simulationParams = ensembleMode 
        ? {
            ...baseParams,
            ensemble: {
              enabled: true,
              configurations: ensembleConfig,
              totalRuns: totalEnsembleRuns,
            }
          }
        : baseParams;
      
      // Call the onSimulationStart callback with parameters
      onSimulationStart(simulationParams);
    } catch (err) {
      console.error('Failed to start simulation:', err);
      setError('Failed to start simulation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Stop current simulation
  const stopSimulation = () => {
    onSimulationStop();
  };
  
  // Reset simulation and parameters
  const resetSimulation = () => {
    // Reset to default parameters
    setParameters({
      reaction_name: 'd-d',
      lattice_type: 'FCC',
      lattice_constant: 3.89,
      temperature: 300,
      pressure: 1.0,
      loading_ratio: 0.6,
      surface_roughness: 5.0,
      defect_density: 1e12,
      field_strength: 1e8,
      coherence_length: 10.0,
    });
    
    // Reset enhancement factors
    setEnhancementFactors({
      rydberg_matter: 1.0,
      electron_screening: 1.0,
      interface_field: 1.0,
      coherent_tunneling: 1.0,
      casimir_force: 1.0,
      shock_confinement: 1.0,
      dislocation_energy: 1.0,
      oppenheimer_phillips: 1.0,
      double_layer_qed: 1.0,
    });
    
    // Clear active preset
    setActivePreset(null);
    
    // Clear any errors
    setError(null);
    setValidationErrors({});
    
    // Call reset callback
    onSimulationReset();
  };
  
  // Format numbers with scientific notation for large/small values
  const formatNumber = (value: number): string => {
    if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
      return value.toExponential(2);
    }
    return value.toString();
  };
  
  // Load snapshots from local storage on component mount
  useEffect(() => {
    const storedSnapshots = localStorage.getItem('simulation_snapshots');
    if (storedSnapshots) {
      try {
        setSnapshots(JSON.parse(storedSnapshots));
      } catch (err) {
        console.error('Failed to load snapshots from local storage:', err);
      }
    }
    
    // Broadcast initial enhancement factors to any visualizers
    // Wait a short time to ensure visualizers are mounted
    const timeoutId = setTimeout(() => {
      // Dispatch initial QED Double Layer value
      const visualizationValue = convertToVisualizationScale('double_layer_qed', enhancementFactors.double_layer_qed);
      console.log(`Broadcasting initial double_layer_qed value: ${enhancementFactors.double_layer_qed} (vis: ${visualizationValue})`);
      
      // Try direct method first
      if (typeof window.updateLENRVisualizerEnhancement === 'function') {
        window.updateLENRVisualizerEnhancement('double_layer_qed', visualizationValue);
      } else {
        // Fallback to custom event
        const event = new CustomEvent('enhancementFactorUpdate', {
          detail: { factorName: 'double_layer_qed', value: visualizationValue }
        });
        window.dispatchEvent(event);
      }
    }, 500); // Half-second delay to ensure components are ready
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Save snapshots to local storage when they change
  useEffect(() => {
    localStorage.setItem('simulation_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);
  
  // Create a new snapshot of the current simulation state
  const createSnapshot = useCallback(() => {
    // Close dialog
    setShowSnapshotDialog(false);
    
    // Create unique ID
    const newId = `snapshot_${Date.now()}`;
    
    // Create snapshot
    const newSnapshot: SimulationSnapshot = {
      id: newId,
      name: snapshotName || `Snapshot ${snapshots.length + 1}`,
      timestamp: Date.now(),
      parameters: { ...parameters },
      enhancementFactors: { ...enhancementFactors },
      modelId: selectedModelId,
      notes: snapshotNotes,
    };
    
    // Add to snapshots
    setSnapshots(prev => [...prev, newSnapshot]);
    
    // Reset form
    setSnapshotName('');
    setSnapshotNotes('');
  }, [snapshotName, snapshotNotes, parameters, enhancementFactors, selectedModelId, snapshots.length]);
  
  // Restore parameters from a snapshot
  const restoreSnapshot = useCallback(() => {
    if (!selectedSnapshot) return;
    
    // Confirm dialog should be closed
    setShowRestoreDialog(false);
    
    // Restore parameters and enhancement factors
    setParameters(selectedSnapshot.parameters);
    setEnhancementFactors(selectedSnapshot.enhancementFactors);
    
    // Restore model if available
    if (selectedSnapshot.modelId) {
      setSelectedModelId(selectedSnapshot.modelId);
    }
    
    // Clear active preset
    setActivePreset(null);
    
    // Reset validation errors
    setValidationErrors({});
    
    // Show confirmation
    setError(`Restored settings from snapshot: ${selectedSnapshot.name}`);
    setTimeout(() => setError(null), 3000);
  }, [selectedSnapshot]);
  
  // Delete a snapshot
  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
    setSnapshotMenuAnchorEl(null);
  }, []);
  
  // Export a snapshot as JSON file
  const exportSnapshot = useCallback((snapshot: SimulationSnapshot) => {
    // Create a blob with the snapshot data
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.name.replace(/\s+/g, '_')}_${new Date(snapshot.timestamp).toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSnapshotMenuAnchorEl(null);
  }, []);
  
  // Handle snapshot menu opening
  const handleSnapshotMenuOpen = (event: React.MouseEvent<HTMLElement>, snapshotId: string) => {
    setSnapshotMenuAnchorEl(event.currentTarget);
    setActiveSnapshotId(snapshotId);
  };
  
  // Handle snapshot menu closing
  const handleSnapshotMenuClose = () => {
    setSnapshotMenuAnchorEl(null);
    setActiveSnapshotId(null);
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Handle file selection for import
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSnapshot = JSON.parse(content) as SimulationSnapshot;
        
        // Validate imported snapshot has required fields
        if (!importedSnapshot.id || !importedSnapshot.parameters || !importedSnapshot.enhancementFactors) {
          setError('Invalid snapshot file format.');
          return;
        }
        
        // Ensure unique ID by generating a new one
        importedSnapshot.id = `snapshot_${Date.now()}`;
        
        // Add timestamp if missing
        if (!importedSnapshot.timestamp) {
          importedSnapshot.timestamp = Date.now();
        }
        
        // Add to snapshots
        setSnapshots(prev => [...prev, importedSnapshot]);
        
        // Reset file input
        event.target.value = '';
        
        // Show confirmation
        setError(`Imported snapshot: ${importedSnapshot.name}`);
        setTimeout(() => setError(null), 3000);
      } catch (err) {
        console.error('Failed to import snapshot:', err);
        setError('Failed to import snapshot: Invalid file format.');
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <Card sx={{ width: '100%', mb: 2 }}>
      <CardHeader 
        title="Simulation Control Panel" 
        titleTypographyProps={{ variant: 'h6' }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AdvancedControlHelpDialog />
            <Tooltip title="Toggle Advanced Settings">
              <IconButton onClick={() => setShowAdvanced(!showAdvanced)} sx={{ ml: 1 }}>
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Simulation Presets */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Simulation Presets
          </Typography>
          
          <Grid container spacing={2}>
            {SIMULATION_PRESETS.map((preset) => (
              <Grid key={preset.id} sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                <Button
                  variant={activePreset === preset.id ? "contained" : "outlined"}
                  color="primary"
                  fullWidth
                  onClick={() => applyPreset(preset.id)}
                  disabled={isSimulationRunning}
                >
                  {preset.name}
                </Button>
                <Typography variant="caption" color="textSecondary">
                  {preset.description}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Physics Model Selection */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1">
              Physics Model Selection
            </Typography>
            <AdvancedControlHelpButton controlType="physicsModel" size="small" />
          </Box>
          
          <PhysicsModelSelector
            currentParameters={parameters}
            onModelSelect={handleModelSelect}
            selectedModelId={selectedModelId}
            showCompatibilityInfo={true}
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Basic Parameters */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Basic Parameters
          </Typography>
          
          <Grid container spacing={2}>
            {/* Reaction Type */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <TextField
                select
                fullWidth
                id="reaction-type-field"
                name="reaction_name"
                label="Reaction Type"
                value={parameters.reaction_name}
                onChange={(e) => handleParameterChange('reaction_name', e.target.value)}
                error={!!validationErrors.reaction_name}
                helperText={validationErrors.reaction_name}
                disabled={isSimulationRunning}
                size="small"
              >
                {availableReactions.map((reaction) => (
                  <MenuItem 
                    key={reaction.name} 
                    value={reaction.name}
                    id={`reaction-type-${reaction.name}`}
                  >
                    {reaction.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            {/* Lattice Type */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <TextField
                select
                fullWidth
                id="lattice-type-field"
                name="lattice_type"
                label="Lattice Type"
                value={parameters.lattice_type}
                onChange={(e) => handleParameterChange('lattice_type', e.target.value)}
                disabled={isSimulationRunning}
                size="small"
              >
                <MenuItem value="FCC" id="lattice-type-fcc">Face-Centered Cubic (FCC)</MenuItem>
                <MenuItem value="BCC" id="lattice-type-bcc">Body-Centered Cubic (BCC)</MenuItem>
                <MenuItem value="HCP" id="lattice-type-hcp">Hexagonal Close-Packed (HCP)</MenuItem>
                <MenuItem value="Diamond" id="lattice-type-diamond">Diamond Cubic</MenuItem>
              </TextField>
            </Grid>
            
            {/* Lattice Constant */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <TextField
                fullWidth
                type="number"
                id="lattice-constant-field"
                name="lattice_constant"
                label="Lattice Constant (Å)"
                value={parameters.lattice_constant}
                onChange={(e) => handleParameterChange('lattice_constant', parseFloat(e.target.value))}
                error={!!validationErrors.lattice_constant}
                helperText={validationErrors.lattice_constant}
                disabled={isSimulationRunning}
                InputProps={{ inputProps: { min: 0.1, step: 0.01 } }}
                size="small"
              />
            </Grid>
            
            {/* Temperature */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <TextField
                fullWidth
                type="number"
                id="temperature-field"
                name="temperature"
                label="Temperature (K)"
                value={parameters.temperature}
                onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                error={!!validationErrors.temperature}
                helperText={validationErrors.temperature}
                disabled={isSimulationRunning}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
                size="small"
              />
            </Grid>
            
            {/* Pressure */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <TextField
                fullWidth
                type="number"
                id="pressure-field"
                name="pressure"
                label="Pressure (atm)"
                value={parameters.pressure}
                onChange={(e) => handleParameterChange('pressure', parseFloat(e.target.value))}
                error={!!validationErrors.pressure}
                helperText={validationErrors.pressure}
                disabled={isSimulationRunning}
                InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                size="small"
              />
            </Grid>
            
            {/* Loading Ratio */}
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
              <TextField
                fullWidth
                type="number"
                id="loading-ratio-field"
                name="loading_ratio"
                label="Loading Ratio"
                value={parameters.loading_ratio}
                onChange={(e) => handleParameterChange('loading_ratio', parseFloat(e.target.value))}
                error={!!validationErrors.loading_ratio}
                helperText={validationErrors.loading_ratio || "H/M atomic ratio"}
                disabled={isSimulationRunning}
                InputProps={{ inputProps: { min: 0, max: 2, step: 0.01 } }}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>
        
        {/* Advanced Parameters Section */}
        <Accordion 
          expanded={showAdvanced} 
          onChange={() => setShowAdvanced(!showAdvanced)}
          disabled={isSimulationRunning}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Advanced Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {/* Surface Roughness */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  type="number"
                  id="surface-roughness-field"
                  name="surface_roughness"
                  label="Surface Roughness (nm)"
                  value={parameters.surface_roughness}
                  onChange={(e) => handleParameterChange('surface_roughness', parseFloat(e.target.value))}
                  error={!!validationErrors.surface_roughness}
                  helperText={validationErrors.surface_roughness}
                  disabled={isSimulationRunning}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  size="small"
                />
              </Grid>
              
              {/* Defect Density */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  id="defect-density-field"
                  name="defect_density"
                  label="Defect Density (cm⁻³)"
                  value={formatNumber(parameters.defect_density)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Handle scientific notation inputs
                    try {
                      const parsedValue = value.includes('e') ? parseFloat(value) : parseFloat(value);
                      handleParameterChange('defect_density', parsedValue);
                    } catch (err) {
                      console.error('Invalid number format:', err);
                    }
                  }}
                  error={!!validationErrors.defect_density}
                  helperText={validationErrors.defect_density}
                  disabled={isSimulationRunning}
                  size="small"
                />
              </Grid>
              
              {/* Field Strength */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  id="field-strength-field"
                  name="field_strength"
                  label="Electric Field Strength (V/m)"
                  value={formatNumber(parameters.field_strength)}
                  onChange={(e) => {
                    const value = e.target.value;
                    try {
                      const parsedValue = value.includes('e') ? parseFloat(value) : parseFloat(value);
                      handleParameterChange('field_strength', parsedValue);
                    } catch (err) {
                      console.error('Invalid number format:', err);
                    }
                  }}
                  error={!!validationErrors.field_strength}
                  helperText={validationErrors.field_strength}
                  disabled={isSimulationRunning}
                  size="small"
                />
              </Grid>
              
              {/* Coherence Length */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  type="number"
                  id="coherence-length-field"
                  name="coherence_length"
                  label="Quantum Coherence Length (nm)"
                  value={parameters.coherence_length}
                  onChange={(e) => handleParameterChange('coherence_length', parseFloat(e.target.value))}
                  error={!!validationErrors.coherence_length}
                  helperText={validationErrors.coherence_length}
                  disabled={isSimulationRunning}
                  InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                  size="small"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        {/* Enhancement Factors Section */}
        <Accordion 
          expanded={showEnhancementFactors} 
          onChange={() => setShowEnhancementFactors(!showEnhancementFactors)}
          disabled={isSimulationRunning}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Enhancement Factors</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {/* Primary Enhancement Factors */}
              <Grid sx={{ gridColumn: 'span 12' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Primary Enhancement Mechanisms
                </Typography>
              </Grid>
              
              {/* Electron Screening */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="electron-screening-label">
                  Electron Screening: {enhancementFactors.electron_screening.toFixed(1)}x
                </Typography>
                <Slider
                  id="electron-screening-slider"
                  aria-labelledby="electron-screening-label"
                  value={enhancementFactors.electron_screening}
                  onChange={(_, value) => handleEnhancementFactorChange('electron_screening', value as number)}
                  min={1}
                  max={50}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              {/* Coherent Tunneling */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="coherent-tunneling-label">
                  Coherent Tunneling: {enhancementFactors.coherent_tunneling.toFixed(1)}x
                </Typography>
                <Slider
                  id="coherent-tunneling-slider"
                  aria-labelledby="coherent-tunneling-label"
                  value={enhancementFactors.coherent_tunneling}
                  onChange={(_, value) => handleEnhancementFactorChange('coherent_tunneling', value as number)}
                  min={1}
                  max={20}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              {/* Interface Field */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="interface-field-label">
                  Interface Field: {enhancementFactors.interface_field.toFixed(1)}x
                </Typography>
                <Slider
                  id="interface-field-slider"
                  aria-labelledby="interface-field-label"
                  value={enhancementFactors.interface_field}
                  onChange={(_, value) => handleEnhancementFactorChange('interface_field', value as number)}
                  min={1}
                  max={20}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              {/* Rydberg Matter */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="rydberg-matter-label">
                  Rydberg Matter: {enhancementFactors.rydberg_matter.toFixed(1)}x
                </Typography>
                <Slider
                  id="rydberg-matter-slider"
                  aria-labelledby="rydberg-matter-label"
                  value={enhancementFactors.rydberg_matter}
                  onChange={(_, value) => handleEnhancementFactorChange('rydberg_matter', value as number)}
                  min={1}
                  max={10}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              {/* Secondary Enhancement Factors */}
              <Grid sx={{ gridColumn: 'span 12' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Secondary Enhancement Mechanisms
                </Typography>
              </Grid>
              
              {/* Dislocation Energy */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="dislocation-energy-label">
                  Dislocation Energy: {enhancementFactors.dislocation_energy.toFixed(1)}x
                </Typography>
                <Slider
                  id="dislocation-energy-slider"
                  aria-labelledby="dislocation-energy-label"
                  value={enhancementFactors.dislocation_energy}
                  onChange={(_, value) => handleEnhancementFactorChange('dislocation_energy', value as number)}
                  min={1}
                  max={10}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              {/* Shock Confinement */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="shock-confinement-label">
                  Shock Confinement: {enhancementFactors.shock_confinement.toFixed(1)}x
                </Typography>
                <Slider
                  id="shock-confinement-slider"
                  aria-labelledby="shock-confinement-label"
                  value={enhancementFactors.shock_confinement}
                  onChange={(_, value) => handleEnhancementFactorChange('shock_confinement', value as number)}
                  min={1}
                  max={10}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              {/* Other Enhancement Factors */}
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="oppenheimer-phillips-label">
                  Oppenheimer-Phillips: {enhancementFactors.oppenheimer_phillips.toFixed(1)}x
                </Typography>
                <Slider
                  id="oppenheimer-phillips-slider"
                  aria-labelledby="oppenheimer-phillips-label"
                  value={enhancementFactors.oppenheimer_phillips}
                  onChange={(_, value) => handleEnhancementFactorChange('oppenheimer_phillips', value as number)}
                  min={1}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
              
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Typography variant="body2" gutterBottom id="double-layer-qed-label">
                  QED Double Layer: {enhancementFactors.double_layer_qed.toFixed(1)}x
                </Typography>
                <Slider
                  id="double-layer-qed-slider"
                  aria-labelledby="double-layer-qed-label"
                  value={enhancementFactors.double_layer_qed}
                  onChange={(_, value) => handleEnhancementFactorChange('double_layer_qed', value as number)}
                  min={1}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                  disabled={isSimulationRunning}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        {/* Simulation Speed Controls */}
        <Accordion 
          expanded={isSimulationRunning}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography>
                <Speed fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Simulation Speed Controls
              </Typography>
              <AdvancedControlHelpButton controlType="speed" size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} alignItems="center">
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 7' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SlowMotionVideo color="action" sx={{ mr: 1 }} />
                  <Slider
                    id="simulation-speed-slider"
                    aria-labelledby="simulation-speed-label"
                    value={simulationSpeed}
                    onChange={(_, value) => handleSpeedChange(value as number)}
                    min={1}
                    max={10}
                    step={0.5}
                    marks={[
                      { value: 1, label: '1x' },
                      { value: 5, label: '5x' },
                      { value: 10, label: '10x' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}x`}
                    disabled={!isSimulationRunning || maxSpeedMode}
                  />
                  <FastForward color="action" sx={{ ml: 1 }} />
                </Box>
                <Typography variant="body2" color="textSecondary" gutterBottom id="simulation-speed-label">
                  Current Speed: {maxSpeedMode ? "Maximum" : `${simulationSpeed.toFixed(1)}x`}
                </Typography>
              </Grid>
              
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 5' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <ButtonGroup variant="outlined" size="small">
                    <Tooltip title="Decrease Speed">
                      <Button 
                        onClick={decreaseSpeed}
                        disabled={!isSimulationRunning || simulationSpeed <= 1 || maxSpeedMode}
                      >
                        <SlowMotionVideo />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Increase Speed">
                      <Button 
                        onClick={increaseSpeed}
                        disabled={!isSimulationRunning || simulationSpeed >= 10 || maxSpeedMode}
                      >
                        <FastForward />
                      </Button>
                    </Tooltip>
                  </ButtonGroup>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        id="max-speed-mode-switch"
                        name="max-speed-mode"
                        checked={maxSpeedMode}
                        onChange={toggleMaxSpeedMode}
                        disabled={!isSimulationRunning}
                        color="primary"
                        aria-labelledby="max-speed-mode-label"
                      />
                    }
                    label={<span id="max-speed-mode-label">Max Speed Mode</span>}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Max speed mode disables rendering updates to achieve maximum simulation speed
                </Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
        
        {/* Ensemble Run Configuration */}
        <Accordion 
          expanded={ensembleMode}
          onChange={() => setEnsembleMode(!ensembleMode)}
          sx={{ mb: 2 }}
          disabled={isSimulationRunning}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography>
                <BatchPrediction fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Ensemble Run Configuration
              </Typography>
              <AdvancedControlHelpButton controlType="ensemble" size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    id="ensemble-mode-switch"
                    name="ensemble-mode"
                    checked={ensembleMode}
                    onChange={(e) => setEnsembleMode(e.target.checked)}
                    disabled={isSimulationRunning}
                    color="primary"
                    aria-labelledby="ensemble-mode-label"
                  />
                }
                label={<span id="ensemble-mode-label">Enable Ensemble Mode</span>}
              />
              <Typography variant="body2" color="textSecondary">
                Run multiple simulations with varying parameters to analyze result patterns
              </Typography>
            </Box>
            
            {ensembleMode && (
              <>
                <Divider sx={{ my: 2 }} />
                
                {/* Parameter Selection */}
                <Typography variant="subtitle2" gutterBottom>
                  Select Parameters to Vary:
                </Typography>
                
                <Box sx={{ maxHeight: '150px', overflowY: 'auto', mb: 2 }}>
                  <Grid container spacing={1}>
                    {eligibleParameters.map((paramName) => (
                      <Grid key={paramName} sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
                        <Chip
                          label={formatParamName(paramName)}
                          color={selectedEnsembleParams.includes(paramName) ? "primary" : "default"}
                          variant={selectedEnsembleParams.includes(paramName) ? "filled" : "outlined"}
                          onClick={() => {
                            if (selectedEnsembleParams.includes(paramName)) {
                              removeParameterFromEnsemble(paramName);
                            } else {
                              addParameterToEnsemble(paramName);
                            }
                          }}
                          disabled={isSimulationRunning}
                          sx={{ m: 0.5 }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                
                {/* Parameter Range Configuration */}
                {selectedEnsembleParams.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Parameter Ranges:
                    </Typography>
                    
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      {ensembleConfig.map((config, index) => (
                        <Box key={config.paramName} sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            {formatParamName(config.paramName)}
                          </Typography>
                          
                          <Grid container spacing={2} alignItems="center">
                            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 3' } }}>
                              <TextField
                                fullWidth
                                label="Min"
                                type="number"
                                id={`ensemble-param-min-${config.paramName}`}
                                name={`ensemble-param-min-${config.paramName}`}
                                value={config.min}
                                onChange={(e) => updateEnsembleParam(index, 'min', parseFloat(e.target.value))}
                                size="small"
                                disabled={isSimulationRunning}
                                InputProps={{ inputProps: { step: 0.1 } }}
                              />
                            </Grid>
                            
                            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 3' } }}>
                              <TextField
                                fullWidth
                                label="Max"
                                type="number"
                                id={`ensemble-param-max-${config.paramName}`}
                                name={`ensemble-param-max-${config.paramName}`}
                                value={config.max}
                                onChange={(e) => updateEnsembleParam(index, 'max', parseFloat(e.target.value))}
                                size="small"
                                disabled={isSimulationRunning}
                                InputProps={{ inputProps: { step: 0.1 } }}
                              />
                            </Grid>
                            
                            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 3' } }}>
                              <TextField
                                fullWidth
                                label="Steps"
                                type="number"
                                id={`ensemble-param-steps-${config.paramName}`}
                                name={`ensemble-param-steps-${config.paramName}`}
                                value={config.steps}
                                onChange={(e) => updateEnsembleParam(index, 'steps', parseInt(e.target.value, 10))}
                                size="small"
                                disabled={isSimulationRunning}
                                InputProps={{ inputProps: { min: 1, max: 20, step: 1 } }}
                              />
                            </Grid>
                            
                            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 3' } }}>
                              <Box display="flex" alignItems="center">
                                <IconButton 
                                  color="error" 
                                  onClick={() => removeParameterFromEnsemble(config.paramName)}
                                  disabled={isSimulationRunning}
                                >
                                  <Remove />
                                </IconButton>
                                <Typography variant="body2" color="textSecondary">
                                  {config.steps + 1} values
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Paper>
                    
                    {/* Ensemble Summary */}
                    <Alert 
                      severity={totalEnsembleRuns > 50 ? "warning" : "info"}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="body2">
                        {totalEnsembleRuns > 1 ? (
                          <>
                            <strong>Total Simulations:</strong> {totalEnsembleRuns}
                            {totalEnsembleRuns > 50 && " (Large ensembles may take significant time to process)"}
                          </>
                        ) : (
                          "Configure at least one parameter with multiple steps to create an ensemble."
                        )}
                      </Typography>
                    </Alert>
                  </>
                )}
                
                {selectedEnsembleParams.length === 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Select at least one parameter to include in the ensemble run.
                  </Alert>
                )}
              </>
            )}
          </AccordionDetails>
        </Accordion>
        
        {/* Simulation Snapshot System */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography>
                <History fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Simulation Snapshot System
              </Typography>
              <AdvancedControlHelpButton controlType="snapshot" size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Save simulation states to restore them later or share with others
              </Typography>
              
              {/* Snapshot Actions */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                  <ButtonGroup variant="outlined" fullWidth>
                    <Button 
                      startIcon={<Camera />}
                      onClick={() => setShowSnapshotDialog(true)}
                      disabled={isSimulationRunning}
                    >
                      Create Snapshot
                    </Button>
                    
                    <Tooltip title="Import Snapshot">
                      <Button component="label">
                        <Upload />
                        <input
                          type="file"
                          accept=".json"
                          hidden
                          id="import-snapshot-file"
                          name="import-snapshot-file"
                          aria-label="Import Snapshot File"
                          onChange={handleImportFile}
                          disabled={isSimulationRunning}
                        />
                      </Button>
                    </Tooltip>
                  </ButtonGroup>
                </Grid>
              </Grid>
              
              {/* Snapshots List */}
              {snapshots.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[...snapshots]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((snapshot) => (
                          <TableRow key={snapshot.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {snapshot.name}
                              </Typography>
                              {snapshot.notes && (
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                  {snapshot.notes.length > 30 
                                    ? `${snapshot.notes.substring(0, 30)}...` 
                                    : snapshot.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatTimestamp(snapshot.timestamp)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Restore">
                                <IconButton 
                                  size="small"
                                  onClick={() => {
                                    setSelectedSnapshot(snapshot);
                                    setShowRestoreDialog(true);
                                  }}
                                  disabled={isSimulationRunning}
                                >
                                  <Restore fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="More Options">
                                <IconButton 
                                  size="small"
                                  onClick={(e) => handleSnapshotMenuOpen(e, snapshot.id)}
                                >
                                  <MoreVert fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No snapshots saved yet. Create a snapshot to save the current simulation configuration.
                </Alert>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
        
        {/* Control Buttons */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={ensembleMode ? <BatchPrediction /> : <PlayArrow />}
            onClick={startSimulation}
            disabled={isSimulationRunning || isLoading}
            sx={{ mr: 1 }}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              ensembleMode ? `Run Ensemble (${totalEnsembleRuns})` : 'Start Simulation'
            )}
          </Button>
          
          <Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Stop />}
              onClick={stopSimulation}
              disabled={!isSimulationRunning}
              sx={{ mr: 1 }}
            >
              Stop
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={resetSimulation}
              disabled={isSimulationRunning}
            >
              Reset
            </Button>
          </Box>
        </Box>
        
        {/* Simulation Status */}
        {simulationId && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Simulation ID: {simulationId}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Status: {isSimulationRunning ? 'Running' : 'Stopped'}
            </Typography>
          </Box>
        )}
      </CardContent>
      
      {/* Create Snapshot Dialog */}
      <Dialog 
        open={showSnapshotDialog} 
        onClose={() => setShowSnapshotDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Simulation Snapshot</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Save the current simulation configuration for later use.
          </DialogContentText>
          
          <TextField
            autoFocus
            margin="dense"
            id="snapshot-name-field"
            name="snapshot-name"
            label="Snapshot Name"
            fullWidth
            variant="outlined"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="snapshot-notes-field"
            name="snapshot-notes"
            label="Notes (Optional)"
            fullWidth
            variant="outlined"
            value={snapshotNotes}
            onChange={(e) => setSnapshotNotes(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSnapshotDialog(false)}>Cancel</Button>
          <Button onClick={createSnapshot} variant="contained" startIcon={<Camera />}>
            Create Snapshot
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog
        open={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
      >
        <DialogTitle>Restore Simulation State</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to restore the simulation state from snapshot:
            <strong>{selectedSnapshot?.name}</strong>?
            This will replace your current configuration.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
          <Button onClick={restoreSnapshot} variant="contained" color="primary">
            Restore
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snapshot Options Menu */}
      <Menu
        anchorEl={snapshotMenuAnchorEl}
        open={Boolean(snapshotMenuAnchorEl)}
        onClose={handleSnapshotMenuClose}
      >
        <MenuItem 
          onClick={() => {
            const snapshot = snapshots.find(s => s.id === activeSnapshotId);
            if (snapshot) {
              exportSnapshot(snapshot);
            }
          }}
          id="export-snapshot-menu-item"
        >
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        
        <MenuItem
          onClick={() => {
            deleteSnapshot(activeSnapshotId!);
          }}
          id="delete-snapshot-menu-item"
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete" primaryTypographyProps={{ color: 'error' }} />
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default SimulationControlPanel; 