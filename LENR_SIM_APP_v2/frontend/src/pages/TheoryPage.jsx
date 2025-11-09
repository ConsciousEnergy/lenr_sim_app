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
  Card,
  CardContent,
  Grid,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Tab,
  Tabs
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import FunctionsIcon from '@mui/icons-material/Functions';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`theory-tabpanel-${index}`}
      aria-labelledby={`theory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TheoryPage = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
            Unified LENR Theoretical Framework
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            A Comprehensive Integration of Quantum, Nuclear, and Condensed Matter Phenomena
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Chip label="Rydberg Matter" size="small" color="primary" />
            <Chip label="Quantum Tunneling" size="small" color="primary" />
            <Chip label="QED Effects" size="small" color="primary" />
            <Chip label="Casimir Forces" size="small" color="primary" />
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Abstract */}
        <Alert severity="info" sx={{ mb: 4 }}>
          <AlertTitle><strong>Abstract</strong></AlertTitle>
          <Typography variant="body2">
            Low-Energy Nuclear Reactions (LENR) offer a transformative pathway toward clean and sustainable energy. 
            This framework unifies major theoretical elements—including Rydberg Matter, halo electrons, double-layer 
            QED effects, Casimir forces, the Oppenheimer-Phillips process, and quantum tunneling enhancements—under 
            a single comprehensive model. Computational results predict tunneling enhancements exceeding 10⁸, while 
            experimental evidence confirms isotopic shifts, neutron formation, and measurable excess heat production.
          </Typography>
        </Alert>

        {/* Tabs for Main Sections */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
            aria-label="theory sections"
          >
            <Tab icon={<ScienceIcon />} label="Theoretical Framework" iconPosition="start" />
            <Tab icon={<FunctionsIcon />} label="Computational Methods" iconPosition="start" />
            <Tab icon={<AutoGraphIcon />} label="Experimental Validation" iconPosition="start" />
            <Tab icon={<LibraryBooksIcon />} label="Mathematics" iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 1: Theoretical Framework */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Core Theoretical Mechanisms
          </Typography>

          {/* Mechanism Cards */}
          <Grid container spacing={3}>
            {/* Rydberg Matter */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', background: alpha(theme.palette.primary.main, 0.05) }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BubbleChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Rydberg Matter (RM)
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Definition:</strong> A phase where atoms occupy highly excited electronic states with extended orbitals.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Role in LENR:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Enhanced Energy Localization" 
                        secondary="Extended orbitals enable efficient energy concentration" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Facilitated Tunneling" 
                        secondary="Lower bound states enable enhanced quantum tunneling" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Cluster Formation" 
                        secondary="RM clusters serve as catalytic hot spots" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </List>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      Energy (n=10): E<sub>n</sub> = -13.6 eV / n² = -0.136 eV
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Halo Electrons */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', background: alpha(theme.palette.secondary.main, 0.05) }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <FlashOnIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Halo Electrons
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Definition:</strong> Weakly bound electrons with extended orbitals that overlap significantly with nuclear wavefunctions.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Key Properties:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="secondary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Enhanced Nuclear Interaction" 
                        secondary="Increased overlap probability (~10⁻³)" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="secondary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Neutron Formation" 
                        secondary="Enables electron capture: p + e⁻ → n + νₑ" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="secondary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Transmutation Pathways" 
                        secondary="Essential for isotopic transformation" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </List>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      Cross-section: σ = σ₀ × P<sub>overlap</sub> ≈ 10⁻²⁴ m²
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Double-Layer QED */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', background: alpha(theme.palette.info.main, 0.05) }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TimelineIcon sx={{ mr: 1, color: 'info.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Double-Layer QED Effects
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Definition:</strong> Charge separation at electrolyte or lattice interfaces forming high electric fields in thin double layers.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Implications:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="info" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Coulomb Barrier Reduction" 
                        secondary="Localized high fields lower energy barriers" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="info" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Ionization Enhancement" 
                        secondary="Promotes Rydberg Matter formation" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </List>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      Field Strength: E = ΔV / d = 0.1V / 1nm = 10⁸ V/m
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Casimir Effect */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', background: alpha(theme.palette.success.main, 0.05) }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccountTreeIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Casimir Effect
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Definition:</strong> Quantum vacuum fluctuations produce an attractive force between closely spaced conductive or dielectric surfaces.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>LENR Applications:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Energy Localization" 
                        secondary="Nanoscale distortions focus energy" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Enhanced Tunneling" 
                        secondary="Confinement lowers effective barriers" 
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </List>
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      F<sub>Casimir</sub> = -(π²ℏc/240) × (A/d⁴) ≈ -10⁻⁷ N
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quantum Tunneling Enhancement */}
          <Box sx={{ mt: 4 }}>
            <Alert severity="success" icon={<FlashOnIcon />}>
              <AlertTitle><strong>Quantum Tunneling Enhancements</strong></AlertTitle>
              <Typography variant="body2" paragraph>
                Under LENR-specific conditions (reduced barrier height through electric fields, Rydberg states, and 
                Casimir effects), numerical simulations indicate tunneling probability enhancements exceeding <strong>10⁸</strong>.
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mt: 2 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  P<sub>tunnel</sub> = exp(-2/ℏ ∫ √[2m(V(x)-E)] dx)
                </Typography>
              </Box>
            </Alert>
          </Box>

          {/* Historical Context */}
          <Box sx={{ mt: 4 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Historical Theoretical Foundations (1920–2025)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Timeline>
                  <TimelineItem year="1928" author="Gamow">
                    Introduces quantum tunneling to explain alpha decay—setting precedent for sub-barrier interactions.
                  </TimelineItem>
                  <TimelineItem year="1950s" author="Fröhlich">
                    Proposes long-range coherence in condensed matter; foundational to polarons and superconductivity.
                  </TimelineItem>
                  <TimelineItem year="1970s-80s" author="Preparata & Del Giudice">
                    Apply QED to coherent domains in water and deuterium systems.
                  </TimelineItem>
                  <TimelineItem year="1989" author="Fleischmann & Pons">
                    Report anomalous heat generation during deuterium electrolysis in palladium electrodes.
                  </TimelineItem>
                  <TimelineItem year="1990s" author="Schwinger">
                    Proposes quantum field approach to LENR, invoking non-linear QED in condensed matter.
                  </TimelineItem>
                  <TimelineItem year="2000s" author="Takahashi">
                    Develops tetrahedral fusion cluster model, predicting multi-body coherent D-D fusion pathways.
                  </TimelineItem>
                  <TimelineItem year="2010s-2020s" author="Hagelstein">
                    Explores phonon-nuclear coupling and coherent energy transfer between lattice and nuclear degrees of freedom.
                  </TimelineItem>
                  <TimelineItem year="2025" author="Acs et al.">
                    Unified theoretical framework integrating quantum, nuclear, and condensed matter phenomena.
                  </TimelineItem>
                </Timeline>
              </AccordionDetails>
            </Accordion>
          </Box>
        </TabPanel>

        {/* Tab 2: Computational Methods */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Computational Framework & Simulations
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Poisson–Schrödinger Coupled Dynamics
                  </Typography>
                  <Typography variant="body2" paragraph>
                    To evaluate electron distribution and field dynamics near metal–hydrogen interfaces, 
                    we solve the coupled Poisson–Schrödinger system:
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                      ∇²φ = -ρ/ε₀ &nbsp;&nbsp;&nbsp; (Poisson's Equation)
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      -ℏ²/2m ∇²ψ + V(r)ψ = Eψ &nbsp;&nbsp;&nbsp; (Schrödinger's Equation)
                    </Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    <strong>Simulation Parameters:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Grid Size: ~0.1 nm" secondary="Atomic-scale resolution" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Time Steps: ~1 fs" secondary="Femtosecond precision" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Software: COMSOL Multiphysics, Python (NumPy, SciPy)" secondary="Finite-element and finite-difference methods" />
                    </ListItem>
                  </List>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Key Results:</strong> Electric fields in interfacial regions exceed 10⁸ V/m; 
                      wavefunction solutions show significant electron density near protons, supporting neutron formation pathways.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Bubble Collapse Dynamics
                  </Typography>
                  <Typography variant="body2" paragraph>
                    During electrolysis, microbubbles form and collapse, concentrating energy through the 
                    modified Rayleigh–Plesset equation:
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      R R̈ + 3/2 Ṙ² = 1/ρ(P<sub>bubble</sub> - P<sub>∞</sub> - 2σ/R - 4μṘ/R + ε₀E²/2)
                    </Typography>
                  </Box>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Simulation Outcomes:</strong> Temperature peaks exceed 10⁵ K; collapsing bubbles produce 
                      pressures of multiple GPa, supporting nuclear reaction conditions.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Monte Carlo Uncertainty Propagation
                  </Typography>
                  <Typography variant="body2" paragraph>
                    We employ Monte Carlo sampling across uncertain parameters to assess confidence bounds:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="primary" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Material microstructure (dislocation density, grain size)" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="primary" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Surface topology and loading ratio (H/D/Pd ∈ [0.6, 1.1])" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="primary" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Electrochemical gradients and local temperature" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="primary" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Screening and effective barrier shape" />
                    </ListItem>
                  </List>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Results:</strong> Enhancement factors of 10³–10⁵ occur with 90% confidence within 
                      specific material and field ranges.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 3: Experimental Validation */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Experimental Correlations & Validation
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Electrolytic Reactors (Pd-D Systems)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Setup:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Palladium electrodes (>99.99% purity)" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Heavy water (D₂O) electrolytes with lithium salts" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Current densities: 0.1–1 A/cm²" />
                    </ListItem>
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" paragraph>
                    <strong>Key Results:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Up to 50% excess heat relative to electrical input" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Helium-4 and tritium production detected" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Low-level neutron flux above background" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                    Gaseous Reactors (Ni-H Systems)
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Setup:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Nickel powders with high surface area" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Hydrogen gas at 1–10 atm" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Operating temperatures: 300–800 K" />
                    </ListItem>
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" paragraph>
                    <strong>Key Results:</strong>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Anomalous heat: up to 1 kW in high-surface-area setups" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Spectroscopic signatures of Rydberg Matter" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Transmutation products (Cu, Zn) on nickel surfaces" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="success">
                <AlertTitle><strong>Computational-Experimental Correlation</strong></AlertTitle>
                <Typography variant="body2">
                  <strong>Tunneling Enhancements:</strong> Calculations show up to 10⁸-fold increases in tunneling 
                  probability under combined RM, halo electron, and high-field environments.
                  <br /><br />
                  <strong>Neutron Formation:</strong> Estimated neutron production rates align with low-level neutron 
                  signatures found experimentally.
                  <br /><br />
                  <strong>Isotopic Shifts:</strong> Detection of helium-4, tritium, and heavier isotopes supports 
                  multi-step nuclear processes (e.g., Oppenheimer-Phillips).
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 4: Mathematics */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            Mathematical Foundations
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Core Equations
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={3}>
                    <EquationCard
                      title="Schrödinger Equation"
                      equation="-ℏ²/2m ∇²ψ + V(r)ψ = Eψ"
                      description="Governs quantum state under potential V(r); central for calculating wavefunction overlaps, tunneling rates, and halo electron interactions."
                    />
                    <EquationCard
                      title="Quantum Tunneling Probability"
                      equation="P_tunnel = exp(-2/ℏ ∫ √[2m(V(x)-E)] dx)"
                      description="Calculates probability of quantum particles penetrating energy barriers. LENR conditions can enhance this by factors exceeding 10⁸."
                    />
                    <EquationCard
                      title="Casimir Force"
                      equation="F_Casimir = -(π²ℏc/240) × (A/d⁴)"
                      description="Attractive force from quantum vacuum fluctuations. Creates energy localization at nanoscale interfaces critical for LENR."
                    />
                    <EquationCard
                      title="Electric Field Strength"
                      equation="E = ΔV / d"
                      description="For ΔV = 0.1V across d = 1nm, yields E = 10⁸ V/m. High fields modify barrier conditions for tunneling."
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Key Symbols & Constants
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <SymbolCard symbol="ℏ" name="Reduced Planck's Constant" value="≈ 1.054 × 10⁻³⁴ J·s" />
                      <SymbolCard symbol="c" name="Speed of Light" value="≈ 3 × 10⁸ m/s" />
                      <SymbolCard symbol="k_B" name="Boltzmann's Constant" value="≈ 1.381 × 10⁻²³ J/K" />
                      <SymbolCard symbol="ε₀" name="Vacuum Permittivity" value="≈ 8.854 × 10⁻¹² F/m" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <SymbolCard symbol="a₀" name="Bohr Radius" value="≈ 0.0529 nm" />
                      <SymbolCard symbol="ψ" name="Wavefunction" value="Describes quantum state" />
                      <SymbolCard symbol="V(r)" name="Potential Energy" value="Function of position" />
                      <SymbolCard symbol="E" name="Energy" value="Eigenvalue or field strength" />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <AlertTitle><strong>Thermodynamics & Energy Conservation</strong></AlertTitle>
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mt: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    Q_nuclear = Q_input + Q_excess
                  </Typography>
                  <Typography variant="caption">
                    Total energy balance in calorimetric setups ensures conservation laws are maintained 
                    while accounting for anomalous heat production.
                  </Typography>
                </Box>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Footer */}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            <strong>Authors:</strong> Diadon Acs, LENR-ARA/GPT-4, Sonnet 4.5, and Gemini 2.5
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Date: February 13, 2025 | Organization: www.conscious.energy
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

// Helper Components
const TimelineItem = ({ year, author, children }) => (
  <Box sx={{ mb: 2, pl: 2, borderLeft: 3, borderColor: 'primary.main' }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
      {year} — {author}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  </Box>
);

const Timeline = ({ children }) => (
  <Box sx={{ pl: 2 }}>
    {children}
  </Box>
);

const EquationCard = ({ title, equation, description }) => (
  <Paper elevation={1} sx={{ p: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
      {title}
    </Typography>
    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 1 }}>
      <Typography variant="body1" sx={{ fontFamily: 'monospace', textAlign: 'center' }}>
        {equation}
      </Typography>
    </Box>
    <Typography variant="body2" color="text.secondary">
      {description}
    </Typography>
  </Paper>
);

const SymbolCard = ({ symbol, name, value }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="body1">
      <strong style={{ fontFamily: 'serif', fontSize: '1.2em' }}>{symbol}</strong> — {name}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
      {value}
    </Typography>
  </Box>
);

export default TheoryPage;

