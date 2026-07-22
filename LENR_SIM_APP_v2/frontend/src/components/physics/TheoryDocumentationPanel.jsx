/**
 * TheoryDocumentationPanel.jsx
 *
 * Static, expandable accordion section explaining each mechanism
 * in the Unified LENR Theoretical Framework.  Extracted from
 * UnifiedTheoryPage to reduce component size.
 */

import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ScienceIcon from '@mui/icons-material/Science';
import BoltIcon from '@mui/icons-material/Bolt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FunctionsIcon from '@mui/icons-material/Functions';
import SchoolIcon from '@mui/icons-material/School';
import InfoIcon from '@mui/icons-material/Info';
import { Link as RouterLink } from 'react-router-dom';

function TheoryDocumentationPanel() {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Unified LENR Theoretical Framework
        </Typography>
        <Typography variant="body2">
          This simulation implements the comprehensive theoretical model integrating Rydberg Matter, 
          Delocalized Interface Electrons, double-layer QED effects, Casimir effect, and quantum tunneling enhancements.
          Click each section below to explore the physics in detail.
        </Typography>
      </Alert>

      {/* Expandable Theory Sections */}
      <Box sx={{ mb: 3 }}>
        {/* Section 1: Rydberg Matter */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon color="primary" />
              <Typography variant="h6">1. Rydberg Matter</Typography>
              <Chip label="Extended Orbitals" size="small" color="primary" variant="outlined" sx={{ ml: 'auto' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Rydberg Matter is a phase in which atoms occupy highly excited electronic states with extended orbitals.
              These extended orbitals allow more efficient concentration of energy, effectively lowering the Coulomb barrier.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Energy at n=10:</Typography>
              <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                E_n = -13.6 eV / n² = -0.136 eV
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                <strong>Related parameter:</strong> Temperature affects Rydberg state population
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              <strong>Citation:</strong> Holmlid, L. (2009). "Rydberg Matter and Mesoscopic Physics"
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Section 2: Delocalized Interface Electrons */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BoltIcon color="secondary" />
              <Typography variant="h6">2. Delocalized Interface Electrons</Typography>
              <Chip label="Nuclear Overlap" size="small" color="secondary" variant="outlined" sx={{ ml: 'auto' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Delocalized Interface Electrons are weakly bound electrons whose extended orbitals overlap significantly with nuclear wavefunctions.
              This enhanced overlap raises the probability of electron capture processes.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Overlap Probability:</Typography>
              <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                P_overlap = (rₙ/a)³ × exp(-2rₙ/a) ≈ 8.5 × 10⁻¹⁶
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Where a = 10a₀ (orbital extension), rₙ = 5 fm (nuclear core radius)
              </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                  In condensed matter systems (10^23 atoms, 10^12 events/s), even rare per-atom probabilities
                  may accumulate over ensemble scales (hypothesis)—not automatically &quot;statistically significant&quot;
                  experimental events.
                </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              <strong>Citation:</strong> Widom, A. & Larsen, L. (2006). "Ultra Low Momentum Neutron Catalyzed Nuclear Reactions"
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Section 3: Double-Layer QED */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FunctionsIcon sx={{ color: '#f1c40f' }} />
              <Typography variant="h6">3. Double-Layer QED Effects</Typography>
              <Chip label="High Electric Fields" size="small" sx={{ bgcolor: '#f1c40f', color: 'black', ml: 'auto' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Charge separation at electrolyte or lattice interfaces creates high electric fields in thin double layers.
              These fields can reach 10⁸ V/m, significantly affecting electron dynamics and barrier heights.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Electric Field Calculation:</Typography>
              <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                E = ΔV/d = 0.1V / 1nm = 10⁸ V/m
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                <strong>Related parameter:</strong> Driving Pressure affects double-layer compression
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              <strong>Citation:</strong> Hagelstein, P. (2010). "Coherent energy exchange in LENR"
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Section 4: Bubble Collapse Dynamics */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BubbleChartIcon sx={{ color: '#00bcd4' }} />
              <Typography variant="h6">4. Bubble Collapse (Rayleigh-Plesset)</Typography>
              <Chip label="Compression" size="small" sx={{ bgcolor: '#00bcd4', color: 'white', ml: 'auto' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              The modified Rayleigh-Plesset equation describes bubble dynamics with an additional electric field term.
              During collapse, extreme pressures and temperatures are achieved at the bubble minimum.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Modified Rayleigh-Plesset:</Typography>
              <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                RR̈ + (3/2)Ṙ² = (1/ρ)[P_b - P_∞ - 2σ/R - 4μṘ/R + ε₀E²/2]
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                <strong>Related parameters:</strong> Initial Bubble Radius, Driving Pressure, Frequency
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              <strong>Citation:</strong> Rayleigh, Lord (1917). "On the pressure developed in a liquid during the collapse of a spherical cavity"
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Section 5: Casimir Effect */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon sx={{ color: '#9c27b0' }} />
              <Typography variant="h6">5. Casimir Effect</Typography>
              <Chip label="Quantum Vacuum" size="small" sx={{ bgcolor: '#9c27b0', color: 'white', ml: 'auto' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Quantum vacuum fluctuations produce an attractive force between closely spaced surfaces.
              At nanoscale separations during bubble collapse, this effect becomes significant.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">Casimir Effect:</Typography>
              <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                F_Casimir = -π²ℏc/240 × A/d⁴
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Force scales with inverse fourth power of separation distance
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              <strong>Citation:</strong> Casimir, H.B.G. (1948). "On the attraction between two perfectly conducting plates"
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Section 6: Quantum Tunneling */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ThermostatIcon sx={{ color: '#ff5722' }} />
              <Typography variant="h6">6. Quantum Tunneling Enhancement</Typography>
              <Chip label="Gamow Factor" size="small" sx={{ bgcolor: '#ff5722', color: 'white', ml: 'auto' }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Combined effects of electron screening, phonon coupling, and QED enhancement can increase tunneling
              probability by factors of 10³ to 10⁵ compared to bare Coulomb barrier calculations.
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="caption" color="text.secondary">WKB Tunneling Probability:</Typography>
              <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mt: 1 }}>
                P_tunnel = exp(-2/ℏ ∫√[2m(V(x)-E)]dx)
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                <strong>Related parameters:</strong> Temperature, Loading Ratio (affects screening)
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              <strong>Citation:</strong> Gamow, G. (1928). "Zur Quantentheorie des Atomkernes"
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Proton Phase Transitions */}
      <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon color="primary" /> Proton Phase Transitions
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[
            { color: '#3498db', name: 'FREE (EM)', desc: 'Normal electromagnetic behavior', range: 'E_thermal < 10 eV' },
            { color: '#00ffff', name: 'SCREENED', desc: 'Coulomb barrier lowered 10-100 eV', range: 'Enhancement > 10' },
            { color: '#f1c40f', name: 'CAPTURE READY', desc: 'Weak force coupling (p + e⁻ → n + νₑ)', range: 'Enhancement > 10³' },
            { color: '#ff4500', name: 'NUCLEAR', desc: 'Model phase above enhancement gate', range: 'Enhancement > 10⁵' }
          ].map((phase) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={phase.name}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, bgcolor: phase.color, borderRadius: '50%', flexShrink: 0, mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight="bold">{phase.name}</Typography>
                  <Typography variant="caption" display="block">{phase.desc}</Typography>
                  <Typography variant="caption" color="text.secondary">{phase.range}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* References Section */}
      <Paper sx={{ p: 2, bgcolor: 'action.hover' }} variant="outlined">
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon color="primary" /> References
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={1}>
          <Typography variant="body2">
            [1] Fleischmann, M. & Pons, S. (1989). "Electrochemically Induced Nuclear Fusion of Deuterium". <em>J. Electroanal. Chem.</em>
          </Typography>
          <Typography variant="body2">
            [2] Gamow, G. (1928). "Zur Quantentheorie des Atomkernes". <em>Zeitschrift für Physik</em>
          </Typography>
          <Typography variant="body2">
            [3] Hagelstein, P. et al. (2010s-2020s). "Phonon-nuclear coupling research". MIT
          </Typography>
          <Typography variant="body2">
            [4] Storms, E. (2007). "The Science of Low Energy Nuclear Reaction". World Scientific
          </Typography>
          <Typography variant="body2">
            [5] Acs, D. et al. (2025). "A Unified Theoretical Framework for Low-Energy Nuclear Reactions"
          </Typography>
        </Stack>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          component={RouterLink}
          to="/theory"
          variant="contained"
          size="large"
          startIcon={<MenuBookIcon />}
        >
          View Complete Theory Documentation
        </Button>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
          Full theoretical framework including historical context, computational methods, and experimental validation
        </Typography>
      </Box>
    </Box>
  );
}

export default TheoryDocumentationPanel;
