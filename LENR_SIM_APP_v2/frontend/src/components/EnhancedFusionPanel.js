import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Slider, 
  Switch, 
  FormControlLabel,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { styled } from '@mui/material/styles';
import { getEnhancedFusion } from '../services/api';
import RefreshIcon from '@mui/icons-material/Refresh';

// Styled components
const ConfigurationCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.grey[50]
}));

const ResultCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' ? 
    theme.palette.background.paper : 
    theme.palette.background.default
}));

const SliderBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(3),
}));

const EnhancementBar = styled(Box)(({ theme }) => ({
  height: 20,
  borderRadius: theme.shape.borderRadius,
  width: '100%',
  position: 'relative',
  background: theme.palette.mode === 'dark' ? 
    theme.palette.grey[800] : 
    theme.palette.grey[300],
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  overflow: 'hidden'
}));

const EnhancementProgress = styled(Box)(({ 
  theme, 
  value = 0, 
  maxvalue = 100, 
  color = 'primary.main' 
}) => ({
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  width: `${Math.min(100, (value / maxvalue) * 100)}%`,
  backgroundColor: theme.palette[color.split('.')[0]][color.split('.')[1] || 'main'],
}));

const InfoIconStyled = styled(InfoIcon)(({ theme }) => ({
  fontSize: '1rem',
  marginLeft: theme.spacing(1),
  color: theme.palette.info.main,
  cursor: 'help',
  verticalAlign: 'middle'
}));

// Information about different metal hosts
const METAL_INFO = {
  Pd: {
    name: "Palladium (Pd)",
    description: "Common metal for deuterium loading, good for absorption in lattice sites"
  },
  Ti: {
    name: "Titanium (Ti)",
    description: "Strong metal with good deuterium absorption properties"
  },
  Ni: {
    name: "Nickel (Ni)",
    description: "Often used in powder form, may support LENR reactions with hydrogen"
  }
};

// Information about different site types
const SITE_INFO = {
  octahedral: {
    name: "Octahedral Sites",
    description: "Six surrounding atoms in an octahedral arrangement, common in FCC lattices"
  },
  tetrahedral: {
    name: "Tetrahedral Sites",
    description: "Four surrounding atoms in a tetrahedral arrangement, found in many metal lattices"
  },
  vacancy: {
    name: "Vacancy Sites",
    description: "Defect sites in the lattice where atoms are missing, can trap hydrogen isotopes"
  }
};

/**
 * Component for Enhanced Fusion calculation configuration and visualization
 */
const EnhancedFusionPanel = ({ onResultsChange }) => {
  // State
  const [params, setParams] = useState({
    metal: 'Pd', // Palladium default
    site_occupation: 'tetrahedral', // octahedral, tetrahedral, vacancy
    temperature: 300, // Kelvin
    include_resonance: true,
    include_quantum: true
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Reference to track the onResultsChange callback
  const onResultsChangeRef = useRef(onResultsChange);
  
  // Update the ref when the prop changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    onResultsChangeRef.current = onResultsChange;
  }, [onResultsChange]);
  
  // Keep track of previous params to avoid duplicate API calls
  const prevParamsRef = useRef(null);

  // Run calculation when parameters change
  useEffect(() => {
    // Skip calculation if params haven't changed
    if (prevParamsRef.current && 
        JSON.stringify(prevParamsRef.current) === JSON.stringify(params)) {
      return;
    }
    
    // Update previous params reference
    prevParamsRef.current = { ...params };
    
    const calculateEnhancement = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getEnhancedFusion(params);
        
        // Validate the response
        if (!data || !data.enhancement_factors) {
          console.error('Invalid response format from enhanced fusion API:', data);
          setError('Received invalid data format from the server.');
          setLoading(false);
          return;
        }
        
        // Check for missing properties
        const requiredProps = ['proximity', 'screening', 'fluctuation', 'resonance', 'quantum', 'total'];
        const missingProps = requiredProps.filter(prop => 
          data.enhancement_factors[prop] === undefined || data.enhancement_factors[prop] === null
        );
        
        if (missingProps.length > 0) {
          console.warn('Missing enhancement factor properties:', missingProps);
          // Fix the data to prevent rendering issues
          missingProps.forEach(prop => {
            data.enhancement_factors[prop] = 1.0; // Default to 1.0 (no enhancement)
          });
        }
        
        // Ensure numeric values for plotting and calculations
        Object.keys(data.enhancement_factors).forEach(key => {
          if (typeof data.enhancement_factors[key] !== 'number' || isNaN(data.enhancement_factors[key])) {
            data.enhancement_factors[key] = 1.0;
          }
        });
        
        // Set the validated results
        setResults(data);
        
        // Notify parent component if needed using the ref to avoid dependency issues
        if (onResultsChangeRef.current) {
          onResultsChangeRef.current(data);
        }
      } catch (err) {
        console.error('Error calculating enhanced fusion:', err);
        setError(err.message || 'An error occurred during calculation');
        
        // Clear previous results if an error occurs
        setResults(null);
        
        // Notify parent component of the error using the ref
        if (onResultsChangeRef.current) {
          onResultsChangeRef.current(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    calculateEnhancement();
  }, [params]); // Remove onResultsChange from dependencies to avoid recalculation loops

  // Handle input changes
  const handleMetalChange = (event) => {
    setParams({ ...params, metal: event.target.value });
  };

  const handleSiteOccupationChange = (event) => {
    setParams({ ...params, site_occupation: event.target.value });
  };

  const handleTemperatureChange = (event, newValue) => {
    setParams({ ...params, temperature: newValue });
  };

  const handleResonanceChange = (event) => {
    setParams({ ...params, include_resonance: event.target.checked });
  };

  const handleQuantumChange = (event) => {
    setParams({ ...params, include_quantum: event.target.checked });
  };

  // Format large numbers in scientific notation
  const formatScientific = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value !== 'number') return value.toString();
    
    if (Math.abs(value) < 0.001 || Math.abs(value) > 1000) {
      return value.toExponential(2);
    }
    return value.toFixed(3);
  };

  // Format orders of magnitude
  const formatOOM = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1);
  };

  // Safe Math.log10 that handles errors
  const safeLog10 = (value) => {
    if (value <= 0 || typeof value !== 'number' || isNaN(value)) {
      return 0;
    }
    return Math.log10(value);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Enhanced Fusion Configuration
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure parameters for the enhanced fusion rate calculations based on the Enhanced Model.
        These settings control various nuclear fusion enhancement mechanisms in solid-state environments.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button 
              variant="outlined" 
              color="primary"
              size="small"
              onClick={() => {
                // Force recalculation by cloning the params object
                setParams({...params});
              }}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          </Box>
        </Alert>
      )}

      <ConfigurationCard>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Host Material and Site Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="metal-label">Metal Host</InputLabel>
                <Select
                  labelId="metal-label"
                  id="metal-select"
                  value={params.metal}
                  label="Metal Host"
                  onChange={handleMetalChange}
                >
                  {Object.entries(METAL_INFO).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      <Tooltip title={info.description}>
                        <span>{info.name}</span>
                      </Tooltip>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="site-label">Site Occupation</InputLabel>
                <Select
                  labelId="site-label"
                  id="site-select"
                  value={params.site_occupation}
                  label="Site Occupation"
                  onChange={handleSiteOccupationChange}
                >
                  {Object.entries(SITE_INFO).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      <Tooltip title={info.description}>
                        <span>{info.name}</span>
                      </Tooltip>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <SliderBox>
            <Typography gutterBottom display="flex" alignItems="center">
              Temperature (K): {params.temperature}
              <Tooltip title="System temperature affects screening and other quantum effects">
                <InfoIconStyled />
              </Tooltip>
            </Typography>
            <Slider
              value={params.temperature}
              onChange={handleTemperatureChange}
              min={100}
              max={500}
              step={10}
              marks={[
                { value: 100, label: '100K' },
                { value: 300, label: '300K' },
                { value: 500, label: '500K' }
              ]}
            />
          </SliderBox>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Enhancement Mechanisms
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={params.include_resonance}
                  onChange={handleResonanceChange}
                  color="primary"
                />
              }
              label={
                <Box component="span" display="flex" alignItems="center">
                  <span>Include Intranuclear Resonance Effects</span>
                  <Tooltip title="Nuclear resonance effects can significantly enhance fusion rates">
                    <InfoIconStyled />
                  </Tooltip>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={params.include_quantum}
                  onChange={handleQuantumChange}
                  color="primary"
                />
              }
              label={
                <Box component="span" display="flex" alignItems="center">
                  <span>Include Quantum Coherence (Dicke/RET)</span>
                  <Tooltip title="Quantum coherence can lead to collective enhancement of nuclear interactions">
                    <InfoIconStyled />
                  </Tooltip>
                </Box>
              }
            />
          </Box>
        </CardContent>
      </ConfigurationCard>

      {/* Results display */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : results && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Enhanced Fusion Results
          </Typography>
          
          {/* Summary */}
          <Alert 
            severity={results.is_observable ? "success" : "info"}
            sx={{ mb: 2 }}
          >
            <Typography variant="body1">{results.summary}</Typography>
          </Alert>
          
          <ResultCard>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Enhancement Factors
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Proximity Factor:
                  </Typography>
                  <EnhancementBar>
                    <EnhancementProgress 
                      value={safeLog10(results.enhancement_factors.proximity)} 
                      maxvalue={5}
                      color="primary.main"
                    />
                  </EnhancementBar>
                  <Typography variant="body2" align="right">
                    {formatScientific(results.enhancement_factors.proximity)}× ({formatOOM(safeLog10(results.enhancement_factors.proximity))} OOM)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Screening Factor:
                  </Typography>
                  <EnhancementBar>
                    <EnhancementProgress 
                      value={safeLog10(results.enhancement_factors.screening)} 
                      maxvalue={30}
                      color="secondary.main"
                    />
                  </EnhancementBar>
                  <Typography variant="body2" align="right">
                    {formatScientific(results.enhancement_factors.screening)}× ({formatOOM(safeLog10(results.enhancement_factors.screening))} OOM)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Fluctuation Factor:
                  </Typography>
                  <EnhancementBar>
                    <EnhancementProgress 
                      value={safeLog10(results.enhancement_factors.fluctuation)} 
                      maxvalue={5}
                      color="success.main"
                    />
                  </EnhancementBar>
                  <Typography variant="body2" align="right">
                    {formatScientific(results.enhancement_factors.fluctuation)}× ({formatOOM(safeLog10(results.enhancement_factors.fluctuation))} OOM)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Resonance Factor:
                  </Typography>
                  <EnhancementBar>
                    <EnhancementProgress 
                      value={safeLog10(results.enhancement_factors.resonance)} 
                      maxvalue={15}
                      color="warning.main"
                    />
                  </EnhancementBar>
                  <Typography variant="body2" align="right">
                    {formatScientific(results.enhancement_factors.resonance)}× ({formatOOM(safeLog10(results.enhancement_factors.resonance))} OOM)
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Quantum Factor:
                  </Typography>
                  <EnhancementBar>
                    <EnhancementProgress 
                      value={safeLog10(results.enhancement_factors.quantum)} 
                      maxvalue={15}
                      color="info.main"
                    />
                  </EnhancementBar>
                  <Typography variant="body2" align="right">
                    {formatScientific(results.enhancement_factors.quantum)}× ({formatOOM(safeLog10(results.enhancement_factors.quantum))} OOM)
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" fontWeight="bold" color={results.is_observable ? "success.main" : "textPrimary"}>
                Total Enhancement: {formatScientific(results.enhancement_factors.total)}× ({formatOOM(safeLog10(results.enhancement_factors.total))} orders of magnitude)
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Baseline Rate: {formatScientific(results.baseline_rate)} fusions/sec·pair
                </Typography>
                <Typography variant="body2">
                  Enhanced Rate: {formatScientific(results.enhanced_rate)} fusions/sec·pair
                </Typography>
                <Typography variant="body2">
                  Observable Threshold: {formatScientific(results.observable_threshold)} fusions/sec·pair
                </Typography>
                <Typography variant="body2" color={results.is_observable ? "success.main" : "textSecondary"}>
                  {results.is_observable 
                    ? `Above observable threshold by ${formatOOM(Math.abs(results.orders_of_magnitude_below_threshold))} orders of magnitude` 
                    : `Below observable threshold by ${formatOOM(results.orders_of_magnitude_below_threshold)} orders of magnitude`}
                </Typography>
              </Box>
            </CardContent>
          </ResultCard>
        </Box>
      )}
    </Box>
  );
};

export default EnhancedFusionPanel; 