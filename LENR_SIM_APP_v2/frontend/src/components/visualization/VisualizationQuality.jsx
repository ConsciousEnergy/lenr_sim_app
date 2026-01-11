import React, { useState } from 'react';
import { 
  Typography, 
  Slider, 
  Box, 
  FormControlLabel, 
  Switch, 
  Grid,
  Divider,
  Paper,
  Tooltip,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Component for controlling visualization quality settings with improved spacing
 * to prevent text overlap on smaller screens
 * 
 * @param {Object} props
 * @param {number} props.quality - Current quality level (0-100)
 * @param {Function} props.onQualityChange - Callback when quality changes
 * @param {boolean} props.showAdvanced - Whether advanced options are shown
 * @param {Function} props.onShowAdvancedChange - Callback when showAdvanced changes
 */
const VisualizationQuality = ({ 
  quality = 75, 
  onQualityChange = () => {},
  showAdvanced = false,
  onShowAdvancedChange = () => {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Convert 0-100 to quality labels
  const getQualityLabel = (value) => {
    if (value < 25) return 'Low';
    if (value < 50) return 'Medium';
    if (value < 75) return 'High';
    return 'Ultra';
  };

  // Convert quality to UI settings
  const getSettingsFromQuality = (value) => {
    return {
      particleCount: Math.round(1000 + (value/100) * 9000),
      antiAliasing: value >= 50,
      shadows: value >= 75,
      reflections: value >= 90,
      postProcessing: value >= 60,
      textureQuality: value < 25 ? 'low' : value < 75 ? 'medium' : 'high'
    };
  };

  // Calculate settings based on current quality
  const settings = getSettingsFromQuality(quality);

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        padding: theme.spacing(2), 
        mt: 2, 
        mb: 3, 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
      role="form"
      aria-label="Visualization quality settings"
      id="visualization-quality-form"
    >
      {/* Title and info icon with responsive layout */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 2
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 500,
            whiteSpace: 'normal',
            overflow: 'visible',
            marginRight: isMobile ? 0 : 2
          }}
          id="visualization-quality-title"
        >
          Visualization Quality
        </Typography>
        <Box sx={{ mt: isMobile ? 1 : 0 }}>
          <Tooltip title="Adjust quality settings to balance visual fidelity and performance">
            <IconButton 
              size="small"
              aria-label="Visualization quality information"
              id="visualization-quality-info-button"
              name="visualization-quality-info-button"
            >
              <InfoIcon fontSize="small" aria-hidden="true" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Slider with label */}
      <Box sx={{ mb: 3, px: 1, width: '100%' }}>
        <Typography 
          id="visualization-quality-slider-label" 
          variant="body2"
          sx={{ mb: 1 }}
        >
          Quality Level
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <Slider
              value={quality}
              onChange={(_, newValue) => onQualityChange(newValue)}
              aria-labelledby="visualization-quality-slider-label"
              id="visualization-quality-slider"
              name="visualization-quality-slider"
              valueLabelDisplay="auto"
              valueLabelFormat={getQualityLabel}
              step={5}
              marks={[
                { value: 0, label: 'Low' },
                { value: 50, label: 'Medium' },
                { value: 100, label: 'Ultra' }
              ]}
            />
          </Grid>
          <Grid item>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                minWidth: '60px', 
                textAlign: 'center',
                fontWeight: 'medium'
              }}
              id="visualization-quality-value"
              aria-live="polite"
            >
              {getQualityLabel(quality)}
            </Typography>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Advanced settings toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch 
              checked={showAdvanced} 
              onChange={(e) => onShowAdvancedChange(e.target.checked)} 
              size="small"
              id="advanced-settings-toggle"
              name="advanced-settings-toggle"
            />
          }
          label={
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              Advanced Settings
              <SettingsIcon fontSize="small" sx={{ ml: 0.5, fontSize: '1rem' }} aria-hidden="true" />
            </Typography>
          }
          id="advanced-settings-control"
          htmlFor="advanced-settings-toggle"
        />
      </Box>
      
      {/* Advanced settings panel */}
      {showAdvanced && (
        <Box 
          sx={{ mt: 2, px: 1 }}
          aria-labelledby="advanced-settings-heading"
          role="region"
          id="advanced-settings-panel"
        >
          <Typography 
            variant="body2" 
            sx={{ mb: 1, fontWeight: 'medium' }}
            id="advanced-settings-heading"
          >
            Current Settings:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary" id="label-particle-count">
                Particle Count:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2" 
                sx={{ fontWeight: 'medium' }}
                aria-labelledby="label-particle-count"
                id="value-particle-count"
              >
                {settings.particleCount.toLocaleString()}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary" id="label-anti-aliasing">
                Anti-Aliasing:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2" 
                sx={{ fontWeight: 'medium' }}
                aria-labelledby="label-anti-aliasing"
                id="value-anti-aliasing"
              >
                {settings.antiAliasing ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary" id="label-shadows">
                Shadows:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2" 
                sx={{ fontWeight: 'medium' }}
                aria-labelledby="label-shadows"
                id="value-shadows"
              >
                {settings.shadows ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary" id="label-reflections">
                Reflections:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2" 
                sx={{ fontWeight: 'medium' }}
                aria-labelledby="label-reflections"
                id="value-reflections"
              >
                {settings.reflections ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary" id="label-post-processing">
                Post-Processing:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2" 
                sx={{ fontWeight: 'medium' }}
                aria-labelledby="label-post-processing"
                id="value-post-processing"
              >
                {settings.postProcessing ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary" id="label-texture-quality">
                Texture Quality:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2" 
                sx={{ 
                  textTransform: 'capitalize',
                  fontWeight: 'medium'
                }}
                aria-labelledby="label-texture-quality"
                id="value-texture-quality"
              >
                {settings.textureQuality}
              </Typography>
            </Grid>
          </Grid>
          
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ display: 'block', mt: 2, fontStyle: 'italic' }}
            id="performance-note"
          >
            Higher quality settings may impact performance on slower devices
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default VisualizationQuality; 