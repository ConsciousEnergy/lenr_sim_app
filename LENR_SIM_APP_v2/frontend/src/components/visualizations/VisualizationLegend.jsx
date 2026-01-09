/**
 * VisualizationLegend.jsx
 * 
 * Legend component for fusion simulation visualizations.
 * Shows particle types, energy color scale, and hotspot information.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircleIcon from '@mui/icons-material/Circle';
import FlareIcon from '@mui/icons-material/Flare';
import TimelineIcon from '@mui/icons-material/Timeline';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import StraightenIcon from '@mui/icons-material/Straighten';
import BlurOnIcon from '@mui/icons-material/BlurOn';

// Particle type definitions with colors and descriptions
const PARTICLE_TYPES = {
  deuterium: {
    color: '#3498db',
    label: 'Deuterium (D)',
    symbol: '²H',
    description: 'Heavy hydrogen isotope with one neutron',
    mass: '2.014 u',
  },
  tritium: {
    color: '#2ecc71',
    label: 'Tritium (T)',
    symbol: '³H',
    description: 'Radioactive hydrogen isotope with two neutrons',
    mass: '3.016 u',
  },
  helium: {
    color: '#f1c40f',
    label: 'Helium-4 (α)',
    symbol: '⁴He',
    description: 'Alpha particle - fusion product',
    mass: '4.003 u',
  },
  proton: {
    color: '#e74c3c',
    label: 'Proton (p)',
    symbol: '¹H',
    description: 'Hydrogen nucleus',
    mass: '1.007 u',
  },
  electron: {
    color: '#9b59b6',
    label: 'Electron (e⁻)',
    symbol: 'e⁻',
    description: 'Plasma electron',
    mass: '0.000549 u',
  },
  neutron: {
    color: '#95a5a6',
    label: 'Neutron (n)',
    symbol: 'n',
    description: 'Neutral particle from fusion',
    mass: '1.009 u',
  },
};

// Energy color scale definition
const ENERGY_SCALE = [
  { color: '#0000ff', label: 'Low', value: '< 1 keV' },
  { color: '#00ffff', label: '', value: '1-5 keV' },
  { color: '#00ff00', label: '', value: '5-10 keV' },
  { color: '#ffff00', label: '', value: '10-50 keV' },
  { color: '#ff8000', label: '', value: '50-100 keV' },
  { color: '#ff0000', label: 'High', value: '> 100 keV' },
];

// Quantum flux mode definitions - grounded in observable physics
const QUANTUM_FLUX_MODES = {
  electron_screening: {
    label: 'Electron Screening',
    description: 'Thomas-Fermi electron density around nuclei reducing the Coulomb barrier. Observable in enhanced fusion rates.',
    colorLow: '#0044aa',
    colorHigh: '#00ddff',
    physics: 'ρ(r) = ρ₀·exp(-r/λ_TF)',
  },
  magnetic_dipoles: {
    label: 'Magnetic Dipoles',
    description: 'Nuclear and electron spin magnetic moments. Creates local fields affecting particle interactions.',
    colorLow: '#880044',
    colorHigh: '#ff66aa',
    physics: 'μ = gₙ·μₙ·I',
  },
  phonon_modes: {
    label: 'Phonon Modes',
    description: 'Debye model lattice vibrations (acoustic + optical modes). Transfers energy between lattice and nuclei.',
    colorLow: '#885500',
    colorHigh: '#ffcc00',
    physics: 'ω = vₛ·k (acoustic)',
  },
  coulomb_exchange: {
    label: 'Coulomb Exchange',
    description: 'Virtual photon exchange between charged particles. Basis of electromagnetic interaction.',
    colorLow: '#226644',
    colorHigh: '#66ffcc',
    physics: 'V(r) = Z₁Z₂e²/4πε₀r',
  },
  gamow_window: {
    label: 'Gamow Window',
    description: 'Optimal tunneling energy region from stellar nucleosynthesis. Where tunneling × thermal distribution peaks.',
    colorLow: '#440088',
    colorHigh: '#ff44ff',
    physics: 'E₀ = (E_G·kT/2)^(2/3)',
  },
  combined: {
    label: 'Combined Effects',
    description: 'Total enhancement from electron screening, phonon coupling, and Gamow probability.',
    colorLow: '#224444',
    colorHigh: '#aaffee',
    physics: 'η_total = η_screen × η_phonon × P_tunnel',
  },
};

/**
 * Renders a color gradient bar for energy scale
 */
function EnergyGradientBar() {
  const gradientColors = ENERGY_SCALE.map(s => s.color).join(', ');
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          height: 16,
          borderRadius: 1,
          background: `linear-gradient(to right, ${gradientColors})`,
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Low</Typography>
        <Typography variant="caption" color="text.secondary">Energy</Typography>
        <Typography variant="caption" color="text.secondary">High</Typography>
      </Box>
    </Box>
  );
}

/**
 * Single particle type legend item
 */
function ParticleTypeItem({ type, info, count }) {
  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2">{info.description}</Typography>
          <Typography variant="caption">Mass: {info.mass}</Typography>
        </Box>
      }
      placement="right"
    >
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          py: 0.5,
          px: 1,
          borderRadius: 1,
          '&:hover': { bgcolor: 'action.hover' },
          cursor: 'help',
        }}
      >
        <CircleIcon sx={{ color: info.color, fontSize: 14 }} />
        <Typography variant="body2" sx={{ flexGrow: 1 }}>
          {info.label}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {info.symbol}
        </Typography>
        {count !== undefined && (
          <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
      </Box>
    </Tooltip>
  );
}

ParticleTypeItem.propTypes = {
  type: PropTypes.string.isRequired,
  info: PropTypes.object.isRequired,
  count: PropTypes.number,
};

/**
 * Statistics display for current simulation state
 */
function SimulationStats({ stats }) {
  if (!stats) return null;
  
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TimelineIcon fontSize="small" />
        Statistics
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 1,
        fontSize: '0.75rem',
      }}>
        {stats.totalParticles !== undefined && (
          <StatItem label="Particles" value={stats.totalParticles.toLocaleString()} />
        )}
        {stats.hotspotCount !== undefined && (
          <StatItem label="Hotspots" value={stats.hotspotCount} />
        )}
        {stats.avgEnergy !== undefined && (
          <StatItem label="Avg Energy" value={`${stats.avgEnergy.toFixed(2)} keV`} />
        )}
        {stats.maxEnergy !== undefined && (
          <StatItem label="Max Energy" value={`${stats.maxEnergy.toFixed(2)} keV`} />
        )}
        {stats.fusionRate !== undefined && (
          <StatItem label="Fusion Rate" value={`${stats.fusionRate.toExponential(2)}/s`} />
        )}
        {stats.temperature !== undefined && (
          <StatItem label="Temp" value={`${(stats.temperature / 1000).toFixed(1)}k K`} />
        )}
      </Box>
    </Box>
  );
}

SimulationStats.propTypes = {
  stats: PropTypes.object,
};

function StatItem({ label, value }) {
  return (
    <Box sx={{ 
      bgcolor: 'action.hover', 
      borderRadius: 0.5, 
      p: 0.5,
      textAlign: 'center',
    }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="medium">
        {value}
      </Typography>
    </Box>
  );
}

StatItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

/**
 * Scale indicator component
 */
function ScaleIndicator({ gridSize, scaleUnit, realWorldSize }) {
  // Format the real-world size appropriately
  const formatSize = (size) => {
    if (size >= 1e-6) return `${(size * 1e6).toFixed(1)} μm`;
    if (size >= 1e-9) return `${(size * 1e9).toFixed(1)} nm`;
    if (size >= 1e-10) return `${(size * 1e10).toFixed(1)} Å`;
    return `${(size * 1e12).toFixed(1)} pm`;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <StraightenIcon fontSize="small" />
        Scale
      </Typography>
      <Box sx={{ pl: 1 }}>
        {/* Visual scale bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 0,
          }}>
            <Box sx={{ width: 4, height: 12, bgcolor: 'white' }} />
            <Box sx={{ width: 60, height: 3, bgcolor: 'white' }} />
            <Box sx={{ width: 4, height: 12, bgcolor: 'white' }} />
          </Box>
          <Typography variant="caption">
            {formatSize(realWorldSize)}
          </Typography>
        </Box>
        {/* Grid info */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 0.5,
          fontSize: '0.7rem',
        }}>
          <Typography variant="caption" color="text.secondary">
            Grid: {gridSize} × {gridSize} × {gridSize}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Unit: {scaleUnit}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

ScaleIndicator.propTypes = {
  gridSize: PropTypes.number,
  scaleUnit: PropTypes.string,
  realWorldSize: PropTypes.number,
};

/**
 * Quantum flux mode indicator
 */
function QuantumFluxIndicator({ mode, intensity }) {
  const modeInfo = QUANTUM_FLUX_MODES[mode] || QUANTUM_FLUX_MODES.electron_screening;
  
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <BlurOnIcon fontSize="small" sx={{ color: modeInfo.colorHigh }} />
        Quantum Field
      </Typography>
      <Box sx={{ pl: 1 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 'medium' }}>
          {modeInfo.label}
        </Typography>
        <Tooltip title={modeInfo.description} placement="bottom">
          <Box sx={{ cursor: 'help' }}>
            {/* Color gradient bar */}
            <Box
              sx={{
                height: 12,
                borderRadius: 0.5,
                background: `linear-gradient(to right, ${modeInfo.colorLow}, ${modeInfo.colorHigh})`,
                border: '1px solid rgba(255,255,255,0.2)',
                mb: 0.5,
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Low</Typography>
              <Typography variant="caption" color="text.secondary">Density</Typography>
              <Typography variant="caption" color="text.secondary">High</Typography>
            </Box>
          </Box>
        </Tooltip>
        {/* Physics equation */}
        {modeInfo.physics && (
          <Typography 
            variant="caption" 
            sx={{ 
              mt: 0.5, 
              display: 'block',
              fontFamily: 'monospace',
              bgcolor: 'rgba(255,255,255,0.1)',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
            }}
          >
            {modeInfo.physics}
          </Typography>
        )}
        {intensity !== undefined && (
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Current: {(intensity * 100).toFixed(1)}%
          </Typography>
        )}
      </Box>
    </Box>
  );
}

QuantumFluxIndicator.propTypes = {
  mode: PropTypes.string,
  intensity: PropTypes.number,
};

/**
 * Main Legend Component
 */
function VisualizationLegend({ 
  particleCounts = {},
  stats = null,
  showEnergy = true,
  showParticles = true,
  showHotspots = true,
  showStats = true,
  showScale = true,
  showQuantumFlux = true,
  scaleInfo = { gridSize: 10, scaleUnit: 'nm', realWorldSize: 5e-9 },
  quantumFluxMode = 'electron_screening',
  quantumFluxIntensity = undefined,
  position = 'top-right',
  collapsed = false,
  onToggleCollapse,
  variant = 'overlay', // 'overlay' | 'panel'
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);
  
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggleCollapse) onToggleCollapse(newState);
  };
  
  // Position styles for overlay variant
  const positionStyles = variant === 'overlay' ? {
    position: 'absolute',
    zIndex: 10,
    ...(position === 'top-right' && { top: 8, right: 8 }),
    ...(position === 'top-left' && { top: 8, left: 8 }),
    ...(position === 'bottom-right' && { bottom: 8, right: 8 }),
    ...(position === 'bottom-left' && { bottom: 8, left: 8 }),
  } : {};
  
  return (
    <Paper
      elevation={variant === 'overlay' ? 4 : 0}
      sx={{
        ...positionStyles,
        bgcolor: variant === 'overlay' ? 'rgba(0, 0, 0, 0.9)' : 'background.paper',
        color: 'text.primary',
        minWidth: 220,
        maxWidth: 300,
        maxHeight: 'calc(100vh - 180px)',
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 1,
          bgcolor: 'primary.dark',
          cursor: 'pointer',
        }}
        onClick={handleToggle}
      >
        <ScatterPlotIcon sx={{ mr: 1, fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Visualization Legend
        </Typography>
        <IconButton size="small" sx={{ color: 'inherit' }}>
          {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
      </Box>
      
      <Collapse in={!isCollapsed} sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ 
          p: 1.5, 
          maxHeight: 'calc(100vh - 250px)', 
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255,255,255,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '3px',
          },
        }}>
          {/* Particle Types Section */}
          {showParticles && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircleIcon fontSize="small" />
                Particle Types
              </Typography>
              <Box>
                {Object.entries(PARTICLE_TYPES).map(([type, info]) => (
                  <ParticleTypeItem 
                    key={type} 
                    type={type} 
                    info={info} 
                    count={particleCounts[type]}
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {showParticles && showEnergy && <Divider sx={{ my: 1.5 }} />}
          
          {/* Energy Scale Section */}
          {showEnergy && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Particles are colored by their kinetic energy">
                  <InfoOutlinedIcon fontSize="small" />
                </Tooltip>
                Energy Scale
              </Typography>
              <EnergyGradientBar />
            </Box>
          )}
          
          {(showEnergy || showParticles) && showHotspots && <Divider sx={{ my: 1.5 }} />}
          
          {/* Hotspots Section */}
          {showHotspots && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FlareIcon fontSize="small" sx={{ color: '#ffaa00' }} />
                Fusion Hotspots
              </Typography>
              <Box sx={{ pl: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      bgcolor: '#ffaa00',
                      boxShadow: '0 0 8px #ffaa00',
                    }} 
                  />
                  <Typography variant="body2">Active fusion region</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Size indicates reaction intensity
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Scale Section */}
          {showScale && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <ScaleIndicator 
                gridSize={scaleInfo.gridSize}
                scaleUnit={scaleInfo.scaleUnit}
                realWorldSize={scaleInfo.realWorldSize}
              />
            </>
          )}
          
          {/* Quantum Flux Section */}
          {showQuantumFlux && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <QuantumFluxIndicator 
                mode={quantumFluxMode}
                intensity={quantumFluxIntensity}
              />
            </>
          )}
          
          {/* Visual Effects Legend */}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Visual Elements
            </Typography>
            <Box sx={{ pl: 1, fontSize: '0.75rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 3, 
                    background: 'linear-gradient(to right, #00ffff, transparent)',
                    borderRadius: 1,
                  }} 
                />
                <Typography variant="caption">Particle trajectories</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(100,200,255,0.3) 0%, rgba(0,255,255,0.1) 50%, transparent 70%)',
                  }} 
                />
                <Typography variant="caption">Density distribution</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%',
                    border: '2px solid #ff4488',
                    borderStyle: 'dashed',
                  }} 
                />
                <Typography variant="caption">Magnetic dipole loops</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box 
                  sx={{ 
                    width: 16, 
                    height: 2, 
                    background: 'linear-gradient(45deg, #44ffaa 0%, #44ffaa 100%)',
                    borderStyle: 'wavy',
                  }} 
                />
                <Typography variant="caption">Coulomb exchange (virtual γ)</Typography>
              </Box>
            </Box>
          </Box>
          
          {showStats && stats && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <SimulationStats stats={stats} />
            </>
          )}
          
          {/* Interaction Hints */}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ opacity: 0.7 }}>
            <Typography variant="caption" display="block">
              🖱️ Drag to rotate • Scroll to zoom
            </Typography>
            <Typography variant="caption" display="block">
              Right-click drag to pan
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}

VisualizationLegend.propTypes = {
  particleCounts: PropTypes.object,
  stats: PropTypes.shape({
    totalParticles: PropTypes.number,
    hotspotCount: PropTypes.number,
    avgEnergy: PropTypes.number,
    maxEnergy: PropTypes.number,
    fusionRate: PropTypes.number,
    temperature: PropTypes.number,
  }),
  showEnergy: PropTypes.bool,
  showParticles: PropTypes.bool,
  showHotspots: PropTypes.bool,
  showStats: PropTypes.bool,
  showScale: PropTypes.bool,
  showQuantumFlux: PropTypes.bool,
  scaleInfo: PropTypes.shape({
    gridSize: PropTypes.number,
    scaleUnit: PropTypes.string,
    realWorldSize: PropTypes.number,
  }),
  quantumFluxMode: PropTypes.oneOf([
    'electron_screening',
    'magnetic_dipoles',
    'phonon_modes',
    'coulomb_exchange',
    'gamow_window',
    'combined',
  ]),
  quantumFluxIntensity: PropTypes.number,
  position: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left']),
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
  variant: PropTypes.oneOf(['overlay', 'panel']),
};

export default VisualizationLegend;
