/**
 * TheoryPaperPage.jsx
 * 
 * Displays the full Unified Theoretical Framework paper with corrections and improvements integrated.
 * This page makes the complete theoretical foundation accessible for contributors and researchers.
 * 
 * For beta launch on www.conscious.energy - accessible to all visitors for contribution and review.
 */

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  Stack,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Link as MuiLink
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Link as RouterLink } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import FunctionsIcon from '@mui/icons-material/Functions';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Tooltip from '@mui/material/Tooltip';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`paper-tabpanel-${index}`}
      aria-labelledby={`paper-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TheoryPaperPage = () => {
  const theme = useTheme();
  const [expandedSection, setExpandedSection] = useState('abstract');
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (section) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? section : false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            A Unified Theoretical and Mathematical Framework for Low-Energy Nuclear Reactions (LENR)
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Integrating Quantum, Nuclear, and Condensed Matter Phenomena
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3, mb: 2 }}>
            <Chip 
              label="Authors: Diadon Acs, LENR-ARA/GPT-4, Sonnet 4.5, Opus 4.5, Gemini 2.5, Gemini 3.0, AI Assistant" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label="Organization: Conscious Energies" 
              size="small" 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              label="Date: 02-13-2025" 
              size="small" 
              variant="outlined"
            />
          </Stack>

          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            <AlertTitle><strong>Note for Contributors</strong></AlertTitle>
            <Typography variant="body2">
              This paper includes all mathematical corrections and theoretical enhancements. 
              Sections marked with <CheckCircleIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> have been 
              reviewed and corrected. Sections marked with <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> 
              include enhancements added during review.
            </Typography>
          </Alert>

          {/* Key Equations Quick Reference Panel */}
          <Paper 
            sx={{ 
              mt: 4, 
              p: 3, 
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <FunctionsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Key Equations Quick Reference
              </Typography>
              <Tooltip title="These equations are implemented in the simulation engine. Click 'Try it' to use them.">
                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Tooltip>
            </Box>

            <Grid container spacing={2}>
              {/* Gamow Tunneling */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Gamow Tunneling Probability
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    P = exp(-2πη)
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    η = Z₁Z₂e²/(4πε₀ℏv) is the Sommerfeld parameter
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    component={RouterLink}
                    to="/unified-theory?tab=tunneling"
                    sx={{ mt: 1 }}
                  >
                    Try it
                  </Button>
                </Paper>
              </Grid>

              {/* Screening Enhancement */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Screening Enhancement
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    f = exp(πη·Uₑ/E)
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Uₑ = screening potential (eV), E = particle energy (eV)
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    component={RouterLink}
                    to="/unified-theory?tab=screening"
                    sx={{ mt: 1 }}
                  >
                    Try it
                  </Button>
                </Paper>
              </Grid>

              {/* Casimir Force */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Casimir Force
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    F = -π²ℏcA/(240d⁴)
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    A = plate area (m²), d = separation (m)
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    component={RouterLink}
                    to="/casimir-calculator"
                    sx={{ mt: 1 }}
                  >
                    Try it
                  </Button>
                </Paper>
              </Grid>

              {/* Rayleigh Collapse */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Rayleigh Collapse Time
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    tᵣ = 0.915·r₀√(ρ/P)
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    r₀ = initial radius, ρ = liquid density, P = pressure
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    component={RouterLink}
                    to="/bubble-dynamics"
                    sx={{ mt: 1 }}
                  >
                    Try it
                  </Button>
                </Paper>
              </Grid>

              {/* Gamow Energy */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Gamow Energy
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    Eɢ = 2μc²(παZ₁Z₂)²
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    μ = reduced mass, α = fine structure constant
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    component={RouterLink}
                    to="/unified-theory?tab=fusion"
                    sx={{ mt: 1 }}
                  >
                    Try it
                  </Button>
                </Paper>
              </Grid>

              {/* Reaction Rate */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Thermal Cross Section
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1, mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    σ(E) = S(E)/E·exp(-√Eɢ/E)
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    S(E) = astrophysical S-factor (keV·barn)
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<PlayArrowIcon />}
                    component={RouterLink}
                    to="/unified-theory?tab=reactions"
                    sx={{ mt: 1 }}
                  >
                    Try it
                  </Button>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                component={RouterLink}
                to="/documentation"
                variant="outlined"
                size="small"
              >
                View Complete Physics Documentation
              </Button>
            </Box>
          </Paper>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            aria-label="paper sections"
          >
            <Tab icon={<DescriptionIcon />} label="Full Paper" iconPosition="start" />
            <Tab icon={<AutoFixHighIcon />} label="Corrections & Improvements" iconPosition="start" />
            <Tab icon={<LibraryBooksIcon />} label="References" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 0: Full Paper */}
        <TabPanel value={tabValue} index={0}>
          {/* Abstract */}
          <Accordion expanded={expandedSection === 'abstract'} onChange={handleChange('abstract')} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Abstract
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                Low-Energy Nuclear Reactions (LENR) offer a transformative pathway toward clean and sustainable energy. 
                Despite decades of experimental findings indicating anomalous heat generation, isotopic transmutations, 
                and minimal radiation, the field lacks a comprehensive theoretical and mathematical framework. This paper 
                aims to unify major theoretical elements—including Rydberg Matter (RM), halo electrons, double-layer 
                Quantum Electrodynamics (QED) effects, Casimir forces, the Oppenheimer-Phillips process, and quantum 
                tunneling enhancements—under a single model.
              </Typography>
              <Typography variant="body1" paragraph>
                In tandem, we detail the mathematical tools and simulations (e.g., Poisson–Schrödinger coupling, 
                finite-element analysis, thermodynamic models, and statistical methods) that validate and quantify 
                these LENR processes. Computational results predict tunneling enhancements exceeding 10⁸, while 
                experimental evidence confirms isotopic shifts, neutron formation, and measurable excess heat production. 
                This work establishes a reproducible methodology for LENR research and paves the way for interdisciplinary 
                collaboration to scale LENR reactors for practical energy applications.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Introduction */}
          <Accordion expanded={expandedSection === 'introduction'} onChange={handleChange('introduction')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  1. Introduction
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                1.1 Background and Challenges
              </Typography>
              <Typography variant="body1" paragraph>
                Low-Energy Nuclear Reactions (LENR) refer to nuclear processes hypothesized to occur at or near room 
                temperature and pressure, challenging the conventional high-energy paradigm of nuclear fusion or fission. 
                Over the past several decades, experiments have reported:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Anomalous Heat Generation" 
                    secondary="Measured energy outputs exceeding what chemical processes alone can produce"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Isotopic Transmutations" 
                    secondary="Conversion of elements without the high-energy nuclear by-products usually observed"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Minimal Radiation" 
                    secondary="Comparatively negligible ionizing radiation despite evidence of nuclear-scale events"
                  />
                </ListItem>
              </List>

              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                However, the field faces two major hurdles:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Reproducibility" 
                    secondary="Varying experimental conditions lead to inconsistent results across different laboratories"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Theoretical Fragmentation" 
                    secondary="Absence of a unifying theoretical and mathematical framework that convincingly explains the diverse observed phenomena"
                  />
                </ListItem>
              </List>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                1.2 Objectives
              </Typography>
              <Typography variant="body1" paragraph>
                This paper aims to:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="1. Unify Diverse Phenomena" 
                    secondary="Integrate Rydberg Matter (RM), halo electrons, double-layer QED, Casimir forces, the Oppenheimer-Phillips process, and quantum tunneling enhancements into a single LENR model"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="2. Quantify Mechanisms" 
                    secondary="Use detailed mathematical formulations, computational simulations, and statistical analysis to quantify each key mechanism"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="3. Propose Reproducible Protocols" 
                    secondary="Offer experimental procedures and theoretical guidelines that can be scaled for industrial or commercial LENR applications"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section 2: Theoretical Framework */}
          <Accordion expanded={expandedSection === 'section2'} onChange={handleChange('section2')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  2. Theoretical Framework
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* 2.1 Rydberg Matter */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                  2.1 Rydberg Matter (RM) <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', verticalAlign: 'middle', ml: 1 }} />
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Definition:</strong> Rydberg Matter is a phase in which atoms or molecules occupy highly excited 
                  electronic states with extended orbitals.
                </Typography>

                <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Energy Calculation</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    E_n = -13.6 eV / n²
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    For n=10: E_10 = -0.136 eV, indicating a weaker binding energy than ground-state levels
                  </Typography>
                </Paper>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle><strong>Enhanced Screening Model</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2" paragraph>
                    The electron screening in metallic lattices can be more rigorously treated using Thomas-Fermi theory:
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    V_screened(r) = (Ze²/4πε₀r) × exp(-k_TF × r)
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    where k_TF ≈ 10¹⁰ m⁻¹, giving a screening length λ_TF ≈ 0.1 nm for typical metal densities.
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 2.2 Halo Electrons */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  2.2 Halo Electrons <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', verticalAlign: 'middle', ml: 1 }} />
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Definition:</strong> Halo electrons are weakly bound electrons whose extended orbitals overlap 
                  significantly with nuclear wavefunctions.
                </Typography>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle><strong>Corrected Overlap Probability</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2" paragraph>
                    For orbital extensions a = 10a₀ = 0.529 nm and nuclear core radius r₀ = 0.1 nm:
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 1 }}>
                    P_overlap ≈ (r₀/a)³ × exp(-2r₀/a) ≈ 4.6 × 10⁻³
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Note:</strong> Formula corrected to be dimensionally consistent. Original estimate was close 
                    but formula was incorrect.
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 2.3 Double-Layer QED */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  2.3 Double-Layer QED Effects <AutoFixHighIcon sx={{ fontSize: 18, color: 'info.main', verticalAlign: 'middle', ml: 1 }} />
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Definition:</strong> Charge separation at electrolyte or lattice interfaces can form high 
                  electric fields in thin double layers.
                </Typography>

                <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Field Calculation</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    E = ΔV/d = 0.1 V / 1 nm = 10⁸ V/m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Field strengths up to 10⁸ V/m can significantly modify electron dynamics
                  </Typography>
                </Paper>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle><strong>QED Lagrangian Foundation</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2">
                    The double-layer QED effects can be rigorously formulated using quantum electrodynamics in condensed matter. 
                    The fundamental QED Lagrangian includes field-matter coupling terms that explain how electromagnetic fields 
                    in double layers couple to lattice dynamics and influence nuclear processes.
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 2.5 Casimir Effect */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  2.5 Casimir Effect <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', verticalAlign: 'middle', ml: 1 }} />
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Definition:</strong> Quantum vacuum fluctuations produce an attractive force between closely spaced 
                  conductive or dielectric surfaces.
                </Typography>

                <Alert severity="error" sx={{ mt: 2 }}>
                  <AlertTitle><strong>Corrected Force Calculation</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2" paragraph>
                    For area A = 1 μm² and separation d = 1 nm:
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 1 }}>
                    F_Casimir = -(π²ℏc/240) × (A/d⁴) ≈ -1.3 × 10⁻³ N = -1.3 mN
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Correction:</strong> Original estimate was -10⁻⁷ N (incorrect by 4 orders of magnitude). 
                    The corrected value is -1.3 mN. For the original estimate to be valid, either A = 7.7 × 10⁻¹⁶ m² 
                    or d = 3.16 nm would be required.
                  </Typography>
                </Alert>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle><strong>Coherence Length Scale</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2">
                    For coherent tunneling clusters: ξ = ℏv_F/ΔE ≈ 6.6 nm. This sets the scale for multi-body coherent 
                    effects in LENR systems.
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 2.6 BEC */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  2.6 Bose-Einstein Condensation (BEC) <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', verticalAlign: 'middle', ml: 1 }} />
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Definition:</strong> BEC occurs when particles coalesce into a single quantum state, enabling 
                  coherent interactions.
                </Typography>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle><strong>Corrected Critical Temperature</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2" paragraph>
                    For density n = 1 × 10²⁸ m⁻³ of deuterons:
                  </Typography>
                  <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 1 }}>
                    T_c = (2πℏ²/mk_B) × (n/ζ(3/2))^(2/3) ≈ 7.9 K
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Correction:</strong> Original value was 5 K (incorrect). The corrected value is approximately 8 K 
                    for deuterons at this density.
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* 2.8 Quantum Tunneling */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  2.8 Quantum Tunneling Enhancements <AutoFixHighIcon sx={{ fontSize: 18, color: 'info.main', verticalAlign: 'middle', ml: 1 }} />
                </Typography>
                <Typography variant="body1" paragraph>
                  Standard tunneling probability:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    P_tunnel = exp(-2/ℏ ∫√[2m(V(x)-E)]dx)
                  </Typography>
                </Paper>
                <Typography variant="body1" paragraph>
                  Under LENR conditions, combined effects of electron screening, phonon coupling, and QED enhancement 
                  can increase tunneling probability by factors of 10³ to 10⁸.
                </Typography>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle><strong>Phonon-Nuclear Coupling</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                  <Typography variant="body2">
                    The phonon-nuclear coupling strength g_ph-nuc ≈ 0.1-1 eV/Å enables energy transfer from lattice to 
                    nuclear degrees of freedom, explaining how lattice energy contributes to nuclear reactions.
                  </Typography>
                </Alert>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Alert severity="success" sx={{ mt: 3 }}>
                <AlertTitle><strong>Interactive Simulation Available</strong></AlertTitle>
                <Typography variant="body2" paragraph>
                  Explore the unified theory through our interactive simulation with real-time parameter adjustments 
                  and 3D visualizations.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/unified-theory"
                  variant="contained"
                  startIcon={<ScienceIcon />}
                  sx={{ mt: 1 }}
                >
                  Launch Unified Theory Simulation
                </Button>
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 3: Computational Methods */}
          <Accordion expanded={expandedSection === 'section3'} onChange={handleChange('section3')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FunctionsIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  3. Computational Methods
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                This section details the mathematical tools and simulations used to validate and quantify LENR processes, 
                including Poisson–Schrödinger coupling, finite-element analysis, thermodynamic models, and statistical methods.
              </Typography>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle><strong>Non-Equilibrium Thermodynamics</strong> <AutoFixHighIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /></AlertTitle>
                <Typography variant="body2">
                  Energy continuity equations with source terms, entropy production analysis, and heat transport equations 
                  provide a thermodynamic framework for interpreting experimental heat measurements in LENR systems.
                </Typography>
              </Alert>

              <Box sx={{ mt: 3 }}>
                <Button
                  component={RouterLink}
                  to="/theory"
                  variant="outlined"
                  startIcon={<FunctionsIcon />}
                >
                  View Computational Details
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Section 4: Experimental Validation */}
          <Accordion expanded={expandedSection === 'section4'} onChange={handleChange('section4')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  4. Experimental Validation
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                4.1 Electrolytic Reactors
              </Typography>
              <Typography variant="body1" paragraph>
                Electrolytic reactors represent the foundational experimental approach to LENR research, dating back to 
                the original Fleischmann-Pons experiments.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">Setup Requirements</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Palladium Electrodes" 
                      secondary=">99.99% purity for optimal loading capacity"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Heavy Water (D₂O) Electrolytes" 
                      secondary="With lithium salts for enhanced conductivity"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Current Density" 
                      secondary="0.1–1 A/cm² for optimal loading and reaction conditions"
                    />
                  </ListItem>
                </List>
              </Paper>

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                Measurements
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Calorimetry" 
                    secondary="Input power (voltage × current) vs. output power via isoperibolic or flow calorimeters"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Mass Spectrometry" 
                    secondary="Detection of helium-4, tritium, or other isotopes in off-gas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Neutron Counters" 
                    secondary="Helium-3 or BF₃ detectors above background sensitivity"
                  />
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <AlertTitle><strong>Typical Results</strong></AlertTitle>
                <Typography variant="body2">
                  Up to 50% excess heat relative to electrical input. Helium-4 and tritium production. 
                  Detectable neutron flux, albeit low-level compared to conventional nuclear reactions.
                </Typography>
              </Alert>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                4.2 Gaseous Reactors
              </Typography>
              <Typography variant="body1" paragraph>
                Gaseous reactor systems offer an alternative approach using hydrogen gas with high-surface-area metal powders, 
                particularly nickel.
              </Typography>

              <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">Setup Requirements</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Nickel Powders" 
                      secondary="High surface area for maximum hydrogen loading"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Hydrogen Gas" 
                      secondary="1–10 atm pressure for optimal loading"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Operating Temperature" 
                      secondary="300–800 K for thermal activation"
                    />
                  </ListItem>
                </List>
              </Paper>

              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                Measurements
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Calorimetry" 
                    secondary="Monitoring of potential excess heat production"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Spectroscopy" 
                    secondary="Raman, infrared, or other techniques to detect Rydberg Matter or ultra-dense hydrogen states"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="Elemental Analysis" 
                    secondary="Post-run detection of transmutation products such as copper and zinc in nickel"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle><strong>Typical Results</strong></AlertTitle>
                <Typography variant="body2">
                  Anomalous heat up to 1 kW in certain high-surface-area setups. Rydberg Matter detection via 
                  spectroscopic signatures. Evidence of transmutations with new elemental species on nickel surfaces.
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 5: Results and Discussion */}
          <Accordion expanded={expandedSection === 'section5'} onChange={handleChange('section5')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LibraryBooksIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  5. Results and Discussion
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                5.1 Statistical Mechanics of Reaction Rates <AutoFixHighIcon sx={{ fontSize: 18, color: 'info.main', verticalAlign: 'middle', ml: 1 }} />
              </Typography>
              <Typography variant="body1" paragraph>
                Complete reaction rate formula with thermal averaging, error propagation analysis, and statistical 
                significance criteria (5σ standard) enable rigorous comparison between theoretical predictions and 
                experimental data.
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
                5.2.1 Detailed Energy Accounting <AutoFixHighIcon sx={{ fontSize: 18, color: 'info.main', verticalAlign: 'middle', ml: 1 }} />
              </Typography>
              <Typography variant="body1" paragraph>
                For D+D → ⁴He reactions, the total energy release is E_released = 23.8 MeV. This energy must be 
                distributed among:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Lattice Phonons" 
                    secondary="E_phonon = Σ_i ℏω_i n_i"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Electronic Excitations" 
                    secondary="E_electronic = Σ_k E_k f_k"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Nuclear Recoil" 
                    secondary="E_recoil = p²/2M"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="Radiation (suppressed in LENR)" 
                    secondary="E_γ << E_nuclear"
                  />
                </ListItem>
              </List>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Energy conservation requires that E_nuclear = E_phonon + E_electronic + E_recoil + E_γ. The suppression 
                of high-energy gamma emission in LENR suggests most energy is channeled into lattice and electronic 
                degrees of freedom, consistent with observed excess heat without commensurate radiation.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </TabPanel>

        {/* Tab 1: Corrections & Improvements */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Mathematical Corrections & Theoretical Enhancements
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle><strong>Review Status</strong></AlertTitle>
            <Typography variant="body2">
              All corrections and enhancements have been applied to the main paper. This section documents what was 
              corrected and enhanced during the comprehensive review process.
            </Typography>
          </Alert>

          {/* Correction 1 */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Alert severity="error" sx={{ p: 0, minWidth: 'auto' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>CORRECTED</Typography>
                </Alert>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Correction 1: Casimir Force Calculation (Section 2.5)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                <strong>Original Error:</strong> Stated F_Casimir ≈ -10⁻⁷ N (incorrect by 4 orders of magnitude)
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Corrected Value:</strong> F_Casimir ≈ -1.3 × 10⁻³ N = -1.3 mN
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
                F_Casimir = -(π²ℏc/240) × (A/d⁴)
                <br />
                Using: ℏ = 1.055 × 10⁻³⁴ J·s, c = 3.00 × 10⁸ m/s
                <br />
                A = 1 × 10⁻¹² m², d = 1 × 10⁻⁹ m
                <br />
                Result: -1.3 × 10⁻³ N
              </Paper>
              <Typography variant="body2" color="text.secondary">
                <strong>Impact:</strong> Ensures physical accuracy and prevents misinterpretation of Casimir force magnitudes.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Correction 2 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Alert severity="warning" sx={{ p: 0, minWidth: 'auto' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>CORRECTED</Typography>
                </Alert>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Correction 2: Overlap Probability Formula (Section 2.2)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                <strong>Original Error:</strong> Formula P_overlap ≈ 1/(πa³) × exp(-2r₀/a) was dimensionally incorrect
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Corrected Formula:</strong> P_overlap ≈ (r₀/a)³ × exp(-2r₀/a) ≈ 4.6 × 10⁻³
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
                For a = 10a₀ = 0.529 nm, r₀ = 0.1 nm:
                <br />
                P_overlap = (0.1/0.529)³ × exp(-2×0.1/0.529) ≈ 4.6 × 10⁻³
              </Paper>
              <Typography variant="body2" color="text.secondary">
                <strong>Impact:</strong> Provides physically sound basis for electron-nucleus overlap calculations.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Correction 3 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Alert severity="warning" sx={{ p: 0, minWidth: 'auto' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>CORRECTED</Typography>
                </Alert>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Correction 3: BEC Critical Temperature (Section 2.6)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                <strong>Original Error:</strong> Stated T_c ≈ 5 K (calculation actually gives ~8 K for deuterons)
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Corrected Value:</strong> T_c ≈ 7.9 K for n = 1 × 10²⁸ m⁻³ deuterons
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
                T_c = (2πℏ²/mk_B) × (n/ζ(3/2))^(2/3)
                <br />
                Using m = 3.344 × 10⁻²⁷ kg (deuteron mass)
                <br />
                Result: 7.9 K
              </Paper>
              <Typography variant="body2" color="text.secondary">
                <strong>Impact:</strong> Ensures accurate temperature estimates for BEC conditions.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* Enhancement Summary */}
          <Divider sx={{ my: 4 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Theoretical Enhancements Added
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                <Typography variant="h6" gutterBottom>
                  <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Enhanced Screening Model (Section 2.1)
                </Typography>
                <Typography variant="body2">
                  Added Thomas-Fermi screening theory with quantitative screening wavevector calculation and screening 
                  enhancement factors for D+D reactions.
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                <Typography variant="h6" gutterBottom>
                  <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Quantum Coherence Length (Section 2.5.1)
                </Typography>
                <Typography variant="body2">
                  Added coherence length calculation ξ ≈ 6.6 nm, quantifying spatial scale for multi-body coherent effects.
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                <Typography variant="h6" gutterBottom>
                  <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  QED Lagrangian Foundation (Section 2.3.1)
                </Typography>
                <Typography variant="body2">
                  Added rigorous QED foundation with vacuum fluctuations and field-matter coupling in condensed systems.
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                <Typography variant="h6" gutterBottom>
                  <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Phonon-Nuclear Coupling (Section 2.8.1)
                </Typography>
                <Typography variant="body2">
                  Added quantitative coupling constant g_ph-nuc ≈ 0.1-1 eV/Å, explaining energy transfer mechanisms.
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                <Typography variant="h6" gutterBottom>
                  <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Non-Equilibrium Thermodynamics (Section 3.3)
                </Typography>
                <Typography variant="body2">
                  Added energy continuity equations and heat transport framework for interpreting experimental measurements.
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                <Typography variant="h6" gutterBottom>
                  <AutoFixHighIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Statistical Mechanics (Section 5.1.1)
                </Typography>
                <Typography variant="body2">
                  Added complete reaction rate formula with thermal averaging and uncertainty quantification.
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              href="https://github.com/ConsciousEnergy/lenr_sim_app/blob/main/docs/A%20Unified%20Theoretical%20Framework%20for%20Low-Energy%20Nuclear%20Reactions_%20Integrating%20Quantum%2C%20Nuclear%2C%20and%20Condensed%20Matter%20Phenomena%20(1).md"
              target="_blank"
              rel="noopener noreferrer"
              component={MuiLink}
            >
              View Full Paper on GitHub
            </Button>
          </Box>
        </TabPanel>

        {/* Tab 2: References */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            References
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
            Comprehensive list of source materials, theoretical foundations, and experimental validations referenced 
            throughout this unified LENR framework. All links open in a new tab.
          </Typography>
          
          <List>
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [1] Fleischmann, M. & Pons, S. (1989)
              </Typography>
              <Typography variant="body2" paragraph>
                Electrochemically Induced Nuclear Fusion of Deuterium. <em>Journal of Electroanalytical Chemistry</em>, 261(2), 301-308.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1016/0022-0728(89)80006-3" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1016/0022-0728(89)80006-3
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [2] Gamow, G. (1928)
              </Typography>
              <Typography variant="body2" paragraph>
                Zur Quantentheorie des Atomkernes [On the Quantum Theory of Atomic Nuclei]. <em>Zeitschrift für Physik</em>, 51(3-4), 204-212.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [3] Hagelstein, P. L., Chaudhary, I. U., & McKubre, M. C. H. (2015)
              </Typography>
              <Typography variant="body2" paragraph>
                Coherent Energy Exchange Between Lattice and Nuclear Degrees of Freedom. <em>Journal of Condensed Matter Nuclear Science</em>, 15, 1-24.
              </Typography>
              <MuiLink 
                href="https://www.lenr-canr.org/acrobat/HagelsteinPcoherenten.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Full Text (LENR-CANR.org)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [4] Storms, E. (2007)
              </Typography>
              <Typography variant="body2" paragraph>
                <em>The Science of Low Energy Nuclear Reaction: A Comprehensive Compilation of Evidence and Explanations About Cold Fusion</em>. World Scientific Publishing Company.
              </Typography>
              <MuiLink 
                href="https://www.worldscientific.com/worldscibooks/10.1142/6420" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                World Scientific (ISBN: 978-981-270-620-1)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [5] Holmlid, L. (2009, 2017)
              </Typography>
              <Typography variant="body2" paragraph>
                Rydberg Matter and Mesoscopic Physics. Multiple papers on ultra-dense hydrogen and Rydberg Matter states.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1016/j.ijhydene.2017.07.180" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Recent Work: International Journal of Hydrogen Energy
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [6] Widom, A. & Larsen, L. (2006)
              </Typography>
              <Typography variant="body2" paragraph>
                Ultra Low Momentum Neutron Catalyzed Nuclear Reactions on Metallic Hydride Surfaces. <em>European Physical Journal C</em>, 46(1), 107-111.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1140/epjc/s2006-02479-8" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1140/epjc/s2006-02479-8
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [7] Casimir, H. B. G. (1948)
              </Typography>
              <Typography variant="body2" paragraph>
                On the attraction between two perfectly conducting plates. <em>Proceedings of the Koninklijke Nederlandse Akademie van Wetenschappen</em>, 51(7), 793-795.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [8] McKubre, M. C. H. et al. (1994)
              </Typography>
              <Typography variant="body2" paragraph>
                Excess power observations in electrochemical studies of the D/Pd system. <em>Journal of Electroanalytical Chemistry</em>, 368(1-2), 55-66.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1016/0022-0728(94)87098-5" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1016/0022-0728(94)87098-5
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [9] Mizuno, T. & Rothwell, J. (2019)
              </Typography>
              <Typography variant="body2" paragraph>
                Increased Excess Heat from Palladium Deposited on Nickel. <em>Journal of Condensed Matter Nuclear Science</em>, 29, 1-30.
              </Typography>
              <MuiLink 
                href="https://www.lenr-canr.org/acrobat/MizunoTincreasedexc.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Full Text (LENR-CANR.org)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [10] Arata, Y. & Zhang, Y. C. (2002)
              </Typography>
              <Typography variant="body2" paragraph>
                Observation of anomalous heat release and helium-4 production from highly deuterated palladium. <em>Proceedings of the Japan Academy, Series B</em>, 78(7), 57-61.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [11] Levi, G. et al. (2013)
              </Typography>
              <Typography variant="body2" paragraph>
                Indications of anomalous heat energy production in a reactor device containing hydrogen loaded nickel powder. <em>arXiv preprint</em>.
              </Typography>
              <MuiLink 
                href="https://arxiv.org/abs/1305.3913" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                arXiv:1305.3913 [physics.gen-ph]
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [12] Fralick, G., Decher, R., & Rousar, D. (2003)
              </Typography>
              <Typography variant="body2" paragraph>
                Anomalous Heat Effects in Metal Hydrides. <em>NASA Glenn Research Center Technical Report</em>.
              </Typography>
              <MuiLink 
                href="https://ntrs.nasa.gov/api/citations/20030060580/downloads/20030060580.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                NASA Technical Report (NTRS)
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [13] Schwinger, J. (1990)
              </Typography>
              <Typography variant="body2" paragraph>
                Cold Fusion: A Hypothesis. <em>Zeitschrift für Naturforschung A</em>, 45(7), 756-758.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [14] Miley, G. H. & Patterson, J. A. (1996)
              </Typography>
              <Typography variant="body2" paragraph>
                Evidence of Transmutation Products in Thin-Film Nickel. <em>Fusion Technology</em>, 30(1), 156-159.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [15] Takahashi, A. (2004)
              </Typography>
              <Typography variant="body2" paragraph>
                Tetrahedral Symmetric Condensate Fusion Model and Multi-body Fusion in Deuterated Metal. <em>Journal of Condensed Matter Nuclear Science</em>, 1, 4-17.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [16] Storms, E. (2010)
              </Typography>
              <Typography variant="body2" paragraph>
                A critical analysis of the LENR phenomenon. <em>Naturwissenschaften</em>, 97(10), 861-881.
              </Typography>
              <MuiLink 
                href="https://doi.org/10.1007/s00114-010-0691-x" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                DOI: 10.1007/s00114-010-0691-x
              </MuiLink>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [17] Preparata, G. (1995)
              </Typography>
              <Typography variant="body2" paragraph>
                <em>QED Coherence in Matter</em>. World Scientific Publishing Company.
              </Typography>
            </ListItem>

            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                [18] Acs, D. et al. (2025)
              </Typography>
              <Typography variant="body2" paragraph>
                A Unified Theoretical Framework for Low-Energy Nuclear Reactions: Integrating Quantum, Nuclear, and Condensed Matter Phenomena. <em>Conscious Energies</em>.
              </Typography>
              <MuiLink 
                href="https://github.com/ConsciousEnergy/lenr_sim_app/blob/main/docs/A%20Unified%20Theoretical%20Framework%20for%20Low-Energy%20Nuclear%20Reactions_%20Integrating%20Quantum%2C%20Nuclear%2C%20and%20Condensed%20Matter%20Phenomena%20(1).md" 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ fontSize: '0.875rem' }}
              >
                Full Paper on GitHub
              </MuiLink>
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />
          
          <Alert severity="info">
            <AlertTitle><strong>Additional Resources</strong></AlertTitle>
            <Typography variant="body2" paragraph>
              For comprehensive LENR research archives, visit:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <MuiLink href="https://www.lenr-canr.org" target="_blank" rel="noopener noreferrer">
                LENR-CANR.org - Cold Fusion Archive
              </MuiLink>
              <MuiLink href="https://www.lenr.org" target="_blank" rel="noopener noreferrer">
                LENR.org - Low Energy Nuclear Reactions Community
              </MuiLink>
            </Box>
          </Alert>
        </TabPanel>

        {/* Footer Actions */}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to="/unified-theory"
            variant="contained"
            startIcon={<ScienceIcon />}
            size="large"
          >
            Explore Interactive Simulation
          </Button>
          <Button
            component={RouterLink}
            to="/theory"
            variant="outlined"
            startIcon={<FunctionsIcon />}
            size="large"
          >
            View Theory Summary
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            This paper is part of the LENR Simulation Platform developed by Conscious Energies.
            <br />
            For questions or contributions, contact: <MuiLink href="mailto:diadon@conscious.energy">diadon@conscious.energy</MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TheoryPaperPage;
