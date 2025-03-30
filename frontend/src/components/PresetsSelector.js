import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Grid,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  Collapse,
  ButtonGroup
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { styled } from '@mui/material/styles';
import { parameterPresets, getPresetById } from '../data/parameterPresets';

// Custom styled components
const PresetPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

const PresetDescription = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(2),
  fontSize: '0.9rem',
  color: theme.palette.text.secondary,
}));

const ReferenceText = styled(Typography)(({ theme }) => ({
  fontSize: '0.8rem',
  fontStyle: 'italic',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
}));

const CategoryChip = styled(Chip)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

// Hidden file input for importing configs
const HiddenInput = styled('input')({
  display: 'none',
});

/**
 * PresetsSelector Component
 * 
 * Allows users to select from predefined parameter presets or save/manage custom presets
 */
const PresetsSelector = ({ onPresetSelect, currentParameters }) => {
  const [selectedPresetId, setSelectedPresetId] = useState('pd-d-custom');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [localPresets, setLocalPresets] = useState(() => {
    // Load custom presets from localStorage
    const savedPresets = localStorage.getItem('lenr-custom-presets');
    return savedPresets ? JSON.parse(savedPresets) : [];
  });
  const [showDetails, setShowDetails] = useState(false);
  const [importError, setImportError] = useState('');

  // Combine built-in presets with local custom presets
  const allPresets = [...parameterPresets, ...localPresets];

  // Handle preset selection change
  const handlePresetChange = (event) => {
    const presetId = event.target.value;
    setSelectedPresetId(presetId);
    
    // Find the selected preset
    const selectedPreset = allPresets.find(preset => preset.id === presetId);
    if (selectedPreset) {
      onPresetSelect(selectedPreset.parameters);
    }
  };

  // Handle saving a new custom preset
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    
    // Create a new preset with the current parameters
    const newPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      description: newPresetDescription || 'Custom parameter preset',
      parameters: { ...currentParameters },
      category: 'custom',
      reference: 'User defined',
      isCustom: true
    };
    
    // Add to local presets and save to localStorage
    const updatedPresets = [...localPresets, newPreset];
    setLocalPresets(updatedPresets);
    localStorage.setItem('lenr-custom-presets', JSON.stringify(updatedPresets));
    
    // Close dialog and reset fields
    setSaveDialogOpen(false);
    setNewPresetName('');
    setNewPresetDescription('');
    
    // Select the new preset
    setSelectedPresetId(newPreset.id);
    onPresetSelect(newPreset.parameters);
  };

  // Handle deleting a custom preset
  const handleDeletePreset = (presetId) => {
    const updatedPresets = localPresets.filter(preset => preset.id !== presetId);
    setLocalPresets(updatedPresets);
    localStorage.setItem('lenr-custom-presets', JSON.stringify(updatedPresets));
    
    // If the deleted preset was selected, switch to the default
    if (selectedPresetId === presetId) {
      setSelectedPresetId('pd-d-custom');
      const defaultPreset = getPresetById('pd-d-custom');
      onPresetSelect(defaultPreset.parameters);
    }
  };

  // Export all custom presets to a JSON file
  const handleExportPresets = () => {
    if (localPresets.length === 0) {
      alert('No custom presets to export');
      return;
    }
    
    // Create a configuration object with metadata
    const configToExport = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      presets: localPresets
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(configToExport, null, 2);
    
    // Create a Blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and click it to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `lenr-presets-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import custom presets from a JSON file
  const handleImportPresets = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target.result);
        
        // Basic validation
        if (!importedConfig.presets || !Array.isArray(importedConfig.presets)) {
          setImportError('Invalid configuration format');
          return;
        }
        
        // Process imported presets
        const importedPresets = importedConfig.presets.map(preset => ({
          ...preset,
          id: `imported-${Date.now()}-${preset.id}`, // Ensure unique IDs
          isCustom: true,
          importDate: new Date().toISOString()
        }));
        
        // Merge with existing presets
        const mergedPresets = [...localPresets, ...importedPresets];
        setLocalPresets(mergedPresets);
        localStorage.setItem('lenr-custom-presets', JSON.stringify(mergedPresets));
        
        alert(`Successfully imported ${importedPresets.length} presets`);
      } catch (error) {
        console.error('Error importing presets:', error);
        setImportError('Error importing configuration file. Check file format.');
      }
    };
    
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = null;
  };

  // Get currently selected preset
  const selectedPreset = allPresets.find(preset => preset.id === selectedPresetId) || allPresets[6];

  return (
    <PresetPaper>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" component="h2">
          Parameter Presets
        </Typography>
        <Tooltip title={showDetails ? "Hide details" : "Show details"}>
          <IconButton 
            size="small" 
            onClick={() => setShowDetails(!showDetails)}
            aria-label={showDetails ? "hide details" : "show details"}
          >
            {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="preset-select-label">Select Preset</InputLabel>
        <Select
          labelId="preset-select-label"
          id="preset-select"
          value={selectedPresetId}
          label="Select Preset"
          onChange={handlePresetChange}
        >
          <MenuItem value="header-builtin" disabled>
            <Typography variant="subtitle2">Built-in Presets</Typography>
          </MenuItem>
          
          {parameterPresets.map((preset) => (
            <MenuItem key={preset.id} value={preset.id}>
              {preset.name}
            </MenuItem>
          ))}
          
          {localPresets.length > 0 && (
            <MenuItem value="header-custom" disabled>
              <Divider />
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Custom Presets
              </Typography>
            </MenuItem>
          )}
          
          {localPresets.map((preset) => (
            <MenuItem key={preset.id} value={preset.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>{preset.name}</Typography>
              {preset.isCustom && (
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePreset(preset.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Collapse in={showDetails}>
        <PresetDescription>
          {selectedPreset.description}
        </PresetDescription>
        
        <Box display="flex" flexWrap="wrap">
          <CategoryChip
            label={selectedPreset.category}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        
        <ReferenceText>
          Reference: {selectedPreset.reference}
        </ReferenceText>
      </Collapse>
      
      <Box display="flex" justifyContent="space-between" mt={2}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={() => setSaveDialogOpen(true)}
          size="small"
        >
          Save Current
        </Button>
        
        <ButtonGroup size="small" aria-label="configuration actions">
          <Tooltip title="Import presets from file">
            <label htmlFor="preset-file-input">
              <HiddenInput
                id="preset-file-input"
                type="file"
                accept=".json"
                onChange={handleImportPresets}
              />
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                size="small"
              >
                Import
              </Button>
            </label>
          </Tooltip>
          
          <Tooltip title="Export presets to file">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPresets}
              size="small"
              disabled={localPresets.length === 0}
            >
              Export
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Box>
      
      {importError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {importError}
        </Typography>
      )}
      
      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Parameter Preset</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save your current parameters as a custom preset for future use.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="preset-name"
            label="Preset Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            id="preset-description"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={newPresetDescription}
            onChange={(e) => setNewPresetDescription(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} variant="contained" color="primary">
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </PresetPaper>
  );
};

export default PresetsSelector; 