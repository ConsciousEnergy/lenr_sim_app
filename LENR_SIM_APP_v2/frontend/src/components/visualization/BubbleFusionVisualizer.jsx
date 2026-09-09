import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import api from '../../services/api';

// Bubble fusion visualization component with real physics calculations
const BubbleFusionVisualizer = ({
  initialRadius = 10.0,
  drivingPressureAmplitude = 1.2,
  frequency = 20,
  showPressureField = false,
  showTemperatureField = true,
  showCollapse = true,
  width = 800,
  height = 600,
  onRenderComplete = () => {},
  fluidType = 'water',
  gasType = 'deuterium',
  gasFraction = 0.8
}) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_animationTime, setAnimationTime] = useState(0);
  const [physicsData, setPhysicsData] = useState(null);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [error, setError] = useState(null);
  const animationRef = useRef(null);
  
  // Calculated values based on parameters
  const collapseTime = useRef(null);
  const maxTemperature = useRef(null);
  const minRadius = useRef(null);
  
  // Animation settings
  const _fps = 30;
  const _animationDuration = 2000; // ms
  const animationPeriod = 1 / frequency * 1000; // ms
  
  // Fetch physics calculation from backend
  useEffect(() => {
    const fetchPhysicsData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Same-origin Caddy only proxies /api/* — bare /physics misses the backend.
        const response = await api.post('/api/physics/bubble-fusion', {
          initial_radius_um: initialRadius,
          acoustic_pressure_bar: drivingPressureAmplitude,
          frequency_khz: frequency,
          ambient_pressure_bar: 1.0,
          ambient_temperature_k: 298.0,
          fluid_type: fluidType,
          gas_type: gasType,
          gas_fraction: gasFraction
        });
        
        const data = response;
        setIsLocalFallback(false);
        setPhysicsData(data);
        
        // Update refs with real physics values
        if (data.collapse_results) {
          collapseTime.current = data.collapse_results.collapse_time_ns / 1e9;
          maxTemperature.current = data.collapse_results.max_temperature_k;
          minRadius.current = data.collapse_results.min_radius_um;
        }
        
        console.log('Bubble fusion calculation:', data.collapse_results);
      } catch (err) {
        console.warn('API call failed, using fallback calculations', err);
        setError(err.message || 'Failed to fetch physics data');
        setIsLocalFallback(true);
        
        // Fallback to approximations
        collapseTime.current = 0.5 / frequency;
        maxTemperature.current = (1 + drivingPressureAmplitude) * 1000;
        minRadius.current = initialRadius / (1 + drivingPressureAmplitude * 5);
        const compressionRatio = initialRadius / Math.max(minRadius.current, 1e-9);
        
        // Create fallback physics data for onRenderComplete
        const fallbackData = {
          collapse_results: {
            max_temperature_k: maxTemperature.current,
            min_radius_um: minRadius.current,
            collapse_time_ns: collapseTime.current * 1e9,
            max_pressure_gpa: null,
            compression_ratio: compressionRatio,
            peak_velocity_km_s: null,
            fusion_probability: 0 // Zero probability for fallback
          }
        };
        setPhysicsData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPhysicsData();
    
    // Reset animation
    setAnimationTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initialRadius, drivingPressureAmplitude, frequency, fluidType, gasType, gasFraction]);
  
  // Function to render a frame
  const renderFrame = useCallback((time) => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Center coordinates
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate normalized time within the period (0-1)
    const normalizedTime = (time % animationPeriod) / animationPeriod;
    
    // Background gradient for pressure field
    if (showPressureField) {
      const pressureGradient = ctx.createRadialGradient(
        centerX, centerY, 0, 
        centerX, centerY, height / 2
      );
      
      // Pressure wave visualization
      const pressureWaveOffset = Math.sin(normalizedTime * 2 * Math.PI);
      const pressureWaveIntensity = 0.5 + 0.5 * pressureWaveOffset;
      
      // Keep rings behind HUD text: low opacity, thin strokes.
      pressureGradient.addColorStop(0, `rgba(100, 149, 237, ${pressureWaveIntensity * 0.04})`);
      pressureGradient.addColorStop(0.7, `rgba(100, 149, 237, ${pressureWaveIntensity * 0.02})`);
      pressureGradient.addColorStop(1, 'rgba(100, 149, 237, 0)');
      
      ctx.fillStyle = pressureGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Draw pressure waves
      ctx.strokeStyle = `rgba(70, 130, 230, ${pressureWaveIntensity * 0.12})`;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 3; i++) {
        const radius = (i / 3 + normalizedTime) * height / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    
    // Calculate current bubble radius
    // Use a modified sine wave to simulate Rayleigh-Plesset dynamics
    let radiusFactor;
    
    if (normalizedTime < 0.4) {
      // Expansion phase
      radiusFactor = 1 + drivingPressureAmplitude * 0.5 * Math.sin(normalizedTime / 0.4 * Math.PI / 2);
    } else if (normalizedTime < 0.42) {
      // Collapse phase (rapid)
      const collapseProgress = (normalizedTime - 0.4) / 0.02;
      radiusFactor = 1 + drivingPressureAmplitude * 0.5 - 
                    (drivingPressureAmplitude * 0.5 + 0.8) * collapseProgress;
    } else if (normalizedTime < 0.45) {
      // Minimum size and rebound
      const reboundProgress = (normalizedTime - 0.42) / 0.03;
      radiusFactor = 0.2 + 0.6 * reboundProgress;
    } else {
      // Return to equilibrium
      const recoveryProgress = (normalizedTime - 0.45) / 0.55;
      radiusFactor = 0.8 + 0.2 * recoveryProgress;
    }
    
    const currentRadius = initialRadius * radiusFactor;
    const radiusPixels = Math.max(2, currentRadius * 5); // Scale for visibility
    
    // Temperature visualization
    if (showTemperatureField && normalizedTime >= 0.4 && normalizedTime <= 0.44) {
      // Heat during collapse
      const temperatureFactor = 1 - (radiusFactor - 0.2) / 0.8;
      
      if (temperatureFactor > 0) {
        const tempGradient = ctx.createRadialGradient(
          centerX, centerY, 0, 
          centerX, centerY, radiusPixels * 2
        );
        
        tempGradient.addColorStop(0, `rgba(255, 100, 50, ${temperatureFactor * 0.8})`);
        tempGradient.addColorStop(0.5, `rgba(255, 200, 50, ${temperatureFactor * 0.4})`);
        tempGradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
        
        ctx.fillStyle = tempGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusPixels * 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    // Draw bubble
    const bubbleGradient = ctx.createRadialGradient(
      centerX - radiusPixels * 0.3, centerY - radiusPixels * 0.3, 0,
      centerX, centerY, radiusPixels
    );
    
    bubbleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    bubbleGradient.addColorStop(0.8, 'rgba(200, 200, 255, 0.4)');
    bubbleGradient.addColorStop(1, 'rgba(150, 150, 200, 0.1)');
    
    ctx.fillStyle = bubbleGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusPixels, 0, 2 * Math.PI);
    ctx.fill();
    
    // Bubble outline
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw collapse flash
    if (showCollapse && normalizedTime >= 0.41 && normalizedTime <= 0.43) {
      const flashIntensity = 1 - Math.abs((normalizedTime - 0.42) / 0.01);
      ctx.fillStyle = `rgba(255, 255, 200, ${flashIntensity * 0.7})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radiusPixels * 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add some "particle" effects during flash
      if (flashIntensity > 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = radiusPixels * (2 + Math.random() * 2);
          const particleSize = 1 + Math.random() * 2;
          ctx.beginPath();
          ctx.arc(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            particleSize,
            0, 2 * Math.PI
          );
          ctx.fill();
        }
      }
    }
    
    // Fixed HUD (do not track the animating radius — that makes labels bounce).
    let phaseText = '';
    if (normalizedTime < 0.4) phaseText = 'Expansion';
    else if (normalizedTime < 0.42) phaseText = 'Collapse';
    else if (normalizedTime < 0.45) phaseText = 'Rebound';
    else phaseText = 'Recovery';

    const hudLines = [
      `Radius: ${currentRadius.toFixed(1)} μm`,
      phaseText,
    ];
    const hudPadX = 12;
    const hudPadY = 8;
    const hudLineH = 18;
    const hudW = 168;
    const hudH = hudPadY * 2 + hudLineH * hudLines.length;
    const hudX = Math.max(8, centerX - hudW / 2);
    const hudY = height - hudH - 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.strokeStyle = 'rgba(30, 40, 80, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(hudX, hudY, hudW, hudH, 6);
    } else {
      ctx.rect(hudX, hudY, hudW, hudH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillStyle = 'rgba(25, 35, 70, 0.95)';
    hudLines.forEach((line, i) => {
      const ty = hudY + hudPadY + hudLineH * (i + 0.5);
      const tx = hudX + hudPadX;
      ctx.strokeText(line, tx, ty);
      ctx.fillText(line, tx, ty);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRadius, drivingPressureAmplitude, frequency, animationPeriod, showPressureField, showTemperatureField, showCollapse]);
  
  // Animation loop
  useEffect(() => {
    if (isLoading || !canvasRef.current) return;
    
    let startTime = null;
    
    // Animation function
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Update time
      setAnimationTime(elapsed);
      
      // Render frame
      renderFrame(elapsed);
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLoading, renderFrame]);
  
  // Set canvas dimensions
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, [width, height]);
  
  // Trigger completion callback after rendering is done
  useEffect(() => {
    if (!isLoading && onRenderComplete && physicsData) {
      const fusionProbability = physicsData.collapse_results?.fusion_probability || 0;
      onRenderComplete(fusionProbability);
    }
  }, [isLoading, physicsData, onRenderComplete]);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Typography variant="h6" gutterBottom align="center">
        Bubble Fusion Visualization
      </Typography>
      
      <Box
        sx={{
          position: 'relative',
          width: width,
          height: height,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="textSecondary">
              Computing bubble dynamics...
            </Typography>
          </Box>
        ) : null}
        
        {error && !isLoading ? (
          <Typography 
            variant="caption" 
            color="warning.main" 
            sx={{ 
              position: 'absolute', 
              top: 8, 
              left: 8, 
              backgroundColor: 'rgba(255,255,255,0.8)', 
              px: 1, 
              borderRadius: 1 
            }}
          >
            Using approximate calculations
          </Typography>
        ) : null}
        
        <canvas
          ref={canvasRef}
          style={{
            display: isLoading ? 'none' : 'block',
            width: '100%',
            height: '100%'
          }}
        />
      </Box>
      
      {/* Physics Results Display */}
      {physicsData && physicsData.collapse_results && (
        <Paper elevation={2} sx={{ mt: 2, p: 2, width: '100%', maxWidth: 600 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            {isLocalFallback
              ? 'Collapse Results (Local Schematic Fallback)'
              : 'Collapse Results (Physics Engine)'}
          </Typography>
          {isLocalFallback && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>
              Backend unreachable — values are approximate and must not be cited as engine output.
            </Typography>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            <Typography variant="body2">
              <strong>Max Temperature:</strong> {physicsData.collapse_results.max_temperature_k?.toFixed(0) ?? 'N/A'} K
            </Typography>
            <Typography variant="body2">
              <strong>Max Pressure:</strong>{' '}
              {physicsData.collapse_results.max_pressure_gpa != null
                ? `${Number(physicsData.collapse_results.max_pressure_gpa).toFixed(2)} GPa`
                : 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Min Radius:</strong> {physicsData.collapse_results.min_radius_um?.toFixed(3) ?? 'N/A'} μm
            </Typography>
            <Typography variant="body2">
              <strong>Compression:</strong>{' '}
              {physicsData.collapse_results.compression_ratio != null
                ? `${Number(physicsData.collapse_results.compression_ratio).toFixed(1)}×`
                : 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Collapse Time:</strong> {physicsData.collapse_results.collapse_time_ns?.toFixed(1) ?? 'N/A'} ns
            </Typography>
            <Typography variant="body2">
              <strong>Peak Velocity:</strong>{' '}
              {physicsData.collapse_results.peak_velocity_km_s != null
                ? `${Number(physicsData.collapse_results.peak_velocity_km_s).toFixed(2)} km/s`
                : 'N/A'}
            </Typography>
          </Box>
          {physicsData.collapse_results.conditions_met && (
            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color={physicsData.collapse_results.conditions_met.temperature_threshold ? 'success.main' : 'error.main'}>
                Temperature Threshold: {physicsData.collapse_results.conditions_met.temperature_threshold ? '✓' : '✗'}
              </Typography>
              {' | '}
              <Typography variant="caption" color={physicsData.collapse_results.conditions_met.pressure_threshold ? 'success.main' : 'error.main'}>
                Pressure Threshold: {physicsData.collapse_results.conditions_met.pressure_threshold ? '✓' : '✗'}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Frequency: {frequency} kHz | Pressure: {drivingPressureAmplitude.toFixed(1)} bar | Initial Radius: {initialRadius.toFixed(1)} μm
        </Typography>
        
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
          Using WKB approximation with Rayleigh-Plesset dynamics
        </Typography>
      </Box>
    </Box>
  );
};

BubbleFusionVisualizer.propTypes = {
  initialRadius: PropTypes.number,
  drivingPressureAmplitude: PropTypes.number,
  frequency: PropTypes.number,
  showPressureField: PropTypes.bool,
  showTemperatureField: PropTypes.bool,
  showCollapse: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  onRenderComplete: PropTypes.func,
  fluidType: PropTypes.string,
  gasType: PropTypes.string,
  gasFraction: PropTypes.number
};


export default BubbleFusionVisualizer; 