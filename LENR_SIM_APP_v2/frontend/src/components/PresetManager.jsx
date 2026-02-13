/**
 * PresetManager.jsx
 * 
 * UI component for managing simulation presets.
 * Allows users to save, load, import/export, and browse presets.
 * 
 * v0.2.2-beta: Initial implementation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Chip,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  Info as InfoIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

// API base URL
const API_BASE = `${API_BASE_URL}/api`;

/**
 * Format parameter value for display
 */
function formatValue(value) {
  if (typeof value === 'number') {
    if (Math.abs(value) < 0.001 || Math.abs(value) > 10000) {
      return value.toExponential(2);
    }
    return value.toFixed(3);
  }
  return String(value);
}

/**
 * PresetCard - Displays a single preset in the list
 */
function PresetCard({ preset, onSelect, onDuplicate, onDelete, onExport, isSelected }) {
  return (
    <Paper
      elevation={isSelected ? 4 : 1}
      sx={{
        p: 2,
        mb: 1,
        cursor: 'pointer',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': {
          borderColor: 'primary.light',
          backgroundColor: 'action.hover',
        },
      }}
      onClick={() => onSelect(preset)}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              {preset.name}
            </Typography>
            {preset.is_builtin && (
              <Chip
                icon={<StarIcon fontSize="small" />}
                label="Built-in"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {preset.description || 'No description'}
          </Typography>
          <Box display="flex" gap={1} mt={1}>
            <Chip
              label={preset.host_material}
              size="small"
              icon={<ScienceIcon fontSize="small" />}
            />
            <Chip
              label={`Loading: ${(preset.loading_ratio * 100).toFixed(0)}%`}
              size="small"
            />
            <Chip
              label={`${(preset.frequency / 1000).toFixed(0)} kHz`}
              size="small"
            />
          </Box>
        </Box>
        <Box display="flex" gap={0.5}>
          <Tooltip title="Duplicate">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(preset);
              }}
            >
              <DuplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onExport(preset);
              }}
            >
              <ExportIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!preset.is_builtin && (
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(preset);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

/**
 * SavePresetDialog - Dialog for saving current configuration as preset
 */
function SavePresetDialog({ open, onClose, onSave, currentParams }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        ...currentParams,
      });
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to save preset:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Current Configuration as Preset</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Preset Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Current parameters will be saved with this preset.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim() || saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save Preset
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * ImportDialog - Dialog for importing preset from JSON
 */
function ImportDialog({ open, onClose, onImport }) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setError(null);
    setImporting(true);
    
    try {
      const presetData = JSON.parse(jsonText);
      await onImport(presetData);
      setJsonText('');
      onClose();
    } catch (e) {
      setError(e.message || 'Invalid JSON');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setJsonText(e.target.result);
        setError(null);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Preset</DialogTitle>
      <DialogContent>
        <Button
          variant="outlined"
          component="label"
          startIcon={<ImportIcon />}
          sx={{ mb: 2 }}
        >
          Upload JSON File
          <input
            type="file"
            hidden
            accept=".json"
            onChange={handleFileUpload}
          />
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Or paste JSON below:
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={10}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder="Paste preset JSON here..."
          variant="outlined"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!jsonText.trim() || importing}
          startIcon={importing ? <CircularProgress size={20} /> : <ImportIcon />}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * PresetManager - Main component
 */
function PresetManager({ 
  currentParams = {}, 
  onLoadPreset, 
  compact = false,
  showTitle = true 
}) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Fetch presets
  const fetchPresets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/presets/?page_size=100`);
      if (!response.ok) throw new Error('Failed to fetch presets');
      
      const data = await response.json();
      setPresets(data.presets);
    } catch (err) {
      console.error('Failed to load presets:', err);
      setError('Failed to load presets');
      // Use fallback presets
      setPresets([
        {
          id: 'local-default',
          name: 'Default',
          description: 'Default simulation parameters',
          is_builtin: true,
          host_material: 'palladium',
          loading_ratio: 0.9,
          frequency: 20000,
          temperature: 300,
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Save new preset
  const handleSavePreset = async (presetData) => {
    const response = await fetch(`${API_BASE}/presets/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presetData),
    });
    
    if (!response.ok) throw new Error('Failed to save preset');
    
    await fetchPresets();
  };

  // Duplicate preset
  const handleDuplicate = async (preset) => {
    try {
      const response = await fetch(
        `${API_BASE}/presets/${preset.id}/duplicate`,
        { method: 'POST' }
      );
      
      if (!response.ok) throw new Error('Failed to duplicate');
      
      await fetchPresets();
    } catch (err) {
      console.error('Failed to duplicate preset:', err);
    }
  };

  // Delete preset
  const handleDelete = async (preset) => {
    if (!window.confirm(`Delete preset "${preset.name}"?`)) return;
    
    try {
      const response = await fetch(`${API_BASE}/presets/${preset.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      if (selectedPreset?.id === preset.id) {
        setSelectedPreset(null);
      }
      await fetchPresets();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  // Export preset
  const handleExport = async (preset) => {
    try {
      const response = await fetch(`${API_BASE}/presets/${preset.id}/export`);
      if (!response.ok) throw new Error('Failed to export');
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preset.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export preset:', err);
    }
  };

  // Import preset
  const handleImport = async (presetData) => {
    const response = await fetch(`${API_BASE}/presets/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presetData),
    });
    
    if (!response.ok) throw new Error('Failed to import preset');
    
    await fetchPresets();
  };

  // Load preset
  const handleLoadPreset = (preset) => {
    setSelectedPreset(preset);
    if (onLoadPreset) {
      onLoadPreset(preset);
    }
  };

  // Compact mode rendering
  if (compact) {
    return (
      <Box>
        <FormControl size="small" fullWidth>
          <InputLabel>Preset</InputLabel>
          <Select
            value={selectedPreset?.id || ''}
            label="Preset"
            onChange={(e) => {
              const preset = presets.find(p => p.id === e.target.value);
              if (preset) handleLoadPreset(preset);
            }}
          >
            {presets.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.name}
                {preset.is_builtin && ' ⭐'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box display="flex" gap={1} mt={1}>
          <Button
            size="small"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
          >
            Save
          </Button>
          <Button
            size="small"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import
          </Button>
        </Box>
        
        <SavePresetDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          onSave={handleSavePreset}
          currentParams={currentParams}
        />
        <ImportDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onImport={handleImport}
        />
      </Box>
    );
  }

  // Full mode rendering
  return (
    <Paper sx={{ p: 2 }}>
      {showTitle && (
        <Typography variant="h6" gutterBottom>
          Simulation Presets
        </Typography>
      )}
      
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Action buttons */}
      <Box display="flex" gap={1} mb={2}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => setSaveDialogOpen(true)}
        >
          Save Current
        </Button>
        <Button
          variant="outlined"
          startIcon={<ImportIcon />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Preset list */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={selectedPreset?.id === preset.id}
              onSelect={handleLoadPreset}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onExport={handleExport}
            />
          ))}
        </Box>
      )}
      
      {/* Selected preset details */}
      {selectedPreset && (
        <Accordion
          expanded={detailsExpanded}
          onChange={() => setDetailsExpanded(!detailsExpanded)}
          sx={{ mt: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Details: {selectedPreset.name}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Host Material</Typography>
                <Typography>{selectedPreset.host_material}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Loading Ratio</Typography>
                <Typography>{(selectedPreset.loading_ratio * 100).toFixed(0)}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Temperature</Typography>
                <Typography>{selectedPreset.temperature} K</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Frequency</Typography>
                <Typography>{(selectedPreset.frequency / 1000).toFixed(1)} kHz</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Bubble Radius</Typography>
                <Typography>{formatValue(selectedPreset.initial_bubble_radius)} m</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Electric Field</Typography>
                <Typography>{formatValue(selectedPreset.electric_field)} V/m</Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
      
      {/* Dialogs */}
      <SavePresetDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSavePreset}
        currentParams={currentParams}
      />
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImport}
      />
    </Paper>
  );
}

export default PresetManager;
