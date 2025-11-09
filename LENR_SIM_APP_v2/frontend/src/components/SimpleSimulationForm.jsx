import React, { useState } from 'react';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Grid } from '@mui/material';

/**
 * SimpleSimulationForm Component
 * A properly accessible form with all required attributes for the LENR simulation
 */
const SimpleSimulationForm = ({ onSubmit }) => {
  const [formValues, setFormValues] = useState({
    temperature: 300,
    pressure: 101325,
    material: 'palladium',
    duration: 100,
    timeStep: 0.1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formValues);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} id="simple-simulation-form">
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <TextField
              label="Temperature (K)"
              id="temperature-field"
              name="temperature"
              type="number"
              value={formValues.temperature}
              onChange={handleChange}
              inputProps={{
                min: 273,
                max: 1273,
                step: 1
              }}
              aria-describedby="temperature-helper-text"
              helperText="Temperature in Kelvin (273K-1273K)"
              required
            />
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <TextField
              label="Pressure (Pa)"
              id="pressure-field"
              name="pressure"
              type="number"
              value={formValues.pressure}
              onChange={handleChange}
              inputProps={{
                min: 10000,
                max: 500000,
                step: 1000
              }}
              aria-describedby="pressure-helper-text"
              helperText="Standard pressure is 101325 Pa (1 atm)"
              required
            />
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel id="material-label" htmlFor="material-select">Material</InputLabel>
            <Select
              labelId="material-label"
              id="material-select"
              name="material"
              value={formValues.material}
              onChange={handleChange}
              label="Material"
              aria-describedby="material-helper-text"
              required
            >
              <MenuItem value="palladium" id="material-option-palladium">Palladium</MenuItem>
              <MenuItem value="nickel" id="material-option-nickel">Nickel</MenuItem>
              <MenuItem value="titanium" id="material-option-titanium">Titanium</MenuItem>
              <MenuItem value="platinum" id="material-option-platinum">Platinum</MenuItem>
            </Select>
            <Typography id="material-helper-text" variant="caption" sx={{ mt: 1 }}>
              Select the main material for your simulation
            </Typography>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <TextField
              label="Duration (s)"
              id="duration-field"
              name="duration"
              type="number"
              value={formValues.duration}
              onChange={handleChange}
              inputProps={{
                min: 1,
                max: 1000,
                step: 1
              }}
              aria-describedby="duration-helper-text"
              helperText="Simulation duration in seconds"
              required
            />
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <TextField
              label="Time Step (s)"
              id="time-step-field"
              name="timeStep"
              type="number"
              value={formValues.timeStep}
              onChange={handleChange}
              inputProps={{
                min: 0.01,
                max: 1,
                step: 0.01
              }}
              aria-describedby="time-step-helper-text"
              helperText="Time step size in seconds"
              required
            />
          </FormControl>
        </Grid>

        <Grid item xs={12} sx={{ mt: 2 }}>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            id="start-simulation-button"
            name="start-simulation"
            aria-label="Start Simulation"
          >
            Start Simulation
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimpleSimulationForm; 