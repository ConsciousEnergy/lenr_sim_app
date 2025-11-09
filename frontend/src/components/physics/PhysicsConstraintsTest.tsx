import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import PhysicsConstraints, { ValidationResult } from './PhysicsConstraints';

/**
 * Test component for PhysicsConstraints validation
 * This demonstrates how the constraint validation system works
 */
const PhysicsConstraintsTest: React.FC = () => {
  // Default parameters for testing
  const defaultParams = {
    temperature: 300,
    pressure: 1.0,
    activationEnergy: 0.5,
    latticeConstant: 3.89,
    latticeType: 'FCC',
    deuteriumLoading: 0.6,
    screeningFactor: 5.0,
    coherenceTime: 1.0e-12,
    initialEnergy: 0.025,
    reactionEnergy: 3.27e6
  };

  const [parameters, setParameters] = useState<Record<string, number | string>>(defaultParams);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Run validation whenever parameters change
  useEffect(() => {
    const results = PhysicsConstraints.validateParameterSet(parameters);
    setValidationResults(results);
    setValidationErrors(PhysicsConstraints.getValidationErrors(results));
  }, [parameters]);

  // Handle parameter changes
  const handleParameterChange = (name: string, value: string) => {
    const parsedValue = name === 'latticeType' 
      ? value 
      : parseFloat(value);
      
    if (name !== 'latticeType' && isNaN(parsedValue as number)) return;
    
    setParameters(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  // Reset parameters to default values
  const handleReset = () => {
    setParameters(defaultParams);
  };

  // Create invalid parameters to demonstrate validation errors
  const createInvalidParams = () => {
    setParameters({
      temperature: 3000,
      pressure: 0.1,
      activationEnergy: 0.02,
      latticeConstant: 2.0,
      latticeType: 'FCC',
      deuteriumLoading: 0.95,
      screeningFactor: 100,
      coherenceTime: 1.0e-9,
      initialEnergy: 5.0,
      reactionEnergy: 1000
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Physics Constraints Test
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This component tests the physical constraint validation system. 
        Change parameter values to see how interdependent validation works.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
          <Button 
            variant="outlined" 
            onClick={handleReset}
            sx={{ mr: 2 }}
            fullWidth
          >
            Reset to Valid Parameters
          </Button>
        </Grid>
        <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
          <Button 
            variant="outlined" 
            color="warning"
            onClick={createInvalidParams}
            fullWidth
          >
            Set Invalid Parameters
          </Button>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Parameters
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          {/* Thermal Parameters */}
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Temperature (K)"
              value={parameters.temperature}
              onChange={(e) => handleParameterChange('temperature', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Pressure (atm)"
              value={parameters.pressure}
              onChange={(e) => handleParameterChange('pressure', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Activation Energy (eV)"
              value={parameters.activationEnergy}
              onChange={(e) => handleParameterChange('activationEnergy', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>

          {/* Lattice Parameters */}
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Lattice Constant (Å)"
              value={parameters.latticeConstant}
              onChange={(e) => handleParameterChange('latticeConstant', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Lattice Type"
              value={parameters.latticeType}
              onChange={(e) => handleParameterChange('latticeType', e.target.value)}
              select
              SelectProps={{ native: true }}
              fullWidth
              margin="normal"
              size="small"
            >
              <option value="FCC">FCC</option>
              <option value="BCC">BCC</option>
              <option value="HCP">HCP</option>
              <option value="Diamond">Diamond</option>
            </TextField>
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Deuterium Loading (D/Pd)"
              value={parameters.deuteriumLoading}
              onChange={(e) => handleParameterChange('deuteriumLoading', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>

          {/* Quantum Parameters */}
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Screening Factor"
              value={parameters.screeningFactor}
              onChange={(e) => handleParameterChange('screeningFactor', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Coherence Time (s)"
              value={parameters.coherenceTime}
              onChange={(e) => handleParameterChange('coherenceTime', e.target.value)}
              type="number"
              inputProps={{ step: "1e-15" }}
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>

          {/* Energy Parameters */}
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Initial Energy (eV)"
              value={parameters.initialEnergy}
              onChange={(e) => handleParameterChange('initialEnergy', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
            <TextField
              label="Reaction Energy (eV)"
              value={parameters.reactionEnergy}
              onChange={(e) => handleParameterChange('reactionEnergy', e.target.value)}
              type="number"
              fullWidth
              margin="normal"
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Validation Results
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {validationErrors.length > 0 ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              The following physical constraints are violated:
            </Typography>
            <List dense disablePadding>
              {validationErrors.map((error, idx) => (
                <ListItem key={idx} disableGutters>
                  <ListItemText primary={error} />
                </ListItem>
              ))}
            </List>
          </Alert>
        ) : (
          <Alert severity="success">
            All parameters satisfy physical constraints and are physically realistic.
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Validation Tests Performed: {validationResults.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Successfully passed: {validationResults.filter(r => r.isValid).length} tests
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PhysicsConstraintsTest; 