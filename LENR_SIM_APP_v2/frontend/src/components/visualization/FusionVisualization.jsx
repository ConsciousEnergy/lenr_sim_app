import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  useTheme,
  Slider,
  IconButton,
  Paper,
  Tooltip,
  Stack,
  LinearProgress
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import * as d3 from 'd3';

/**
 * Basic 2D fusion reaction visualization component with time-evolution capabilities
 */
const FusionVisualization = ({
  reactionType = 'd-d',
  latticeType = 'palladium',
  temperature = 300,
  loadingRatio = 0.8,
  latticeDimension = 3,
  defectDensity = 0.01,
  showLattice = true,
  showDiffusion = true,
  showHotSpots = true,
  width = 800,
  height = 500
}) => {
  const theme = useTheme();
  const svgRef = useRef(null);
  const animationRef = useRef(null);
  const [loading, setLoading] = useState(true);
  
  // Time evolution states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeStep, setCurrentTimeStep] = useState(0);
  const [timeSteps, setTimeSteps] = useState(100); // Total number of time steps
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Playback speed multiplier
  const [simulationProgress, setSimulationProgress] = useState(0);
  
  // Generate time-dependent simulation data
  const generateTimeStepData = useCallback((timeStep) => {
    const normalizedTime = timeStep / timeSteps; // 0 to 1
    
    // Create temperature that increases over time
    const timeBasedTemperature = temperature * (1 + normalizedTime * 0.5);
    
    // Create loading ratio that fluctuates slightly over time
    const timeBasedLoadingRatio = loadingRatio * (1 + Math.sin(normalizedTime * Math.PI * 4) * 0.1);
    
    // Create defect density that varies over time
    const timeBasedDefectDensity = defectDensity * (1 + Math.cos(normalizedTime * Math.PI * 2) * 0.2);
    
    return {
      timeStep,
      normalizedTime,
      temperature: timeBasedTemperature,
      loadingRatio: timeBasedLoadingRatio,
      defectDensity: timeBasedDefectDensity,
      reactionRate: 0.01 + normalizedTime * 0.1 * Math.pow(timeBasedTemperature / temperature, 2)
    };
  }, [temperature, loadingRatio, defectDensity, timeSteps]);
  
  // Toggle play/pause
  const togglePlayback = () => {
    setIsPlaying(prevState => !prevState);
  };
  
  // Reset simulation
  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentTimeStep(0);
    setSimulationProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
  
  // Step forward one frame
  const stepForward = () => {
    if (currentTimeStep < timeSteps - 1) {
      setCurrentTimeStep(prev => prev + 1);
      setSimulationProgress(((currentTimeStep + 1) / timeSteps) * 100);
    }
  };
  
  // Step backward one frame
  const stepBackward = () => {
    if (currentTimeStep > 0) {
      setCurrentTimeStep(prev => prev - 1);
      setSimulationProgress(((currentTimeStep - 1) / timeSteps) * 100);
    }
  };
  
  // Change speed
  const increaseSpeed = () => {
    setPlaybackSpeed(prev => Math.min(prev * 2, 8));
  };
  
  const decreaseSpeed = () => {
    setPlaybackSpeed(prev => Math.max(prev / 2, 0.5));
  };
  
  // Handle time slider change
  const handleTimeSliderChange = (event, newValue) => {
    setCurrentTimeStep(newValue);
    setSimulationProgress((newValue / timeSteps) * 100);
  };
  
  // Animation loop for time evolution
  useEffect(() => {
    if (!isPlaying) return;
    
    const animate = () => {
      setCurrentTimeStep(prevTimeStep => {
        // Loop back to beginning when we reach the end
        if (prevTimeStep >= timeSteps - 1) {
          return 0;
        }
        return prevTimeStep + playbackSpeed;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, timeSteps, playbackSpeed]);
  
  // Update progress when time step changes
  useEffect(() => {
    setSimulationProgress((currentTimeStep / timeSteps) * 100);
  }, [currentTimeStep, timeSteps]);
  
  // Get current time step data
  const timeStepData = generateTimeStepData(currentTimeStep);
  
  // Generate visualization data based on current time step
  useEffect(() => {
    if (!svgRef.current) return;
    
    setLoading(true);
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Get time-dependent parameters
    const {
      temperature: timeBasedTemperature,
      loadingRatio: timeBasedLoadingRatio,
      defectDensity: timeBasedDefectDensity,
      reactionRate
    } = timeStepData;
    
    // Basic simulation constants
    const latticeConstants = {
      'palladium': 3.89, // Å
      'nickel': 3.52,    // Å
      'titanium': 2.95,  // Å
      'platinum': 3.92   // Å
    };
    
    const atomColors = {
      'palladium': '#6E6E6E',
      'nickel': '#808080',
      'titanium': '#A0A0A0',
      'platinum': '#C0C0C0',
      'deuterium': '#65A5D1',
      'tritium': '#3E78C0',
      'hydrogen': '#5098D1',
      'boron': '#D16565'
    };
    
    // Calculate number of cells to display
    const cellSize = 40;
    const cellsX = Math.floor(width / cellSize);
    const cellsY = Math.floor(height / cellSize);
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Add timestamp indicator
    svg.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('fill', theme.palette.text.secondary)
      .attr('font-size', '12px')
      .text(`Time: ${currentTimeStep.toFixed(0)}/${timeSteps} (${(timeStepData.normalizedTime * 100).toFixed(1)}%)`);
    
    // Create lattice background if enabled
    if (showLattice) {
      // Draw lattice grid
      const latticeGroup = svg.append('g')
        .attr('class', 'lattice-group');

      // Create grid pattern
      for (let x = 0; x < cellsX; x++) {
        for (let y = 0; y < cellsY; y++) {
          const isDefect = Math.random() < timeBasedDefectDensity;
          
          latticeGroup.append('rect')
            .attr('x', x * cellSize)
            .attr('y', y * cellSize)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', 'none')
            .attr('stroke', theme.palette.divider)
            .attr('stroke-width', 0.5);
            
          // Add host lattice atoms (corners)
          latticeGroup.append('circle')
            .attr('cx', x * cellSize)
            .attr('cy', y * cellSize)
            .attr('r', cellSize / 10)
            .attr('fill', isDefect ? theme.palette.error.light : atomColors[latticeType])
            .attr('opacity', isDefect ? 0.8 : 0.6);
            
          // FCC structure - add atoms in face centers if 3D lattice
          if (latticeDimension === 3) {
            latticeGroup.append('circle')
              .attr('cx', x * cellSize + cellSize / 2)
              .attr('cy', y * cellSize + cellSize / 2)
              .attr('r', cellSize / 10)
              .attr('fill', isDefect ? theme.palette.error.light : atomColors[latticeType])
              .attr('opacity', isDefect ? 0.8 : 0.6);
          }
        }
      }
      
      // Add deuterium/hydrogen atoms based on loading ratio
      const fuelGroup = svg.append('g')
        .attr('class', 'fuel-group');
      
      // Determine which fuel atom to use based on reaction type
      let fuelAtom1, fuelAtom2;
      switch (reactionType) {
        case 'd-d':
          fuelAtom1 = 'deuterium';
          fuelAtom2 = 'deuterium';
          break;
        case 'd-t':
          fuelAtom1 = 'deuterium';
          fuelAtom2 = 'tritium';
          break;
        case 'p-B11':
          fuelAtom1 = 'hydrogen';
          fuelAtom2 = 'boron';
          break;
        default:
          fuelAtom1 = 'deuterium';
          fuelAtom2 = 'deuterium';
      }
      
      // Add fuel atoms - placed within octahedral sites
      for (let x = 0; x < cellsX; x++) {
        for (let y = 0; y < cellsY; y++) {
          if (Math.random() < timeBasedLoadingRatio) {
            const fuelType = Math.random() > 0.5 ? fuelAtom1 : fuelAtom2;
            
            // Add time-based motion to the fuel atoms
            const offsetX = 0.3 + Math.sin(currentTimeStep * 0.1 + x * 0.5 + y * 0.5) * 0.05;
            const offsetY = 0.3 + Math.cos(currentTimeStep * 0.1 + x * 0.5 + y * 0.5) * 0.05;
            
            fuelGroup.append('circle')
              .attr('cx', x * cellSize + cellSize * offsetX)
              .attr('cy', y * cellSize + cellSize * offsetY)
              .attr('r', cellSize / 12)
              .attr('fill', atomColors[fuelType])
              .attr('opacity', 0.7)
              .attr('class', 'fuel-atom');
          }
        }
      }
    }
    
    // Add diffusion pathways if enabled
    if (showDiffusion) {
      const diffusionGroup = svg.append('g')
        .attr('class', 'diffusion-group');
      
      // Create random diffusion paths
      const numPaths = Math.floor(timeBasedLoadingRatio * 40);
      
      for (let i = 0; i < numPaths; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        
        // Create a path with multiple segments
        const numSegments = 4 + Math.floor(Math.random() * 8);
        let pathData = `M ${startX} ${startY}`;
        
        let currentX = startX;
        let currentY = startY;
        
        // Time-dependent factor for path generation
        const timeFactor = (Math.sin(currentTimeStep * 0.05 + i * 0.2) + 1) * 0.5;
        
        for (let j = 0; j < numSegments; j++) {
          const angle = Math.random() * Math.PI * 2 + currentTimeStep * 0.01 * (i % 2 === 0 ? 1 : -1);
          const distance = (20 + Math.random() * 60) * (0.8 + timeFactor * 0.4);
          
          currentX += Math.cos(angle) * distance;
          currentY += Math.sin(angle) * distance;
          
          // Keep within bounds
          currentX = Math.max(0, Math.min(width, currentX));
          currentY = Math.max(0, Math.min(height, currentY));
          
          pathData += ` L ${currentX} ${currentY}`;
        }
        
        diffusionGroup.append('path')
          .attr('d', pathData)
          .attr('fill', 'none')
          .attr('stroke', theme.palette.info.main)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.5);
      }
    }
    
    // Add reaction hot spots if enabled
    if (showHotSpots) {
      const hotSpotGroup = svg.append('g')
        .attr('class', 'hotspot-group');
      
      // Number of hotspots scales with temperature and defect density
      const hotspotFactor = timeBasedTemperature / 300 * (1 + timeBasedDefectDensity * 10);
      const numHotspots = Math.floor(6 * hotspotFactor);
      
      for (let i = 0; i < numHotspots; i++) {
        // Time-dependent positions
        const angle = currentTimeStep * 0.02 + i * (Math.PI * 2 / numHotspots);
        const distanceFactor = 0.3 + 0.1 * Math.sin(currentTimeStep * 0.05 + i * 0.5);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.4;
        
        const x = centerX + Math.cos(angle) * radius * distanceFactor + (Math.random() - 0.5) * 100;
        const y = centerY + Math.sin(angle) * radius * distanceFactor + (Math.random() - 0.5) * 100;
        
        // Hotspot size varies with time
        const hotspotSize = 20 + Math.random() * 30 + Math.sin(currentTimeStep * 0.1 + i) * 10;
        
        // Create hotspot glow
        const gradient = hotSpotGroup.append('radialGradient')
          .attr('id', `hotspot-gradient-${i}`)
          .attr('cx', '50%')
          .attr('cy', '50%')
          .attr('r', '50%');
          
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', theme.palette.warning.main)
          .attr('stop-opacity', 0.8);
          
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', theme.palette.warning.main)
          .attr('stop-opacity', 0);
          
        hotSpotGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', hotspotSize)
          .attr('fill', `url(#hotspot-gradient-${i})`)
          .attr('class', 'hotspot');
      }
    }
    
    // If it's a specific reaction type, add some animated particles
    const reactionGroup = svg.append('g')
      .attr('class', 'reaction-group');
      
    // Number of reactions scales with temperature and time
    const numReactions = Math.floor(5 * timeBasedTemperature / 300 * (0.5 + timeStepData.reactionRate));
    
    for (let i = 0; i < numReactions; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      
      // Create a particle
      reactionGroup.append('circle')
        .attr('cx', startX)
        .attr('cy', startY)
        .attr('r', 5 + Math.random() * 8)
        .attr('fill', theme.palette.error.main)
        .attr('opacity', 0.8)
        .attr('class', 'reaction-particle');
    }
    
    // Add time-dependent metrics
    const metricsGroup = svg.append('g')
      .attr('class', 'metrics-group');
      
    metricsGroup.append('text')
      .attr('x', width - 10)
      .attr('y', 20)
      .attr('text-anchor', 'end')
      .attr('fill', theme.palette.text.secondary)
      .attr('font-size', '12px')
      .text(`Temperature: ${timeBasedTemperature.toFixed(1)} K`);
      
    metricsGroup.append('text')
      .attr('x', width - 10)
      .attr('y', 40)
      .attr('text-anchor', 'end')
      .attr('fill', theme.palette.text.secondary)
      .attr('font-size', '12px')
      .text(`Reaction Rate: ${timeStepData.reactionRate.toFixed(4)}`);
    
    setLoading(false);
  }, [
    currentTimeStep,
    timeStepData,
    width, 
    height, 
    reactionType, 
    latticeType, 
    latticeDimension,
    showLattice,
    showDiffusion,
    showHotSpots,
    timeSteps,
    theme
  ]);
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {loading && (
          <CircularProgress 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
        )}
        
        <svg 
          ref={svgRef} 
          width={width} 
          height={height}
          style={{
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.5s ease'
          }}
        />
        
        {!showLattice && !showDiffusion && !showHotSpots && (
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            Enable visualization options to view lattice simulation
          </Typography>
        )}
        
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8
          }}
        >
          {reactionType.toUpperCase()} fusion in {latticeType} lattice at {timeStepData.temperature.toFixed(1)} K
        </Typography>
      </Box>
      
      {/* Time control panel */}
      <Paper
        sx={{
          width: '100%',
          p: 2,
          mt: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderRadius: '0 0 8px 8px'
        }}
      >
        <LinearProgress 
          variant="determinate" 
          value={simulationProgress} 
          sx={{ height: 8, borderRadius: 4, mb: 1 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Time Step: {currentTimeStep.toFixed(0)}/{timeSteps}
          </Typography>
          
          <Typography variant="caption" color="textSecondary">
            Speed: {playbackSpeed}x
          </Typography>
        </Box>
        
        <Slider
          value={currentTimeStep}
          min={0}
          max={timeSteps - 1}
          step={1}
          onChange={handleTimeSliderChange}
          aria-labelledby="time-slider"
          sx={{ mt: 1, mb: 2 }}
        />
        
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Reset">
            <IconButton onClick={resetSimulation} size="small">
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Decrease Speed">
            <IconButton onClick={decreaseSpeed} size="small">
              <FastRewindIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Previous Frame">
            <IconButton onClick={stepBackward} size="small">
              <SkipPreviousIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isPlaying ? "Pause" : "Play"}>
            <IconButton onClick={togglePlayback} color="primary">
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Next Frame">
            <IconButton onClick={stepForward} size="small">
              <SkipNextIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Increase Speed">
            <IconButton onClick={increaseSpeed} size="small">
              <FastForwardIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    </Box>
  );
};

FusionVisualization.propTypes = {
  reactionType: PropTypes.oneOf(['d-d', 'd-t', 'p-B11', 'custom']),
  latticeType: PropTypes.oneOf(['palladium', 'nickel', 'titanium', 'platinum', 'custom']),
  temperature: PropTypes.number,
  loadingRatio: PropTypes.number,
  latticeDimension: PropTypes.number,
  defectDensity: PropTypes.number,
  showLattice: PropTypes.bool,
  showDiffusion: PropTypes.bool,
  showHotSpots: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number
};

export default FusionVisualization; 