import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Button, 
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert
} from '@mui/material';

/**
 * AccessibilityDemo Component
 * 
 * Demonstrates good vs bad accessibility practices in forms
 */
const AccessibilityDemo = () => {
  const [showErrors, setShowErrors] = useState(false);
  
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Form Accessibility Comparison
      </Typography>
      <Typography variant="body1" paragraph>
        This demonstration compares inaccessible form elements (left) with accessible ones (right).
        Common accessibility issues include missing ID/name attributes and improper label associations.
      </Typography>
      
      <Button 
        variant="outlined" 
        onClick={() => setShowErrors(!showErrors)}
        sx={{ mb: 3 }}
      >
        {showErrors ? 'Hide Error Details' : 'Show Error Details'}
      </Button>
      
      {showErrors && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Common Accessibility Issues:</Typography>
          <ul>
            <li>Form inputs missing ID attributes</li>
            <li>Form inputs missing name attributes</li>
            <li>Labels not properly associated with form controls</li>
            <li>Select elements missing proper labels</li>
            <li>Missing ARIA attributes for screen readers</li>
          </ul>
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* Inaccessible Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" color="error" gutterBottom>
              ❌ Inaccessible Form
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form">
              {/* Inaccessible Temperature Field */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Temperature (K)
                </Typography>
                <TextField 
                  type="number"
                  defaultValue={300}
                  fullWidth
                  // DELIBERATE ACCESSIBILITY ISSUE: This field intentionally lacks id, name, and aria attributes
                  // for demonstration purposes only. DO NOT use this pattern in real code.
                />
              </Box>
              
              {/* Inaccessible Pressure Field */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Pressure (Pa)
                </Typography>
                <TextField 
                  type="number"
                  defaultValue={101325}
                  fullWidth
                  // DELIBERATE ACCESSIBILITY ISSUE: This field intentionally lacks id, name, and aria attributes
                  // for demonstration purposes only. DO NOT use this pattern in real code.
                />
              </Box>
              
              {/* Inaccessible Material Field */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Material
                </Typography>
                <Select
                  defaultValue="palladium"
                  fullWidth
                  // DELIBERATE ACCESSIBILITY ISSUE: This select element intentionally lacks id, labelId,
                  // and aria attributes for demonstration purposes only. DO NOT use this pattern in real code.
                >
                  <MenuItem value="palladium">Palladium</MenuItem>
                  <MenuItem value="nickel">Nickel</MenuItem>
                  <MenuItem value="titanium">Titanium</MenuItem>
                </Select>
              </Box>
              
              <Button 
                variant="contained"
                fullWidth
                // DELIBERATE ACCESSIBILITY ISSUE: This button intentionally lacks type, id, name,
                // and aria attributes for demonstration purposes only. DO NOT use this pattern in real code.
              >
                Start Simulation
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Accessible Form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" color="success" gutterBottom>
              ✅ Accessible Form
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box 
              component="form" 
              id="accessible-demo-form"
              role="form"
              aria-labelledby="accessible-form-title"
            >
              <Typography id="accessible-form-title" variant="subtitle1" sx={{ mb: 2 }}>
                LENR Simulation Setup
              </Typography>
              
              {/* Accessible Temperature Field */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <TextField
                    label="Temperature (K)"
                    id="temperature-input"
                    name="temperature"
                    type="number"
                    defaultValue={300}
                    aria-describedby="temperature-helper-text"
                    helperText="Enter temperature in Kelvin (273-1273K)"
                  />
                </FormControl>
              </Box>
              
              {/* Accessible Pressure Field */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <TextField
                    label="Pressure (Pa)"
                    id="pressure-input"
                    name="pressure"
                    type="number"
                    defaultValue={101325}
                    aria-describedby="pressure-helper-text"
                    helperText="Standard atmospheric pressure is 101325 Pa"
                  />
                </FormControl>
              </Box>
              
              {/* Accessible Material Field */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="material-label" htmlFor="material-select">Material</InputLabel>
                  <Select
                    labelId="material-label"
                    id="material-select"
                    name="material"
                    defaultValue="palladium"
                    label="Material"
                    aria-describedby="material-helper-text"
                  >
                    <MenuItem value="palladium" id="material-palladium">Palladium</MenuItem>
                    <MenuItem value="nickel" id="material-nickel">Nickel</MenuItem>
                    <MenuItem value="titanium" id="material-titanium">Titanium</MenuItem>
                  </Select>
                  <Typography 
                    variant="caption" 
                    id="material-helper-text"
                    sx={{ mt: 0.5 }}
                  >
                    Select the primary material for the simulation
                  </Typography>
                </FormControl>
              </Box>
              
              <Button 
                type="submit"
                variant="contained"
                fullWidth
                id="start-simulation-button"
                name="start-simulation"
                aria-label="Start Simulation"
              >
                Start Simulation
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {showErrors && (
        <Paper sx={{ p: 3, mt: 4, backgroundColor: '#f9f9f9' }}>
          <Typography variant="h6" gutterBottom>
            Browser Inspection Findings
          </Typography>
          <Typography variant="body2">
            When inspecting the inaccessible form in browser DevTools, you may see warnings like:
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#ffe0e0', borderRadius: 1 }}>
            <Typography variant="body2" fontFamily="monospace" component="pre">
              {"To fix this issue, next the <input> or provide a for= attribute on the <label> that matches a form field id."}
            </Typography>
          </Box>
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#e0f7fa', borderRadius: 1 }}>
            <Typography variant="subtitle2">Key Fixes Applied:</Typography>
            <ul>
              <li><code>id</code> attribute added to all form controls</li>
              <li><code>name</code> attribute added to all form controls</li>
              <li><code>htmlFor</code> attribute added to labels to associate with inputs</li>
              <li><code>aria-labelledby</code> and <code>aria-describedby</code> attributes added</li>
              <li>Proper form structure with <code>role="form"</code></li>
              <li>Clear helper text for all inputs</li>
            </ul>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default AccessibilityDemo; 