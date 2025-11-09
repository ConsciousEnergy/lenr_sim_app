import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';

const VisualizerContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '400px',
  position: 'relative',
  overflow: 'hidden'
}));

const Canvas = styled('canvas')({
  width: '100%',
  height: '100%',
});

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 10
}));

/**
 * A simplified 2D visualization for LENR simulations
 * Uses Canvas API for better performance on low-end devices
 */
const SimplifiedLatticeVisualizer = ({ simulationData, isLoading = false }) => {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setDimensions({ width, height });
        
        // Update canvas dimensions
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Redraw
        drawVisualization();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw visualization based on simulation data
  const drawVisualization = () => {
    if (!canvasRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set background
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw lattice
      const cellSize = Math.min(canvas.width, canvas.height) / 20;
      const offsetX = canvas.width / 2 - cellSize * 5;
      const offsetY = canvas.height / 2 - cellSize * 5;
      
      // Draw grid
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= 10; i++) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + i * cellSize);
        ctx.lineTo(offsetX + 10 * cellSize, offsetY + i * cellSize);
        ctx.stroke();
        
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(offsetX + i * cellSize, offsetY);
        ctx.lineTo(offsetX + i * cellSize, offsetY + 10 * cellSize);
        ctx.stroke();
      }
      
      // Draw atoms from simulation data if available
      if (simulationData && simulationData.atoms) {
        simulationData.atoms.forEach(atom => {
          const x = offsetX + (atom.x + 5) * cellSize;
          const y = offsetY + (atom.y + 5) * cellSize;
          const radius = cellSize * 0.4;
          
          // Different colors for different elements
          if (atom.element === 'palladium') {
            ctx.fillStyle = '#a8a8a8';
          } else if (atom.element === 'hydrogen' || atom.element === 'deuterium') {
            ctx.fillStyle = '#6495ED';
          } else {
            ctx.fillStyle = '#FF7F50';
          }
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.strokeStyle = '#444';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      } else {
        // Draw placeholder atoms
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            if ((i + j) % 2 === 0) {
              const x = offsetX + (i + 0.5) * cellSize;
              const y = offsetY + (j + 0.5) * cellSize;
              const radius = cellSize * 0.4;
              
              ctx.fillStyle = '#a8a8a8';
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, 2 * Math.PI);
              ctx.fill();
              
              ctx.strokeStyle = '#444';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }
      
      // Add legend
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.fillText('Simplified 2D Lattice View', 10, 20);
      
    } catch (err) {
      console.error('Error drawing visualization:', err);
      setError('Failed to render visualization');
    }
  };

  // Draw visualization when simulation data changes
  useEffect(() => {
    drawVisualization();
  }, [simulationData, dimensions]);

  return (
    <VisualizerContainer>
      {isLoading && (
        <LoadingOverlay>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading visualization...
          </Typography>
        </LoadingOverlay>
      )}
      
      {error && (
        <Box sx={{ p: 2, color: 'error.main' }}>
          <Typography variant="body2">
            {error}
          </Typography>
        </Box>
      )}
      
      <Canvas ref={canvasRef} />
    </VisualizerContainer>
  );
};

export default SimplifiedLatticeVisualizer; 