/**
 * ComparisonView.jsx
 * 
 * Component for side-by-side comparison of different LENR systems (Pd-D vs Ni-H).
 * Fetches comparison data from the unified simulation API and displays results.
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// System presets with physical parameters
const SYSTEM_PRESETS = {
  'Pd-D': {
    name: 'Palladium-Deuterium',
    host_material: 'palladium',
    loading_ratio: 0.9,
    lattice_constant: 3.89e-10,
    electron_density: 6.8e28,
    debye_temperature: 275,
    screening_energy: 310, // eV
    color: '#3498db',
    description: 'Classic Fleischmann-Pons configuration',
  },
  'Ni-H': {
    name: 'Nickel-Hydrogen',
    host_material: 'nickel',
    loading_ratio: 0.85,
    lattice_constant: 3.52e-10,
    electron_density: 9.1e28,
    debye_temperature: 450,
    screening_energy: 200, // eV
    color: '#e74c3c',
    description: 'Rossi-type configuration',
  },
  'Ti-D': {
    name: 'Titanium-Deuterium',
    host_material: 'titanium',
    loading_ratio: 0.8,
    lattice_constant: 2.95e-10,
    electron_density: 3.8e28,
    debye_temperature: 420,
    screening_energy: 65, // eV
    color: '#2ecc71',
    description: 'Gas-loading configuration',
  },
};

// Enhancement factor categories for radar chart
const ENHANCEMENT_CATEGORIES = [
  { key: 'screening', label: 'Screening' },
  { key: 'phonon', label: 'Phonon' },
  { key: 'qed', label: 'QED' },
  { key: 'casimir', label: 'Casimir' },
  { key: 'compression', label: 'Compression' },
  { key: 'coherence', label: 'Coherence' },
];

/**
 * Format large numbers for display
 */
function formatScientific(value, precision = 2) {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  if (value === 0) return '0';
  
  const exp = Math.floor(Math.log10(Math.abs(value)));
  if (Math.abs(exp) < 4) {
    return value.toFixed(precision);
  }
  return `${(value / Math.pow(10, exp)).toFixed(precision)}×10^${exp}`;
}

/**
 * ComparisonView Component
 */
function ComparisonView({ 
  onError,
  initialSystem1 = 'Pd-D',
  initialSystem2 = 'Ni-H',
}) {
  // State for system selection
  const [system1, setSystem1] = useState(initialSystem1);
  const [system2, setSystem2] = useState(initialSystem2);
  
  // Simulation parameters (shared between systems)
  const [temperature, setTemperature] = useState(300);
  const [drivingPressure, setDrivingPressure] = useState(1.5e5);
  const [frequency, setFrequency] = useState(20000);
  
  // Comparison results
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Run comparison simulation
   */
  const runComparison = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/unified/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systems: [
            {
              system_id: system1,
              ...SYSTEM_PRESETS[system1],
              temperature,
              driving_pressure: drivingPressure,
              frequency,
            },
            {
              system_id: system2,
              ...SYSTEM_PRESETS[system2],
              temperature,
              driving_pressure: drivingPressure,
              frequency,
            },
          ],
          parameters: {
            temperature,
            driving_pressure: drivingPressure,
            frequency,
            num_cycles: 3,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setComparisonData(data);
      
    } catch (err) {
      const errorMessage = `Comparison failed: ${err.message}`;
      setError(errorMessage);
      if (onError) {
        onError(err);
      }
      
      // Generate mock comparison data for demonstration
      setComparisonData(generateMockComparisonData(system1, system2, temperature));
    } finally {
      setIsLoading(false);
    }
  }, [system1, system2, temperature, drivingPressure, frequency, onError]);
  
  /**
   * Export comparison data as JSON
   */
  const exportData = useCallback(() => {
    if (!comparisonData) return;
    
    const exportObj = {
      timestamp: new Date().toISOString(),
      systems: { system1, system2 },
      parameters: { temperature, drivingPressure, frequency },
      results: comparisonData,
    };
    
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lenr_comparison_${system1}_vs_${system2}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [comparisonData, system1, system2, temperature, drivingPressure, frequency]);
  
  // Run initial comparison on mount
  useEffect(() => {
    runComparison();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Prepare data for charts
  const barChartData = comparisonData ? [
    {
      name: 'Enhancement Factor',
      [system1]: Math.log10(comparisonData.results?.[system1]?.total_enhancement || 1),
      [system2]: Math.log10(comparisonData.results?.[system2]?.total_enhancement || 1),
    },
    {
      name: 'Screening',
      [system1]: Math.log10(comparisonData.results?.[system1]?.enhancement_breakdown?.screening || 1),
      [system2]: Math.log10(comparisonData.results?.[system2]?.enhancement_breakdown?.screening || 1),
    },
    {
      name: 'Phonon',
      [system1]: Math.log10(comparisonData.results?.[system1]?.enhancement_breakdown?.phonon || 1),
      [system2]: Math.log10(comparisonData.results?.[system2]?.enhancement_breakdown?.phonon || 1),
    },
    {
      name: 'Compression',
      [system1]: Math.log10(comparisonData.results?.[system1]?.compression_ratio || 1),
      [system2]: Math.log10(comparisonData.results?.[system2]?.compression_ratio || 1),
    },
  ] : [];
  
  const radarChartData = comparisonData ? ENHANCEMENT_CATEGORIES.map(cat => ({
    category: cat.label,
    [system1]: normalizeValue(comparisonData.results?.[system1]?.enhancement_breakdown?.[cat.key]),
    [system2]: normalizeValue(comparisonData.results?.[system2]?.enhancement_breakdown?.[cat.key]),
    fullMark: 100,
  })) : [];
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CompareArrowsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          LENR System Comparison
        </Typography>
      </Box>
      
      {/* System Selection */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title="Configuration" 
          action={
            <Box>
              <IconButton onClick={exportData} disabled={!comparisonData}>
                <DownloadIcon />
              </IconButton>
              <IconButton onClick={runComparison} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* System 1 Selection */}
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>System 1</InputLabel>
                <Select
                  value={system1}
                  onChange={(e) => setSystem1(e.target.value)}
                  label="System 1"
                >
                  {Object.entries(SYSTEM_PRESETS).map(([key, preset]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: preset.color,
                            mr: 1,
                          }}
                        />
                        {preset.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {SYSTEM_PRESETS[system1]?.description}
              </Typography>
            </Grid>
            
            {/* System 2 Selection */}
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>System 2</InputLabel>
                <Select
                  value={system2}
                  onChange={(e) => setSystem2(e.target.value)}
                  label="System 2"
                >
                  {Object.entries(SYSTEM_PRESETS).map(([key, preset]) => (
                    <MenuItem key={key} value={key} disabled={key === system1}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: preset.color,
                            mr: 1,
                          }}
                        />
                        {preset.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {SYSTEM_PRESETS[system2]?.description}
              </Typography>
            </Grid>
            
            {/* Temperature Control */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography gutterBottom>Temperature: {temperature} K</Typography>
              <Slider
                value={temperature}
                onChange={(_, value) => setTemperature(value)}
                min={100}
                max={1000}
                step={10}
                marks={[
                  { value: 100, label: '100K' },
                  { value: 300, label: '300K' },
                  { value: 1000, label: '1000K' },
                ]}
              />
            </Grid>
            
            {/* Driving Pressure Control */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography gutterBottom>
                Driving Pressure: {(drivingPressure / 1e5).toFixed(1)} bar
              </Typography>
              <Slider
                value={drivingPressure}
                onChange={(_, value) => setDrivingPressure(value)}
                min={0.5e5}
                max={5e5}
                step={0.1e5}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CompareArrowsIcon />}
              onClick={runComparison}
              disabled={isLoading || system1 === system2}
            >
              {isLoading ? 'Running Comparison...' : 'Compare Systems'}
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error} (Showing simulated data for demonstration)
        </Alert>
      )}
      
      {/* Results */}
      {comparisonData && (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SystemSummaryCard
                systemId={system1}
                preset={SYSTEM_PRESETS[system1]}
                data={comparisonData.results?.[system1]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SystemSummaryCard
                systemId={system2}
                preset={SYSTEM_PRESETS[system2]}
                data={comparisonData.results?.[system2]}
              />
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3}>
            {/* Bar Chart Comparison */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader 
                  title="Enhancement Factor Comparison (log₁₀)" 
                  subheader="Higher values indicate stronger enhancement"
                />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey={system1} fill={SYSTEM_PRESETS[system1].color} />
                      <Bar dataKey={system2} fill={SYSTEM_PRESETS[system2].color} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Radar Chart Comparison */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader 
                  title="Enhancement Mechanism Profile" 
                  subheader="Normalized comparison of different enhancement mechanisms"
                />
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name={system1}
                        dataKey={system1}
                        stroke={SYSTEM_PRESETS[system1].color}
                        fill={SYSTEM_PRESETS[system1].color}
                        fillOpacity={0.3}
                      />
                      <Radar
                        name={system2}
                        dataKey={system2}
                        stroke={SYSTEM_PRESETS[system2].color}
                        fill={SYSTEM_PRESETS[system2].color}
                        fillOpacity={0.3}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Detailed Comparison Table */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title="Detailed Parameter Comparison" />
            <CardContent>
              <ComparisonTable
                system1={system1}
                system2={system2}
                preset1={SYSTEM_PRESETS[system1]}
                preset2={SYSTEM_PRESETS[system2]}
                data1={comparisonData.results?.[system1]}
                data2={comparisonData.results?.[system2]}
              />
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

ComparisonView.propTypes = {
  onError: PropTypes.func,
  initialSystem1: PropTypes.string,
  initialSystem2: PropTypes.string,
};

/**
 * System Summary Card Component
 */
function SystemSummaryCard({ systemId, preset, data }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: preset?.color || '#666',
                mr: 1,
              }}
            />
            {preset?.name || systemId}
          </Box>
        }
        subheader={preset?.description}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Total Enhancement
            </Typography>
            <Typography variant="h5">
              {formatScientific(data?.total_enhancement)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Compression Ratio
            </Typography>
            <Typography variant="h5">
              {data?.compression_ratio?.toFixed(1) || 'N/A'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Max Temperature
            </Typography>
            <Typography variant="h5">
              {data?.max_temperature?.toFixed(0) || 'N/A'} K
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Peak Field
            </Typography>
            <Typography variant="h5">
              {formatScientific(data?.peak_field)} V/m
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Proton Phase Distribution */}
        <Typography variant="subtitle2" gutterBottom>
          Proton Phase Distribution
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {data?.proton_phases && Object.entries(data.proton_phases).map(([phase, fraction]) => (
            <Chip
              key={phase}
              label={`${phase}: ${(fraction * 100).toFixed(1)}%`}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

SystemSummaryCard.propTypes = {
  systemId: PropTypes.string.isRequired,
  preset: PropTypes.object,
  data: PropTypes.object,
};

/**
 * Detailed Comparison Table Component
 */
function ComparisonTable({ system1, system2, preset1, preset2, data1, data2 }) {
  const rows = [
    { label: 'Host Material', v1: preset1?.host_material, v2: preset2?.host_material },
    { label: 'Loading Ratio', v1: preset1?.loading_ratio, v2: preset2?.loading_ratio },
    { label: 'Lattice Constant', v1: `${(preset1?.lattice_constant * 1e10).toFixed(2)} Å`, v2: `${(preset2?.lattice_constant * 1e10).toFixed(2)} Å` },
    { label: 'Debye Temperature', v1: `${preset1?.debye_temperature} K`, v2: `${preset2?.debye_temperature} K` },
    { label: 'Screening Energy', v1: `${preset1?.screening_energy} eV`, v2: `${preset2?.screening_energy} eV` },
    { label: 'Total Enhancement', v1: formatScientific(data1?.total_enhancement), v2: formatScientific(data2?.total_enhancement), highlight: true },
    { label: 'Screening Factor', v1: formatScientific(data1?.enhancement_breakdown?.screening), v2: formatScientific(data2?.enhancement_breakdown?.screening) },
    { label: 'Phonon Factor', v1: formatScientific(data1?.enhancement_breakdown?.phonon), v2: formatScientific(data2?.enhancement_breakdown?.phonon) },
    { label: 'QED Factor', v1: formatScientific(data1?.enhancement_breakdown?.qed), v2: formatScientific(data2?.enhancement_breakdown?.qed) },
    { label: 'Compression Ratio', v1: data1?.compression_ratio?.toFixed(2), v2: data2?.compression_ratio?.toFixed(2) },
    { label: 'Max Temperature', v1: `${data1?.max_temperature?.toFixed(0)} K`, v2: `${data2?.max_temperature?.toFixed(0)} K` },
    { label: 'Max Pressure', v1: formatScientific(data1?.max_pressure), v2: formatScientific(data2?.max_pressure) },
    { label: 'Peak E-Field', v1: formatScientific(data1?.peak_field), v2: formatScientific(data2?.peak_field) },
  ];
  
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Parameter</TableCell>
            <TableCell align="right" sx={{ color: preset1?.color }}>{system1}</TableCell>
            <TableCell align="right" sx={{ color: preset2?.color }}>{system2}</TableCell>
            <TableCell align="center">Comparison</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const v1Num = parseFloat(row.v1);
            const v2Num = parseFloat(row.v2);
            let comparison = '—';
            if (!isNaN(v1Num) && !isNaN(v2Num) && v2Num !== 0) {
              const ratio = v1Num / v2Num;
              if (ratio > 1.1) comparison = `${ratio.toFixed(1)}× higher`;
              else if (ratio < 0.9) comparison = `${(1/ratio).toFixed(1)}× lower`;
              else comparison = 'Similar';
            }
            
            return (
              <TableRow
                key={index}
                sx={{
                  bgcolor: row.highlight ? 'action.selected' : 'inherit',
                  '&:last-child td, &:last-child th': { border: 0 },
                }}
              >
                <TableCell component="th" scope="row">{row.label}</TableCell>
                <TableCell align="right">{row.v1 || 'N/A'}</TableCell>
                <TableCell align="right">{row.v2 || 'N/A'}</TableCell>
                <TableCell align="center">
                  <Typography variant="caption" color="text.secondary">
                    {comparison}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

ComparisonTable.propTypes = {
  system1: PropTypes.string.isRequired,
  system2: PropTypes.string.isRequired,
  preset1: PropTypes.object,
  preset2: PropTypes.object,
  data1: PropTypes.object,
  data2: PropTypes.object,
};

/**
 * Normalize value to 0-100 scale for radar chart
 */
function normalizeValue(value) {
  if (!value || isNaN(value)) return 0;
  const logVal = Math.log10(Math.max(value, 1));
  return Math.min(100, Math.max(0, logVal * 20));
}

/**
 * Generate mock comparison data for demonstration
 */
function generateMockComparisonData(system1, system2, temperature) {
  const generateSystemData = (systemId) => {
    const preset = SYSTEM_PRESETS[systemId];
    const baseFactor = systemId === 'Pd-D' ? 1.0 : systemId === 'Ni-H' ? 0.7 : 0.5;
    const tempFactor = Math.exp((temperature - 300) / 500);
    
    return {
      total_enhancement: 1e6 * baseFactor * tempFactor,
      compression_ratio: 10 + 5 * baseFactor,
      max_temperature: temperature * (5 + 3 * baseFactor),
      max_pressure: 1e9 * baseFactor,
      peak_field: 1e10 * baseFactor,
      collapse_time: 1e-6,
      enhancement_breakdown: {
        screening: 1000 * (preset.screening_energy / 200),
        phonon: 5 + 3 * (preset.debye_temperature / 300),
        qed: 1.1 * baseFactor,
        casimir: 50 * baseFactor,
        compression: 100 * baseFactor,
        coherence: 10 * baseFactor,
        loading: 1 + 10 * (preset.loading_ratio - 0.8),
      },
      proton_phases: {
        FREE: 0.1,
        SCREENED: 0.3,
        CAPTURE_READY: 0.4,
        NUCLEAR: 0.2 * baseFactor,
      },
    };
  };
  
  return {
    timestamp: new Date().toISOString(),
    results: {
      [system1]: generateSystemData(system1),
      [system2]: generateSystemData(system2),
    },
  };
}

export default ComparisonView;
