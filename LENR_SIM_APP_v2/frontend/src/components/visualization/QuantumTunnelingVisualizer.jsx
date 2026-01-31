import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import * as d3 from 'd3';
import tunnelingUtils from '../../utils/quantumTunnelingUtils';
import api from '../../services/api';

const QuantumTunnelingVisualizer = ({
  potentialType = 'coulomb',
  z1 = 1,
  z2 = 1,
  temperature = 300,
  pressure = 1,
  electronScreeningFactor = 1.0,
  energyKeV = 0.1,
  showWaveFunction = true,
  showTunnelingProbability = true,
  showClassicalTurningPoint = true,
  width = 800,
  height = 400,
  onProbabilityCalculated = () => {},
}) => {
  const theme = useTheme();
  const svgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tunnelingData, setTunnelingData] = useState(null);
  const [calculatedProbability, setCalculatedProbability] = useState(null);

  // Calculate reduced mass for d-d fusion
  const reducedMass = tunnelingUtils.DEUTERON_MASS / 2;

  // Fetch tunneling data from API or calculate locally
  const calculateTunnelingData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from real physics API first
      try {
        const response = await api.post('/physics/quantum-tunneling', {
          z1,
          z2,
          a1: z1 === 1 ? 2.0 : z1 * 2,  // Approximate mass number
          a2: z2 === 1 ? 2.0 : z2 * 2,
          energy_kev: energyKeV,
          temperature_k: temperature,
          potential_type: potentialType === 'coulomb' ? 'coulomb' : 'screened',
          screening_enhancement: electronScreeningFactor,
          material: 'palladium',
          pressure_atm: pressure,
        });
        
        // Transform API response to visualization format
        // Note: api.js returns data directly, not wrapped in .data
        const apiData = response;
        
        // Extract potential curve data
        const positions = apiData.potential_curve?.map(p => p.distance_m) || [];
        const potentialValues = apiData.potential_curve?.map(p => p.potential_kev) || [];
        
        // Extract wave function data
        const waveFunction = apiData.wave_function?.map(w => w.amplitude) || [];
        const tunnelingProbabilities = apiData.wave_function?.map(w => w.probability) || [];
        
        const transformedData = {
          positions,
          potentialValues,
          waveFunction,
          tunnelingProbabilities,
          classicalTurningPoint: apiData.classical_turning_point_m,
          tunnelingProbability: apiData.tunneling_probability,
          baselineProbability: apiData.tunneling_probability / apiData.enhancement_factor,
          temperatureEnhancement: apiData.temperature_enhancement,
          electronScreeningEnhancement: apiData.electron_screening_enhancement,
          barrierHeight: apiData.barrier_height_kev,
          gamowFactor: apiData.gamow_factor,
          screeningEnergy: apiData.screening_energy_kev,
          method: apiData.method
        };
        
        setTunnelingData(transformedData);
        if (apiData.tunneling_probability) {
          setCalculatedProbability(apiData.tunneling_probability);
          onProbabilityCalculated(apiData.tunneling_probability);
        }
        
        console.log('Real physics calculation:', apiData.method, 'P =', apiData.tunneling_probability);
      } catch (apiError) {
        // Fallback to local calculation if API call fails
        console.warn('API call failed, falling back to local calculation', apiError);
        
        // Convert keV to Joules
        const energy = energyKeV * tunnelingUtils.KEV_TO_J;
        
        // Parameters for visualization
        const minDistance = 1e-15; // 1 femtometer
        const maxDistance = 1e-9;  // 1 nanometer
        const numPoints = 500;
        
        // Parameters for calculation
        const screeningLength = 2.5e-11 * (electronScreeningFactor ** 0.3); // Screening length increases with screening factor
        
        // Generate datasets for visualization
        const localData = tunnelingUtils.generateTunnelingVisualizationData(
          { minDistance, maxDistance, numPoints },
          {
            potentialType,
            z1,
            z2,
            reducedMass,
            energy,
            screeningLength,
            electronScreeningFactor
          }
        );
        
        // Calculate tunneling probability at classical turning point
        const classicalTurningPoint = localData.classicalTurningPoint || 1e-14;
        const tunnelingProb = tunnelingUtils.calculateWKBTunnelingProbability({
          potentialType,
          z1,
          z2,
          reducedMass,
          energy,
          barrierStart: classicalTurningPoint,
          barrierEnd: 1e-10, // 0.1 nm as cutoff
          screeningLength,
          electronScreeningFactor
        });
        
        // Apply temperature effects
        const temperatureEnhancedProb = tunnelingUtils.calculateTemperatureEnhancedTunneling(
          { temperature },
          {
            potentialType,
            z1,
            z2,
            reducedMass,
            energy,
            barrierStart: classicalTurningPoint,
            barrierEnd: 1e-10,
            screeningLength,
            electronScreeningFactor
          }
        );
        
        // Store and notify about the calculated probability
        setCalculatedProbability(temperatureEnhancedProb);
        onProbabilityCalculated(temperatureEnhancedProb);
        
        setTunnelingData({
          ...localData,
          tunnelingProbability: temperatureEnhancedProb,
          baselineProbability: tunnelingProb,
          temperatureEnhancement: temperatureEnhancedProb / tunnelingProb,
          electronScreeningEnhancement: electronScreeningFactor
        });
      }
    } catch (err) {
      console.error('Error calculating tunneling data:', err);
      setError('Failed to calculate tunneling data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [potentialType, z1, z2, temperature, pressure, electronScreeningFactor, 
      energyKeV, onProbabilityCalculated, reducedMass]);

  // Calculate data when parameters change
  useEffect(() => {
    calculateTunnelingData();
  }, [calculateTunnelingData]);

  // Render visualization using D3
  useEffect(() => {
    if (!tunnelingData || !svgRef.current) return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('overflow', 'visible');
      
    // Create main group with margin
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Extract data arrays with fallback defaults
    const { positions = [], potentialValues = [], waveFunction = [], tunnelingProbabilities = [], classicalTurningPoint } = tunnelingData;
    
    // Validate we have data to render
    if (!positions.length || !potentialValues.length) {
      console.warn('QuantumTunnelingVisualizer: No valid data to render');
      return;
    }
    
    // Convert to log scale for better visualization, filtering out invalid values
    const logPositions = positions
      .map(p => (p > 0 && isFinite(p)) ? Math.log10(p) : null)
      .filter(v => v !== null && isFinite(v));
    
    // Guard against empty array after filtering
    if (logPositions.length === 0) {
      console.warn('QuantumTunnelingVisualizer: No valid positions after log conversion');
      return;
    }
    
    // Normalize values for visualization
    // Guard against division by zero - use 1 as fallback if no valid max
    const validPotentials = potentialValues.filter(v => isFinite(v) && v !== null);
    const rawMaxPotential = validPotentials.length > 0 ? Math.max(...validPotentials) : 1;
    const maxPotential = (rawMaxPotential > 0 && isFinite(rawMaxPotential)) ? rawMaxPotential : 1;
    
    // Create scales with validated domain
    const xMin = Math.min(...logPositions);
    const xMax = Math.max(...logPositions);
    const xScale = d3.scaleLinear()
      .domain([isFinite(xMin) ? xMin : -15, isFinite(xMax) ? xMax : -9])
      .range([0, innerWidth]);
      
    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);
    
    // Draw x-axis
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `10^${d}m`);
      
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .append('text')
      .attr('fill', theme.palette.text.primary)
      .attr('x', innerWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .text('Distance (m)');
    
    // Draw y-axis
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => d.toFixed(1));
      
    g.append('g')
      .call(yAxis)
      .append('text')
      .attr('fill', theme.palette.text.primary)
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .text('Normalized Value');
    
    // Draw potential barrier
    const line = d3.line()
      .x((_, i) => xScale(logPositions[i]))
      .y(d => yScale(d / maxPotential));
      
    g.append('path')
      .datum(potentialValues)
      .attr('fill', 'none')
      .attr('stroke', theme.palette.primary.main)
      .attr('stroke-width', 2)
      .attr('d', line)
      .attr('class', 'potential-curve');
      
    // Add potential barrier label
    g.append('text')
      .attr('x', xScale(logPositions[Math.floor(positions.length * 0.3)]))
      .attr('y', yScale(potentialValues[Math.floor(positions.length * 0.3)] / maxPotential) - 10)
      .attr('fill', theme.palette.primary.main)
      .attr('text-anchor', 'middle')
      .text('Potential Barrier');
    
    // Draw wave function if enabled
    if (showWaveFunction && waveFunction.length > 0) {
      const waveScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([yScale(0.3), yScale(0.7)]);
        
      const waveLine = d3.line()
        .x((_, i) => xScale(logPositions[i]))
        .y(d => waveScale(d));
        
      g.append('path')
        .datum(waveFunction)
        .attr('fill', 'none')
        .attr('stroke', theme.palette.secondary.main)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4')
        .attr('d', waveLine)
        .attr('class', 'wave-function');
        
      // Add wave function label
      g.append('text')
        .attr('x', xScale(logPositions[Math.floor(positions.length * 0.8)]))
        .attr('y', waveScale(waveFunction[Math.floor(positions.length * 0.8)]) - 10)
        .attr('fill', theme.palette.secondary.main)
        .attr('text-anchor', 'middle')
        .text('Wave Function');
    }
    
    // Draw tunneling probability if enabled
    if (showTunnelingProbability && tunnelingProbabilities.length > 0) {
      // Create gradient
      const gradientId = 'tunneling-gradient';
      
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
        
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', theme.palette.warning.main)
        .attr('stop-opacity', 0.8);
        
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', theme.palette.success.main)
        .attr('stop-opacity', 0.4);
      
      // Map tunneling probabilities to area
      const areaGenerator = d3.area()
        .x((_, i) => xScale(logPositions[i]))
        .y0(yScale(0))
        .y1((d) => yScale(d));
        
      g.append('path')
        .datum(tunnelingProbabilities)
        .attr('fill', `url(#${gradientId})`)
        .attr('d', areaGenerator)
        .attr('class', 'tunneling-probability');
        
      // Add tunneling probability label
      g.append('text')
        .attr('x', xScale(logPositions[Math.floor(positions.length * 0.7)]))
        .attr('y', yScale(tunnelingProbabilities[Math.floor(positions.length * 0.7)]) - 10)
        .attr('fill', theme.palette.warning.main)
        .attr('text-anchor', 'middle')
        .text('Tunneling Probability');
    }
    
    // Draw classical turning point if enabled
    if (showClassicalTurningPoint && classicalTurningPoint) {
      const turningPointIndex = positions.findIndex(p => p >= classicalTurningPoint);
      if (turningPointIndex >= 0) {
        g.append('line')
          .attr('x1', xScale(logPositions[turningPointIndex]))
          .attr('y1', 0)
          .attr('x2', xScale(logPositions[turningPointIndex]))
          .attr('y2', innerHeight)
          .attr('stroke', theme.palette.error.main)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('class', 'turning-point');
          
        g.append('text')
          .attr('x', xScale(logPositions[turningPointIndex]))
          .attr('y', 15)
          .attr('fill', theme.palette.error.main)
          .attr('text-anchor', 'middle')
          .text('Classical Turning Point');
      }
    }
    
    // Draw incident energy line
    // Normalize energy in keV to match maxPotential units
    const normalizedEnergy = Math.min(Math.max(energyKeV / maxPotential, 0), 1);    
    g.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(normalizedEnergy))
      .attr('x2', innerWidth)
      .attr('y2', yScale(normalizedEnergy))
      .attr('stroke', theme.palette.info.main)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('class', 'energy-line');
      
    g.append('text')
      .attr('x', 10)
      .attr('y', yScale(normalizedEnergy) - 10)
      .attr('fill', theme.palette.info.main)
      .attr('text-anchor', 'start')
      .text(`Energy: ${energyKeV} keV`);
    
    // Add probability text
    if (calculatedProbability !== null) {
      svg.append('text')
        .attr('x', width - margin.right)
        .attr('y', margin.top - 15)
        .attr('text-anchor', 'end')
        .attr('fill', theme.palette.success.main)
        .attr('font-weight', 'bold')
        .text(`P(tunneling): ${calculatedProbability.toExponential(4)}`);
    }
    
  }, [tunnelingData, width, height, showWaveFunction, showTunnelingProbability, 
      showClassicalTurningPoint, calculatedProbability, energyKeV, theme]);

  return (
    <Box sx={{ 
      width: '100%', 
      height: 'auto', 
      position: 'relative', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center' 
    }}>
      {loading && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      
      <svg 
        ref={svgRef} 
        width={width} 
        height={height}
        style={{ 
          visibility: loading ? 'hidden' : 'visible',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
      
      {tunnelingData && (
        <Box sx={{ width: '100%', mt: 2, px: 2 }}>
          <Typography variant="body2" color="textSecondary" align="center">
            {`Potential type: ${potentialType.charAt(0).toUpperCase() + potentialType.slice(1)} | 
              Temperature: ${temperature} K | 
              Electron screening: ${electronScreeningFactor.toFixed(2)}x`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

QuantumTunnelingVisualizer.propTypes = {
  potentialType: PropTypes.oneOf(['coulomb', 'yukawa', 'morse']),
  z1: PropTypes.number,
  z2: PropTypes.number,
  temperature: PropTypes.number,
  pressure: PropTypes.number,
  electronScreeningFactor: PropTypes.number,
  energyKeV: PropTypes.number,
  showWaveFunction: PropTypes.bool,
  showTunnelingProbability: PropTypes.bool,
  showClassicalTurningPoint: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  onProbabilityCalculated: PropTypes.func
};

export default QuantumTunnelingVisualizer; 