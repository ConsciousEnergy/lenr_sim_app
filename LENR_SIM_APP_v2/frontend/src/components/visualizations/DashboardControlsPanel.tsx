import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  TextField,
  Button,
  Chip,
  Stack,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  SelectChangeEvent,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import LoadIcon from '@mui/icons-material/FolderOpen';
import { useSimulationStatus } from '../../api/physics/hooks';

interface FilterSettings {
  status: string[];
  energyRange: [number, number];
  temperatureRange: [number, number];
  reactionRate: [number, number];
  showRealTimeUpdates: boolean;
  searchTerm: string;
  visualizationType: 'energy' | 'temperature' | 'reaction_rate';
  autoRefresh: boolean;
  refreshInterval: number;
}

interface DashboardControlsPanelProps {
  simulationId: string | null;
  title?: string;
  onFilterChange?: (_filters: FilterSettings) => void;
  onVisualizationTypeChange?: (_type: 'energy' | 'temperature' | 'reaction_rate') => void;
  onRefresh?: () => void;
  height?: number | string;
  width?: number | string;
}

/**
 * Dashboard Controls Panel Component
 * 
 * Provides controls for filtering and customizing the physics simulation dashboard.
 * Allows users to filter by date, status, energy range, and more.
 */

// Static default filter settings (outside component to avoid recreation on every render)
const DEFAULT_FILTERS: FilterSettings = {
  status: ['running', 'completed'],
  energyRange: [0, 100],
  temperatureRange: [0, 1000],
  reactionRate: [0, 1],
  showRealTimeUpdates: true,
  searchTerm: '',
  visualizationType: 'energy',
  autoRefresh: true,
  refreshInterval: 5
};

const DashboardControlsPanel: React.FC<DashboardControlsPanelProps> = ({
  simulationId,
  title = "Dashboard Controls",
  onFilterChange,
  onVisualizationTypeChange,
  onRefresh,
  height = 'auto',
  width = '100%'
}) => {
  // Fetch simulation status to show current data
  const { status: _status, isLoading } = useSimulationStatus(simulationId);
  
  // Filter state
  const [filters, setFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    dataRange: true,
    visualOptions: true
  });
  
  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof FilterSettings, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Call the callback if provided
      if (onFilterChange) {
        onFilterChange(newFilters);
      }
      
      return newFilters;
    });
  }, [onFilterChange]);
  
  // Reset filters to default
  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    
    if (onFilterChange) {
      onFilterChange(DEFAULT_FILTERS);
    }
  }, [onFilterChange]);
  
  // Handle visualization type change
  const handleVisualizationTypeChange = useCallback((event: SelectChangeEvent) => {
    const newType = event.target.value as 'energy' | 'temperature' | 'reaction_rate';
    
    handleFilterChange('visualizationType', newType);
    
    // Call the callback if provided
    if (onVisualizationTypeChange) {
      onVisualizationTypeChange(newType);
    }
  }, [handleFilterChange, onVisualizationTypeChange]);
  
  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    handleFilterChange('status', newStatus);
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Set up auto-refresh effect
  useEffect(() => {
    if (!filters.autoRefresh || filters.refreshInterval <= 0 || !onRefresh) return;
    
    const interval = setInterval(() => {
      onRefresh();
    }, filters.refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [filters.autoRefresh, filters.refreshInterval, onRefresh]);
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        width,
        height,
        overflow: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh Data">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset Filters">
            <IconButton
              size="small"
              onClick={handleResetFilters}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Simulation ID Display */}
      {simulationId && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Simulation ID:</Typography>
          <Chip 
            label={simulationId} 
            size="small" 
            variant="outlined"
          />
        </Box>
      )}
      
      {/* Status Filters */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Status Filter
        </Typography>
        
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {['running', 'completed', 'failed', 'paused', 'queued'].map(statusOption => (
            <Chip
              key={statusOption}
              label={statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
              color={filters.status.includes(statusOption) ? 'primary' : 'default'}
              variant={filters.status.includes(statusOption) ? 'filled' : 'outlined'}
              onClick={() => toggleStatusFilter(statusOption)}
              size="small"
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </Box>
      
      {/* Search Term */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Search
        </Typography>
        
        <TextField
          size="small"
          fullWidth
          placeholder="Search term..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          InputProps={{
            endAdornment: filters.searchTerm ? (
              <IconButton
                size="small"
                onClick={() => handleFilterChange('searchTerm', '')}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : undefined
          }}
        />
      </Box>
      
      {/* Data Range Controls Section */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            mb: 1
          }}
          onClick={() => toggleSection('dataRange')}
        >
          <Typography variant="subtitle1">
            Data Range Filters
          </Typography>
          <FilterListIcon fontSize="small" />
        </Box>
        
        {expandedSections.dataRange && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Energy Range Slider */}
              <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <Typography variant="body2" gutterBottom>
                  Energy Range (eV)
                </Typography>
                <Slider
                  getAriaLabel={() => 'Energy range'}
                  value={filters.energyRange}
                  onChange={(_, newValue) => handleFilterChange('energyRange', newValue as [number, number])}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{filters.energyRange[0]} eV</Typography>
                  <Typography variant="caption">{filters.energyRange[1]} eV</Typography>
                </Box>
              </Grid>
              
              {/* Temperature Range Slider */}
              <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <Typography variant="body2" gutterBottom>
                  Temperature Range (K)
                </Typography>
                <Slider
                  getAriaLabel={() => 'Temperature range'}
                  value={filters.temperatureRange}
                  onChange={(_, newValue) => handleFilterChange('temperatureRange', newValue as [number, number])}
                  valueLabelDisplay="auto"
                  min={0}
                  max={1000}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{filters.temperatureRange[0]} K</Typography>
                  <Typography variant="caption">{filters.temperatureRange[1]} K</Typography>
                </Box>
              </Grid>
              
              {/* Reaction Rate Slider */}
              <Grid sx={{ gridColumn: { xs: 'span 12' } }}>
                <Typography variant="body2" gutterBottom>
                  Reaction Rate
                </Typography>
                <Slider
                  getAriaLabel={() => 'Reaction rate'}
                  value={filters.reactionRate}
                  onChange={(_, newValue) => handleFilterChange('reactionRate', newValue as [number, number])}
                  valueLabelDisplay="auto"
                  min={0}
                  max={1}
                  step={0.01}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{filters.reactionRate[0].toFixed(2)}</Typography>
                  <Typography variant="caption">{filters.reactionRate[1].toFixed(2)}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
      
      {/* Visualization Options Section */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            mb: 1
          }}
          onClick={() => toggleSection('visualOptions')}
        >
          <Typography variant="subtitle1">
            Visualization Options
          </Typography>
          <FilterListIcon fontSize="small" />
        </Box>
        
        {expandedSections.visualOptions && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Visualization Type Selector */}
              <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="visualization-type-label">Visualization Type</InputLabel>
                  <Select
                    labelId="visualization-type-label"
                    id="visualization-type"
                    value={filters.visualizationType}
                    label="Visualization Type"
                    onChange={handleVisualizationTypeChange}
                  >
                    <MenuItem value="energy">Energy</MenuItem>
                    <MenuItem value="temperature">Temperature</MenuItem>
                    <MenuItem value="reaction_rate">Reaction Rate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Auto-refresh Toggle */}
              <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.autoRefresh}
                      onChange={(e) => handleFilterChange('autoRefresh', e.target.checked)}
                    />
                  }
                  label="Auto-refresh"
                />
                
                {filters.autoRefresh && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      Refresh Interval (seconds)
                    </Typography>
                    <Slider
                      value={filters.refreshInterval}
                      onChange={(_, newValue) => handleFilterChange('refreshInterval', newValue as number)}
                      aria-labelledby="refresh-interval-slider"
                      valueLabelDisplay="auto"
                      step={1}
                      marks
                      min={1}
                      max={30}
                    />
                  </Box>
                )}
              </Grid>
              
              {/* Real-time Updates Toggle */}
              <Grid sx={{ gridColumn: { xs: 'span 12' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.showRealTimeUpdates}
                      onChange={(e) => handleFilterChange('showRealTimeUpdates', e.target.checked)}
                    />
                  }
                  label="Show Real-time Updates"
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SaveIcon />}
        >
          Save Config
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          startIcon={<LoadIcon />}
        >
          Load Config
        </Button>
      </Box>
    </Paper>
  );
};

export default DashboardControlsPanel; 