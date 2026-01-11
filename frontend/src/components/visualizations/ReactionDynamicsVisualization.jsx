import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Tabs,
  Tab,
  useTheme,
  FormControlLabel,
  Switch,
  Slider,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Button,
  Stack,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Science as ScienceIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  Fullscreen as FullscreenIcon,
  Timeline as TimelineIcon,
  Show as ShowIcon,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  MoreVert as MoreVertIcon,
  Save as SaveIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Surface,
  Contour,
  ReferenceArea,
  Brush,
  ReferenceLine
} from 'recharts';

// Import for 3D visualization
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

/**
 * Reaction Dynamics 3D Visualization Component
 * 
 * Renders the 3D visualization of quantum tunneling, potential barriers,
 * and reaction cross-sections
 */
const ReactionDynamics3D = ({ reactionData, potentialType = 'coulomb' }) => {
  const meshRef = useRef();
  
  // Animate the mesh
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  const generateGeometry = () => {
    // This would be more sophisticated in a real implementation
    // For now, generate a simple visualization based on the reaction type
    
    // For Coulomb barrier potential
    if (potentialType === 'coulomb') {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#1976d2" wireframe />
        </mesh>
      );
    }
    
    // For quantum tunneling probability
    if (potentialType === 'tunneling') {
      return (
        <group ref={meshRef}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 0.5, 2]} />
            <meshStandardMaterial color="#d32f2f" opacity={0.7} transparent />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <coneGeometry args={[0.5, 1, 32]} />
            <meshStandardMaterial color="#4caf50" />
          </mesh>
        </group>
      );
    }
    
    // Default visualization
    return (
      <mesh ref={meshRef}>
        <torusGeometry args={[1, 0.4, 16, 50]} />
        <meshStandardMaterial color="#ff9800" />
      </mesh>
    );
  };
  
  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      {generateGeometry()}
      <OrbitControls />
      <gridHelper args={[10, 10, `#888888`, `#444444`]} />
      <axesHelper args={[5]} />
    </Canvas>
  );
};

/**
 * Interactive Zoom Control for Charts
 */
const ZoomableLineChart = ({ 
  data, 
  xDataKey, 
  yDataKey, 
  xLabel, 
  yLabel, 
  lineColor,
  height = 300,
  onPointClick = null
}) => {
  const theme = useTheme();
  const [zoomState, setZoomState] = useState({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    top: 'dataMax+1',
    bottom: 'dataMin-1',
    animation: true,
  });

  // For zooming functionality
  const handleZoomIn = () => {
    if (zoomState.refAreaLeft === zoomState.refAreaRight || !zoomState.refAreaRight) {
      setZoomState({
        ...zoomState,
        refAreaLeft: '',
        refAreaRight: '',
      });
      return;
    }

    // Ensure left is always less than right
    let left = Math.min(zoomState.refAreaLeft, zoomState.refAreaRight);
    let right = Math.max(zoomState.refAreaLeft, zoomState.refAreaRight);

    setZoomState({
      ...zoomState,
      refAreaLeft: '',
      refAreaRight: '',
      left: left,
      right: right,
    });
  };

  const handleZoomOut = () => {
    setZoomState({
      ...zoomState,
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'dataMax+1',
      bottom: 'dataMin-1',
    });
  };

  const handleMouseDown = (e) => {
    if (!e) return;
    setZoomState({
      ...zoomState,
      refAreaLeft: e.activeLabel,
    });
  };

  const handleMouseMove = (e) => {
    if (!e) return;
    if (zoomState.refAreaLeft) {
      setZoomState({
        ...zoomState,
        refAreaRight: e.activeLabel,
      });
    }
  };

  const handleMouseUp = () => {
    if (zoomState.refAreaLeft === zoomState.refAreaRight || !zoomState.refAreaRight) {
      setZoomState({
        ...zoomState,
        refAreaLeft: '',
        refAreaRight: '',
      });
      return;
    }

    handleZoomIn();
  };

  return (
    <Box sx={{ width: '100%', height: height + 50, position: 'relative' }}>
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        right: 10, 
        zIndex: 10,
        display: 'flex',
        gap: 0.5
      }}>
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download Chart">
          <IconButton size="small" onClick={() => {
            // Generate and download an image of the chart
            // This is a placeholder for real download functionality
            alert('Chart download functionality would be implemented here');
          }}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={onPointClick}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xDataKey} 
            label={{ value: xLabel, position: 'insideBottomRight', offset: -5 }}
            allowDataOverflow
            domain={[zoomState.left, zoomState.right]}
            type="number"
          />
          <YAxis 
            label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
            allowDataOverflow
            domain={[zoomState.bottom, zoomState.top]}
          />
          <RechartsTooltip 
            formatter={(value, name) => {
              return [value.toExponential(4), name];
            }}
          />
          <Legend verticalAlign="top" />
          <Line 
            type="monotone" 
            dataKey={yDataKey} 
            name={yLabel} 
            stroke={lineColor || theme.palette.primary.main} 
            dot={{ r: 2 }}
            activeDot={{ r: 6, onClick: onPointClick }}
          />
          
          {zoomState.refAreaLeft && zoomState.refAreaRight ? (
            <ReferenceArea 
              x1={zoomState.refAreaLeft} 
              x2={zoomState.refAreaRight} 
              strokeOpacity={0.3} 
              fill={theme.palette.primary.light} 
              fillOpacity={0.3} 
            />
          ) : null}
          
          <Brush 
            dataKey={xDataKey} 
            height={30} 
            stroke={theme.palette.secondary.main}
            startIndex={0}
            endIndex={Math.min(20, data.length - 1)}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

/**
 * Interactive Quantum Tunneling Probability Visualization
 */
const QuantumTunnelingChart = ({ reaction, temperature, plotType = 'log' }) => {
  const theme = useTheme();
  const [selectedEnergy, setSelectedEnergy] = useState(null);
  const [visualizationType, setVisualizationType] = useState(plotType);
  
  // Calculate tunneling probability data
  // This would be more sophisticated in a real implementation
  const generateTunnelingData = () => {
    const data = [];
    
    // Calculate Coulomb barrier (simplified approximation)
    const coulombBarrier = 1.44 * reaction.reactant1_z * reaction.reactant2_z / 
      (1.4 * (Math.pow(reaction.reactant1_a, 1/3) + Math.pow(reaction.reactant2_a, 1/3)));
    
    // Generate tunneling probability vs energy data
    for (let energy = 0.1; energy <= 2 * coulombBarrier; energy += coulombBarrier / 20) {
      // Simple model for tunneling probability
      // P ≈ exp(-2π × (V₀-E)^(1/2) × a / ħ)
      // where V₀ is the barrier height, E is energy, a is barrier width
      
      let tunnelProb;
      if (energy >= coulombBarrier) {
        tunnelProb = 1.0; // Classical over-barrier
      } else {
        // Quantum tunneling (very simplified model)
        const barrierParameter = 2 * Math.sqrt(2 * (coulombBarrier - energy));
        tunnelProb = Math.exp(-barrierParameter);
      }
      
      data.push({
        energy,
        probabilityLog: Math.log10(tunnelProb), // Log scale for better visibility
        probability: tunnelProb,
        temperature: temperature
      });
    }
    
    return data;
  };
  
  const tunnelingData = generateTunnelingData();
  
  // Handle changing the visualization type
  const handleVisualizationChange = (event, newValue) => {
    if (newValue !== null) {
      setVisualizationType(newValue);
    }
  };
  
  // Handle clicking on a point in the chart
  const handlePointClick = (data) => {
    setSelectedEnergy(data.activePayload[0].payload.energy);
  };
  
  // Generate detail information for selected energy point
  const generateEnergyDetails = () => {
    if (!selectedEnergy) return null;
    
    const dataPoint = tunnelingData.find(d => d.energy === selectedEnergy);
    if (!dataPoint) return null;
    
    return (
      <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Energy Point Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">Energy:</Typography>
              <Typography variant="body1">{selectedEnergy.toFixed(2)} keV</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">Tunneling Probability:</Typography>
              <Typography variant="body1">{dataPoint.probability.toExponential(4)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">Coulomb Barrier Penetration:</Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgressWithLabel 
                  value={Math.min(100, (-Math.log10(dataPoint.probability) / 20) * 100)} 
                  color={dataPoint.probability > 1e-10 ? "success" : "warning"}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Quantum Tunneling Probability vs. Energy
        </Typography>
        
        <ToggleButtonGroup
          value={visualizationType}
          exclusive
          onChange={handleVisualizationChange}
          size="small"
        >
          <ToggleButton value="log" aria-label="logarithmic scale">
            <Tooltip title="Logarithmic Scale">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ mr: 0.5 }}>Log</Typography>
                <ShowIcon fontSize="small" />
              </Box>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="linear" aria-label="linear scale">
            <Tooltip title="Linear Scale">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ mr: 0.5 }}>Linear</Typography>
                <LineChartIcon fontSize="small" />
              </Box>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <ZoomableLineChart
        data={tunnelingData}
        xDataKey="energy"
        yDataKey={visualizationType === 'log' ? 'probabilityLog' : 'probability'}
        xLabel="Energy (keV)"
        yLabel={visualizationType === 'log' ? 'Log₁₀ Tunneling Probability' : 'Tunneling Probability'}
        lineColor={theme.palette.primary.main}
        height={300}
        onPointClick={handlePointClick}
      />
      
      {selectedEnergy && generateEnergyDetails()}
    </Box>
  );
};

/**
 * Linear progress bar with label
 */
const LinearProgressWithLabel = ({ value, color = "primary" }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <Box
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundImage: `linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)`,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: `${value}%`,
              top: -10,
              transform: 'translateX(-50%)',
            }}
          >
            <Typography variant="caption">▼</Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(value)}%`}</Typography>
      </Box>
    </Box>
  );
};

/**
 * Reaction Path Energy Visualization
 * 
 * Visualizes the energy along the reaction path, including
 * intermediate states and transition states
 */
const ReactionPathChart = ({ reaction }) => {
  const theme = useTheme();
  const [animationActive, setAnimationActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef(null);
  
  // Generate reaction path data
  // This would be more sophisticated in a real implementation
  const generatePathData = () => {
    // Calculate total charge and mass
    const reactantCharge = reaction.reactant1_z + reaction.reactant2_z;
    const reactantMass = reaction.reactant1_a + reaction.reactant2_a;
    
    // Calculate Coulomb barrier (simplified approximation)
    const coulombBarrier = 1.44 * reaction.reactant1_z * reaction.reactant2_z / 
      (1.4 * (Math.pow(reaction.reactant1_a, 1/3) + Math.pow(reaction.reactant2_a, 1/3)));
    
    // Create data points along reaction path
    const pathData = [
      // Initial state (separated reactants)
      { position: 0, energy: 0, state: 'Initial Reactants' },
      
      // Approaching (feel Coulomb repulsion)
      { position: 1, energy: coulombBarrier * 0.3, state: 'Approaching' },
      
      // Maximum of Coulomb barrier
      { position: 2, energy: coulombBarrier, state: 'Coulomb Barrier' },
      
      // Nuclear interaction zone (tunneling region)
      { position: 3, energy: coulombBarrier * 0.8, state: 'Nuclear Interaction' },
      
      // Compound nucleus (temporary merged state)
      { position: 4, energy: coulombBarrier * 0.5, state: 'Compound Nucleus' },
      
      // Transition to products
      { position: 5, energy: coulombBarrier * 0.2, state: 'Product Formation' },
      
      // Final products state
      { position: 6, energy: -reaction.q_value, state: 'Final Products' }
    ];
    
    return pathData;
  };
  
  const pathData = generatePathData();
  
  // Handle animation control
  useEffect(() => {
    if (animationActive) {
      animationRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= pathData.length) {
            // Stop animation at the end
            setAnimationActive(false);
            return 0;
          }
          return next;
        });
      }, 1000 / playbackSpeed);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [animationActive, playbackSpeed, pathData.length]);
  
  // Handle playback control
  const handlePlayPause = () => {
    setAnimationActive(!animationActive);
  };
  
  const handleNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, pathData.length - 1));
  };
  
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };
  
  const handleReset = () => {
    setAnimationActive(false);
    setCurrentStep(0);
  };
  
  const handleSpeedChange = (event, newValue) => {
    setPlaybackSpeed(newValue);
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Reaction Energy Path
      </Typography>
      
      <Box sx={{ height: 300, width: '100%', mb: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={pathData}
            margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="position" 
              label={{ value: 'Reaction Coordinate', position: 'insideBottomRight', offset: -5 }} 
              ticks={[0, 1, 2, 3, 4, 5, 6]}
            />
            <YAxis 
              label={{ value: 'Energy (MeV)', angle: -90, position: 'insideLeft' }}
            />
            <RechartsTooltip 
              formatter={(value, name, props) => {
                if (name === 'energy') {
                  return [value.toFixed(3) + ' MeV', 'Energy'];
                }
                return [value, name];
              }}
              labelFormatter={(value) => {
                const point = pathData[value];
                return point ? point.state : '';
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="energy" 
              name="Reaction Energy" 
              stroke={theme.palette.primary.main} 
              dot={{ stroke: theme.palette.primary.dark, strokeWidth: 2, r: 4 }}
              activeDot={{ stroke: theme.palette.primary.dark, strokeWidth: 2, r: 6 }}
            />
            
            {/* Current step indicator */}
            <ReferenceLine 
              x={currentStep} 
              stroke={theme.palette.secondary.main} 
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: "Current",
                position: "top",
                fill: theme.palette.secondary.main
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {pathData[currentStep]?.state || "Reaction State"}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Energy: {pathData[currentStep]?.energy.toFixed(3)} MeV
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {getReactionStepDescription(currentStep)}
          </Typography>
        </Card>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="caption" gutterBottom display="block">
            Reaction Path Progress:
          </Typography>
          <Slider 
            value={currentStep}
            step={1}
            marks
            min={0}
            max={pathData.length - 1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => pathData[value]?.state || ""}
            onChange={(e, newValue) => setCurrentStep(newValue)}
            sx={{ width: 300, mr: 2 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handlePrevStep}>
            <PrevIcon />
          </IconButton>
          <IconButton onClick={handlePlayPause}>
            {animationActive ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton onClick={handleNextStep}>
            <NextIcon />
          </IconButton>
          <IconButton onClick={handleReset}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
          <Typography variant="caption" sx={{ mr: 1 }}>
            Speed:
          </Typography>
          <Slider
            value={playbackSpeed}
            step={0.5}
            marks
            min={0.5}
            max={3}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}x`}
            onChange={handleSpeedChange}
            sx={{ width: 120 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Get description for reaction step
 */
const getReactionStepDescription = (step) => {
  switch (step) {
    case 0:
      return "Reactants are separated and in their initial state before the reaction begins.";
    case 1:
      return "Reactants approach each other and begin to feel the Coulomb repulsion between their positively charged nuclei.";
    case 2:
      return "Maximum point of the Coulomb barrier. Classically, particles need enough energy to overcome this barrier.";
    case 3:
      return "Particles enter the nuclear interaction zone where strong nuclear forces become significant.";
    case 4:
      return "Formation of a temporary compound nucleus where nucleons are redistributed.";
    case 5:
      return "The compound nucleus decays into specific reaction products.";
    case 6:
      return "Final reaction products with released energy (Q-value) as specified by the reaction.";
    default:
      return "Reaction progress visualization.";
  }
};

/**
 * Wave Function Visualization
 * 
 * Visualizes the quantum mechanical wave function during tunneling
 */
const WaveFunctionVisualization = ({ reaction, energy }) => {
  const theme = useTheme();
  
  // Generate wave function data
  // This would be more sophisticated in a real implementation
  const generateWaveData = () => {
    const waveData = [];
    
    // Calculate Coulomb barrier (simplified approximation)
    const coulombBarrier = 1.44 * reaction.reactant1_z * reaction.reactant2_z / 
      (1.4 * (Math.pow(reaction.reactant1_a, 1/3) + Math.pow(reaction.reactant2_a, 1/3)));
    
    // Barrier region bounds (in arbitrary units)
    const barrierStart = 30;
    const barrierEnd = 70;
    
    // Generate wave function amplitude
    for (let x = 0; x <= 100; x++) {
      let potential = 0;
      let waveAmplitude = 0;
      let waveReal = 0;
      let waveImag = 0;
      
      // Define potential barrier
      if (x >= barrierStart && x <= barrierEnd) {
        potential = coulombBarrier;
      }
      
      // Generate wave function (very simplified model)
      // For x < barrier: ψ(x) = Ae^(ikx) + Be^(-ikx)
      // For barrier: ψ(x) = Ce^(-κx) + De^(κx)
      // For x > barrier: ψ(x) = Fe^(ik'x)
      
      // Wave parameters
      const k1 = Math.sqrt(energy);
      const k2 = Math.sqrt(Math.max(0.01, coulombBarrier - energy)); // Imaginary wavenumber in barrier
      
      if (x < barrierStart) {
        // Before barrier (incoming + reflected wave)
        const phaseIncoming = k1 * x;
        const phaseReflected = -k1 * x;
        
        // Amplitude decays with barrier height/energy ratio
        const reflectionAmp = Math.pow((coulombBarrier - energy) / coulombBarrier, 0.5);
        const incidentAmp = 1.0;
        
        waveReal = incidentAmp * Math.cos(phaseIncoming) + reflectionAmp * Math.cos(phaseReflected);
        waveImag = incidentAmp * Math.sin(phaseIncoming) + reflectionAmp * Math.sin(phaseReflected);
        waveAmplitude = Math.sqrt(waveReal * waveReal + waveImag * waveImag);
      } else if (x >= barrierStart && x <= barrierEnd) {
        // Inside barrier (exponentially decaying)
        const barrierWidth = barrierEnd - barrierStart;
        const normalizedPos = (x - barrierStart) / barrierWidth;
        
        // Decay inside barrier
        const decayFactor = -k2 * (x - barrierStart);
        waveAmplitude = Math.exp(decayFactor);
        
        // Small oscillations representing wave-like properties
        waveReal = waveAmplitude * Math.cos(k1 * x);
        waveImag = waveAmplitude * Math.sin(k1 * x);
      } else {
        // After barrier (transmitted wave with reduced amplitude)
        const tunnelProb = Math.exp(-2 * k2 * (barrierEnd - barrierStart));
        const transmissionAmp = Math.sqrt(tunnelProb);
        
        const phaseTransmitted = k1 * x;
        
        waveReal = transmissionAmp * Math.cos(phaseTransmitted);
        waveImag = transmissionAmp * Math.sin(phaseTransmitted);
        waveAmplitude = Math.sqrt(waveReal * waveReal + waveImag * waveImag);
      }
      
      waveData.push({
        position: x,
        potential: potential / coulombBarrier, // Normalized
        amplitude: waveAmplitude,
        real: waveReal,
        imaginary: waveImag,
        probability: waveAmplitude * waveAmplitude
      });
    }
    
    return waveData;
  };
  
  const waveData = generateWaveData();
  
  return (
    <Box sx={{ height: 300, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={waveData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="position"
            label={{ value: 'Position', position: 'insideBottomRight', offset: -5 }} 
          />
          <YAxis 
            yAxisId="left"
            label={{ value: 'Wave Function', angle: -90, position: 'insideLeft' }}
            domain={[-1.5, 1.5]}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            label={{ value: 'Potential (normalized)', angle: 90, position: 'insideRight' }}
            domain={[0, 1.2]}
          />
          <RechartsTooltip />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="real" 
            name="Real Part" 
            stroke={theme.palette.primary.main} 
            dot={false} 
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="imaginary" 
            name="Imaginary Part" 
            stroke={theme.palette.secondary.main} 
            dot={false} 
            strokeDasharray="3 3"
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="probability" 
            name="Probability" 
            stroke={theme.palette.success.main} 
            dot={false} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="potential" 
            name="Potential Barrier" 
            stroke={theme.palette.error.main}
            strokeWidth={2}
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

/**
 * Enhanced Main Reaction Dynamics Visualization Component
 */
const ReactionDynamicsVisualization = ({ 
  data = {}, 
  reaction, 
  parameters 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [energy, setEnergy] = useState(5.0); // Default energy in keV
  const [viewMode, setViewMode] = useState('standard');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleEnergyChange = (event, newValue) => {
    setEnergy(newValue);
  };
  
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };
  
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleSaveConfiguration = () => {
    // Save current visualization settings as a preset
    alert('Save visualization configuration functionality would be implemented here');
    handleMenuClose();
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Reaction Dynamics Visualization
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            sx={{ mr: 1 }}
          >
            <ToggleButton value="standard" aria-label="standard view">
              <Tooltip title="Standard View">
                <ViewListIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <Tooltip title="Grid View">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <IconButton
            size="small"
            aria-controls={open ? 'visualization-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleMenuClick}
          >
            <MoreVertIcon />
          </IconButton>
          
          <Menu
            id="visualization-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'visualization-options-button',
            }}
          >
            <MenuItem onClick={handleSaveConfiguration}>
              <ListItemIcon>
                <SaveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Save Configuration</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <FullscreenIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Full Screen</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export All Graphs</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Energy Selection Slider */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography id="energy-slider" gutterBottom>
          Incident Energy: {energy.toFixed(1)} keV
        </Typography>
        <Slider
          value={energy}
          onChange={handleEnergyChange}
          aria-labelledby="energy-slider"
          valueLabelDisplay="auto"
          step={0.1}
          marks={[
            { value: 0.1, label: '0.1 keV' },
            { value: 5, label: '5 keV' },
            { value: 10, label: '10 keV' },
            { value: 20, label: '20 keV' }
          ]}
          min={0.1}
          max={20}
        />
      </Box>
      
      {/* Visualization Types Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="reaction dynamics tabs">
          <Tab label="Quantum Tunneling" />
          <Tab label="Reaction Path" />
          <Tab label="Wave Function" />
          <Tab label="3D Visualization" />
        </Tabs>
      </Box>
      
      {/* Standard View Mode */}
      {viewMode === 'standard' && (
        <Box>
          {/* Quantum Tunneling Tab */}
          {activeTab === 0 && (
            <QuantumTunnelingChart 
              reaction={reaction} 
              temperature={parameters?.temperature || 10}
            />
          )}
          
          {/* Reaction Path Tab */}
          {activeTab === 1 && (
            <ReactionPathChart 
              reaction={reaction}
            />
          )}
          
          {/* Wave Function Tab */}
          {activeTab === 2 && (
            <WaveFunctionVisualization 
              reaction={reaction}
              energy={energy}
            />
          )}
          
          {/* 3D Visualization Tab */}
          {activeTab === 3 && (
            <Box sx={{ height: 400 }}>
              <ReactionDynamics3D 
                reactionData={data}
                potentialType={activeTab === 0 ? 'coulomb' : 'tunneling'}
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Grid View Mode */}
      {viewMode === 'grid' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>Quantum Tunneling</Typography>
                <QuantumTunnelingChart 
                  reaction={reaction} 
                  temperature={parameters?.temperature || 10}
                  plotType="log"
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>Reaction Path</Typography>
                <ReactionPathChart 
                  reaction={reaction}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>Wave Function</Typography>
                <WaveFunctionVisualization 
                  reaction={reaction}
                  energy={energy}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>3D Visualization</Typography>
                <Box sx={{ height: 300 }}>
                  <ReactionDynamics3D 
                    reactionData={data}
                    potentialType="tunneling"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ReactionDynamicsVisualization; 