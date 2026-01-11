import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';

// Simple bubble fusion visualization component
// In a real implementation, this would use Three.js, D3, or another visualization library
const BubbleFusionVisualizer = ({
  initialRadius,
  drivingPressureAmplitude,
  frequency,
  showPressureField,
  showTemperatureField,
  showCollapse,
  width = 800,
  height = 600,
  onRenderComplete
}) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef(null);
  
  // Calculated values based on parameters
  const collapseTime = useRef(null);
  const maxTemperature = useRef(null);
  const minRadius = useRef(null);
  
  // Animation settings
  const fps = 30;
  const animationDuration = 2000; // ms
  const animationPeriod = 1 / frequency * 1000; // ms
  
  // Calculate derived parameters
  useEffect(() => {
    // Calculate collapse parameters based on input parameters
    // These are simplified approximations for visualization purposes
    collapseTime.current = 0.5 / frequency; // Approximate collapse time (s)
    maxTemperature.current = (1 + drivingPressureAmplitude) * 1000; // Rough temperature estimate (K)
    minRadius.current = initialRadius / (1 + drivingPressureAmplitude * 5); // Simple approximation
    
    // Reset animation
    setAnimationTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Delay to simulate loading
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initialRadius, drivingPressureAmplitude, frequency]);
  
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
      
      pressureGradient.addColorStop(0, `rgba(100, 149, 237, ${pressureWaveIntensity * 0.1})`);
      pressureGradient.addColorStop(0.7, `rgba(100, 149, 237, ${pressureWaveIntensity * 0.05})`);
      pressureGradient.addColorStop(1, 'rgba(100, 149, 237, 0)');
      
      ctx.fillStyle = pressureGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Draw pressure waves
      ctx.strokeStyle = `rgba(70, 130, 230, ${pressureWaveIntensity * 0.4})`;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 5; i++) {
        const radius = (i / 5 + normalizedTime) * height / 2;
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
    
    // Display radius text
    ctx.fillStyle = 'rgba(50, 50, 100, 0.8)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Radius: ${currentRadius.toFixed(1)} μm`, centerX, centerY + radiusPixels + 30);
    
    // Display phase information
    let phaseText = '';
    if (normalizedTime < 0.4) phaseText = 'Expansion';
    else if (normalizedTime < 0.42) phaseText = 'Collapse';
    else if (normalizedTime < 0.45) phaseText = 'Rebound';
    else phaseText = 'Recovery';
    
    ctx.fillText(phaseText, centerX, centerY + radiusPixels + 50);
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
    if (!isLoading && onRenderComplete) {
      // Calculate mock fusion probability based on parameters
      const fusionProbability = Math.exp(-10 / drivingPressureAmplitude) * 1e-20;
      onRenderComplete(fusionProbability);
    }
  }, [isLoading, drivingPressureAmplitude, onRenderComplete]);
  
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
              Initializing visualization...
            </Typography>
          </Box>
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
      
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Frequency: {frequency} kHz | Pressure: {drivingPressureAmplitude.toFixed(1)} bar | Initial Radius: {initialRadius.toFixed(1)} μm
        </Typography>
        
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
          Note: This is a simplified visualization for educational purposes
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
  onRenderComplete: PropTypes.func
};

BubbleFusionVisualizer.defaultProps = {
  initialRadius: 10.0,
  drivingPressureAmplitude: 1.2,
  frequency: 20,
  showPressureField: true,
  showTemperatureField: true,
  showCollapse: true,
  width: 800,
  height: 600,
  onRenderComplete: () => {}
};

export default BubbleFusionVisualizer; 