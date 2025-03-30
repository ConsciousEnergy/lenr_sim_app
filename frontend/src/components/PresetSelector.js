import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActionArea, 
  Grid, 
  Divider, 
  Chip
} from '@mui/material';

/**
 * LENR/CMNS parameter presets for various experimental configurations
 */
const presets = [
  {
    id: 'pd-d-room-temp',
    name: 'Pd-D (Room Temperature)',
    description: 'Classic Fleischmann-Pons configuration at room temperature',
    parameters: {
      T: 293,
      lambda: 1.2e-10,
      r0: 1.5e-10,
      k_spring: 12000,
      potential: 'harmonic',
      nTimeSteps: 1000,
      impactT: 0,
      impactDuration: 0
    },
    category: 'electrochemical'
  },
  {
    id: 'pd-d-high-temp',
    name: 'Pd-D (Elevated Temperature)',
    description: 'Palladium-deuterium system at elevated temperature',
    parameters: {
      T: 350,
      lambda: 1.5e-10,
      r0: 1.4e-10,
      k_spring: 11500,
      potential: 'morse',
      nTimeSteps: 1000,
      impactT: 0,
      impactDuration: 0
    },
    category: 'electrochemical'
  },
  {
    id: 'ni-h-high-temp',
    name: 'Ni-H (E-Cat Type)',
    description: 'Nickel-hydrogen system similar to Rossi E-Cat',
    parameters: {
      T: 600,
      lambda: 1.8e-10,
      r0: 1.6e-10,
      k_spring: 10000,
      potential: 'morse',
      nTimeSteps: 1000,
      impactT: 0,
      impactDuration: 0
    },
    category: 'gas-loading'
  },
  {
    id: 'ti-d-fracture',
    name: 'Ti-D (Fracture-Induced)',
    description: 'Titanium-deuterium with fracture-induced effects',
    parameters: {
      T: 300,
      lambda: 2.0e-10,
      r0: 1.8e-10,
      k_spring: 9000,
      potential: 'harmonic',
      nTimeSteps: 1000,
      impactT: 400,
      impactDuration: 0.1
    },
    category: 'mechanical'
  },
  {
    id: 'pd-d-ultrasonic',
    name: 'Pd-D (Ultrasonic)',
    description: 'Palladium-deuterium with ultrasonic stimulation',
    parameters: {
      T: 320,
      lambda: 1.6e-10,
      r0: 1.4e-10,
      k_spring: 11000,
      potential: 'harmonic',
      nTimeSteps: 1000,
      impactT: 350,
      impactDuration: 0.01
    },
    category: 'acoustic'
  },
  {
    id: 'zr-d-gas',
    name: 'Zr-D (Gas Loading)',
    description: 'Zirconium-deuterium gas loading system',
    parameters: {
      T: 450,
      lambda: 1.7e-10,
      r0: 1.9e-10,
      k_spring: 9500,
      potential: 'morse',
      nTimeSteps: 1000,
      impactT: 0,
      impactDuration: 0
    },
    category: 'gas-loading'
  }
];

/**
 * PresetSelector Component
 * 
 * Displays a grid of preset parameter configurations for different LENR/CMNS experiments
 */
const PresetSelector = ({ onPresetSelect }) => {
  const handleSelectPreset = (preset) => {
    onPresetSelect(preset.parameters);
  };
  
  // Group presets by category
  const groupedPresets = presets.reduce((groups, preset) => {
    const category = preset.category || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(preset);
    return groups;
  }, {});
  
  // Category display names
  const categoryNames = {
    'electrochemical': 'Electrochemical Systems',
    'gas-loading': 'Gas Loading Systems',
    'mechanical': 'Mechanical Stimulation',
    'acoustic': 'Acoustic Stimulation',
    'other': 'Other Configurations'
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Parameter Presets
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Select a predefined configuration to quickly set up common LENR/CMNS experimental parameters.
      </Typography>
      
      {Object.keys(groupedPresets).map(category => (
        <Box key={category} mb={3}>
          <Typography variant="subtitle1" fontWeight="medium" mb={1}>
            {categoryNames[category]}
          </Typography>
          
          <Grid container spacing={2}>
            {groupedPresets[category].map(preset => (
              <Grid item xs={12} sm={6} key={preset.id}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => handleSelectPreset(preset)}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {preset.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {preset.description}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        <Chip 
                          size="small" 
                          label={`T: ${preset.parameters.T}K`} 
                          color="primary" 
                          variant="outlined"
                        />
                        <Chip 
                          size="small" 
                          label={preset.parameters.potential === 'morse' ? 'Morse' : 'Harmonic'} 
                          color="secondary" 
                          variant="outlined"
                        />
                        {preset.parameters.impactT > 0 && (
                          <Chip 
                            size="small" 
                            label="Impact" 
                            color="warning" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default PresetSelector; 