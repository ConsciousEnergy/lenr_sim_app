
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  useTheme
} from '@mui/material';

// Import chart components
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

/**
 * Test Results Panel
 * 
 * Displays different types of test results based on the active tab
 * 
 * @param {Object} props - Component props
 * @param {number} props.activeTab - The active tab index
 * @param {Object} props.testResults - The test results data
 * @param {Object} props.testParams - The test parameters
 * @param {Object} props.reaction - The reaction being tested
 * @returns {JSX.Element} Test Results Panel component
 */
const TestResultsPanel = ({ activeTab, testResults, testParams, reaction }) => {
  const theme = useTheme();
  
  if (!testResults) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1">No test results available</Typography>
      </Box>
    );
  }
  
  // Summary tab content
  const renderSummaryTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Reaction Performance Summary</Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell>Interpretation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Reaction Rate</TableCell>
                  <TableCell align="right">{testResults.reactionRate.toExponential(3)} cm³/s</TableCell>
                  <TableCell>{getRateInterpretation(testResults.reactionRate)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Power Density</TableCell>
                  <TableCell align="right">{testResults.powerDensity.toFixed(3)} W/cm³</TableCell>
                  <TableCell>{getPowerInterpretation(testResults.powerDensity)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Energy Gain Factor (Q)</TableCell>
                  <TableCell align="right">{testResults.energyGain.toFixed(2)}</TableCell>
                  <TableCell>{getQInterpretation(testResults.energyGain)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Energy Confinement</TableCell>
                  <TableCell align="right">{testResults.energyConfinement.toFixed(3)} s</TableCell>
                  <TableCell>{getConfinementInterpretation(testResults.energyConfinement)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Optimal Temperature</TableCell>
                  <TableCell align="right">{testResults.optimalTemperature.toFixed(1)} keV</TableCell>
                  <TableCell>
                    {testParams.temperature < testResults.optimalTemperature 
                      ? 'Current temperature is below optimal' 
                      : testParams.temperature > testResults.optimalTemperature 
                        ? 'Current temperature is above optimal'
                        : 'Current temperature is optimal'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Fusion Probability</TableCell>
                  <TableCell align="right">{(testResults.fusionProbability * 100).toFixed(4)}%</TableCell>
                  <TableCell>{getProbabilityInterpretation(testResults.fusionProbability)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Product Distribution</Typography>
          
          <Box sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={testResults.productDistribution}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="energy" name="Energy (MeV)" fill={theme.palette.primary.main} />
                <Bar dataKey="percentage" name="Yield (%)" fill={theme.palette.secondary.main} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Energy tab content
  const renderEnergyTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Energy Analysis</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={testResults.energyOverTime}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Energy (MeV)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalEnergy" 
                  stackId="1"
                  name="Total Energy" 
                  stroke={theme.palette.success.main} 
                  fill={theme.palette.success.light} 
                />
                <Area 
                  type="monotone" 
                  dataKey="ionEnergy" 
                  stackId="1"
                  name="Ion Energy" 
                  stroke={theme.palette.primary.main} 
                  fill={theme.palette.primary.light} 
                />
                <Area 
                  type="monotone" 
                  dataKey="radiationEnergy" 
                  stackId="1"
                  name="Radiation Energy" 
                  stroke={theme.palette.warning.main} 
                  fill={theme.palette.warning.light} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={testResults.energyDistribution}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="energy" label={{ value: 'Energy (MeV)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Probability', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="probability" 
                  name="Energy Distribution" 
                  stroke={theme.palette.primary.main} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Cross-section tab content
  const renderCrossSectionTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Cross-Section Analysis</Typography>
      
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={testResults.crossSectionData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="energy" 
              scale="log"
              domain={['auto', 'auto']}
              type="number"
              label={{ value: 'Energy (keV)', position: 'insideBottomRight', offset: -5 }} 
            />
            <YAxis 
              scale="log"
              domain={['auto', 'auto']}
              label={{ value: 'Cross Section (barns)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip formatter={(value) => value.toExponential(3)} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="crossSection" 
              name="Cross Section" 
              stroke={theme.palette.primary.main} 
              dot={{ r: 1 }} 
            />
            <Line 
              type="monotone" 
              dataKey="maxwellianAverage" 
              name="Maxwellian Averaged" 
              stroke={theme.palette.secondary.main} 
              dot={{ r: 1 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>Peak Cross Section</Typography>
          <Typography variant="h5">{testResults.peakCrossSection.toExponential(3)} barns</Typography>
          <Typography variant="body2" color="text.secondary">
            at {testResults.peakCrossSectionEnergy.toFixed(1)} keV
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>Gamow Energy</Typography>
          <Typography variant="h5">{testResults.gamowEnergy.toFixed(1)} keV</Typography>
          <Typography variant="body2" color="text.secondary">
            Typical energy for quantum tunneling
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Reactivity tab content
  const renderReactivityTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Reactivity Analysis</Typography>
      
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={testResults.reactivityData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="temperature" 
              label={{ value: 'Ion Temperature (keV)', position: 'insideBottomRight', offset: -5 }} 
            />
            <YAxis 
              label={{ value: 'Reactivity (cm³/s)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip formatter={(value) => value.toExponential(3)} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="reactivity" 
              name="Reactivity" 
              stroke={theme.palette.primary.main} 
              dot={false} 
            />
            {testResults.comparisonReactivity && (
              <Line 
                type="monotone" 
                dataKey="comparisonReactivity" 
                name="D-T Reactivity (Reference)" 
                stroke={theme.palette.secondary.main} 
                dot={false} 
                strokeDasharray="5 5"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="subtitle1" gutterBottom>Lawson Criterion Analysis</Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Required n·τ Product</Typography>
            <Typography variant="h5">
              {testResults.lawsonCriterion.required.toExponential(2)} s/cm³
            </Typography>
            <Typography variant="body2" color="text.secondary">
              For energy breakeven (Q=1)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              borderColor: testResults.lawsonCriterion.achieved >= testResults.lawsonCriterion.required
                ? theme.palette.success.main 
                : theme.palette.error.main
            }}
          >
            <Typography variant="subtitle2" gutterBottom>Achieved n·τ Product</Typography>
            <Typography variant="h5">
              {testResults.lawsonCriterion.achieved.toExponential(2)} s/cm³
            </Typography>
            <Typography 
              variant="body2" 
              color={testResults.lawsonCriterion.achieved >= testResults.lawsonCriterion.required
                ? "success.main"
                : "error.main"}
            >
              {testResults.lawsonCriterion.achieved >= testResults.lawsonCriterion.required
                ? "✓ Sufficient for ignition"
                : "✗ Insufficient for ignition"}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Sweep results tab content
  const renderSweepResultsTab = () => {
    if (!testParams.parameterSweep || !testResults.sweepResults) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">No parameter sweep was performed</Typography>
        </Box>
      );
    }
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Parameter Sweep: {formatParameterName(testParams.sweepParameter)}
        </Typography>
        
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={testResults.sweepResults}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="parameterValue" 
                label={{ 
                  value: formatParameterName(testParams.sweepParameter), 
                  position: 'insideBottomRight', 
                  offset: -5 
                }} 
              />
              <YAxis yAxisId="left" label={{ value: 'Reactivity (cm³/s)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Power Density (W/cm³)', angle: 90, position: 'insideRight' }} />
              <Tooltip formatter={(value) => value.toExponential(3)} />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="reactivity" 
                name="Reactivity" 
                stroke={theme.palette.primary.main} 
                dot={{ r: 3 }} 
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="powerDensity" 
                name="Power Density" 
                stroke={theme.palette.secondary.main} 
                dot={{ r: 3 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="subtitle1" gutterBottom>Optimal Values</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Optimal {formatParameterName(testParams.sweepParameter)} for Reactivity
              </Typography>
              <Typography variant="h5">
                {testResults.optimalValues.reactivity.value.toFixed(
                  getParameterPrecision(testParams.sweepParameter)
                )} {getParameterUnit(testParams.sweepParameter)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reactivity: {testResults.optimalValues.reactivity.reactivity.toExponential(3)} cm³/s
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Optimal {formatParameterName(testParams.sweepParameter)} for Power Density
              </Typography>
              <Typography variant="h5">
                {testResults.optimalValues.powerDensity.value.toFixed(
                  getParameterPrecision(testParams.sweepParameter)
                )} {getParameterUnit(testParams.sweepParameter)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Power Density: {testResults.optimalValues.powerDensity.powerDensity.toFixed(3)} W/cm³
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Helper functions for parameter formatting
  const formatParameterName = (param) => {
    switch (param) {
      case 'temperature': return 'Temperature (keV)';
      case 'density': return 'Density (cm⁻³)';
      case 'initialEnergy': return 'Initial Energy (keV)';
      case 'confinementTime': return 'Confinement Time (s)';
      case 'magneticField': return 'Magnetic Field (T)';
      default: return param;
    }
  };
  
  const getParameterUnit = (param) => {
    switch (param) {
      case 'temperature': return 'keV';
      case 'density': return 'cm⁻³';
      case 'initialEnergy': return 'keV';
      case 'confinementTime': return 's';
      case 'magneticField': return 'T';
      default: return '';
    }
  };
  
  const getParameterPrecision = (param) => {
    switch (param) {
      case 'temperature': return 1;
      case 'density': return 0;
      case 'initialEnergy': return 1;
      case 'confinementTime': return 3;
      case 'magneticField': return 1;
      default: return 2;
    }
  };
  
  // Helper functions for interpretations
  const getRateInterpretation = (rate) => {
    if (rate < 1e-20) return 'Extremely low - negligible fusion';
    if (rate < 1e-18) return 'Very low - far from practical';
    if (rate < 1e-16) return 'Low - insufficient for energy production';
    if (rate < 1e-14) return 'Moderate - potentially useful for research';
    if (rate < 1e-12) return 'Good - approaching practical values';
    return 'Excellent - suitable for energy production';
  };
  
  const getPowerInterpretation = (power) => {
    if (power < 0.001) return 'Negligible power output';
    if (power < 0.1) return 'Low power density';
    if (power < 1) return 'Moderate power density';
    if (power < 10) return 'Good power density';
    return 'Excellent power density';
  };
  
  const getQInterpretation = (q) => {
    if (q < 0.1) return 'Very inefficient - requires much more energy than produced';
    if (q < 1) return 'Inefficient - requires more energy than produced';
    if (q === 1) return 'Breakeven - energy out equals energy in';
    if (q < 5) return 'Net energy gain - potentially viable';
    if (q < 20) return 'Good energy gain - commercially viable';
    return 'Excellent energy gain - highly efficient';
  };
  
  const getConfinementInterpretation = (confinement) => {
    if (confinement < 0.001) return 'Very poor confinement';
    if (confinement < 0.01) return 'Poor confinement';
    if (confinement < 0.1) return 'Moderate confinement';
    if (confinement < 1) return 'Good confinement';
    return 'Excellent confinement';
  };
  
  const getProbabilityInterpretation = (probability) => {
    if (probability < 1e-6) return 'Extremely unlikely';
    if (probability < 1e-4) return 'Very unlikely';
    if (probability < 1e-2) return 'Unlikely';
    if (probability < 0.1) return 'Possible';
    return 'Likely';
  };
  
  // Render the appropriate tab content
  switch (activeTab) {
    case 0:
      return renderSummaryTab();
    case 1:
      return renderEnergyTab();
    case 2:
      return renderCrossSectionTab();
    case 3:
      return renderReactivityTab();
    case 4:
      return renderSweepResultsTab();
    default:
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body1">Tab content not available</Typography>
        </Box>
      );
  }
};

export default TestResultsPanel; 