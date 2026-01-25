import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Grid, 
  Paper 
} from '@mui/material';

// Default simulation parameters
const defaultParams = {
  temperature: 300,
  pressure: 101325,
  material: 'palladium',
  duration: 100,
  timeStep: 0.1
};

/**
 * SimulationForm Component
 * A properly accessible form with all required attributes for the LENR simulation
 */
const SimulationForm = ({ onSubmit }) => {
  const [params, setParams] = useState(defaultParams);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(params);
    }
  };
  
  return (
    <Paper 
      elevation={1} 
      sx={{ p: 3 }}
      component="form"
      onSubmit={handleSubmit}
      id="lenr-simulation-form"
      aria-labelledby="form-title"
    >
      <Typography 
        variant="h6" 
        component="h2" 
        gutterBottom
        id="form-title"
      >
        New Simulation
      </Typography>
      
      <Grid container spacing={3}>
        {/* Temperature */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <TextField
              id="temperature-input"
              name="temperature"
              label="Temperature (K)"
              type="number"
              value={params.temperature}
              onChange={handleChange}
              aria-describedby="temperature-helper-text"
              inputProps={{
                min: 273,
                max: 1273,
                step: 1,
              }}
              required
            />
            <Typography 
              variant="caption" 
              color="textSecondary"
              id="temperature-helper-text"
            >
              Enter temperature in Kelvin (273-1273K)
            </Typography>
          </FormControl>
        </Grid>
        
        {/* Pressure */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <TextField
              id="pressure-input"
              name="pressure"
              label="Pressure (Pa)"
              type="number"
              value={params.pressure}
              onChange={handleChange}
              aria-describedby="pressure-helper-text"
              inputProps={{
                min: 10000,
                max: 500000,
                step: 1000,
              }}
              required
            />
            <Typography 
              variant="caption" 
              color="textSecondary"
              id="pressure-helper-text"
            >
              Standard atmospheric pressure is 101325 Pa
            </Typography>
          </FormControl>
        </Grid>
        
        {/* Material */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="material-label" htmlFor="material-select">Material</InputLabel>
            <Select
              labelId="material-label"
              id="material-select"
              name="material"
              value={params.material}
              onChange={handleChange}
              label="Material"
              aria-describedby="material-helper-text"
              required
            >
              <MenuItem value="palladium" id="material-palladium">Palladium</MenuItem>
              <MenuItem value="nickel" id="material-nickel">Nickel</MenuItem>
              <MenuItem value="titanium" id="material-titanium">Titanium</MenuItem>
              <MenuItem value="platinum" id="material-platinum">Platinum</MenuItem>
            </Select>
            <Typography 
              variant="caption" 
              color="textSecondary"
              id="material-helper-text"
            >
              Select the primary material for the simulation
            </Typography>
          </FormControl>
        </Grid>
        
        {/* Duration */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <TextField
              id="duration-input"
              name="duration"
              label="Duration (s)"
              type="number"
              value={params.duration}
              onChange={handleChange}
              aria-describedby="duration-helper-text"
              inputProps={{
                min: 1,
                max: 10000,
                step: 1,
              }}
              required
            />
            <Typography 
              variant="caption" 
              color="textSecondary"
              id="duration-helper-text"
            >
              Simulation duration in seconds
            </Typography>
          </FormControl>
        </Grid>
        
        {/* Time Step */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <TextField
              id="time-step-input"
              name="timeStep"
              label="Time Step (s)"
              type="number"
              value={params.timeStep}
              onChange={handleChange}
              aria-describedby="time-step-helper-text"
              inputProps={{
                min: 0.01,
                max: 1,
                step: 0.01,
              }}
              required
            />
            <Typography 
              variant="caption" 
              color="textSecondary"
              id="time-step-helper-text"
            >
              Time step size in seconds
            </Typography>
          </FormControl>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          id="start-simulation-button"
          name="start-simulation"
          aria-label="Start Simulation"
        >
          Start Simulation
        </Button>
      </Box>
    </Paper>
  );
};

export default SimulationForm; 