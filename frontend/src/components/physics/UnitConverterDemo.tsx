import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Grid, 
  Divider,
  Card,
  CardContent,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import UnitConverterField from './UnitConverterField';
import PhysicsUnitConverter, { UnitFamily } from './PhysicsUnitConverter';

/**
 * Demonstrates the use of the physics unit conversion system
 */
const UnitConverterDemo: React.FC = () => {
  // State for each unit type converter
  const [temperature, setTemperature] = useState<{ value: number, unit: string }>({ 
    value: 300, 
    unit: 'K' 
  });
  
  const [pressure, setPressure] = useState<{ value: number, unit: string }>({ 
    value: 1.0, 
    unit: 'atm' 
  });
  
  const [length, setLength] = useState<{ value: number, unit: string }>({ 
    value: 3.89, 
    unit: 'Å' 
  });
  
  const [energy, setEnergy] = useState<{ value: number, unit: string }>({ 
    value: 2.3, 
    unit: 'eV' 
  });
  
  const [time, setTime] = useState<{ value: number, unit: string }>({ 
    value: 1.0e-12, 
    unit: 's' 
  });

  // Conversion display mode
  const [conversionMode, setConversionMode] = useState<'scientific' | 'standard'>('scientific');

  // Handler for unit converter field changes
  const handleTemperatureChange = (value: number, unit: string) => {
    setTemperature({ value, unit });
  };
  
  const handlePressureChange = (value: number, unit: string) => {
    setPressure({ value, unit });
  };
  
  const handleLengthChange = (value: number, unit: string) => {
    setLength({ value, unit });
  };
  
  const handleEnergyChange = (value: number, unit: string) => {
    setEnergy({ value, unit });
  };
  
  const handleTimeChange = (value: number, unit: string) => {
    setTime({ value, unit });
  };

  // Convert values to all available units for display
  const getConversions = (value: number, unit: string, unitFamily: UnitFamily) => {
    const availableUnits = PhysicsUnitConverter.getAvailableUnits(unitFamily);
    
    return availableUnits.map(targetUnit => ({
      unit: targetUnit,
      value: PhysicsUnitConverter.convertUnit(value, unit, targetUnit),
      name: PhysicsUnitConverter.getUnitName(targetUnit)
    }));
  };

  // Format a value for display
  const formatValue = (value: number): string => {
    if (conversionMode === 'scientific' || Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
      return value.toExponential(4);
    }
    return value.toFixed(4);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Physics Unit Converter
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This component demonstrates the unit conversion system for physics parameters.
        Change values or units to see conversions to other compatible units.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Display Format</FormLabel>
          <RadioGroup
            row
            value={conversionMode}
            onChange={(e) => setConversionMode(e.target.value as 'scientific' | 'standard')}
          >
            <FormControlLabel 
              value="scientific" 
              control={<Radio />} 
              label="Scientific Notation" 
            />
            <FormControlLabel 
              value="standard" 
              control={<Radio />} 
              label="Standard Notation" 
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Temperature converter */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Temperature
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <UnitConverterField
              label="Temperature"
              value={temperature.value}
              unit={temperature.unit}
              onChange={handleTemperatureChange}
              fullWidth
              helperText="Temperature in various units"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Equivalent Values:
            </Typography>
            
            <Grid container spacing={2}>
              {getConversions(temperature.value, temperature.unit, 'temperature')
                .map(conversion => (
                  <Grid size={{ xs: 6 }} key={conversion.unit}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                      <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2" color="text.secondary">
                          {conversion.name}
                        </Typography>
                        <Typography variant="body1">
                          {formatValue(conversion.value)} {conversion.unit}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          </Paper>
        </Grid>

        {/* Pressure converter */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Pressure
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <UnitConverterField
              label="Pressure"
              value={pressure.value}
              unit={pressure.unit}
              onChange={handlePressureChange}
              fullWidth
              helperText="Pressure in various units"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Equivalent Values:
            </Typography>
            
            <Grid container spacing={2}>
              {getConversions(pressure.value, pressure.unit, 'pressure')
                .map(conversion => (
                  <Grid size={{ xs: 6 }} key={conversion.unit}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                      <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2" color="text.secondary">
                          {conversion.name}
                        </Typography>
                        <Typography variant="body1">
                          {formatValue(conversion.value)} {conversion.unit}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          </Paper>
        </Grid>

        {/* Length converter */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Length
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <UnitConverterField
              label="Length"
              value={length.value}
              unit={length.unit}
              onChange={handleLengthChange}
              fullWidth
              helperText="Length in various units"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Equivalent Values:
            </Typography>
            
            <Grid container spacing={2}>
              {getConversions(length.value, length.unit, 'length')
                .map(conversion => (
                  <Grid size={{ xs: 6 }} key={conversion.unit}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                      <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2" color="text.secondary">
                          {conversion.name}
                        </Typography>
                        <Typography variant="body1">
                          {formatValue(conversion.value)} {conversion.unit}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          </Paper>
        </Grid>

        {/* Energy converter */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Energy
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <UnitConverterField
              label="Energy"
              value={energy.value}
              unit={energy.unit}
              onChange={handleEnergyChange}
              fullWidth
              helperText="Energy in various units"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Equivalent Values:
            </Typography>
            
            <Grid container spacing={2}>
              {getConversions(energy.value, energy.unit, 'energy')
                .map(conversion => (
                  <Grid size={{ xs: 6 }} key={conversion.unit}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                      <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2" color="text.secondary">
                          {conversion.name}
                        </Typography>
                        <Typography variant="body1">
                          {formatValue(conversion.value)} {conversion.unit}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          </Paper>
        </Grid>

        {/* Time converter */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Time
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <UnitConverterField
              label="Time"
              value={time.value}
              unit={time.unit}
              onChange={handleTimeChange}
              fullWidth
              helperText="Time in various units"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Equivalent Values:
            </Typography>
            
            <Grid container spacing={2}>
              {getConversions(time.value, time.unit, 'time')
                .map(conversion => (
                  <Grid size={{ xs: 6 }} key={conversion.unit}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                      <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2" color="text.secondary">
                          {conversion.name}
                        </Typography>
                        <Typography variant="body1">
                          {formatValue(conversion.value)} {conversion.unit}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UnitConverterDemo; 